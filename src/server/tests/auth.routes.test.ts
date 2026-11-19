import { beforeAll, describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { createExpressApp } from '../app.ts';
import { getDb, setTestDb } from '../db.ts';
import type { Express } from 'express';

describe('Authentication routes (/api/auth)', () => {
  let app: Express;

  beforeAll(() => {
    const db = getDb(':memory:');
    setTestDb(db);
    app = createExpressApp();
  });

  describe('POST /api/auth/register-restaurant', () => {
    it('creates a new restaurant, owner account, JWT token and session cookie', async () => {
      const res = await request(app)
        .post('/api/auth/register-restaurant')
        .send({
          restaurantName: 'Chez Tantie Cocody',
          city: 'Abidjan',
          ownerName: 'Awa Koné',
          email: 'awa.kone@cocody.ci',
          phone: '+225 07 12 34 56 78',
          password: 'Password123!',
          planCode: 'ESSENTIEL',
        });

      expect(res.status).toBe(201);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toMatchObject({
        email: 'awa.kone@cocody.ci',
        fullName: 'Awa Koné',
        role: 'OWNER',
        restaurantName: 'Chez Tantie Cocody',
        restaurantStatus: 'TRIAL',
      });
      expect(res.headers['set-cookie']).toBeDefined();
      expect(res.headers['set-cookie'][0]).toContain('restomax_token=');
    });

    it('rejects incomplete registration payloads with 400', async () => {
      const res = await request(app)
        .post('/api/auth/register-restaurant')
        .send({
          restaurantName: 'A',
          email: 'invalid-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeTruthy();
    });

    it('rejects duplicate email registration with 409', async () => {
      const res = await request(app)
        .post('/api/auth/register-restaurant')
        .send({
          restaurantName: 'Autre Maquis',
          ownerName: 'Autre Gérant',
          email: 'awa.kone@cocody.ci',
          password: 'Password123!',
        });

      expect(res.status).toBe(409);
    });
  });

  describe('POST /api/auth/login', () => {
    it('authenticates a seeded restaurant owner and returns user + token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'proprietaire@lesillage.ci',
          password: 'RestoMax2026!',
        });

      expect(res.status).toBe(200);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user.email).toBe('proprietaire@lesillage.ci');
      expect(res.body.user.role).toBe('OWNER');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('returns 400 when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'proprietaire@lesillage.ci' });

      expect(res.status).toBe(400);
    });

    it('returns 401 for wrong credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'proprietaire@lesillage.ci',
          password: 'WrongPassword!',
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    it('returns 401 when no token or cookie is provided', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
    });

    it('returns authenticated user profile when valid Bearer token is sent', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'proprietaire@lesillage.ci',
          password: 'RestoMax2026!',
        });

      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${loginRes.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('proprietaire@lesillage.ci');
      expect(res.body.user.role).toBe('OWNER');
    });

    it('returns 401 for malformed JWT token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/change-password', () => {
    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({ currentPassword: 'Password123!', newPassword: 'NewPassword123!' });

      expect(res.status).toBe(401);
    });

    it('rejects incorrect current password with 400', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.kone@cocody.ci',
          password: 'Password123!',
        });

      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({
          currentPassword: 'WrongCurrentPassword',
          newPassword: 'NewPassword123!',
        });

      expect(res.status).toBe(400);
    });

    it('updates password and allows login with the new password', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.kone@cocody.ci',
          password: 'Password123!',
        });

      const changeRes = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'UpdatedPassword2026!',
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body).toEqual({ ok: true });

      const newLoginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'awa.kone@cocody.ci',
          password: 'UpdatedPassword2026!',
        });
      expect(newLoginRes.status).toBe(200);
      expect(typeof newLoginRes.body.token).toBe('string');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('revokes active session so subsequent /me calls return 401', async () => {
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'proprietaire@lesillage.ci',
          password: 'RestoMax2026!',
        });

      const token = loginRes.body.token as string;
      const logoutRes = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ ok: true });

      const meAfterLogout = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);
      expect(meAfterLogout.status).toBe(401);
    });
  });
});
