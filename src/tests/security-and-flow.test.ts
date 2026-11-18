import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getDb, setTestDb } from '../server/db.ts';
import { createExpressApp } from '../server/app.ts';
import {
  assertSameTenant,
  createKnexInstance,
  forTenant,
  runKnexMigrations,
} from '../server/knex.ts';
import { BaseRepository } from '../server/repositories/BaseRepository.ts';
import { BaseService } from '../server/services/BaseService.ts';
import knexConfig from '../server/db/knexfile.ts';

let server: http.Server;
let baseUrl: string;

async function req(
  path: string,
  options: { method?: string; token?: string; body?: unknown } = {},
) {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

test.before(async () => {
  // Use an isolated in-memory database so production/dev data is never touched
  const db = getDb(':memory:');
  setTestDb(db);

  const app = createExpressApp();
  server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const addr = server.address() as { port: number };
  baseUrl = `http://127.0.0.1:${addr.port}`;
});

test.after(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('1. Registration, Owner login, and Multi-tenant isolation', async () => {
  // Register a brand new restaurant
  const reg = await req('/api/auth/register-restaurant', {
    method: 'POST',
    body: {
      restaurantName: 'Maquis Test Lagune',
      city: 'Abidjan',
      ownerName: 'Tester Owner',
      email: 'owner.test@maquis.ci',
      phone: '+225 07 00 00 99 99',
      password: 'Password123!',
      planCode: 'PROFESSIONNEL',
    },
  });
  assert.equal(reg.status, 201);
  assert.ok(reg.data.token);
  const newOwnerToken = reg.data.token as string;

  // Login as Restaurant 1 Owner (seeded)
  const login1 = await req('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'proprietaire@lesillage.ci',
      password: 'RestoMax2026!',
    },
  });
  assert.equal(login1.status, 200);
  const r1Token = login1.data.token as string;

  // Cross-tenant isolation check: newOwnerToken must NOT see Le Sillage's items or orders
  const menuNew = await req('/api/restaurant/menu', { token: newOwnerToken });
  assert.equal(menuNew.status, 200);
  assert.equal(menuNew.data.items.length, 0);

  // Attempting to patch a Restaurant 1 item from Restaurant 2 token must fail with 404
  const crossPatch = await req('/api/restaurant/menu/items/itm_capitaine', {
    method: 'PATCH',
    token: newOwnerToken,
    body: { priceXof: 100 },
  });
  assert.equal(crossPatch.status, 404);

  // Attempting to pay Restaurant 1 order from Restaurant 2 token must fail with 404
  const crossPay = await req('/api/restaurant/orders/ord_live_1/pay', {
    method: 'POST',
    token: newOwnerToken,
    body: { amountXof: 1000, method: 'CASH' },
  });
  assert.equal(crossPay.status, 404);

  // R1 Owner can read R1 menu
  const menuR1 = await req('/api/restaurant/menu', { token: r1Token });
  assert.equal(menuR1.status, 200);
  assert.ok(menuR1.data.items.length >= 5);
});

test('2. RBAC bypass prevention & server-side pricing', async () => {
  // Login as Kitchen/Bar user
  const loginKds = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'cuisine@lesillage.ci', password: 'RestoMax2026!' },
  });
  assert.equal(loginKds.status, 200);
  const kdsToken = loginKds.data.token as string;

  // Kitchen cannot read finance or access superadmin or pay orders
  const fin = await req('/api/restaurant/finance', { token: kdsToken });
  assert.equal(fin.status, 403);

  const sa = await req('/api/superadmin/dashboard', { token: kdsToken });
  assert.equal(sa.status, 403);

  const payTry = await req('/api/restaurant/orders/ord_live_1/pay', {
    method: 'POST',
    token: kdsToken,
    body: { amountXof: 1000, method: 'CASH' },
  });
  assert.equal(payTry.status, 403);

  // Server-side pricing check via Cashier POS order (attempting to send fake total/price)
  const loginCashier = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'caisse@lesillage.ci', password: 'RestoMax2026!' },
  });
  const cashierToken = loginCashier.data.token as string;

  const orderRes = await req('/api/restaurant/orders', {
    method: 'POST',
    token: cashierToken,
    body: {
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: 'itm_capitaine', quantity: 2, priceXof: 1 }],
    },
  });
  assert.equal(orderRes.status, 201);
  // 2 * 12500 FCFA = 25000 FCFA (fake client priceXof=1 is ignored!)
  assert.equal(orderRes.data.order.totalXof, 25000);
});

