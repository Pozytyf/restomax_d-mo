import { getDb, generateId } from '../db.ts';
import { BaseRepository } from './BaseRepository.ts';

export class SuperadminRepository extends BaseRepository {
  constructor() {
    super({ tableName: 'tenants', tenantColumn: 'id' });
  }

  getPlatformDashboardData() {
    const db = getDb();
    const counts = db
      .prepare(
        `SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END) as active,
          SUM(CASE WHEN status = 'TRIAL' THEN 1 ELSE 0 END) as trial,
          SUM(CASE WHEN status = 'SUSPENDED' THEN 1 ELSE 0 END) as suspended
         FROM restaurants WHERE deleted_at IS NULL`,
      )
      .get() as {
      total: number;
      active: number;
      trial: number;
      suspended: number;
    };

    const activeSubs = db
      .prepare(
        `SELECT COUNT(*) as c FROM subscriptions WHERE status IN ('ACTIVE', 'TRIAL')`,
      )
      .get() as { c: number };

    const platformRev = db
      .prepare(
        `SELECT
          COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount_xof ELSE 0 END), 0) as paid_xof,
          COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount_xof ELSE 0 END), 0) as pending_xof
         FROM platform_invoices`,
      )
      .get() as { paid_xof: number; pending_xof: number };

    const openTickets = db
      .prepare(
        `SELECT COUNT(*) as c FROM support_tickets WHERE status IN ('OPEN', 'IN_PROGRESS')`,
      )
      .get() as { c: number };

    const usersCount = db
      .prepare(`SELECT COUNT(*) as c FROM users WHERE status = 'ACTIVE'`)
      .get() as { c: number };

    const leadsCount = db
      .prepare(`SELECT COUNT(*) as c FROM contact_leads`)
      .get() as { c: number };

    const recentRestaurants = db
      .prepare(
        `SELECT r.id, r.name, r.city, r.status, r.created_at as createdAt,
                p.name as planName, s.status as subscriptionStatus
         FROM restaurants r
         LEFT JOIN subscriptions s ON s.restaurant_id = r.id
         LEFT JOIN plans p ON p.id = s.plan_id
         WHERE r.deleted_at IS NULL
         ORDER BY r.created_at DESC
         LIMIT 6`,
      )
      .all();

    const recentAudit = db
      .prepare(
        `SELECT id, actor_email as actorEmail, actor_role as actorRole,
                action, target_type as targetType, details, created_at as createdAt
         FROM audit_logs ORDER BY created_at DESC LIMIT 8`,
      )
      .all();

    const monthlyPlatformSeries = db
      .prepare(
        `SELECT substr(created_at, 1, 7) as month,
                COALESCE(SUM(amount_xof), 0) as revenue_xof,
                COUNT(*) as invoices
         FROM platform_invoices
         WHERE status = 'PAID'
         GROUP BY substr(created_at, 1, 7)
         ORDER BY month ASC`,
      )
      .all();

    return {
      counts,
      activeSubs,
      platformRev,
      openTickets,
      usersCount,
      leadsCount,
      recentRestaurants,
      recentAudit,
      monthlyPlatformSeries,
    };
  }

  findAllRestaurants() {
    const db = getDb();
    return db
      .prepare(
        `SELECT r.id, r.name, r.slug, r.email, r.phone, r.city, r.country, r.status,
                r.paydunya_mode as paydunyaMode, r.created_at as createdAt, r.deleted_at as deletedAt,
                p.name as planName, s.status as subscriptionStatus,
                (SELECT u.full_name FROM restaurant_members rm JOIN users u ON u.id = rm.user_id WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER' LIMIT 1) as ownerName,
                (SELECT u.email FROM restaurant_members rm JOIN users u ON u.id = rm.user_id WHERE rm.restaurant_id = r.id AND rm.role = 'OWNER' LIMIT 1) as ownerEmail,
                (SELECT COUNT(*) FROM orders o WHERE o.restaurant_id = r.id) as ordersCount
         FROM restaurants r
         LEFT JOIN subscriptions s ON s.restaurant_id = r.id
         LEFT JOIN plans p ON p.id = s.plan_id
         ORDER BY r.created_at DESC`,
      )
      .all();
  }

