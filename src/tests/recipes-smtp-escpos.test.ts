import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { getDb, setTestDb } from '../server/db.ts';
import { createExpressApp } from '../server/app.ts';
import { buildPostgresKnexConfig } from '../server/db/knexfile.ts';
import {
  buildEscPosKitchenPayload,
  buildEscPosReceiptPayload,
} from '../shared/escpos.ts';
import {
  INSTANCE_ID,
  broadcastToRoom,
  handleIncomingClusterEnvelope,
  registerClusterPublisher,
  type ClusterEnvelope,
} from '../server/ws.ts';

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
  registerClusterPublisher(null);
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test('1. Recipe CRUD updates costPriceXof and auto-deducts stock on POS & QR orders + triggers alert', async () => {
  const loginOwner = await req('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'proprietaire@lesillage.ci',
      password: 'RestoMax2026!',
    },
  });
  assert.equal(loginOwner.status, 200);
  const ownerToken = loginOwner.data.token as string;

  // Replace recipe on itm_kedjenou with stk_3 (Poulet fermier: qty 18, threshold 12, unitCost 2800)
  // Using 4 units per portion -> food cost = 4 * 2800 = 11200 FCFA
  const recipeUpdate = await req('/api/restaurant/menu/items/itm_kedjenou/recipe', {
    method: 'PUT',
    token: ownerToken,
    body: {
      lines: [{ stockId: 'stk_3', quantityPerUnit: 4 }],
    },
  });
  assert.equal(recipeUpdate.status, 200);
  assert.equal(recipeUpdate.data.recipes.length, 1);
  assert.equal(recipeUpdate.data.recipes[0].stockId, 'stk_3');

  // Verify menu item costPriceXof was recalculated
  const menuRes = await req('/api/restaurant/menu', { token: ownerToken });
  assert.equal(menuRes.status, 200);
  const kedjenou = (menuRes.data.items as Array<{ id: string; costPriceXof: number; recipeLines: unknown[] }>).find(
    (i) => i.id === 'itm_kedjenou',
  );
  assert.ok(kedjenou);
  assert.equal(kedjenou.costPriceXof, 11200);
  assert.equal(kedjenou.recipeLines.length, 1);

  // Place a POS order for 1 Kedjenou -> deducts 4 from stk_3 (18 -> 14, still > 12)
  const posOrd = await req('/api/restaurant/orders', {
    method: 'POST',
    token: ownerToken,
    body: {
      orderType: 'TAKEAWAY',
      items: [{ menuItemId: 'itm_kedjenou', quantity: 1 }],
    },
  });
  assert.equal(posOrd.status, 201);

  const stocksAfterPos = await req('/api/restaurant/stocks', { token: ownerToken });
  const stk3AfterPos = (stocksAfterPos.data.stocks as Array<{ id: string; quantity: number; usedInRecipesCount: number }>).find(
    (s) => s.id === 'stk_3',
  );
  assert.ok(stk3AfterPos);
  assert.equal(stk3AfterPos.quantity, 14);
  assert.ok(stk3AfterPos.usedInRecipesCount >= 1);

  const autoMoves = (stocksAfterPos.data.movements as Array<{ movementType: string; quantityDelta: number }>).filter(
    (m) => m.movementType === 'AUTO_ORDER',
  );
  assert.ok(autoMoves.length >= 1);

  // Place a QR order for 1 Kedjenou -> deducts another 4 from stk_3 (14 -> 10 <= 12 threshold -> triggers alert!)
  const qrRes = await req('/api/public/qr/sillage-table-02-v1');
  assert.equal(qrRes.status, 200);
  const qrOrder = await req('/api/public/qr/sillage-table-02-v1/orders', {
    method: 'POST',
    body: {
      sessionId: qrRes.data.sessionId,
      customerName: 'Test Recipe QR',
      items: [{ menuItemId: 'itm_kedjenou', quantity: 1 }],
    },
  });
  assert.equal(qrOrder.status, 201);

  const stocksAfterQr = await req('/api/restaurant/stocks', { token: ownerToken });
  const stk3AfterQr = (stocksAfterQr.data.stocks as Array<{ id: string; quantity: number }>).find(
    (s) => s.id === 'stk_3',
  );
  assert.equal(stk3AfterQr?.quantity, 10);

  // Check notification alert generated for stk_3 crossing critical threshold
  const notifs = await req('/api/restaurant/notifications', { token: ownerToken });
  assert.equal(notifs.status, 200);
  const criticalNotif = (notifs.data.notifications as Array<{ stockId: string; title: string }>).find(
    (n) => n.stockId === 'stk_3',
  );
  assert.ok(criticalNotif);
});

