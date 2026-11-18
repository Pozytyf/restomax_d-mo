import express from 'express';
import cookieParser from 'cookie-parser';
import { publicRouter } from './routes/public.ts';
import { authRouter } from './routes/auth.ts';
import { restaurantRouter } from './routes/restaurant.ts';
import { superAdminRouter } from './routes/superadmin.ts';

export function createExpressApp() {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'restomax', timezone: 'Africa/Abidjan' });
  });

  // SEO endpoints: robots.txt & dynamic sitemap.xml
  app.get('/robots.txt', (req, res) => {
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      [
        'User-agent: *',
        'Allow: /',
        'Disallow: /app',
        'Disallow: /superadmin',
        'Disallow: /api',
        `Sitemap: ${baseUrl}/sitemap.xml`,
      ].join('\n'),
    );
  });

  app.get('/sitemap.xml', (req, res) => {
    const baseUrl =
      process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
    const urls = [
      '/',
      '/fonctionnalites',
      '/tarifs',
      '/demonstration',
      '/a-propos',
      '/contact',
      '/faq',
      '/mentions-legales',
      '/confidentialite',
      '/cgu',
      '/cgv',
      '/cookies',
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${baseUrl}${u}</loc>
    <changefreq>weekly</changefreq>
  </url>`,
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  app.use('/api/public', publicRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/restaurant', restaurantRouter);
  app.use('/api/superadmin', superAdminRouter);

  return app;
}