test('3. Payment double-charge & double-refund prevention', async () => {
  const loginCashier = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'caisse@lesillage.ci', password: 'RestoMax2026!' },
  });
  const cashierToken = loginCashier.data.token as string;

  const loginOwner = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'proprietaire@lesillage.ci', password: 'RestoMax2026!' },
  });
  const ownerToken = loginOwner.data.token as string;

  // Create order of 3000 FCFA (Bissap)
  const ord = await req('/api/restaurant/orders', {
    method: 'POST',
    token: cashierToken,
    body: {
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: 'itm_bissap', quantity: 1 }],
    },
  });
  assert.equal(ord.status, 201);
  const orderId = ord.data.order.id as string;

  // Pay 3000 FCFA
  const pay1 = await req(`/api/restaurant/orders/${orderId}/pay`, {
    method: 'POST',
    token: cashierToken,
    body: { amountXof: 3000, method: 'WAVE' },
  });
  assert.equal(pay1.status, 201);
  const paymentId = pay1.data.payment.id as string;

  // Attempt second payment on already paid order -> 409 Conflict
  const pay2 = await req(`/api/restaurant/orders/${orderId}/pay`, {
    method: 'POST',
    token: cashierToken,
    body: { amountXof: 3000, method: 'CASH' },
  });
  assert.equal(pay2.status, 409);

  // Refund once -> 200 OK
  const ref1 = await req(`/api/restaurant/payments/${paymentId}/refund`, {
    method: 'POST',
    token: ownerToken,
  });
  assert.equal(ref1.status, 200);

  // Attempt double refund -> 409 Conflict
  const ref2 = await req(`/api/restaurant/payments/${paymentId}/refund`, {
    method: 'POST',
    token: ownerToken,
  });
  assert.equal(ref2.status, 409);
});

test('4. QR Ordering, QR Revocation & Stock movement', async () => {
  const loginOwner = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'proprietaire@lesillage.ci', password: 'RestoMax2026!' },
  });
  const ownerToken = loginOwner.data.token as string;

  // Load QR Table 02
  const qrGet = await req('/api/public/qr/sillage-table-02-v1');
  assert.equal(qrGet.status, 200);
  const sessionId = qrGet.data.sessionId as string;

  // Submit QR order
  const qrOrd = await req('/api/public/qr/sillage-table-02-v1/orders', {
    method: 'POST',
    body: {
      sessionId,
      customerName: 'Convive QR',
      items: [{ menuItemId: 'itm_bissap', quantity: 2 }],
    },
  });
  assert.equal(qrOrd.status, 201);
  assert.equal(qrOrd.data.order.totalXof, 6000);

  // Regenerate QR code for tbl_2 -> old token must be revoked (410)
  const regen = await req('/api/restaurant/tables/tbl_2/qr-regenerate', {
    method: 'POST',
    token: ownerToken,
  });
  assert.equal(regen.status, 200);
  const newToken = regen.data.token as string;

  const oldQrCheck = await req('/api/public/qr/sillage-table-02-v1');
  assert.equal(oldQrCheck.status, 410);

  const newQrCheck = await req(`/api/public/qr/${newToken}`);
  assert.equal(newQrCheck.status, 200);

  // Stock movement
  const stkMove = await req('/api/restaurant/stocks/stk_1/move', {
    method: 'POST',
    token: ownerToken,
    body: { movementType: 'IN', quantity: 10, reason: 'Livraison port' },
  });
  assert.equal(stkMove.status, 200);
  assert.equal(stkMove.data.quantity, 14.5);
});

test('5. Session revocation & Restaurant suspension block old tokens', async () => {
  const loginSa = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'superadmin@restomax.ci', password: 'RestoMax2026!' },
  });
  assert.equal(loginSa.status, 200);
  const saToken = loginSa.data.token as string;

  const loginR2 = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'proprietaire@terrasse.ci', password: 'RestoMax2026!' },
  });
  assert.equal(loginR2.status, 200);
  const r2Token = loginR2.data.token as string;

  // Super-admin suspends Restaurant 2 -> existing JWT token must immediately fail (401/403)!
  const susp = await req('/api/superadmin/restaurants/rest_plateau_02/status', {
    method: 'PATCH',
    token: saToken,
    body: { status: 'SUSPENDED', reason: 'Test suspension' },
  });
  assert.equal(susp.status, 200);

  const r2Blocked = await req('/api/restaurant/menu', { token: r2Token });
  assert.ok(r2Blocked.status === 401 || r2Blocked.status === 403);

  // Logout revokes session immediately
  const logoutSa = await req('/api/auth/logout', {
    method: 'POST',
    token: saToken,
  });
  assert.equal(logoutSa.status, 200);

  const saAfterLogout = await req('/api/superadmin/dashboard', {
    token: saToken,
  });
  assert.equal(saAfterLogout.status, 401);
});

