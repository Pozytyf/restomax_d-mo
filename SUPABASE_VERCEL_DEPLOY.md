# Déploiement Resto’MAX sur Supabase + Vercel

Ce guide explique comment initialiser la base PostgreSQL sur **Supabase** et déployer l’application **Resto’MAX** sur **Vercel**.

---

## 1. Concevoir et initialiser la base de données sur Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com/dashboard).
2. Ouvrez **SQL Editor** dans votre projet Supabase.
3. Copiez puis exécutez le contenu du fichier `supabase/schema.sql` :
   - Crée les **29 tables** multi-tenant (`tenants`, `restaurants`, `users`, `menu_items`, `menu_item_recipes`, `orders`, `payments`, `stocks`, etc.).
   - Configure les index de performance et le trigger `trg_restaurants_sync_tenant`.
   - Active **Row Level Security (RLS)** sur toutes les tables métier avec la fonction `public.current_tenant_id()`.
   - Ajoute `orders`, `order_items`, `dining_tables`, `stocks` et `notifications` à la publication `supabase_realtime`.
4. (Optionnel — données de démonstration) Exécutez ensuite `supabase/seed.sql` dans **SQL Editor**.
5. Récupérez vos identifiants dans **Project Settings > API** et **Project Settings > Database (Connection String - Transaction Pooler, port 6543)** :
   - `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_DB_URL` / `DATABASE_URL` (avec `?sslmode=require`)

> **Alternative CLI / Knex** : vous pouvez également exécuter les migrations Knex sur votre base PostgreSQL Supabase :
> ```bash
> DATABASE_CLIENT=pg DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-eu-west-1.pooler.supabase.com:6543/postgres" DATABASE_SSL=true npm run migrate:latest
> ```

---

## 2. Déployer sur Vercel

1. Connectez ce dépôt à [Vercel](https://vercel.com/new) (ou exécutez `vercel --prod`).
2. Le fichier `vercel.json` configure automatiquement :
   - Le build frontend Vite (`npm run build` → `dist/`).
   - La fonction Serverless Node (`/api/index.ts`) gérant `/api/*`, `/robots.txt` et `/sitemap.xml`.
   - La réécriture des routes SPA (`/app/*`, `/q/*`, `/superadmin/*`, pages marketing) vers `/index.html`.
3. Ajoutez les variables d’environnement suivantes dans **Vercel > Settings > Environment Variables** :
   - `APP_URL` = `https://votre-domaine.vercel.app`
   - `JWT_SECRET` = secret aléatoire robuste (64+ caractères)
   - `DATABASE_CLIENT` = `pg`
   - `DATABASE_URL` / `SUPABASE_DB_URL` = URI Transaction Pooler Supabase
   - `DATABASE_SSL` = `true`
   - `SUPABASE_URL` & `VITE_SUPABASE_URL`
   - `SUPABASE_ANON_KEY` & `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - (Optionnel) `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
4. Vérifiez le déploiement via `GET https://votre-domaine.vercel.app/api/health` :
   - `"supabaseConfigured": true`
   - `"supabaseRealtimeReady": true`
   - `"postgresConnected": true`

---

## 3. État technique de la couche d'accès aux données

- **Prêt immédiatement** : schéma PostgreSQL complet (`supabase/schema.sql`, 29 tables + RLS + Realtime), jeu de données (`supabase/seed.sql`), migrations Knex PostgreSQL (`src/server/migrations/`), pool `pg` + client `@supabase/supabase-js` côté serveur et navigateur (`Supabase Realtime` sur `orders`, `dining_tables`, `stocks`, `notifications`), et fonction Serverless Vercel (`/api/index.ts` + `vercel.json`).
- **Point d'attention pour la persistance multi-instances en production** : les dépôts métier historiques (`authRepository`, `publicRepository`, `restaurantRepository`, `superadminRepository`) exécutent encore leurs requêtes synchrones sur `better-sqlite3` (repli automatique sur `/tmp/restomax.db` éphémère sur Vercel). Pour persister 100 % des écritures API directement dans Supabase PostgreSQL sur plusieurs instances Vercel, ces dépôts devront être basculés vers des requêtes asynchrones `pg` / Knex.
