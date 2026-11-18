import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createExpressApp } from './src/server/app.ts';
import { getDb } from './src/server/db.ts';
import { setupWebSocketServer } from './src/server/ws.ts';

async function startServer() {
  const port = Number(process.env.PORT || 3000);
  const isProd = process.env.NODE_ENV === 'production';

  // Initialize database & run migrations/seed
  getDb();

  const app = createExpressApp();
  const httpServer = http.createServer(app);

  // Attach real-time WebSocket server on port 3000
  setupWebSocketServer(httpServer);

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  httpServer.listen(port, '0.0.0.0', () => {
    console.log(`Resto'MAX server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Resto’MAX server:', err);
  process.exit(1);
});