  findUserByEmail(email: string) {
    const db = getDb();
    return db
      .prepare('SELECT id FROM users WHERE lower(email) = lower(?)')
      .get(email);
  }

  findPlanByCodeOrDefault(planCode: string) {
    const db = getDb();
    return (
      (db
        .prepare('SELECT id, trial_days FROM plans WHERE code = ?')
        .get(planCode) as { id: string; trial_days: number } | undefined) ||
      (db.prepare('SELECT id, trial_days FROM plans LIMIT 1').get() as {
        id: string;
        trial_days: number;
      })
    );
  }

  createRestaurantAdmin(params: {
    rid: string;
    uid: string;
    name: string;
    slug: string;
    cleanEmail: string;
    phone: string;
    city: string;
    ownerName: string;
    passwordHash: string;
    planId: string;
    now: string;
    periodEnd: string;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO restaurants (id, name, slug, email, phone, city, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE', ?)`,
    ).run(
      params.rid,
      params.name,
      params.slug,
      params.cleanEmail,
      params.phone,
      params.city,
      params.now,
    );

    db.prepare(
      `INSERT INTO users (id, tenant_id, email, password_hash, full_name, phone, role, global_role, permissions_json, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'OWNER', 'USER', '[]', 'ACTIVE', ?)`,
    ).run(
      params.uid,
      params.rid,
      params.cleanEmail,
      params.passwordHash,
      params.ownerName,
      params.phone,
      params.now,
    );

    db.prepare(
      `INSERT INTO restaurant_members (id, restaurant_id, user_id, role, custom_permissions_json, status, created_at)
       VALUES (?, ?, ?, 'OWNER', '[]', 'ACTIVE', ?)`,
    ).run(generateId('mem'), params.rid, params.uid, params.now);

    db.prepare(
      `INSERT INTO subscriptions (id, restaurant_id, plan_id, billing_cycle, status, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, 'MONTHLY', 'ACTIVE', ?, ?, ?)`,
    ).run(
      generateId('sub'),
      params.rid,
      params.planId,
      params.now,
      params.periodEnd,
      params.now,
    );
  }

  updateRestaurantStatus(rid: string, status: string) {
    const db = getDb();
    const now = new Date().toISOString();
    if (status === 'DELETED') {
      db.prepare(
        `UPDATE restaurants SET status = 'DELETED', deleted_at = ? WHERE id = ?`,
      ).run(now, rid);
    } else {
      db.prepare(
        `UPDATE restaurants SET status = ?, deleted_at = NULL WHERE id = ?`,
      ).run(status, rid);
    }

    if (status === 'SUSPENDED' || status === 'DELETED') {
      db.prepare(
        `UPDATE sessions SET revoked_at = ? WHERE restaurant_id = ? AND revoked_at IS NULL`,
      ).run(now, rid);
    }
  }

  findAllPlans() {
    const db = getDb();
    return db
      .prepare('SELECT * FROM plans ORDER BY price_monthly_xof ASC')
      .all() as Array<Record<string, unknown>>;
  }

  updatePlan(
    planId: string,
    params: {
      name: string | null;
      tagline: string | null;
      priceMonthlyXof: number | null;
      priceYearlyXof: number | null;
      trialDays: number | null;
      maxTables: number | null;
      maxStaff: number | null;
      active: number | null;
    },
  ) {
    const db = getDb();
    db.prepare(
      `UPDATE plans
       SET name = COALESCE(?, name),
           tagline = COALESCE(?, tagline),
           price_monthly_xof = COALESCE(?, price_monthly_xof),
           price_yearly_xof = COALESCE(?, price_yearly_xof),
           trial_days = COALESCE(?, trial_days),
           max_tables = COALESCE(?, max_tables),
           max_staff = COALESCE(?, max_staff),
           active = COALESCE(?, active)
       WHERE id = ?`,
    ).run(
      params.name,
      params.tagline,
      params.priceMonthlyXof,
      params.priceYearlyXof,
      params.trialDays,
      params.maxTables,
      params.maxStaff,
      params.active,
      planId,
    );
  }

  findAllSubscriptions() {
    const db = getDb();
    return db
      .prepare(
        `SELECT s.id, s.restaurant_id as restaurantId, r.name as restaurantName,
                p.name as planName, p.code as planCode, p.price_monthly_xof as priceMonthlyXof,
                s.billing_cycle as billingCycle, s.status,
                s.trial_ends_at as trialEndsAt, s.current_period_end as currentPeriodEnd
         FROM subscriptions s
         JOIN restaurants r ON r.id = s.restaurant_id
         JOIN plans p ON p.id = s.plan_id
         ORDER BY s.created_at DESC`,
      )
      .all();
  }

  findPlatformInvoices() {
    const db = getDb();
    return db
      .prepare(
        `SELECT i.id, i.invoice_number as invoiceNumber, i.restaurant_id as restaurantId,
                r.name as restaurantName, i.amount_xof as amountXof, i.status,
                i.payment_method as paymentMethod, i.mode, i.paid_at as paidAt, i.created_at as createdAt
         FROM platform_invoices i
         JOIN restaurants r ON r.id = i.restaurant_id
         ORDER BY i.created_at DESC`,
      )
      .all();
  }

  markInvoicePaid(invoiceId: string) {
    const db = getDb();
    db.prepare(
      `UPDATE platform_invoices SET status = 'PAID', paid_at = ? WHERE id = ?`,
    ).run(new Date().toISOString(), invoiceId);
  }

  findAllUsers() {
    const db = getDb();
    return db
      .prepare(
        `SELECT u.id, u.email, u.full_name as fullName, u.phone, u.global_role as globalRole,
                u.status, u.created_at as createdAt,
                r.name as restaurantName, rm.role as restaurantRole
         FROM users u
         LEFT JOIN restaurant_members rm ON rm.user_id = u.id
         LEFT JOIN restaurants r ON r.id = rm.restaurant_id
         ORDER BY u.created_at DESC`,
      )
      .all();
  }

  updateUserStatus(userId: string, status: string) {
    const db = getDb();
    db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, userId);
    if (status !== 'ACTIVE') {
      db.prepare(
        'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL',
      ).run(new Date().toISOString(), userId);
    }
  }

