-- ============================================================================
-- Resto’MAX SaaS — Schéma PostgreSQL complet pour Supabase
-- Exécuter dans Supabase > SQL Editor (ou via `supabase db push` / `psql`).
-- Inclut : 29 tables multi-tenant, index, triggers, Row Level Security (RLS)
-- et publication Supabase Realtime.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Migrations & Paramètres plateforme
CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- 2. Offres d'abonnement SaaS
CREATE TABLE IF NOT EXISTS public.plans (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL,
  price_monthly_xof INTEGER NOT NULL,
  price_yearly_xof INTEGER NOT NULL,
  trial_days INTEGER NOT NULL DEFAULT 14,
  max_tables INTEGER NOT NULL,
  max_staff INTEGER NOT NULL,
  max_menu_items INTEGER NOT NULL,
  is_demo_pricing INTEGER NOT NULL DEFAULT 1,
  is_featured INTEGER NOT NULL DEFAULT 0,
  features_json TEXT NOT NULL DEFAULT '[]',
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

-- 3. Tenants & Restaurants (isolation multi-tenant)
CREATE TABLE IF NOT EXISTS public.tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Abidjan',
  country TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
  currency TEXT NOT NULL DEFAULT 'XOF',
  timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan',
  tax_rate_percent DOUBLE PRECISION NOT NULL DEFAULT 18.0,
  service_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  opening_hours TEXT NOT NULL DEFAULT '08:00 - 23:30',
  paydunya_mode TEXT NOT NULL DEFAULT 'TEST',
  paydunya_public_key TEXT NOT NULL DEFAULT '',
  paydunya_private_key TEXT NOT NULL DEFAULT '',
  paydunya_token TEXT NOT NULL DEFAULT '',
  printer_settings_json TEXT NOT NULL DEFAULT '{"paperWidth":"80mm","connectionType":"BROWSER","printerHost":"","printerPort":9100,"autoPrintReceipt":false,"autoPrintKitchenTicket":false}',
  status TEXT NOT NULL DEFAULT 'TRIAL',
  deleted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.restaurants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT 'Abidjan',
  country TEXT NOT NULL DEFAULT 'Côte d''Ivoire',
  currency TEXT NOT NULL DEFAULT 'XOF',
  timezone TEXT NOT NULL DEFAULT 'Africa/Abidjan',
  tax_rate_percent DOUBLE PRECISION NOT NULL DEFAULT 18.0,
  service_fee_percent DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  opening_hours TEXT NOT NULL DEFAULT '08:00 - 23:30',
  paydunya_mode TEXT NOT NULL DEFAULT 'TEST',
  paydunya_public_key TEXT NOT NULL DEFAULT '',
  paydunya_private_key TEXT NOT NULL DEFAULT '',
  paydunya_token TEXT NOT NULL DEFAULT '',
  printer_settings_json TEXT NOT NULL DEFAULT '{"paperWidth":"80mm","connectionType":"BROWSER","printerHost":"","printerPort":9100,"autoPrintReceipt":false,"autoPrintKitchenTicket":false}',
  status TEXT NOT NULL DEFAULT 'TRIAL',
  deleted_at TEXT,
  created_at TEXT NOT NULL
);

