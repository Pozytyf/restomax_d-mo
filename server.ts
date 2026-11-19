import 'dotenv/config';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './src/server/app.ts';
import { getDb } from './src/server/db.ts';
import { runKnexMigrations } from './src/server/knex.ts';
import { setupWebSocketServer } from './src/server/ws.ts';

function resolveCliArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx !== -1 && idx + 1 < process.argv.length) {
    return process.argv[idx + 1];
  }
  const prefix = `${name}=`;
  const eqArg = process.argv.find((arg) => arg.startsWith(prefix));
  return eqArg ? eqArg.slice(prefix.length) : undefined;
}

function resolveListenPort(): number {
  const cliPort = resolveCliArg('--port');
  if (cliPort && Number.isFinite(Number(cliPort)) && Number(cliPort) > 0) {
    return Number(cliPort);
  }
  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined;
  const nginxPort = process.env.NGINX_PORT
    ? Number(process.env.NGINX_PORT)
    : undefined;
  const defaultAppPort = process.env.DEFAULT_APP_PORT
    ? Number(process.env.DEFAULT_APP_PORT)
    : 3000;

  // In Cloud Run / AI Studio, PORT may be set to NGINX_PORT (8080) while the app must listen on DEFAULT_APP_PORT (3000).
  if (envPort && nginxPort && envPort === nginxPort) {
    return defaultAppPort;
  }
  return envPort || defaultAppPort || 3000;
}

async function startServer() {
  const port = resolveListenPort();
  const host = resolveCliArg('--host') || process.env.HOST || '0.0.0.0';
  const isProd = process.env.NODE_ENV === 'production';
  const disableHmr = process.env.DISABLE_HMR === 'true';

  // Initialize Knex SQLite3 pool, run initial schema migrations, and ensure seeded tables
  await runKnexMigrations();
  getDb();

  const app = createExpressApp();
  const httpServer = http.createServer(app);

  // Attach real-time WebSocket server on port 3000
  setupWebSocketServer(httpServer);

  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: !disableHmr,
        ws: disableHmr ? (false as const) : undefined,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found. Run npm run build.');
      }
    });
  }

  httpServer.listen(port, host, () => {
    console.log(`Resto'MAX server listening on http://${host}:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Resto’MAX server:', err);
  process.exit(1);
});