  findAllTicketsAndLeads() {
    const db = getDb();
    const tickets = db
      .prepare(
        `SELECT t.id, t.restaurant_id as restaurantId, r.name as restaurantName,
                t.created_by_email as createdByEmail, t.subject, t.category,
                t.priority, t.status, t.created_at as createdAt
         FROM support_tickets t
         LEFT JOIN restaurants r ON r.id = t.restaurant_id
         ORDER BY t.created_at DESC`,
      )
      .all() as Array<Record<string, unknown>>;

    const getMsgs = db.prepare(
      `SELECT id, author, role, body, created_at as createdAt
       FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
    );

    const leads = db
      .prepare('SELECT * FROM contact_leads ORDER BY created_at DESC LIMIT 30')
      .all();

    return {
      tickets: tickets.map((t) => ({ ...t, messages: getMsgs.all(String(t.id)) })),
      leads,
    };
  }

  addTicketReply(ticketId: string, author: string, body?: string, status?: string) {
    const db = getDb();
    const now = new Date().toISOString();
    if (body && body.trim().length > 0) {
      db.prepare(
        `INSERT INTO ticket_messages (id, ticket_id, author, role, body, created_at)
         VALUES (?, ?, ?, 'SUPER_ADMIN', ?, ?)`,
      ).run(generateId('tmsg'), ticketId, author, body.trim(), now);
    }
    if (status && ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].includes(status)) {
      db.prepare('UPDATE support_tickets SET status = ? WHERE id = ?').run(
        status,
        ticketId,
      );
    }
  }

  findAuditLogs() {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, actor_user_id as actorUserId, actor_email as actorEmail, actor_role as actorRole,
                restaurant_id as restaurantId, action, target_type as targetType,
                target_id as targetId, details, created_at as createdAt
         FROM audit_logs ORDER BY created_at DESC LIMIT 100`,
      )
      .all();
  }

  findPlatformSettings() {
    const db = getDb();
    return db
      .prepare('SELECT key, value FROM platform_settings')
      .all() as Array<{ key: string; value: string }>;
  }

  upsertPlatformSettings(entries: Array<[string, string]>) {
    const db = getDb();
    const now = new Date().toISOString();
    const upsert = db.prepare(
      `INSERT INTO platform_settings (key, value, updated_at) VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    );
    for (const [k, v] of entries) {
      upsert.run(k, v, now);
    }
  }
}

export const superadminRepository = new SuperadminRepository();
