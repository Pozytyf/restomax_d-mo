import type { IncomingMessage, ServerResponse } from 'node:http';
import { createExpressApp } from '../src/server/app.ts';
import { getDb } from '../src/server/db.ts';
import { runKnexMigrations } from '../src/server/knex.ts';

const app = createExpressApp();
let initPromise: Promise<void> | null = null;

async function ensureInitialized(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await runKnexMigrations();
      } catch (err) {
        console.warn('[Vercel/API] Knex migration notice:', err);
      }
      getDb();
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  await ensureInitialized();
  return app(req as Parameters<typeof app>[0], res as Parameters<typeof app>[1]);
}
