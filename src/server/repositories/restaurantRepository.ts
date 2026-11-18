import { getDb, generateId } from '../db.ts';
import type { Permission, Role } from '../../types/index.ts';

export const restaurantRepository = {
  getDashboardMetrics(rid: string) {
    const db = getDb();
    const revenueRow = db
      .prepare(
        `SELECT COALESCE(SUM(total_xof), 0) as total_revenue,
                COUNT(*) as orders_count,
                COALESCE(AVG(total_xof), 0) as avg_basket
         FROM orders
         WHERE restaurant_id = ? AND status != 'CANCELLED'`,
      )
      .get(rid) as {
      total_revenue: number;
      orders_count: number;
      avg_basket: number;
    };

    const pendingRow = db
      .prepare(
        `SELECT COUNT(*) as c FROM orders
         WHERE restaurant_id = ? AND status IN ('PENDING', 'IN_PREPARATION', 'READY')`,
      )
      .get(rid) as { c: number };

    const tablesStats = db
      .prepare(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN status = 'OCCUPIED' THEN 1 ELSE 0 END) as occupied,
                SUM(CASE WHEN status = 'RESERVED' THEN 1 ELSE 0 END) as reserved
         FROM dining_tables WHERE restaurant_id = ?`,
      )
      .get(rid) as { total: number; occupied: number; reserved: number };

    const revenueSeries = db
      .prepare(
        `SELECT substr(created_at, 1, 10) as day,
                COALESCE(SUM(total_xof), 0) as revenue_xof,
                COUNT(*) as orders
         FROM orders
         WHERE restaurant_id = ? AND status != 'CANCELLED'
         GROUP BY substr(created_at, 1, 10)
         ORDER BY day ASC
         LIMIT 14`,
      )
      .all(rid);

    const topItems = db
      .prepare(
        `SELECT oi.name, SUM(oi.quantity) as qty, SUM(oi.line_total_xof) as revenue_xof
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         WHERE o.restaurant_id = ? AND o.status != 'CANCELLED'
         GROUP BY oi.name
         ORDER BY revenue_xof DESC
         LIMIT 5`,
      )
      .all(rid);

    const lowStocks = db
      .prepare(
        `SELECT id, name, unit, quantity, min_threshold, supplier_name
         FROM stocks
         WHERE restaurant_id = ? AND quantity <= min_threshold
         ORDER BY (quantity - min_threshold) ASC`,
      )
      .all(rid);

    const paymentBreakdown = db
      .prepare(
        `SELECT method, COALESCE(SUM(amount_xof), 0) as total_xof, COUNT(*) as count
         FROM payments
         WHERE restaurant_id = ? AND status = 'PAID'
         GROUP BY method`,
      )
      .all(rid);

    const recentOrders = db
      .prepare(
        `SELECT o.id, o.order_number, o.order_type, o.customer_name, o.status,
                o.total_xof, o.paid_xof, o.created_at, t.label as table_label
         FROM orders o
         LEFT JOIN dining_tables t ON t.id = o.table_id
         WHERE o.restaurant_id = ?
         ORDER BY o.created_at DESC
         LIMIT 6`,
      )
      .all(rid);

    const staffActivity = db
      .prepare(
        `SELECT actor_email, actor_role, action, details, created_at
         FROM audit_logs
         WHERE restaurant_id = ?
         ORDER BY created_at DESC
         LIMIT 6`,
      )
      .all(rid);

    const expensesRow = db
      .prepare(
        `SELECT COALESCE(SUM(amount_xof), 0) as total_expenses
         FROM expenses WHERE restaurant_id = ?`,
      )
      .get(rid) as { total_expenses: number };

    const collectedRow = db
      .prepare(
        `SELECT COALESCE(SUM(amount_xof), 0) as total_paid
         FROM payments WHERE restaurant_id = ? AND status = 'PAID'`,
      )
      .get(rid) as { total_paid: number };

    return {
      revenueRow,
      pendingRow,
      tablesStats,
      revenueSeries,
      topItems,
      lowStocks,
      paymentBreakdown,
      recentOrders,
      staffActivity,
      expensesRow,
      collectedRow,
    };
  },

  findMenuCategories(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, restaurant_id as restaurantId, name, station, sort_order as sortOrder, active
         FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order ASC`,
      )
      .all(rid) as Array<Record<string, unknown>>;
  },

  findMenuItems(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT m.id, m.restaurant_id as restaurantId, m.category_id as categoryId,
                c.name as categoryName, c.station,
                m.name, m.description, m.price_xof as priceXof, m.cost_price_xof as costPriceXof,
                m.image_url as imageUrl, m.available, m.sort_order as sortOrder, m.options_json
         FROM menu_items m
         JOIN menu_categories c ON c.id = m.category_id
         WHERE m.restaurant_id = ?
         ORDER BY m.sort_order ASC, m.name ASC`,
      )
      .all(rid) as Array<Record<string, unknown>>;
  },

  countCategories(rid: string): number {
    const db = getDb();
    return (
      db
        .prepare('SELECT COUNT(*) as c FROM menu_categories WHERE restaurant_id = ?')
        .get(rid) as { c: number }
    ).c;
  },

  createCategory(rid: string, name: string, station: string, sortOrder: number) {
    const db = getDb();
    const id = generateId('cat');
    db.prepare(
      `INSERT INTO menu_categories (id, restaurant_id, name, station, sort_order, active)
       VALUES (?, ?, ?, ?, ?, 1)`,
    ).run(id, rid, name, station, sortOrder);
    return id;
  },

  findCategory(categoryId: string, rid: string) {
    const db = getDb();
    return db
      .prepare('SELECT id FROM menu_categories WHERE id = ? AND restaurant_id = ?')
      .get(categoryId, rid);
  },

  createMenuItem(params: {
    rid: string;
    categoryId: string;
    name: string;
    description: string;
    priceXof: number;
    costPriceXof: number;
    optionsJson: string;
  }) {
    const db = getDb();
    const id = generateId('itm');
    db.prepare(
      `INSERT INTO menu_items (
        id, restaurant_id, category_id, name, description, price_xof, cost_price_xof,
        image_url, available, sort_order, options_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, 99, ?, ?)`,
    ).run(
      id,
      params.rid,
      params.categoryId,
      params.name,
      params.description,
      params.priceXof,
      params.costPriceXof,
      params.optionsJson,
      new Date().toISOString(),
    );
    return id;
  },

  findMenuItemById(itemId: string, rid: string) {
    const db = getDb();
    return db
      .prepare('SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ?')
      .get(itemId, rid);
  },

  updateMenuItem(
    itemId: string,
    rid: string,
    updates: {
      available?: boolean;
      priceXof?: number;
      name?: string;
      description?: string;
    },
  ) {
    const db = getDb();
    if (typeof updates.available === 'boolean') {
      db.prepare(
        'UPDATE menu_items SET available = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.available ? 1 : 0, itemId, rid);
    }
    if (updates.priceXof !== undefined) {
      db.prepare(
        'UPDATE menu_items SET price_xof = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.priceXof, itemId, rid);
    }
    if (updates.name !== undefined) {
      db.prepare(
        'UPDATE menu_items SET name = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.name, itemId, rid);
    }
    if (updates.description !== undefined) {
      db.prepare(
        'UPDATE menu_items SET description = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.description, itemId, rid);
    }
  },

  findOrdersWithItems(rid: string) {
    const db = getDb();
    const orders = db
      .prepare(
        `SELECT o.id, o.restaurant_id as restaurantId, o.order_number as orderNumber,
                o.order_type as orderType, o.table_id as tableId, t.label as tableLabel,
                o.customer_name as customerName, o.status, o.subtotal_xof as subtotalXof,
                o.discount_xof as discountXof, o.tax_xof as taxXof, o.total_xof as totalXof,
                o.paid_xof as paidXof, o.notes, o.created_by_user_id as createdByUserId,
                o.created_at as createdAt, o.updated_at as updatedAt
         FROM orders o
         LEFT JOIN dining_tables t ON t.id = o.table_id
         WHERE o.restaurant_id = ?
         ORDER BY o.created_at DESC
         LIMIT 100`,
      )
      .all(rid) as Array<Record<string, unknown>>;

    const getLines = db.prepare(
      `SELECT id, order_id as orderId, menu_item_id as menuItemId, name, station,
              unit_price_xof as unitPriceXof, options_summary as optionsSummary,
              options_delta_xof as optionsDeltaXof, quantity, line_total_xof as lineTotalXof,
              notes, prep_status as prepStatus
       FROM order_items WHERE order_id = ?`,
    );

    return orders.map((o) => ({
      ...o,
      items: getLines.all(String(o.id)),
    }));
  },

  findOrderByIdempotencyKey(rid: string, key: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, order_number, total_xof FROM orders WHERE restaurant_id = ? AND idempotency_key = ?',
      )
      .get(rid, key);
  },

  findRestaurantTaxAndMode(rid: string) {
    const db = getDb();
    return db
      .prepare('SELECT tax_rate_percent, paydunya_mode FROM restaurants WHERE id = ?')
      .get(rid) as { tax_rate_percent: number; paydunya_mode: string };
  },

  findTableById(tableId: string, rid: string) {
    const db = getDb();
    return db
      .prepare('SELECT id, label FROM dining_tables WHERE id = ? AND restaurant_id = ?')
      .get(tableId, rid) as { id: string; label: string } | undefined;
  },

  countOrders(rid: string): number {
    const db = getDb();
    return (
      db
        .prepare('SELECT COUNT(*) as c FROM orders WHERE restaurant_id = ?')
        .get(rid) as { c: number }
    ).c;
  },

  findMenuItemWithStation(menuItemId: string, rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT m.id, m.name, m.price_xof, m.available, m.options_json, c.station
         FROM menu_items m
         JOIN menu_categories c ON c.id = m.category_id
         WHERE m.id = ? AND m.restaurant_id = ?`,
      )
      .get(menuItemId, rid) as Record<string, unknown> | undefined;
  },

  insertPosOrder(params: {
    orderId: string;
    rid: string;
    orderNumber: string;
    orderType: string;
    tableId: string | null;
    customerName: string;
    subtotalXof: number;
    discountXof: number;
    taxXof: number;
    totalXof: number;
    notes: string;
    idempotencyKey: string | null;
    userId: string;
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
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, 0, ?, ?, ?, ?, ?)`,
    ).run(
      params.orderId,
      params.rid,
      params.orderNumber,
      params.orderType,
      params.tableId,
      params.customerName,
      params.subtotalXof,
      params.discountXof,
      params.taxXof,
      params.totalXof,
      params.notes,
      params.idempotencyKey,
      params.userId,
      params.now,
      params.now,
    );

    const insLine = db.prepare(
      `INSERT INTO order_items (
        id, order_id, menu_item_id, name, station, unit_price_xof,
        options_summary, options_delta_xof, quantity, line_total_xof, notes, prep_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
    );
    for (const l of params.lines) {
      insLine.run(
        l.id,
        params.orderId,
        l.menuItemId,
        l.name,
        l.station,
        l.unitPriceXof,
        l.optionsSummary,
        l.optionsDeltaXof,
        l.quantity,
        l.lineTotalXof,
        l.notes,
      );
    }

    if (params.tableId) {
      db.prepare(
        `UPDATE dining_tables SET status = 'OCCUPIED' WHERE id = ? AND restaurant_id = ?`,
      ).run(params.tableId, params.rid);
    }
  },

  findOrderForUpdate(orderId: string, rid: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, table_id, total_xof, paid_xof, status FROM orders WHERE id = ? AND restaurant_id = ?',
      )
      .get(orderId, rid) as
      | {
          id: string;
          table_id: string | null;
          total_xof: number;
          paid_xof: number;
          status: string;
        }
      | undefined;
  },

  updateOrderAndPrepStatus(
    orderId: string,
    rid: string,
    status: string,
    tableId: string | null,
  ) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND restaurant_id = ?',
    ).run(status, now, orderId, rid);

    if (status === 'IN_PREPARATION') {
      db.prepare(
        `UPDATE order_items SET prep_status = 'PREPARING' WHERE order_id = ? AND prep_status = 'PENDING'`,
      ).run(orderId);
    } else if (status === 'READY') {
      db.prepare(`UPDATE order_items SET prep_status = 'READY' WHERE order_id = ?`).run(
        orderId,
      );
    } else if (status === 'SERVED') {
      db.prepare(`UPDATE order_items SET prep_status = 'SERVED' WHERE order_id = ?`).run(
        orderId,
      );
    } else if (status === 'CANCELLED' && tableId) {
      db.prepare(
        `UPDATE dining_tables SET status = 'AVAILABLE' WHERE id = ? AND restaurant_id = ?`,
      ).run(tableId, rid);
    }
  },

  findPayments(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT p.id, p.restaurant_id as restaurantId, p.order_id as orderId,
                o.order_number as orderNumber, p.amount_xof as amountXof,
                p.method, p.status, p.mode, p.reference, p.created_at as createdAt
         FROM payments p
         JOIN orders o ON o.id = p.order_id
         WHERE p.restaurant_id = ?
         ORDER BY p.created_at DESC
         LIMIT 100`,
      )
      .all(rid);
  },

  findPaymentByIdempotencyKey(rid: string, key: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, reference, amount_xof FROM payments WHERE restaurant_id = ? AND idempotency_key = ?',
      )
      .get(rid, key);
  },

  insertPaymentAndSettleOrder(params: {
    paymentId: string;
    rid: string;
    orderId: string;
    amountXof: number;
    method: string;
    mode: string;
    reference: string;
    idempotencyKey: string | null;
    userId: string;
    newPaid: number;
    fullyPaid: boolean;
    tableId: string | null;
    now: string;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO payments (
        id, restaurant_id, order_id, amount_xof, method, status, mode,
        reference, idempotency_key, created_by_user_id, created_at
      ) VALUES (?, ?, ?, ?, ?, 'PAID', ?, ?, ?, ?, ?)`,
    ).run(
      params.paymentId,
      params.rid,
      params.orderId,
      params.amountXof,
      params.method,
      params.mode,
      params.reference,
      params.idempotencyKey,
      params.userId,
      params.now,
    );

    db.prepare(
      `UPDATE orders
       SET paid_xof = ?, status = CASE WHEN ? THEN 'PAID' ELSE status END, updated_at = ?
       WHERE id = ? AND restaurant_id = ?`,
    ).run(
      params.newPaid,
      params.fullyPaid ? 1 : 0,
      params.now,
      params.orderId,
      params.rid,
    );

    if (params.fullyPaid && params.tableId) {
      db.prepare(
        `UPDATE dining_tables SET status = 'AVAILABLE' WHERE id = ? AND restaurant_id = ?`,
      ).run(params.tableId, params.rid);
    }
  },

  findPaymentForRefund(paymentId: string, rid: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, order_id, amount_xof, status FROM payments WHERE id = ? AND restaurant_id = ?',
      )
      .get(paymentId, rid) as
      | { id: string; order_id: string; amount_xof: number; status: string }
      | undefined;
  },

  markPaymentRefunded(paymentId: string, rid: string, orderId: string, amountXof: number) {
    const db = getDb();
    db.prepare(
      `UPDATE payments SET status = 'REFUNDED' WHERE id = ? AND restaurant_id = ?`,
    ).run(paymentId, rid);

    db.prepare(
      `UPDATE orders SET paid_xof = MAX(0, paid_xof - ?), status = 'SERVED', updated_at = ? WHERE id = ? AND restaurant_id = ?`,
    ).run(amountXof, new Date().toISOString(), orderId, rid);
  },

  findTablesWithQrAndActiveOrder(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT t.id, t.restaurant_id as restaurantId, t.zone, t.label, t.capacity, t.status,
                q.token as qrToken, q.version as qrVersion, q.status as qrStatus,
                (SELECT id FROM orders o WHERE o.table_id = t.id AND o.restaurant_id = t.restaurant_id AND o.status NOT IN ('PAID', 'CANCELLED') ORDER BY o.created_at DESC LIMIT 1) as activeOrderId,
                (SELECT total_xof FROM orders o WHERE o.table_id = t.id AND o.restaurant_id = t.restaurant_id AND o.status NOT IN ('PAID', 'CANCELLED') ORDER BY o.created_at DESC LIMIT 1) as activeOrderTotalXof
         FROM dining_tables t
         LEFT JOIN qr_codes q ON q.table_id = t.id AND q.status = 'ACTIVE'
         WHERE t.restaurant_id = ?
         ORDER BY t.zone ASC, t.label ASC`,
      )
      .all(rid);
  },

  createTableWithQr(rid: string, zone: string, label: string, capacity: number) {
    const db = getDb();
    const tableId = generateId('tbl');
    const qrToken = `${rid.slice(-6)}-${generateId('q').slice(-8)}-v1`;
    const now = new Date().toISOString();

    db.prepare(
      `INSERT INTO dining_tables (id, restaurant_id, zone, label, capacity, status)
       VALUES (?, ?, ?, ?, ?, 'AVAILABLE')`,
    ).run(tableId, rid, zone, label, capacity);

    db.prepare(
      `INSERT INTO qr_codes (id, restaurant_id, table_id, token, version, status, created_at)
       VALUES (?, ?, ?, ?, 1, 'ACTIVE', ?)`,
    ).run(generateId('qr'), rid, tableId, qrToken, now);

    return { tableId, qrToken };
  },

  updateTableStatus(tableId: string, rid: string, status: string) {
    const db = getDb();
    db.prepare(
      'UPDATE dining_tables SET status = ? WHERE id = ? AND restaurant_id = ?',
    ).run(status, tableId, rid);
  },

  regenerateTableQr(tableId: string, rid: string) {
    const db = getDb();
    const now = new Date().toISOString();
    const maxVer = (
      db
        .prepare('SELECT COALESCE(MAX(version), 0) as v FROM qr_codes WHERE table_id = ?')
        .get(tableId) as { v: number }
    ).v;
    const nextVer = maxVer + 1;
    const newToken = `${rid.slice(-6)}-${generateId('q').slice(-8)}-v${nextVer}`;

    db.prepare(
      `UPDATE qr_codes SET status = 'REVOKED', revoked_at = ?
       WHERE table_id = ? AND restaurant_id = ? AND status = 'ACTIVE'`,
    ).run(now, tableId, rid);

    db.prepare(
      `INSERT INTO qr_codes (id, restaurant_id, table_id, token, version, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    ).run(generateId('qr'), rid, tableId, newToken, nextVer, now);

    return { token: newToken, version: nextVer };
  },

  findStocksAndMovements(rid: string) {
    const db = getDb();
    const stocks = db
      .prepare(
        `SELECT id, restaurant_id as restaurantId, name, unit, quantity,
                min_threshold as minThreshold, unit_cost_xof as unitCostXof,
                supplier_name as supplierName, updated_at as updatedAt
         FROM stocks WHERE restaurant_id = ? ORDER BY name ASC`,
      )
      .all(rid);

    const movements = db
      .prepare(
        `SELECT m.id, s.name as stockName, m.movement_type as movementType,
                m.quantity_delta as quantityDelta, m.reason, m.created_at as createdAt
         FROM stock_movements m
         JOIN stocks s ON s.id = m.stock_id
         WHERE m.restaurant_id = ?
         ORDER BY m.created_at DESC LIMIT 30`,
      )
      .all(rid);

    return { stocks, movements };
  },

  createStockItem(params: {
    rid: string;
    name: string;
    unit: string;
    quantity: number;
    minThreshold: number;
    unitCostXof: number;
    supplierName: string;
  }) {
    const db = getDb();
    const id = generateId('stk');
    db.prepare(
      `INSERT INTO stocks (id, restaurant_id, name, unit, quantity, min_threshold, unit_cost_xof, supplier_name, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      params.rid,
      params.name,
      params.unit,
      params.quantity,
      params.minThreshold,
      params.unitCostXof,
      params.supplierName,
      new Date().toISOString(),
    );
    return id;
  },

  findStockById(stockId: string, rid: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, quantity, name, min_threshold FROM stocks WHERE id = ? AND restaurant_id = ?',
      )
      .get(stockId, rid) as
      | { id: string; quantity: number; name: string; min_threshold: number }
      | undefined;
  },

  applyStockMovement(params: {
    rid: string;
    stockId: string;
    nextQty: number;
    movementType: string;
    delta: number;
    reason: string;
    userId: string;
  }) {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare('UPDATE stocks SET quantity = ?, updated_at = ? WHERE id = ?').run(
      params.nextQty,
      now,
      params.stockId,
    );
    db.prepare(
      `INSERT INTO stock_movements (id, restaurant_id, stock_id, movement_type, quantity_delta, reason, created_by_user_id, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      generateId('smv'),
      params.rid,
      params.stockId,
      params.movementType,
      params.delta,
      params.reason,
      params.userId,
      now,
    );
  },

  findStaffMembers(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT rm.id, rm.user_id as userId, u.full_name as fullName, u.email, u.phone,
                rm.role, rm.status, rm.custom_permissions_json, rm.created_at as createdAt
         FROM restaurant_members rm
         JOIN users u ON u.id = rm.user_id
         WHERE rm.restaurant_id = ?
         ORDER BY rm.created_at ASC`,
      )
      .all(rid) as Array<Record<string, unknown>>;
  },

  findUserByEmail(email: string) {
    const db = getDb();
    return db
      .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
      .get(email) as { id: string } | undefined;
  },

  createStaffUserAndMember(params: {
    rid: string;
    email: string;
    passwordHash: string;
    fullName: string;
    phone: string | null;
    role: Role;
    customPermissions: Permission[];
  }) {
    const db = getDb();
    const now = new Date().toISOString();
    const userId = generateId('usr');
    const memberId = generateId('mem');

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, global_role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?)`,
    ).run(
      userId,
      params.email,
      params.passwordHash,
      params.fullName,
      params.phone,
      now,
    );

    db.prepare(
      `INSERT INTO restaurant_members (id, restaurant_id, user_id, role, custom_permissions_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    ).run(
      memberId,
      params.rid,
      userId,
      params.role,
      JSON.stringify(params.customPermissions),
      now,
    );

    return { memberId, userId };
  },

  findMemberById(memberId: string, rid: string) {
    const db = getDb();
    return db
      .prepare(
        'SELECT id, user_id, role FROM restaurant_members WHERE id = ? AND restaurant_id = ?',
      )
      .get(memberId, rid) as
      | { id: string; user_id: string; role: Role }
      | undefined;
  },

  updateStaffMember(
    memberId: string,
    rid: string,
    userId: string,
    updates: {
      status?: string;
      role?: string;
      customPermissions?: Permission[];
    },
  ) {
    const db = getDb();
    if (updates.status) {
      db.prepare(
        'UPDATE restaurant_members SET status = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.status, memberId, rid);

      if (updates.status !== 'ACTIVE') {
        db.prepare(
          'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
        ).run(new Date().toISOString(), userId);
      }
    }
    if (updates.role) {
      db.prepare(
        'UPDATE restaurant_members SET role = ? WHERE id = ? AND restaurant_id = ?',
      ).run(updates.role, memberId, rid);
    }
    if (updates.customPermissions) {
      db.prepare(
        'UPDATE restaurant_members SET custom_permissions_json = ? WHERE id = ? AND restaurant_id = ?',
      ).run(JSON.stringify(updates.customPermissions), memberId, rid);
    }
  },

  findCustomers(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, restaurant_id as restaurantId, full_name as fullName, phone, email,
                loyalty_points as loyaltyPoints, total_spent_xof as totalSpentXof,
                visits_count as visitsCount, preferences, created_at as createdAt
         FROM customers WHERE restaurant_id = ? ORDER BY total_spent_xof DESC`,
      )
      .all(rid);
  },

  createCustomer(params: {
    rid: string;
    fullName: string;
    phone: string;
    email: string;
    preferences: string;
  }) {
    const db = getDb();
    const id = generateId('cust');
    db.prepare(
      `INSERT INTO customers (id, restaurant_id, full_name, phone, email, loyalty_points, total_spent_xof, visits_count, preferences, created_at)
       VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?, ?)`,
    ).run(
      id,
      params.rid,
      params.fullName,
      params.phone,
      params.email,
      params.preferences,
      new Date().toISOString(),
    );
    return id;
  },

  findReservations(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT r.id, r.restaurant_id as restaurantId, r.customer_name as customerName,
                r.customer_phone as customerPhone, r.party_size as partySize,
                r.reserved_at as reservedAt, r.table_id as tableId, t.label as tableLabel,
                r.status, r.notes
         FROM reservations r
         LEFT JOIN dining_tables t ON t.id = r.table_id
         WHERE r.restaurant_id = ?
         ORDER BY r.reserved_at ASC`,
      )
      .all(rid);
  },

  createReservation(params: {
    rid: string;
    customerName: string;
    customerPhone: string;
    partySize: number;
    reservedAt: string;
    tableId: string | null;
    notes: string;
  }) {
    const db = getDb();
    const id = generateId('res');
    db.prepare(
      `INSERT INTO reservations (id, restaurant_id, customer_name, customer_phone, party_size, reserved_at, table_id, status, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', ?, ?)`,
    ).run(
      id,
      params.rid,
      params.customerName,
      params.customerPhone,
      params.partySize,
      params.reservedAt,
      params.tableId,
      params.notes,
      new Date().toISOString(),
    );
    return id;
  },

  updateReservationStatus(id: string, rid: string, status: string) {
    const db = getDb();
    db.prepare(
      'UPDATE reservations SET status = ? WHERE id = ? AND restaurant_id = ?',
    ).run(status, id, rid);
  },

  findFinanceSummary(rid: string) {
    const db = getDb();
    const sales = db
      .prepare(
        `SELECT COALESCE(SUM(total_xof), 0) as gross_sales,
                COALESCE(SUM(tax_xof), 0) as total_tax,
                COALESCE(SUM(paid_xof), 0) as collected
         FROM orders WHERE restaurant_id = ? AND status != 'CANCELLED'`,
      )
      .get(rid) as { gross_sales: number; total_tax: number; collected: number };

    const cogsRow = db
      .prepare(
        `SELECT COALESCE(SUM(oi.quantity * mi.cost_price_xof), 0) as total_cogs
         FROM order_items oi
         JOIN orders o ON o.id = oi.order_id
         JOIN menu_items mi ON mi.id = oi.menu_item_id
         WHERE o.restaurant_id = ? AND o.status != 'CANCELLED'`,
      )
      .get(rid) as { total_cogs: number };

    const expenses = db
      .prepare(
        `SELECT id, category, description, amount_xof as amountXof, expense_date as expenseDate
         FROM expenses WHERE restaurant_id = ? ORDER BY expense_date DESC`,
      )
      .all(rid) as Array<Record<string, unknown>>;

    const byMethod = db
      .prepare(
        `SELECT method, COALESCE(SUM(amount_xof), 0) as amountXof, COUNT(*) as count
         FROM payments WHERE restaurant_id = ? AND status = 'PAID'
         GROUP BY method`,
      )
      .all(rid);

    return { sales, cogsRow, expenses, byMethod };
  },

  createExpense(params: {
    rid: string;
    category: string;
    description: string;
    amountXof: number;
    expenseDate?: string;
  }) {
    const db = getDb();
    const id = generateId('exp');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO expenses (id, restaurant_id, category, description, amount_xof, expense_date, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      params.rid,
      params.category,
      params.description,
      params.amountXof,
      params.expenseDate || now,
      now,
    );
    return id;
  },

  findOrdersForCsvExport(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT order_number, order_type, customer_name, status, total_xof, paid_xof, created_at
         FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC`,
      )
      .all(rid) as Array<Record<string, unknown>>;
  },

  findRestaurantSettings(rid: string) {
    const db = getDb();
    const resto = db
      .prepare(
        `SELECT id, name, slug, email, phone, address, city, country, currency, timezone,
                tax_rate_percent as taxRatePercent, service_fee_percent as serviceFeePercent,
                opening_hours as openingHours, paydunya_mode as paydunyaMode,
                paydunya_public_key, paydunya_private_key, paydunya_token, status, created_at as createdAt
         FROM restaurants WHERE id = ?`,
      )
      .get(rid) as Record<string, unknown>;

    const sub = db
      .prepare(
        `SELECT s.id, s.status, s.billing_cycle as billingCycle, s.trial_ends_at as trialEndsAt,
                s.current_period_end as currentPeriodEnd, p.name as planName, p.price_monthly_xof as priceMonthlyXof
         FROM subscriptions s
         JOIN plans p ON p.id = s.plan_id
         WHERE s.restaurant_id = ?
         ORDER BY s.created_at DESC LIMIT 1`,
      )
      .get(rid);

    return { resto, sub };
  },

  updateRestaurantSettings(
    rid: string,
    params: {
      name: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      openingHours: string | null;
      taxRatePercent: number | null;
      paydunyaMode: string | null;
      paydunyaPublicKey?: string;
      paydunyaPrivateKey?: string;
      paydunyaToken?: string;
    },
  ) {
    const db = getDb();
    db.prepare(
      `UPDATE restaurants
       SET name = COALESCE(?, name),
           phone = COALESCE(?, phone),
           address = COALESCE(?, address),
           city = COALESCE(?, city),
           opening_hours = COALESCE(?, opening_hours),
           tax_rate_percent = COALESCE(?, tax_rate_percent),
           paydunya_mode = COALESCE(?, paydunya_mode)
       WHERE id = ?`,
    ).run(
      params.name,
      params.phone,
      params.address,
      params.city,
      params.openingHours,
      params.taxRatePercent,
      params.paydunyaMode,
      rid,
    );

    if (
      params.paydunyaPublicKey ||
      params.paydunyaPrivateKey ||
      params.paydunyaToken
    ) {
      db.prepare(
        `UPDATE restaurants
         SET paydunya_public_key = COALESCE(NULLIF(?, ''), paydunya_public_key),
             paydunya_private_key = COALESCE(NULLIF(?, ''), paydunya_private_key),
             paydunya_token = COALESCE(NULLIF(?, ''), paydunya_token)
         WHERE id = ?`,
      ).run(
        params.paydunyaPublicKey || '',
        params.paydunyaPrivateKey || '',
        params.paydunyaToken || '',
        rid,
      );
    }
  },

  findTicketsForRestaurant(rid: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, subject, category, priority, status, created_at as createdAt
         FROM support_tickets WHERE restaurant_id = ? ORDER BY created_at DESC`,
      )
      .all(rid);
  },

  createSupportTicket(params: {
    rid: string;
    email: string;
    fullName: string;
    role: string;
    subject: string;
    category: string;
    priority: string;
    message: string;
  }) {
    const db = getDb();
    const id = generateId('tkt');
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO support_tickets (id, restaurant_id, created_by_email, subject, category, priority, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?)`,
    ).run(
      id,
      params.rid,
      params.email,
      params.subject,
      params.category,
      params.priority,
      now,
    );
    db.prepare(
      `INSERT INTO ticket_messages (id, ticket_id, author, role, body, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(generateId('tmsg'), id, params.fullName, params.role, params.message, now);
    return id;
  },
};
