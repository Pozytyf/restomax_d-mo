import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Pool } from 'pg';

export interface SupabaseRuntimeConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  dbUrl: string;
  configured: boolean;
  realtimeReady: boolean;
}

let cachedAdminClient: SupabaseClient | null = null;
let cachedPgPool: Pool | null = null;

export function getSupabaseConfig(): SupabaseRuntimeConfig {
  const url = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  ).trim();
  const anonKey = (
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    ''
  ).trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const dbUrl = (
    process.env.SUPABASE_DB_URL ||
    process.env.DATABASE_URL ||
    ''
  ).trim();

  return {
    url,
    anonKey,
    serviceRoleKey,
    dbUrl,
    configured: Boolean(url && (serviceRoleKey || anonKey)) || Boolean(dbUrl),
    realtimeReady: Boolean(url && anonKey),
  };
}

export function isSupabaseDbUrl(connectionString: string): boolean {
  const lower = connectionString.toLowerCase();
  return (
    lower.includes('supabase.co') ||
    lower.includes('supabase.com') ||
    lower.includes('pooler.supabase')
  );
}

export function getSupabaseAdminClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg.url || !(cfg.serviceRoleKey || cfg.anonKey)) {
    return null;
  }
  if (!cachedAdminClient) {
    cachedAdminClient = createClient(
      cfg.url,
      cfg.serviceRoleKey || cfg.anonKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );
  }
  return cachedAdminClient;
}

export function getPostgresPool(): Pool | null {
  const cfg = getSupabaseConfig();
  if (!cfg.dbUrl) {
    return null;
  }
  if (!cachedPgPool) {
    const useSsl =
      process.env.DATABASE_SSL === 'true' || isSupabaseDbUrl(cfg.dbUrl);
    cachedPgPool = new Pool({
      connectionString: cfg.dbUrl,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.DB_POOL_MAX || 10),
      idleTimeoutMillis: 15_000,
      connectionTimeoutMillis: 10_000,
    });
    cachedPgPool.on('error', (err) => {
      console.error('[Supabase/PG Pool Error]', err);
    });
  }
  return cachedPgPool;
}

export async function checkSupabaseHealth(): Promise<{
  configured: boolean;
  realtimeReady: boolean;
  postgresConnected: boolean | null;
  latencyMs: number | null;
}> {
  const cfg = getSupabaseConfig();
  const pool = getPostgresPool();
  if (!pool) {
    return {
      configured: cfg.configured,
      realtimeReady: cfg.realtimeReady,
      postgresConnected: null,
      latencyMs: null,
    };
  }

  const startedAt = Date.now();
  try {
    await pool.query('SELECT 1');
    return {
      configured: cfg.configured,
      realtimeReady: cfg.realtimeReady,
      postgresConnected: true,
      latencyMs: Date.now() - startedAt,
    };
  } catch {
    return {
      configured: cfg.configured,
      realtimeReady: cfg.realtimeReady,
      postgresConnected: false,
      latencyMs: Date.now() - startedAt,
    };
  }
}

export function resetSupabaseSingletonsForTest(): void {
  cachedAdminClient = null;
  if (cachedPgPool) {
    void cachedPgPool.end().catch(() => {});
    cachedPgPool = null;
  }
}
