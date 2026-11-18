import { getDb, generateId } from '../db.ts';

export const authRepository = {
  findUserByEmail(email: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT id, email, password_hash, full_name, phone, global_role, status
         FROM users WHERE lower(email) = lower(?)`,
      )
      .get(email) as
      | {
          id: string;
          email: string;
          password_hash: string;
          full_name: string;
          phone: string | null;
          global_role: string;
          status: string;
        }
      | undefined;
  },

  findPrimaryMembershipForUser(userId: string) {
    const db = getDb();
    return db
      .prepare(
        `SELECT rm.restaurant_id, rm.role, rm.custom_permissions_json, rm.status as member_status,
                r.name as restaurant_name, r.slug as restaurant_slug, r.status as restaurant_status, r.deleted_at
         FROM restaurant_members rm
         JOIN restaurants r ON r.id = rm.restaurant_id
         WHERE rm.user_id = ?
         ORDER BY rm.created_at ASC
         LIMIT 1`,
      )
      .get(userId) as Record<string, unknown> | undefined;
  },

  createSession(params: {
    sessionId: string;
    userId: string;
    restaurantId: string | null;
    expiresAt: string;
    userAgent: string;
    now: string;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO sessions (id, user_id, restaurant_id, expires_at, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      params.sessionId,
      params.userId,
      params.restaurantId,
      params.expiresAt,
      params.userAgent,
      params.now,
    );
  },

  revokeSession(sessionId: string) {
    const db = getDb();
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(
      new Date().toISOString(),
      sessionId,
    );
  },

  findPlanForRegistration(planCode: string) {
    const db = getDb();
    return (
      (db
        .prepare('SELECT id, trial_days FROM plans WHERE code = ? AND active = 1')
        .get(planCode) as { id: string; trial_days: number } | undefined) ||
      (db
        .prepare('SELECT id, trial_days FROM plans WHERE active = 1 LIMIT 1')
        .get() as { id: string; trial_days: number })
    );
  },

  createRestaurantWithOwnerAndStarterData(params: {
    restaurantId: string;
    restaurantName: string;
    slug: string;
    email: string;
    phone: string;
    city: string;
    userId: string;
    ownerName: string;
    passwordHash: string;
    memberId: string;
    subId: string;
    planId: string;
    trialEndsAt: string;
    sessionId: string;
    sessionExpiresAt: string;
    userAgent: string;
    now: string;
  }) {
    const db = getDb();
    db.prepare(
      `INSERT INTO restaurants (
        id, name, slug, email, phone, city, country, currency, timezone, status, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'Côte d''Ivoire', 'XOF', 'Africa/Abidjan', 'TRIAL', ?)`,
    ).run(
      params.restaurantId,
      params.restaurantName,
      params.slug,
      params.email,
      params.phone,
      params.city,
      params.now,
    );

    db.prepare(
      `INSERT INTO users (id, email, password_hash, full_name, phone, global_role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'USER', 'ACTIVE', ?)`,
    ).run(
      params.userId,
      params.email,
      params.passwordHash,
      params.ownerName,
      params.phone,
      params.now,
    );

    db.prepare(
      `INSERT INTO restaurant_members (id, restaurant_id, user_id, role, custom_permissions_json, status, created_at)
       VALUES (?, ?, ?, 'OWNER', '[]', 'ACTIVE', ?)`,
    ).run(params.memberId, params.restaurantId, params.userId, params.now);

    db.prepare(
      `INSERT INTO subscriptions (id, restaurant_id, plan_id, billing_cycle, status, trial_ends_at, current_period_start, current_period_end, created_at)
       VALUES (?, ?, ?, 'MONTHLY', 'TRIAL', ?, ?, ?, ?)`,
    ).run(
      params.subId,
      params.restaurantId,
      params.planId,
      params.trialEndsAt,
      params.now,
      params.trialEndsAt,
      params.now,
    );

    const catK = generateId('cat');
    const catB = generateId('cat');
    db.prepare(
      `INSERT INTO menu_categories (id, restaurant_id, name, station, sort_order, active)
       VALUES (?, ?, 'Plats Principaux', 'KITCHEN', 1, 1)`,
    ).run(catK, params.restaurantId);
    db.prepare(
      `INSERT INTO menu_categories (id, restaurant_id, name, station, sort_order, active)
       VALUES (?, ?, 'Boissons & Bar', 'BAR', 2, 1)`,
    ).run(catB, params.restaurantId);

    for (let i = 1; i <= 4; i++) {
      const tblId = generateId('tbl');
      db.prepare(
        `INSERT INTO dining_tables (id, restaurant_id, zone, label, capacity, status)
         VALUES (?, ?, 'Salle principale', ?, 4, 'AVAILABLE')`,
      ).run(tblId, params.restaurantId, `Table 0${i}`);
      db.prepare(
        `INSERT INTO qr_codes (id, restaurant_id, table_id, token, version, status, created_at)
         VALUES (?, ?, ?, ?, 1, 'ACTIVE', ?)`,
      ).run(
        generateId('qr'),
        params.restaurantId,
        tblId,
        `${params.slug}-t${i}-v1`,
        params.now,
      );
    }

    db.prepare(
      `INSERT INTO sessions (id, user_id, restaurant_id, expires_at, user_agent, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).run(
      params.sessionId,
      params.userId,
      params.restaurantId,
      params.sessionExpiresAt,
      params.userAgent,
      params.now,
    );
  },

  findUserPasswordHash(userId: string) {
    const db = getDb();
    return db
      .prepare('SELECT password_hash FROM users WHERE id = ?')
      .get(userId) as { password_hash: string } | undefined;
  },

  updateUserPasswordHash(userId: string, passwordHash: string) {
    const db = getDb();
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      passwordHash,
      userId,
    );
  },
};
