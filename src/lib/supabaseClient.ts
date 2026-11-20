import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function readEnv(key: string): string {
  try {
    const metaEnv = (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    )?.env;
    return (metaEnv?.[key] || '').trim();
  } catch {
    return '';
  }
}

export function isSupabaseRealtimeEnabled(): boolean {
  return Boolean(readEnv('VITE_SUPABASE_URL') && readEnv('VITE_SUPABASE_ANON_KEY'));
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  const url = readEnv('VITE_SUPABASE_URL');
  const anonKey = readEnv('VITE_SUPABASE_ANON_KEY');
  if (!url || !anonKey) return null;

  if (!browserClient) {
    browserClient = createClient(url, anonKey, {
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    });
  }
  return browserClient;
}
