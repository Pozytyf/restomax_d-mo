import { getDb, generateId } from '../db.ts';
import { BaseRepository } from './BaseRepository.ts';

export class PublicRepository extends BaseRepository {
  constructor() {
    super({ tableName: 'qr_codes', tenantColumn: 'restaurant_id' });
  }

  findActivePlans() {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, code, name, tagline, price_monthly_xof, price_yearly_xof,
                trial_days, max_tables, max_staff, max_menu_items,
                is_demo_pricing, is_featured, features_json, active
         FROM plans WHERE active = 1 ORDER BY price_monthly_xof ASC`,
      )
      .all() as Array<Record<string, unknown>>;
  }

  findAllPlatformSettings() {
    const db = getDb();
    return db
      .prepare('SELECT key, value FROM platform_settings')
      .all() as Array<{ key: string; value: string }>;
  }

  createLead(params: {
    leadType: 'CONTACT' | 'DEMO_REQUEST';
    fullName: string;
    email: string;
    phone: string;
    restaurantName: string;
    city: string;
    message: string;
  }): string {
    const db = getDb();
    const id = generateId(params.leadType === 'CONTACT' ? 'lead' : 'demo');
    db.prepare(
      `INSERT INTO contact_leads (id, lead_type, full_name, email, phone, restaurant_name, city, message, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      params.leadType,
      params.fullName,
      params.email,
      params.phone,
      params.restaurantName,
      params.city,
      params.message,
      new Date().toISOString(),
    );
    return id;
  }

  findQrContextByToken(token: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT q.id as qr_id, q.token, q.version, q.status as qr_status,
                t.id as table_id, t.label as table_label, t.zone as table_zone,
                r.id as restaurant_id, r.name as restaurant_name, r.city, r.currency,
                r.tax_rate_percent, r.opening_hours, r.status as restaurant_status, r.deleted_at
         FROM qr_codes q
         JOIN dining_tables t ON t.id = q.table_id
         JOIN restaurants r ON r.id = q.restaurant_id
         WHERE q.token = ?`,
      )
      .get(token) as Record<string, unknown> | undefined;
  }

  createQrTableSession(params: {
    restaurantId: string;
    tableId: string;
    qrToken: string;
    expiresAt: string;
  }): string {
    const db = getDb();
    const sessionId = generateId('qrs');
    db.prepare(
      `INSERT INTO qr_table_sessions (id, restaurant_id, table_id, qr_token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      sessionId,
      params.restaurantId,
      params.tableId,
      params.qrToken,
      params.expiresAt,
      new Date().toISOString(),
    );
    return sessionId;
  }

  findQrTableSession(sessionId: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, restaurant_id, table_id, expires_at
         FROM qr_table_sessions WHERE id = ?`,
      )
      .get(sessionId) as Record<string, unknown> | undefined;
  }

  findActiveCategories(restaurantId: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, name, station, sort_order
         FROM menu_categories
         WHERE restaurant_id = ? AND active = 1
         ORDER BY sort_order ASC`,
      )
      .all(restaurantId);
  }

  findAvailableMenuItems(restaurantId: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, category_id, name, description, price_xof, image_url, options_json
         FROM menu_items
         WHERE restaurant_id = ? AND available = 1
         ORDER BY sort_order ASC, name ASC`,
      )
      .all(restaurantId) as Array<Record<string, unknown>>;
  }

  findOrderByIdempotencyKey(restaurantId: string, idempotencyKey: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, order_number, total_xof, status FROM orders WHERE restaurant_id = ? AND idempotency_key = ?',
      )
      .get(restaurantId, idempotencyKey) as Record<string, unknown> | undefined;
  }

  countOrdersForRestaurant(restaurantId: string): number {
    const db = getDb();
    const row = db
      .prepare('SELECT COUNT(*) as c FROM orders WHERE restaurant_id = ?')
      .get(restaurantId) as { c: number };
    return row.c;
  }

  findMenuItemWithStation(menuItemId: string, restaurantId: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT m.id, m.name, m.price_xof, m.available, m.options_json, c.station
         FROM menu_items m
         JOIN menu_categories c ON c.id = m.category_id
         WHERE m.id = ? AND m.restaurant_id = ?`,
      )
      .get(menuItemId, restaurantId) as Record<string, unknown> | undefined;
  }

  insertQrOrderTransaction(params: {
    orderId: string;
    restaurantId: string;
    orderNumber: string;
    tableId: string;
    customerName: string;
    subtotalHtXof: number;
    taxXof: number;
    totalXof: number;
    notes: string;
    idempotencyKey: string | null;
    now: string;
    lines: Array<{
      id: string;
      menuItemId: string;
      name: string;
      station: string;
      unitPriceXof: number;
      optionsSummary: string;
      optionsDeltaXof: number;
      quantity: number;
      lineTotalXof: number;
      notes: string;
    }>;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO orders (
        id, restaurant_id, order_number, order_type, table_id, customer_name,
        status, subtotal_xof, discount_xof, tax_xof, total_xof, paid_xof,
        notes, idempotency_key, created_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, 'QR_TABLE', ?, ?, 'PENDING', ?, 0, ?, ?, 0, ?, ?, NULL, ?, ?)`,
    ).run(
      params.orderId,
      params.restaurantId,
      params.orderNumber,
      params.tableId,
      params.customerName,
      params.subtotalHtXof,
      params.taxXof,
      params.totalXof,
      params.notes,
      params.idempotencyKey,
      params.now,
      params.now,
    );

    const insertLine = db.prepare(
      `INSERT INTO order_items (
        id, order_id, menu_item_id, name, station, unit_price_xof,
        options_summary, options_delta_xof, quantity, line_total_xof, notes, prep_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    );
    for (const pl of params.lines) {
      insertLine.run(
        pl.id,
        params.orderId,
        pl.menuItemId,
        pl.name,
        pl.station,
        pl.unitPriceXof,
        pl.optionsSummary,
        pl.optionsDeltaXof,
        pl.quantity,
        pl.lineTotalXof,
        pl.notes,
      );
    }

    db.prepare(
      `UPDATE dining_tables SET status = 'OCCUPIED' WHERE id = ? AND restaurant_id = ?`,
    ).run(params.tableId, params.restaurantId);
  }

  findTrackedQrOrder(token: string, orderId: string) {
    const db = getDb();
    const order = db
      .prepare(
        `SELECT o.id, o.order_number, o.status, o.total_xof, o.paid_xof, o.created_at, o.updated_at,
                t.label as table_label, r.name as restaurant_name
         FROM orders o
         JOIN qr_codes q ON q.table_id = o.table_id AND q.restaurant_id = o.restaurant_id
         JOIN dining_tables t ON t.id = o.table_id
         JOIN restaurants r ON r.id = o.restaurant_id
         WHERE q.token = ? AND o.id = ?`,
      )
      .get(token, orderId) as Record<string, unknown> | undefined;

    if (!order) return null;

    const items = db
      .prepare(
        `SELECT id, name, quantity, options_summary, line_total_xof, prep_status
         FROM order_items WHERE order_id = ?`,
      )
      .all(orderId);

    return { order, items };
  }
}

export const publicRepository = new PublicRepository();