-- 4. Utilisateurs, Membres & Sessions
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  tenant_id TEXT REFERENCES public.tenants(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'OWNER',
  global_role TEXT NOT NULL DEFAULT 'USER',
  permissions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  token_version INTEGER NOT NULL DEFAULT 1,
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS public.restaurant_members (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  custom_permissions_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  UNIQUE(restaurant_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL
);

-- 5. Abonnements & Facturation SaaS
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL REFERENCES public.plans(id),
  billing_cycle TEXT NOT NULL DEFAULT 'MONTHLY',
  status TEXT NOT NULL DEFAULT 'TRIAL',
  trial_ends_at TEXT,
  current_period_start TEXT NOT NULL,
  current_period_end TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.platform_invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  subscription_id TEXT REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount_xof INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID',
  payment_method TEXT NOT NULL,
  mode TEXT NOT NULL DEFAULT 'TEST',
  paid_at TEXT,
  created_at TEXT NOT NULL
);

-- 6. Menu & Catalogue
CREATE TABLE IF NOT EXISTS public.menu_categories (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  station TEXT NOT NULL DEFAULT 'KITCHEN',
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS public.menu_items (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category_id TEXT NOT NULL REFERENCES public.menu_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price_xof INTEGER NOT NULL,
  cost_price_xof INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  available INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  options_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);

-- 7. Salle, Tables & QR Codes
CREATE TABLE IF NOT EXISTS public.dining_tables (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  zone TEXT NOT NULL DEFAULT 'Salle principale',
  label TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status TEXT NOT NULL DEFAULT 'AVAILABLE'
);

CREATE TABLE IF NOT EXISTS public.qr_codes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS public.qr_table_sessions (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id TEXT NOT NULL REFERENCES public.dining_tables(id) ON DELETE CASCADE,
  qr_token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 8. Commandes & Encaissements
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  order_type TEXT NOT NULL,
  table_id TEXT REFERENCES public.dining_tables(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL DEFAULT 'Client comptoir',
  status TEXT NOT NULL DEFAULT 'PENDING',
  subtotal_xof INTEGER NOT NULL,
  discount_xof INTEGER NOT NULL DEFAULT 0,
  tax_xof INTEGER NOT NULL DEFAULT 0,
  total_xof INTEGER NOT NULL,
  paid_xof INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT,
  created_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(restaurant_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES public.menu_items(id),
  name TEXT NOT NULL,
  station TEXT NOT NULL,
  unit_price_xof INTEGER NOT NULL,
  options_summary TEXT NOT NULL DEFAULT '',
  options_delta_xof INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL,
  line_total_xof INTEGER NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  prep_status TEXT NOT NULL DEFAULT 'PENDING'
);

CREATE TABLE IF NOT EXISTS public.payments (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  amount_xof INTEGER NOT NULL,
  method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PAID',
  mode TEXT NOT NULL DEFAULT 'TEST',
  reference TEXT NOT NULL,
  idempotency_key TEXT,
  created_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  UNIQUE(restaurant_id, idempotency_key)
);

-- 9. Stocks, Fiches techniques (recettes) & Alertes SMTP
CREATE TABLE IF NOT EXISTS public.stocks (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'kg',
  quantity DOUBLE PRECISION NOT NULL DEFAULT 0,
  min_threshold DOUBLE PRECISION NOT NULL DEFAULT 5,
  unit_cost_xof INTEGER NOT NULL DEFAULT 0,
  supplier_name TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.stock_movements (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  stock_id TEXT NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL,
  quantity_delta DOUBLE PRECISION NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by_user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.menu_item_recipes (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  menu_item_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  stock_id TEXT NOT NULL REFERENCES public.stocks(id) ON DELETE CASCADE,
  quantity_per_unit DOUBLE PRECISION NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(menu_item_id, stock_id)
);

CREATE TABLE IF NOT EXISTS public.stock_alert_settings (
  restaurant_id TEXT PRIMARY KEY REFERENCES public.restaurants(id) ON DELETE CASCADE,
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  recipient_emails TEXT NOT NULL DEFAULT '',
  smtp_host TEXT NOT NULL DEFAULT '',
  smtp_port INTEGER NOT NULL DEFAULT 587,
  smtp_secure INTEGER NOT NULL DEFAULT 0,
  smtp_user TEXT NOT NULL DEFAULT '',
  smtp_pass TEXT NOT NULL DEFAULT '',
  smtp_from TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  stock_id TEXT REFERENCES public.stocks(id) ON DELETE SET NULL,
  email_dispatched INTEGER NOT NULL DEFAULT 0,
  email_recipients TEXT NOT NULL DEFAULT '',
  email_status TEXT NOT NULL DEFAULT 'SKIPPED',
  is_read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

-- 10. CRM Clients, Réservations & Dépenses
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  loyalty_points INTEGER NOT NULL DEFAULT 0,
  total_spent_xof INTEGER NOT NULL DEFAULT 0,
  visits_count INTEGER NOT NULL DEFAULT 0,
  preferences TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  party_size INTEGER NOT NULL DEFAULT 2,
  reserved_at TEXT NOT NULL,
  table_id TEXT REFERENCES public.dining_tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'CONFIRMED',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.expenses (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_xof INTEGER NOT NULL,
  expense_date TEXT NOT NULL,
  created_at TEXT NOT NULL
);

-- 11. Support, Audit & Leads marketing
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id TEXT PRIMARY KEY,
  restaurant_id TEXT REFERENCES public.restaurants(id) ON DELETE SET NULL,
  created_by_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  category TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'MEDIUM',
  status TEXT NOT NULL DEFAULT 'OPEN',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id TEXT PRIMARY KEY,
  ticket_id TEXT NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  role TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  restaurant_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS public.contact_leads (
  id TEXT PRIMARY KEY,
  lead_type TEXT NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  restaurant_name TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

-- ============================================================================
-- Index de performance multi-tenant
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON public.users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON public.users(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON public.users(tenant_id, role);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON public.orders(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON public.orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_payments_restaurant_created ON public.payments(restaurant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON public.menu_items(restaurant_id, category_id);
CREATE INDEX IF NOT EXISTS idx_stocks_restaurant ON public.stocks(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_recipes_restaurant ON public.menu_item_recipes(restaurant_id, menu_item_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant ON public.notifications(restaurant_id, is_read);
CREATE INDEX IF NOT EXISTS idx_audit_logs_restaurant ON public.audit_logs(restaurant_id, created_at DESC);

-- ============================================================================
-- Trigger de synchronisation restaurants <-> tenants
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_restaurant_to_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF (TG_OP = 'DELETE') THEN
    DELETE FROM public.tenants WHERE id = OLD.id;
    RETURN OLD;
  END IF;

  INSERT INTO public.tenants (
    id, name, slug, email, phone, address, city, country, currency, timezone,
    tax_rate_percent, service_fee_percent, opening_hours, paydunya_mode,
    paydunya_public_key, paydunya_private_key, paydunya_token,
    printer_settings_json, status, deleted_at, created_at
  ) VALUES (
    NEW.id, NEW.name, NEW.slug, NEW.email, NEW.phone, NEW.address, NEW.city, NEW.country, NEW.currency, NEW.timezone,
    NEW.tax_rate_percent, NEW.service_fee_percent, NEW.opening_hours, NEW.paydunya_mode,
    NEW.paydunya_public_key, NEW.paydunya_private_key, NEW.paydunya_token,
    NEW.printer_settings_json, NEW.status, NEW.deleted_at, NEW.created_at
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    email = EXCLUDED.email,
    phone = EXCLUDED.phone,
    address = EXCLUDED.address,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    currency = EXCLUDED.currency,
    timezone = EXCLUDED.timezone,
    tax_rate_percent = EXCLUDED.tax_rate_percent,
    service_fee_percent = EXCLUDED.service_fee_percent,
    opening_hours = EXCLUDED.opening_hours,
    paydunya_mode = EXCLUDED.paydunya_mode,
    paydunya_public_key = EXCLUDED.paydunya_public_key,
    paydunya_private_key = EXCLUDED.paydunya_private_key,
    paydunya_token = EXCLUDED.paydunya_token,
    printer_settings_json = EXCLUDED.printer_settings_json,
    status = EXCLUDED.status,
    deleted_at = EXCLUDED.deleted_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_restaurants_sync_tenant ON public.restaurants;
CREATE TRIGGER trg_restaurants_sync_tenant
AFTER INSERT OR UPDATE OR DELETE ON public.restaurants
FOR EACH ROW EXECUTE FUNCTION public.sync_restaurant_to_tenant();

-- ============================================================================
-- Supabase Row Level Security (RLS) — Isolation multi-tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS TEXT
LANGUAGE sql
STABLE
AS $$
  SELECT NULLIF(COALESCE(
    auth.jwt() ->> 'restaurant_id',
    auth.jwt() -> 'app_metadata' ->> 'restaurant_id',
    ''
  ), '');
$$;

CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'global_role',
    auth.jwt() -> 'app_metadata' ->> 'global_role',
    ''
  ) = 'SUPER_ADMIN';
$$;

-- Activation RLS sur les tables métier
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dining_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_item_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Lecture publique contrôlée pour les plans actifs & menu QR
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS plans_public_read ON public.plans;
CREATE POLICY plans_public_read ON public.plans FOR SELECT USING (active = 1);

-- Politiques d'isolation tenant (le rôle service_role backend contourne automatiquement la RLS)
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'restaurant_members',
    'menu_categories',
    'menu_items',
    'dining_tables',
    'qr_codes',
    'orders',
    'payments',
    'stocks',
    'stock_movements',
    'menu_item_recipes',
    'stock_alert_settings',
    'notifications',
    'customers',
    'reservations',
    'expenses',
    'support_tickets'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_isolation_%I ON public.%I;', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY tenant_isolation_%I ON public.%I FOR ALL USING (public.is_superadmin() OR restaurant_id = public.current_tenant_id()) WITH CHECK (public.is_superadmin() OR restaurant_id = public.current_tenant_id());',
      tbl,
      tbl
    );
  END LOOP;
END $$;

-- ============================================================================
-- Supabase Realtime Publication (temps réel KDS, Salle & Suivi QR sur Vercel)
-- ============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.dining_tables;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.stocks;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