test('2. SMTP alert configuration masks password and handles unconfigured test-email cleanly', async () => {
  const loginOwner = await req('/api/auth/login', {
    method: 'POST',
    body: {
      email: 'proprietaire@lesillage.ci',
      password: 'RestoMax2026!',
    },
  });
  const ownerToken = loginOwner.data.token as string;

  // Save SMTP config with a secret password
  const patchRes = await req('/api/restaurant/stocks/alerts/config', {
    method: 'PATCH',
    token: ownerToken,
    body: {
      inAppEnabled: true,
      emailEnabled: true,
      recipientEmails: 'alerts@lesillage.ci',
      smtpHost: 'smtp.example.invalid',
      smtpPort: 587,
      smtpSecure: false,
      smtpUser: 'mailer@lesillage.ci',
      smtpPass: 'SuperSecretSmtp123!',
      smtpFrom: 'RestoMAX <alerts@lesillage.ci>',
    },
  });
  assert.equal(patchRes.status, 200);
  assert.equal(patchRes.data.settings.smtpPassConfigured, true);
  assert.equal(patchRes.data.settings.smtpHost, 'smtp.example.invalid');
  assert.equal('smtpPass' in patchRes.data.settings, false);

  // Clear host so test-email safely returns QUEUED_NO_SMTP without external network dependency
  await req('/api/restaurant/stocks/alerts/config', {
    method: 'PATCH',
    token: ownerToken,
    body: {
      smtpHost: '',
      smtpUser: '',
      smtpFrom: '',
    },
  });

  const testMail = await req('/api/restaurant/stocks/alerts/test-email', {
    method: 'POST',
    token: ownerToken,
  });
  assert.equal(testMail.status, 200);
  assert.equal(testMail.data.dispatched, false);
  assert.equal(testMail.data.status, 'QUEUED_NO_SMTP');
});

test('3. ESC/POS thermal receipt & kitchen ticket formatting + /api/restaurant/print/escpos', async () => {
  const receipt58 = buildEscPosReceiptPayload({
    paperWidth: '58mm',
    restaurantName: 'Le Sillage Lagune',
    restaurantCity: 'Abidjan',
    orderNumber: 'CMD-8888',
    tableLabel: 'Table 01',
    customerName: 'Kouadio',
    paymentMethod: 'Wave',
    paymentReference: 'WAVE-001',
    paidAmountXof: 12500,
    totalXof: 12500,
    items: [{ name: 'Capitaine grille & Attieke', quantity: 1, lineTotalXof: 12500 }],
  });
  assert.ok(receipt58.previewText.includes('CMD-8888'));
  assert.ok(receipt58.previewText.includes('12 500 FCFA'));
  // Starts with ESC @ (0x1b 0x40) and ends with GS V 66 0 (partial cut)
  assert.equal(receipt58.bytes[0], 0x1b);
  assert.equal(receipt58.bytes[1], 0x40);
  const len = receipt58.bytes.length;
  assert.equal(receipt58.bytes[len - 4], 0x1d);
  assert.equal(receipt58.bytes[len - 3], 0x56);

  const kitchen80 = buildEscPosKitchenPayload({
    paperWidth: '80mm',
    restaurantName: 'Le Sillage Lagune',
    stationLabel: 'Cuisine',
    orderNumber: 'CMD-8888',
    tableLabel: 'Table 01',
    notes: 'Peu pimente',
    items: [{ name: 'Poulet braise', quantity: 2 }],
  });
  assert.ok(kitchen80.previewText.includes('BON CUISINE'));
  assert.ok(kitchen80.previewText.includes('2 x Poulet braise'));
  assert.ok(kitchen80.previewText.includes('Peu pimente'));

  const loginCashier = await req('/api/auth/login', {
    method: 'POST',
    body: { email: 'caisse@lesillage.ci', password: 'RestoMax2026!' },
  });
  const cashierToken = loginCashier.data.token as string;

  const printRes = await req('/api/restaurant/print/escpos', {
    method: 'POST',
    token: cashierToken,
    body: {
      kind: 'RECEIPT',
      orderNumber: 'CMD-8888',
      totalXof: 12500,
      paidAmountXof: 12500,
      paymentMethod: 'Wave',
      items: [{ name: 'Capitaine grillé', quantity: 1, lineTotalXof: 12500 }],
    },
  });
  assert.equal(printRes.status, 200);
  assert.equal(printRes.data.mode, 'BROWSER');
  assert.ok(typeof printRes.data.previewText === 'string');
  assert.ok(printRes.data.previewText.includes('CMD-8888'));
});

test('4. PostgreSQL Knex config builder, WebSocket cluster pub/sub hooks & /api/health', async () => {
  const pgConfig = buildPostgresKnexConfig('postgres://user:pass@db.internal:5432/restomax');
  assert.equal(pgConfig.client, 'pg');
  assert.ok(pgConfig.pool && (pgConfig.pool.max as number) >= 2);

  const published: ClusterEnvelope[] = [];
  registerClusterPublisher((env) => {
    published.push(env);
  });

  broadcastToRoom('restaurant:rest_sillage_01', 'stock:updated', { stockId: 'stk_1' });
  assert.equal(published.length, 1);
  assert.equal(published[0].originInstanceId, INSTANCE_ID);
  assert.equal(published[0].room, 'restaurant:rest_sillage_01');
  assert.equal(published[0].event, 'stock:updated');

  // Calling handleIncomingClusterEnvelope with our own origin or remote origin should not throw
  assert.doesNotThrow(() => handleIncomingClusterEnvelope(published[0]));
  assert.doesNotThrow(() =>
    handleIncomingClusterEnvelope({
      originInstanceId: 'remote-node-2',
      room: 'restaurant:rest_sillage_01',
      event: 'order:updated',
      payload: { orderId: 'ord_1' },
      timestamp: new Date().toISOString(),
    }),
  );

  const health = await req('/api/health');
  assert.equal(health.status, 200);
  assert.equal(health.data.status, 'ok');
  assert.equal(health.data.pubsubMode, 'CLUSTER_PUBSUB');
  assert.equal(health.data.instanceId, INSTANCE_ID);
});
