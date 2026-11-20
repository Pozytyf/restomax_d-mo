import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Database from 'better-sqlite3';
import knex from 'knex';
import request from 'supertest';
import { createExpressApp } from '../server/app.ts';
import { setTestDb } from '../server/db.ts';
import { buildPostgresKnexConfig } from '../server/db/knexfile.ts';
import {
  getSupabaseAdminClient,
  getSupabaseConfig,
  isSupabaseDbUrl,
  resetSupabaseSingletonsForTest,
} from '../server/lib/supabase.ts';

test('1. Supabase DB URL detection & automatic SSL config in Knex', () => {
  const supabaseUrl =
    'postgresql://postgres.abcdef:secret@aws-0-eu-west-1.pooler.supabase.com:6543/postgres';
  assert.equal(isSupabaseDbUrl(supabaseUrl), true);
  assert.equal(isSupabaseDbUrl('postgres://localhost:5432/restomax'), false);

  const cfg = buildPostgresKnexConfig(supabaseUrl);
  assert.equal(cfg.client, 'pg');
  assert.deepEqual(
    (cfg.connection as { ssl: unknown }).ssl,
    { rejectUnauthorized: false },
  );
});

test('2. Supabase runtime config & Admin client initialization', () => {
  const prevUrl = process.env.SUPABASE_URL;
  const prevAnon = process.env.SUPABASE_ANON_KEY;
  const prevService = process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    delete process.env.SUPABASE_URL;
    delete process.env.VITE_SUPABASE_URL;
    delete process.env.SUPABASE_ANON_KEY;
    delete process.env.VITE_SUPABASE_ANON_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    resetSupabaseSingletonsForTest();

    const emptyCfg = getSupabaseConfig();
    assert.equal(emptyCfg.configured, false);
    assert.equal(getSupabaseAdminClient(), null);

    process.env.SUPABASE_URL = 'https://demo-project.supabase.co';
    process.env.SUPABASE_ANON_KEY = 'anon-key-placeholder';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-placeholder';
    resetSupabaseSingletonsForTest();

    const activeCfg = getSupabaseConfig();
    assert.equal(activeCfg.configured, true);
    assert.equal(activeCfg.realtimeReady, true);
    assert.ok(getSupabaseAdminClient() !== null);
  } finally {
    process.env.SUPABASE_URL = prevUrl;
    process.env.SUPABASE_ANON_KEY = prevAnon;
    process.env.SUPABASE_SERVICE_ROLE_KEY = prevService;
    resetSupabaseSingletonsForTest();
  }
});

test('3. Supabase schema.sql & seed.sql contain all multi-tenant tables, RLS, and Realtime', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const seedPath = path.resolve(process.cwd(), 'supabase/seed.sql');
  assert.equal(fs.existsSync(schemaPath), true);
  assert.equal(fs.existsSync(seedPath), true);

  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  const requiredTables = [
    'platform_settings',
    'plans',
    'tenants',
    'restaurants',
    'users',
    'restaurant_members',
    'sessions',
    'subscriptions',
    'platform_invoices',
    'menu_categories',
    'menu_items',
    'dining_tables',
    'qr_codes',
    'qr_table_sessions',
    'orders',
    'order_items',
    'payments',
    'stocks',
    'stock_movements',
    'menu_item_recipes',
    'stock_alert_settings',
    'notifications',
    'customers',
    'reservations',
    'expenses',
    'support_tickets',
    'ticket_messages',
    'audit_logs',
    'contact_leads',
  ];

  for (const tbl of requiredTables) {
    assert.equal(
      schemaSql.includes(`CREATE TABLE IF NOT EXISTS public.${tbl}`),
      true,
      `Missing table ${tbl} in supabase/schema.sql`,
    );
  }

  assert.equal(schemaSql.includes('ENABLE ROW LEVEL SECURITY'), true);
  assert.equal(schemaSql.includes('public.current_tenant_id()'), true);
  assert.equal(schemaSql.includes('supabase_realtime'), true);
  assert.equal(schemaSql.includes('trg_restaurants_sync_tenant'), true);

  const seedSql = fs.readFileSync(seedPath, 'utf8');
  assert.equal(seedSql.includes('rest_sillage_01'), true);
  assert.equal(seedSql.includes('proprietaire@lesillage.ci'), true);
  assert.equal(seedSql.includes('menu_item_recipes'), true);
});

test('4. Full Knex migration 0004 runs cleanly and Vercel config + api/index.ts are valid', async () => {
  const k = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/migrations'),
      extension: 'ts',
    },
  });

  try {
    await k.migrate.latest();
    assert.equal(await k.schema.hasTable('orders'), true);
    assert.equal(await k.schema.hasTable('menu_item_recipes'), true);
    assert.equal(await k.schema.hasTable('stock_alert_settings'), true);
    assert.equal(await k.schema.hasTable('audit_logs'), true);
  } finally {
    await k.destroy();
  }

  const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
  const apiEntryPath = path.resolve(process.cwd(), 'api/index.ts');
  assert.equal(fs.existsSync(vercelJsonPath), true);
  assert.equal(fs.existsSync(apiEntryPath), true);

  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8')) as {
    rewrites: Array<{ source: string; destination: string }>;
    outputDirectory: string;
  };
  assert.equal(vercelConfig.outputDirectory, 'dist');
  assert.equal(
    vercelConfig.rewrites.some(
      (r) => r.source === '/api/(.*)' && r.destination === '/api/index.ts',
    ),
    true,
  );

  // Verify /api/health returns Supabase/Vercel metadata safely
  const sqliteDb = new Database(':memory:');
  setTestDb(sqliteDb);
  const app = createExpressApp();
  const res = await request(app).get('/api/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'ok');
  assert.equal('supabaseConfigured' in res.body, true);
  assert.equal('supabaseRealtimeReady' in res.body, true);
  assert.equal('postgresConnected' in res.body, true);
});
