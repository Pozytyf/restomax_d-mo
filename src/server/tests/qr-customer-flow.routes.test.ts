import { beforeAll, describe, expect, it } from '@jest/globals';
import http from 'node:http';
import request from 'supertest';
import WebSocket from 'ws';
import { createExpressApp } from '../app.ts';
import { getDb, setTestDb } from '../db.ts';
import { setupWebSocketServer } from '../ws.ts';
import type { Express } from 'express';

describe('Customer QR journey (/api/public/qr & end-to-end table-menu-order-tracking)', () => {
  let app: Express;
  let ownerToken: string;
  let cashierToken: string;
  let kitchenToken: string;

  let createdTableId: string;
  let createdQrToken: string;
  let otherTableQrToken: string;
  let createdCategoryId: string;
  let createdBarCategoryId: string;
  let createdItemId: string;
  let createdBarItemId: string;
  let inactiveCategoryId: string;
  let inactiveCatItemId: string;
  let createdOptionIds: string[] = [];
  let createdBarOptionIds: string[] = [];
  let placedOrderId: string;

  beforeAll(async () => {
    const db = getDb(':memory:');
    setTestDb(db);
    app = createExpressApp();

    const [ownerLogin, cashierLogin, kitchenLogin] = await Promise.all([
      request(app).post('/api/auth/login').send({
        email: 'proprietaire@lesillage.ci',
        password: 'RestoMax2026!',
      }),
      request(app).post('/api/auth/login').send({
        email: 'caisse@lesillage.ci',
        password: 'RestoMax2026!',
      }),
      request(app).post('/api/auth/login').send({
        email: 'cuisine@lesillage.ci',
        password: 'RestoMax2026!',
      }),
    ]);

    ownerToken = ownerLogin.body.token as string;
    cashierToken = cashierLogin.body.token as string;
    kitchenToken = kitchenLogin.body.token as string;
  });

  it('links newly created table, active QR SVG image, and new menu items directly to customer QR menu', async () => {
    // 1. Create two tables
    const tblRes = await request(app)
      .post('/api/restaurant/tables')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ zone: 'VIP Lagune', label: 'Table VIP 09', capacity: 6 });

    expect(tblRes.status).toBe(201);
    createdTableId = tblRes.body.id as string;
    createdQrToken = tblRes.body.qrToken as string;
    expect(createdQrToken).toBeTruthy();

    const tbl2Res = await request(app)
      .post('/api/restaurant/tables')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ zone: 'VIP Lagune', label: 'Table VIP 10', capacity: 4 });
    otherTableQrToken = tbl2Res.body.qrToken as string;

    // 2. Fetch QR SVG image with proxy headers
    const svgRes = await request(app)
      .get(`/api/public/qr-image/${encodeURIComponent(createdQrToken)}`)
      .set('X-Forwarded-Proto', 'https')
      .set('Host', 'restomax.example.ci');

    expect(svgRes.status).toBe(200);
    expect(svgRes.headers['content-type']).toContain('image/svg+xml');
    expect(svgRes.headers['cache-control']).toBe('no-store');
    const svgContent =
      svgRes.text ??
      (Buffer.isBuffer(svgRes.body)
        ? svgRes.body.toString('utf8')
        : String(svgRes.body));
    expect(svgContent).toContain('<svg');

    // 3. Unknown QR SVG returns 404
    const missingSvg = await request(app).get('/api/public/qr-image/unknown-qr-token');
    expect(missingSvg.status).toBe(404);

    // 4. Create active KITCHEN and BAR categories + items with options
    const catRes = await request(app)
      .post('/api/restaurant/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Spécialités Lagune', station: 'KITCHEN' });
    expect(catRes.status).toBe(201);
    createdCategoryId = catRes.body.category.id as string;

    const barCatRes = await request(app)
      .post('/api/restaurant/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Bar Lagune', station: 'BAR' });
    expect(barCatRes.status).toBe(201);
    createdBarCategoryId = barCatRes.body.category.id as string;

    const itemRes = await request(app)
      .post('/api/restaurant/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: createdCategoryId,
        name: 'Mérou Braisé Royal',
        description: 'Accompagné d’attiéké frais et alloco.',
        priceXof: 9500,
        options: [
          { label: 'Double alloco', priceDeltaXof: 1500 },
          { label: 'Sauce piment maison', priceDeltaXof: 0 },
        ],
      });
    expect(itemRes.status).toBe(201);
    createdItemId = itemRes.body.id as string;

    const barItemRes = await request(app)
      .post('/api/restaurant/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: createdBarCategoryId,
        name: 'Cocktail Lagune Passion',
        description: 'Jus de passion pressé, menthe fraîche et citron vert.',
        priceXof: 3500,
        options: [{ label: 'Glaçons pilés', priceDeltaXof: 0 }],
      });
    expect(barItemRes.status).toBe(201);
    createdBarItemId = barItemRes.body.id as string;

    // 5. Create an inactive category item and verify it does NOT leak to QR menu
    const inactiveCatRes = await request(app)
      .post('/api/restaurant/menu/categories')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Carte Privée Archive', station: 'KITCHEN' });
    inactiveCategoryId = inactiveCatRes.body.category.id as string;

    const hiddenItemRes = await request(app)
      .post('/api/restaurant/menu/items')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        categoryId: inactiveCategoryId,
        name: 'Plat Archivé',
        description: 'Ne doit pas apparaître',
        priceXof: 5000,
      });
    inactiveCatItemId = hiddenItemRes.body.id as string;

    getDb()
      .prepare('UPDATE menu_categories SET active = 0 WHERE id = ?')
      .run(inactiveCategoryId);

    // 6. Load QR customer menu context
    const menuRes = await request(app).get(
      `/api/public/qr/${encodeURIComponent(createdQrToken)}`,
    );
    expect(menuRes.status).toBe(200);
    expect(menuRes.body.sessionId).toBeTruthy();
    expect(menuRes.body.table).toMatchObject({
      id: createdTableId,
      label: 'Table VIP 09',
      zone: 'VIP Lagune',
    });

    const catIds = (menuRes.body.categories as Array<{ id: string }>).map((c) => c.id);
    expect(catIds).toContain(createdCategoryId);
    expect(catIds).toContain(createdBarCategoryId);
    expect(catIds).not.toContain(inactiveCategoryId);

    const qrItems = menuRes.body.items as Array<{
      id: string;
      station: string;
      options: Array<{ id: string; label: string; priceDeltaXof: number }>;
    }>;
    const itemIds = qrItems.map((i) => i.id);
    expect(itemIds).toContain(createdItemId);
    expect(itemIds).toContain(createdBarItemId);
    expect(itemIds).not.toContain(inactiveCatItemId);

    const targetItem = qrItems.find((i) => i.id === createdItemId)!;
    const targetBarItem = qrItems.find((i) => i.id === createdBarItemId)!;
    expect(targetItem.station).toBe('KITCHEN');
    expect(targetBarItem.station).toBe('BAR');
    createdOptionIds = targetItem.options.map((o) => o.id);
    createdBarOptionIds = targetBarItem.options.map((o) => o.id);
    expect(createdOptionIds.length).toBe(2);
    expect(createdBarOptionIds.length).toBe(1);
  });

  it('rejects unavailable/inactive-category items and enforces idempotency + server pricing on QR checkout', async () => {
    const qrCtx = await request(app).get(
      `/api/public/qr/${encodeURIComponent(createdQrToken)}`,
    );
    const sessionId = qrCtx.body.sessionId as string;

    // Reject item from inactive category
    const rejectedRes = await request(app)
      .post(`/api/public/qr/${encodeURIComponent(createdQrToken)}/orders`)
      .send({
        sessionId,
        items: [{ menuItemId: inactiveCatItemId, quantity: 1 }],
      });
    expect(rejectedRes.status).toBe(400);

    // Reject invalid quantity (0)
    const badQtyRes = await request(app)
      .post(`/api/public/qr/${encodeURIComponent(createdQrToken)}/orders`)
      .send({
        sessionId,
        items: [{ menuItemId: createdItemId, quantity: 0 }],
      });
    expect(badQtyRes.status).toBe(400);

    // Submit valid order combining KITCHEN + BAR items: (9500 + 1500) * 2 + 3500 * 1 = 25500 FCFA
    const idempotencyKey = `qr-test-idem-${Date.now()}`;
    const orderRes = await request(app)
      .post(`/api/public/qr/${encodeURIComponent(createdQrToken)}/orders`)
      .send({
        sessionId,
        customerName: 'Aïcha Bamba',
        notes: 'Servir chaud',
        idempotencyKey,
        items: [
          {
            menuItemId: createdItemId,
            optionIds: createdOptionIds,
            quantity: 2,
            notes: 'Bien grillé',
          },
          {
            menuItemId: createdBarItemId,
            optionIds: createdBarOptionIds,
            quantity: 1,
            notes: 'Bien frais',
          },
        ],
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.order.totalXof).toBe(25500);
    expect(orderRes.body.order.status).toBe('PENDING');
    placedOrderId = orderRes.body.order.id as string;

    // Retry with same idempotencyKey -> deduplicated (200)
    const retryRes = await request(app)
      .post(`/api/public/qr/${encodeURIComponent(createdQrToken)}/orders`)
      .send({
        sessionId,
        customerName: 'Aïcha Bamba',
        idempotencyKey,
        items: [{ menuItemId: createdItemId, quantity: 2 }],
      });
    expect(retryRes.status).toBe(200);
    expect(retryRes.body.deduplicated).toBe(true);
    expect(retryRes.body.order.id).toBe(placedOrderId);

    // Table status switched to OCCUPIED automatically
    const tablesRes = await request(app)
      .get('/api/restaurant/tables')
      .set('Authorization', `Bearer ${ownerToken}`);
    const tbl = (tablesRes.body.tables as Array<{ id: string; status: string }>).find(
      (t) => t.id === createdTableId,
    );
    expect(tbl?.status).toBe('OCCUPIED');
  });

  it('tracks QR order through kitchen preparation, delivery, and POS payment with live WebSocket updates', async () => {
    // Cannot track from a different table's QR token
    const crossTrack = await request(app).get(
      `/api/public/qr/${encodeURIComponent(otherTableQrToken)}/orders/${encodeURIComponent(placedOrderId)}`,
    );
    expect(crossTrack.status).toBe(404);

    // Initial tracking & dual-station routing (KITCHEN + BAR)
    const track1 = await request(app).get(
      `/api/public/qr/${encodeURIComponent(createdQrToken)}/orders/${encodeURIComponent(placedOrderId)}`,
    );
    expect(track1.status).toBe(200);
    expect(track1.body.order.status).toBe('PENDING');
    expect(track1.body.order.notes).toBe('Servir chaud');
    expect(track1.body.order.items.length).toBe(2);
    const kitchenLine = (track1.body.order.items as Array<Record<string, unknown>>).find(
      (i) => i.station === 'KITCHEN',
    );
    const barLine = (track1.body.order.items as Array<Record<string, unknown>>).find(
      (i) => i.station === 'BAR',
    );
    expect(kitchenLine).toBeTruthy();
    expect(barLine).toBeTruthy();
    expect(kitchenLine?.prep_status).toBe('PENDING');
    expect(barLine?.prep_status).toBe('PENDING');
    expect(kitchenLine?.options_summary).toContain('Double alloco');
    expect(kitchenLine?.notes).toBe('Bien grillé');

    // Verify order appears in Restaurant Orders/KDS API with both KITCHEN and BAR lines
    const kdsOrdersRes = await request(app)
      .get('/api/restaurant/orders')
      .set('Authorization', `Bearer ${kitchenToken}`);
    expect(kdsOrdersRes.status).toBe(200);
    const kdsOrder = (
      kdsOrdersRes.body.orders as Array<{
        id: string;
        items: Array<{ station: string; name: string }>;
      }>
    ).find((o) => o.id === placedOrderId);
    expect(kdsOrder).toBeTruthy();
    expect(kdsOrder?.items.map((i) => i.station).sort()).toEqual(['BAR', 'KITCHEN']);

    // Attach temporary HTTP + WebSocket server to verify automatic live push on order room
    const srv = http.createServer(app);
    setupWebSocketServer(srv);
    await new Promise<void>((resolve) => srv.listen(0, '127.0.0.1', () => resolve()));
    const { port } = srv.address() as { port: number };

    const receivedEvents: Array<{ type: string; payload?: { status?: string } }> = [];
    const ws = new WebSocket(
      `ws://127.0.0.1:${port}/ws?room=${encodeURIComponent(`order:${placedOrderId}`)}`,
    );
    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', (err) => reject(err));
    });
    ws.on('message', (raw) => {
      try {
        receivedEvents.push(JSON.parse(String(raw)));
      } catch {
        // ignore
      }
    });

    try {
      // Kitchen updates order status -> IN_PREPARATION -> READY -> SERVED
      const expectedItemPrep: Record<string, string> = {
        IN_PREPARATION: 'PREPARING',
        READY: 'READY',
        SERVED: 'SERVED',
      };

      for (const st of ['IN_PREPARATION', 'READY', 'SERVED']) {
        const upd = await request(app)
          .patch(`/api/restaurant/orders/${placedOrderId}/status`)
          .set('Authorization', `Bearer ${kitchenToken}`)
          .send({ status: st });
        expect(upd.status).toBe(200);

        const trackStep = await request(app).get(
          `/api/public/qr/${encodeURIComponent(createdQrToken)}/orders/${encodeURIComponent(placedOrderId)}`,
        );
        expect(trackStep.status).toBe(200);
        expect(trackStep.body.order.status).toBe(st);
        for (const line of trackStep.body.order.items as Array<{ prep_status: string }>) {
          expect(line.prep_status).toBe(expectedItemPrep[st]);
        }
      }

      // Cashier settles payment -> order becomes PAID, paidXof === totalXof, and table is released
      const payRes = await request(app)
        .post(`/api/restaurant/orders/${placedOrderId}/pay`)
        .set('Authorization', `Bearer ${cashierToken}`)
        .send({ amountXof: 25500, method: 'ORANGE_MONEY' });
      expect(payRes.status).toBe(201);
      expect(payRes.body.payment.fullyPaid).toBe(true);

      const trackPaid = await request(app).get(
        `/api/public/qr/${encodeURIComponent(createdQrToken)}/orders/${encodeURIComponent(placedOrderId)}`,
      );
      expect(trackPaid.status).toBe(200);
      expect(trackPaid.body.order.status).toBe('PAID');
      expect(trackPaid.body.order.paidXof).toBe(25500);

      // Verify table returned to AVAILABLE after full settlement
      const tablesAfterPay = await request(app)
        .get('/api/restaurant/tables')
        .set('Authorization', `Bearer ${ownerToken}`);
      const freedTbl = (
        tablesAfterPay.body.tables as Array<{ id: string; status: string }>
      ).find((t) => t.id === createdTableId);
      expect(freedTbl?.status).toBe('AVAILABLE');

      // Allow WebSocket messages to flush
      await new Promise((r) => setTimeout(r, 100));
      const pushedStatuses = receivedEvents
        .filter((e) => e.type === 'order:updated')
        .map((e) => e.payload?.status);
      expect(pushedStatuses).toEqual([
        'IN_PREPARATION',
        'READY',
        'SERVED',
        'PAID',
      ]);
    } finally {
      ws.close();
      await new Promise<void>((resolve) => srv.close(() => resolve()));
    }
  });

  it('immediately revokes old QR token and SVG image when regenerated, and activates new token', async () => {
    const regenRes = await request(app)
      .post(`/api/restaurant/tables/${createdTableId}/qr-regenerate`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(regenRes.status).toBe(200);
    const newToken = regenRes.body.token as string;
    expect(newToken).not.toBe(createdQrToken);

    const [oldMenu, oldSvg, oldOrder] = await Promise.all([
      request(app).get(`/api/public/qr/${encodeURIComponent(createdQrToken)}`),
      request(app).get(`/api/public/qr-image/${encodeURIComponent(createdQrToken)}`),
      request(app)
        .post(`/api/public/qr/${encodeURIComponent(createdQrToken)}/orders`)
        .send({ items: [{ menuItemId: createdItemId, quantity: 1 }] }),
    ]);

    expect(oldMenu.status).toBe(410);
    expect(oldSvg.status).toBe(410);
    expect(oldOrder.status).toBe(410);

    const newMenu = await request(app).get(
      `/api/public/qr/${encodeURIComponent(newToken)}`,
    );
    expect(newMenu.status).toBe(200);
    expect(newMenu.body.table.id).toBe(createdTableId);
  });
});