test('6. Knex migration (tenants & users) + better-sqlite3 multi-tenant isolation', async () => {
  assert.equal(knexConfig.development.client, 'sqlite3');
  assert.equal(knexConfig.development.pool?.min, 1);
  assert.equal(knexConfig.development.pool?.max, 5);
  assert.equal(knexConfig.test.pool?.max, 1);

  const kx = createKnexInstance(':memory:');
  try {
    const fkPragma = await kx.raw('PRAGMA foreign_keys;');
    assert.equal(fkPragma[0].foreign_keys, 1);

    await runKnexMigrations(kx);

    const hasTenants = await kx.schema.hasTable('tenants');
    const hasUsers = await kx.schema.hasTable('users');
    const hasTenantIdCol = await kx.schema.hasColumn('users', 'tenant_id');
    const hasRoleCol = await kx.schema.hasColumn('users', 'role');
    const hasGlobalRoleCol = await kx.schema.hasColumn('users', 'global_role');
    const hasPermsCol = await kx.schema.hasColumn('users', 'permissions_json');
    const hasTokenVersionCol = await kx.schema.hasColumn('users', 'token_version');
    const hasLastLoginCol = await kx.schema.hasColumn('users', 'last_login_at');
    const hasUpdatedAtCol = await kx.schema.hasColumn('users', 'updated_at');

    assert.equal(hasTenants, true);
    assert.equal(hasUsers, true);
    assert.equal(hasTenantIdCol, true);
    assert.equal(hasRoleCol, true);
    assert.equal(hasGlobalRoleCol, true);
    assert.equal(hasPermsCol, true);
    assert.equal(hasTokenVersionCol, true);
    assert.equal(hasLastLoginCol, true);
    assert.equal(hasUpdatedAtCol, true);

    const now = new Date().toISOString();
    await kx('tenants').insert([
      {
        id: 't_alpha',
        name: 'Restaurant Alpha',
        slug: 'restaurant-alpha',
        email: 'alpha@restomax.ci',
        created_at: now,
      },
      {
        id: 't_beta',
        name: 'Restaurant Beta',
        slug: 'restaurant-beta',
        email: 'beta@restomax.ci',
        created_at: now,
      },
    ]);

    await kx('users').insert([
      {
        id: 'u_alpha_1',
        tenant_id: 't_alpha',
        email: 'chef@alpha.ci',
        password_hash: 'hash',
        full_name: 'Chef Alpha',
        role: 'OWNER',
        permissions_json: JSON.stringify(['*']),
        created_at: now,
      },
      {
        id: 'u_alpha_2',
        tenant_id: 't_alpha',
        email: 'caisse@alpha.ci',
        password_hash: 'hash',
        full_name: 'Caissier Alpha',
        role: 'CASHIER',
        permissions_json: JSON.stringify(['pos:read', 'pos:write']),
        created_at: now,
      },
      {
        id: 'u_beta_1',
        tenant_id: 't_beta',
        email: 'chef@beta.ci',
        password_hash: 'hash',
        full_name: 'Chef Beta',
        role: 'MANAGER',
        permissions_json: '[]',
        created_at: now,
      },
    ]);

    // Single-row insert omitting defaults should populate RBAC & auth defaults cleanly
    await kx('users').insert({
      id: 'u_beta_2',
      tenant_id: 't_beta',
      email: 'serveur@beta.ci',
      password_hash: 'hash',
      full_name: 'Serveur Beta',
      role: 'WAITER',
      created_at: now,
    });
    const waiterBeta = await kx('users').where({ id: 'u_beta_2', tenant_id: 't_beta' }).first();
    assert.equal(waiterBeta.permissions_json, '[]');
    assert.equal(waiterBeta.status, 'ACTIVE');
    assert.equal(waiterBeta.token_version, 1);
    assert.equal(waiterBeta.global_role, 'USER');

    // Multi-tenant scoped query must only return users of the specified tenant
    const alphaUsers = await forTenant('users', 't_alpha', 'tenant_id', kx);
    assert.equal(alphaUsers.length, 2);
    const alphaOwner = alphaUsers.find((u: Record<string, unknown>) => u.id === 'u_alpha_1');
    const alphaCashier = alphaUsers.find((u: Record<string, unknown>) => u.id === 'u_alpha_2');
    assert.equal(alphaOwner?.role, 'OWNER');
    assert.equal(alphaCashier?.role, 'CASHIER');
    assert.equal(alphaOwner?.token_version, 1);

    // Missing tenantId must fail fast with 403
    assert.throws(() => forTenant('users', '', 'tenant_id', kx), /tenant/i);
    assert.throws(() => assertSameTenant('t_alpha', 't_beta'), /inter-tenant/i);

    // Foreign key constraint rejects unknown tenant_id
    await assert.rejects(
      kx('users').insert({
        id: 'u_orphan',
        tenant_id: 't_inexistant',
        email: 'orphan@test.ci',
        password_hash: 'hash',
        full_name: 'Orphan',
        role: 'WAITER',
        created_at: now,
      }),
    );

    // CHECK constraint rejects non-SUPER_ADMIN user without tenant_id
    await assert.rejects(
      kx('users').insert({
        id: 'u_no_tenant',
        tenant_id: null,
        email: 'notenant@test.ci',
        password_hash: 'hash',
        full_name: 'No Tenant',
        role: 'OWNER',
        global_role: 'USER',
        created_at: now,
      }),
    );

    // CHECK constraint rejects invalid RBAC role
    await assert.rejects(
      kx('users').insert({
        id: 'u_bad_role',
        tenant_id: 't_alpha',
        email: 'badrole@alpha.ci',
        password_hash: 'hash',
        full_name: 'Bad Role',
        role: 'HACKER',
        created_at: now,
      }),
    );

    // CHECK constraint rejects invalid user status
    await assert.rejects(
      kx('users').insert({
        id: 'u_bad_status',
        tenant_id: 't_alpha',
        email: 'badstatus@alpha.ci',
        password_hash: 'hash',
        full_name: 'Bad Status',
        role: 'WAITER',
        status: 'INVALID_STATUS',
        created_at: now,
      }),
    );
  } finally {
    await kx.destroy();
  }
});

