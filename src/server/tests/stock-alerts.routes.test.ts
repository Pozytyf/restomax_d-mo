import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createExpressApp } from '../app.ts';
import { getDb, setTestDb } from '../db.ts';
import type { Express } from 'express';

describe('Stock critical alerts & notifications (/api/restaurant/stocks & /notifications)', () => {
  let app: Express;
  let ownerToken: string;
  let secondRestaurantToken: string;
  let createdStockId: string;

  beforeAll(async () => {
    const db = getDb(':memory:');
    setTestDb(db);
    app = createExpressApp();

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'proprietaire@lesillage.ci',
        password: 'RestoMax2026!',
      });
    ownerToken = loginRes.body.token as string;

    const regRes = await request(app)
      .post('/api/auth/register-restaurant')
      .send({
        restaurantName: 'Maquis Plateau Test',
        city: 'Abidjan',
        ownerName: 'Kouadio Koffi',
        email: 'kouadio.plateau@test.ci',
        phone: '+225 07 00 11 22 33',
        password: 'Password123!',
        planCode: 'ESSENTIEL',
      });
    secondRestaurantToken = regRes.body.token as string;
  });

  it('returns default alert settings and resolved owner/manager emails', async () => {
    const res = await request(app)
      .get('/api/restaurant/stocks/alerts/config')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.settings).toMatchObject({
      inAppEnabled: true,
      emailEnabled: true,
      recipientEmails: '',
    });
    expect(Array.isArray(res.body.settings.resolvedRecipients)).toBe(true);
    expect(res.body.settings.resolvedRecipients).toContain('proprietaire@lesillage.ci');
    expect(res.body.settings.resolvedRecipients).toContain('manager@lesillage.ci');
  });

  it('updates stock alert settings and persists custom recipient emails', async () => {
    const patchRes = await request(app)
      .patch('/api/restaurant/stocks/alerts/config')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        inAppEnabled: true,
        emailEnabled: true,
        recipientEmails: 'achats@lesillage.ci, gerant@lesillage.ci',
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.settings).toMatchObject({
      inAppEnabled: true,
      emailEnabled: true,
      recipientEmails: 'achats@lesillage.ci, gerant@lesillage.ci',
      resolvedRecipients: ['achats@lesillage.ci', 'gerant@lesillage.ci'],
    });
  });

  it('automatically dispatches an alert when a stock movement drops below minThreshold', async () => {
    const createRes = await request(app)
      .post('/api/restaurant/stocks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Huile de palme rouge',
        unit: 'L',
        quantity: 20,
        minThreshold: 8,
        unitCostXof: 1200,
        supplierName: 'Marché Adjamé',
      });

    expect(createRes.status).toBe(201);
    createdStockId = createRes.body.id as string;

    const beforeNotifs = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    const initialCount = beforeNotifs.body.notifications.length as number;

    const moveRes = await request(app)
      .post(`/api/restaurant/stocks/${createdStockId}/move`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        movementType: 'OUT',
        quantity: 14,
        reason: 'Service du midi',
      });

    expect(moveRes.status).toBe(200);
    expect(moveRes.body).toEqual({
      quantity: 6,
      alertTriggered: true,
    });

    const afterNotifs = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(afterNotifs.status).toBe(200);
    expect(afterNotifs.body.notifications.length).toBe(initialCount + 1);
    expect(afterNotifs.body.unreadCount).toBeGreaterThanOrEqual(1);

    const latest = afterNotifs.body.notifications[0];
    expect(latest.type).toBe('STOCK_CRITICAL');
    expect(latest.stockId).toBe(createdStockId);
    expect(latest.title).toContain('Huile de palme rouge');
    expect(latest.message).toContain('6 L');
    expect(latest.emailRecipients).toContain('achats@lesillage.ci');
    expect(['QUEUED_NO_SMTP', 'SENT']).toContain(latest.emailStatus);
    expect(latest.isRead).toBe(false);
  });

  it('triggers an automatic alert when creating an ingredient already at or below threshold', async () => {
    const createRes = await request(app)
      .post('/api/restaurant/stocks')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        name: 'Piment frais',
        unit: 'kg',
        quantity: 2,
        minThreshold: 5,
        unitCostXof: 2000,
        supplierName: 'Coopérative Bio',
      });

    expect(createRes.status).toBe(201);

    const notifsRes = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);

    const match = (notifsRes.body.notifications as Array<{ stockId: string; title: string }>).find(
      (n) => n.stockId === createRes.body.id,
    );
    expect(match).toBeDefined();
    expect(match?.title).toContain('Piment frais');
  });

  it('supports manual alert trigger and SKIPPED email status when emailEnabled is false', async () => {
    await request(app)
      .patch('/api/restaurant/stocks/alerts/config')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({
        inAppEnabled: true,
        emailEnabled: false,
      });

    const triggerRes = await request(app)
      .post(`/api/restaurant/stocks/${createdStockId}/alert-test`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(triggerRes.status).toBe(200);
    expect(triggerRes.body.emailStatus).toBe('SKIPPED');
    expect(triggerRes.body.notification).toBeDefined();
    expect(triggerRes.body.notification.stockId).toBe(createdStockId);
  });

  it('marks single and all notifications as read', async () => {
    const listBefore = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    const firstId = listBefore.body.notifications[0].id as string;
    const unreadBefore = listBefore.body.unreadCount as number;
    expect(unreadBefore).toBeGreaterThanOrEqual(2);

    const markOneRes = await request(app)
      .patch('/api/restaurant/notifications/read')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ id: firstId });
    expect(markOneRes.status).toBe(200);

    const listAfterOne = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listAfterOne.body.unreadCount).toBe(unreadBefore - 1);

    const markAllRes = await request(app)
      .patch('/api/restaurant/notifications/read')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});
    expect(markAllRes.status).toBe(200);

    const listAfterAll = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(listAfterAll.body.unreadCount).toBe(0);
  });

  it('enforces multi-tenant isolation for stock alerts and notifications', async () => {
    const otherNotifs = await request(app)
      .get('/api/restaurant/notifications')
      .set('Authorization', `Bearer ${secondRestaurantToken}`);

    expect(otherNotifs.status).toBe(200);
    expect(otherNotifs.body.notifications).toEqual([]);
    expect(otherNotifs.body.unreadCount).toBe(0);

    const crossTrigger = await request(app)
      .post(`/api/restaurant/stocks/${createdStockId}/alert-test`)
      .set('Authorization', `Bearer ${secondRestaurantToken}`);
    expect(crossTrigger.status).toBe(404);
  });
});
