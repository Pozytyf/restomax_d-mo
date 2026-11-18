import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getDb, setTestDb } from '../server/db.ts';
import { createExpressApp } from '../server/app.ts';

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