test('7. BaseRepository & BaseService default multi-tenant isolation', () => {
  class CustomerScopedRepo extends BaseRepository {}
  class CustomerScopedService extends BaseService<CustomerScopedRepo> {}

  const repo = new CustomerScopedRepo({
    tableName: 'customers',
    tenantColumn: 'restaurant_id',
  });
  const service = new CustomerScopedService(repo);

  // Missing tenant context must fail with 403
  assert.throws(() => repo.findAllByTenant(''), /tenant/i);
  assert.throws(() => service.requireTenantContext(undefined), /multi-tenant/i);

  // Insert strictly scoped to rest_sillage_01 even if caller omits/spoofs restaurant_id
  const custId = 'cust_iso_test_1';
  repo.insertForTenant('rest_sillage_01', {
    id: custId,
    restaurant_id: 'rest_plateau_02', // Attempted spoof must be overridden!
    full_name: 'Client Isolé',
    phone: '+225 07 11 22 33 44',
    email: 'isole@test.ci',
    loyalty_points: 10,
    total_spent_xof: 5000,
    visits_count: 1,
    preferences: '',
    created_at: new Date().toISOString(),
  });

  // Visible to rest_sillage_01, invisible and unmodifiable to rest_plateau_02
  const foundR1 = repo.findByIdAndTenant(custId, 'rest_sillage_01');
  assert.ok(foundR1);
  assert.equal(foundR1.restaurant_id, 'rest_sillage_01');

  const foundR2 = repo.findByIdAndTenant(custId, 'rest_plateau_02');
  assert.equal(foundR2, undefined);

  const crossUpdated = repo.updateByIdAndTenant(custId, 'rest_plateau_02', {
    full_name: 'Hacked',
  });
  assert.equal(crossUpdated, 0);

  const crossDeleted = repo.deleteByIdAndTenant(custId, 'rest_plateau_02');
  assert.equal(crossDeleted, 0);

  // Clean up from owning tenant
  const ownDeleted = repo.deleteByIdAndTenant(custId, 'rest_sillage_01');
  assert.equal(ownDeleted, 1);
});
