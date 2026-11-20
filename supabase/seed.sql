-- ============================================================================
-- Resto’MAX SaaS — Données de démonstration pour Supabase
-- À exécuter après `supabase/schema.sql` dans Supabase > SQL Editor.
-- Mot de passe des comptes de démo : RestoMax2026!
-- ============================================================================

INSERT INTO public.platform_settings (key, value, updated_at) VALUES
  ('contact_email', 'contact@restomax.ci', NOW()::text),
  ('contact_phone', '+225 00 00 00 00 00 (Numéro de démonstration)', NOW()::text),
  ('commercial_region', 'Abidjan, Côte d’Ivoire · Zone UEMOA', NOW()::text),
  ('default_trial_days', '14', NOW()::text),
  ('platform_currency', 'XOF', NOW()::text)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.plans (
  id, code, name, tagline, price_monthly_xof, price_yearly_xof,
  trial_days, max_tables, max_staff, max_menu_items, is_demo_pricing,
  is_featured, features_json, active, created_at
) VALUES
  (
    'plan_essentiel',
    'ESSENTIEL',
    'Essentiel',
    'Pour les maquis, cafés et petits restaurants en lancement',
    25000,
    250000,
    14,
    15,
    6,
    80,
    1,
    0,
    '["Caisse POS tactile & reçus","Gestion jusqu’à 15 tables","Menu digital QR Code par table","Suivi des commandes en temps réel","Jusqu’à 6 comptes employés","Support email en français"]',
    1,
    NOW()::text
  ),
  (
    'plan_pro',
    'PROFESSIONNEL',
    'Professionnel',
    'Pour les restaurants structurés, lounges et brasseries',
    55000,
    550000,
    14,
    60,
    25,
    350,
    1,
    1,
    '["Toutes les fonctions Essentiel","Écrans KDS Cuisine & Bar séparés","Gestion avancée des stocks & alertes","Paiements partiels, partagés & Mobile Money (PayDunya)","Fidélité clients & réservations","Rapports financiers & marges FCFA"]',
    1,
    NOW()::text
  ),
  (
    'plan_premium',
    'PREMIUM',
    'Premium',
    'Pour les groupes multi-sites et établissements à fort volume',
    110000,
    1100000,
    14,
    250,
    100,
    1500,
    1,
    0,
    '["Toutes les fonctions Professionnel","Tables, personnel & catalogue étendus","Permissions granulaires personnalisées","Exports comptables & audit sécurité complet","Accompagnement déploiement prioritaire","API & intégrations marchandes dédiées"]',
    1,
    NOW()::text
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.restaurants (
  id, name, slug, email, phone, address, city, country, currency,
  timezone, tax_rate_percent, service_fee_percent, opening_hours,
  paydunya_mode, status, created_at
) VALUES
  (
    'rest_sillage_01',
    'Le Sillage Lagune (Démo)',
    'le-sillage-lagune',
    'direction@lesillage-demo.ci',
    '+225 07 00 00 01 01',
    'Boulevard Lagunaire, Zone 4 (Adresse démo)',
    'Abidjan',
    'Côte d''Ivoire',
    'XOF',
    'Africa/Abidjan',
    18,
    0,
    '11:00 - 00:00',
    'TEST',
    'ACTIVE',
    (NOW() - INTERVAL '45 days')::text
  ),
  (
    'rest_plateau_02',
    'La Terrasse du Plateau (Démo)',
    'terrasse-du-plateau',
    'contact@terrasse-demo.ci',
    '+225 05 00 00 02 02',
    'Avenue Chardy, Plateau (Adresse démo)',
    'Abidjan',
    'Côte d''Ivoire',
    'XOF',
    'Africa/Abidjan',
    18,
    0,
    '07:30 - 22:30',
    'TEST',
    'TRIAL',
    (NOW() - INTERVAL '6 days')::text
  ),
  (
    'rest_bassam_03',
    'Bistro Océan Bassam (Démo)',
    'bistro-ocean-bassam',
    'ocean@bassam-demo.ci',
    '+225 01 00 00 03 03',
    'Quartier France (Adresse démo)',
    'Grand-Bassam',
    'Côte d''Ivoire',
    'XOF',
    'Africa/Abidjan',
    18,
    5,
    '10:00 - 23:00',
    'TEST',
    'SUSPENDED',
    (NOW() - INTERVAL '70 days')::text
  )
ON CONFLICT (id) DO NOTHING;

-- Hash bcrypt coût 10 pour "RestoMax2026!"
INSERT INTO public.users (
  id, tenant_id, email, password_hash, full_name, phone, role, global_role, permissions_json, status, created_at
) VALUES
  ('usr_superadmin', NULL, 'superadmin@restomax.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Amadou Koné', '+225 07 00 00 00 01', 'SUPER_ADMIN', 'SUPER_ADMIN', '[]', 'ACTIVE', (NOW() - INTERVAL '90 days')::text),
  ('usr_owner_1', 'rest_sillage_01', 'proprietaire@lesillage.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Awa Touré', '+225 07 00 00 01 10', 'OWNER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '45 days')::text),
  ('usr_manager_1', 'rest_sillage_01', 'manager@lesillage.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Jean-Marc Kouassi', '+225 07 00 00 01 11', 'MANAGER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '40 days')::text),
  ('usr_cashier_1', 'rest_sillage_01', 'caisse@lesillage.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Mariam Bamba', '+225 07 00 00 01 12', 'CASHIER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '35 days')::text),
  ('usr_waiter_1', 'rest_sillage_01', 'serveur@lesillage.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Cédric Yao', '+225 07 00 00 01 13', 'WAITER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '30 days')::text),
  ('usr_kitchen_1', 'rest_sillage_01', 'cuisine@lesillage.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Chef Ibrahim Diallo', '+225 07 00 00 01 14', 'KITCHEN_BAR', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '30 days')::text),
  ('usr_owner_2', 'rest_plateau_02', 'proprietaire@terrasse.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Fatoumata Coulibaly', '+225 05 00 00 02 10', 'OWNER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '6 days')::text),
  ('usr_owner_3', 'rest_bassam_03', 'proprietaire@bassam.ci', '$2b$10$9fM6T5N3xP8kL2cQ1wV9Xe4Z7hB6mJ0dG5yH8uR2kS4nT7vX1pW2G', 'Koffi Mensah', '+225 01 00 00 03 10', 'OWNER', 'USER', '[]', 'ACTIVE', (NOW() - INTERVAL '70 days')::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.restaurant_members (id, restaurant_id, user_id, role, custom_permissions_json, status, created_at) VALUES
  ('mem_1', 'rest_sillage_01', 'usr_owner_1', 'OWNER', '[]', 'ACTIVE', (NOW() - INTERVAL '45 days')::text),
  ('mem_2', 'rest_sillage_01', 'usr_manager_1', 'MANAGER', '[]', 'ACTIVE', (NOW() - INTERVAL '40 days')::text),
  ('mem_3', 'rest_sillage_01', 'usr_cashier_1', 'CASHIER', '[]', 'ACTIVE', (NOW() - INTERVAL '35 days')::text),
  ('mem_4', 'rest_sillage_01', 'usr_waiter_1', 'WAITER', '[]', 'ACTIVE', (NOW() - INTERVAL '30 days')::text),
  ('mem_5', 'rest_sillage_01', 'usr_kitchen_1', 'KITCHEN_BAR', '[]', 'ACTIVE', (NOW() - INTERVAL '30 days')::text),
  ('mem_6', 'rest_plateau_02', 'usr_owner_2', 'OWNER', '[]', 'ACTIVE', (NOW() - INTERVAL '6 days')::text),
  ('mem_7', 'rest_bassam_03', 'usr_owner_3', 'OWNER', '[]', 'ACTIVE', (NOW() - INTERVAL '70 days')::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.subscriptions (id, restaurant_id, plan_id, billing_cycle, status, trial_ends_at, current_period_start, current_period_end, created_at) VALUES
  ('sub_1', 'rest_sillage_01', 'plan_pro', 'MONTHLY', 'ACTIVE', NULL, (NOW() - INTERVAL '15 days')::text, (NOW() + INTERVAL '15 days')::text, (NOW() - INTERVAL '45 days')::text),
  ('sub_2', 'rest_plateau_02', 'plan_essentiel', 'MONTHLY', 'TRIAL', (NOW() + INTERVAL '8 days')::text, (NOW() - INTERVAL '6 days')::text, (NOW() + INTERVAL '8 days')::text, (NOW() - INTERVAL '6 days')::text),
  ('sub_3', 'rest_bassam_03', 'plan_pro', 'MONTHLY', 'PAST_DUE', NULL, (NOW() - INTERVAL '40 days')::text, (NOW() - INTERVAL '10 days')::text, (NOW() - INTERVAL '70 days')::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_categories (id, restaurant_id, name, station, sort_order, active) VALUES
  ('cat_plats', 'rest_sillage_01', 'Plats Signature', 'KITCHEN', 1, 1),
  ('cat_grillades', 'rest_sillage_01', 'Grillades & Braises', 'KITCHEN', 2, 1),
  ('cat_entrees', 'rest_sillage_01', 'Entrées & Accompagnements', 'KITCHEN', 3, 1),
  ('cat_boissons', 'rest_sillage_01', 'Bar & Cocktails', 'BAR', 4, 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_items (id, restaurant_id, category_id, name, description, price_xof, cost_price_xof, image_url, available, sort_order, options_json, created_at) VALUES
  ('itm_capitaine', 'rest_sillage_01', 'cat_plats', 'Capitaine grillé & Attiéké', 'Filet de capitaine frais mariné aux herbes, attiéké doré, alloco croustillant et sauce tomate fraîche.', 12500, 4800, '/src/assets/images/dish_capitaine_attieke_1795030466633.jpg', 1, 1, '[{"id":"opt_piment_doux","label":"Piment à part","priceDeltaXof":0},{"id":"opt_extra_alloco","label":"Supplément Alloco","priceDeltaXof":1500}]', NOW()::text),
  ('itm_poulet', 'rest_sillage_01', 'cat_grillades', 'Poulet braisé aux épices', 'Cuisse de poulet fermier grillée au charbon de bois, pommes grenailles rôties et sauce poivre.', 9500, 3600, '/src/assets/images/dish_poulet_braise_1795030475827.jpg', 1, 2, '[{"id":"opt_attieke","label":"Accompagnement Attiéké","priceDeltaXof":1000},{"id":"opt_frites","label":"Accompagnement Frites maison","priceDeltaXof":1000}]', NOW()::text),
  ('itm_alloco', 'rest_sillage_01', 'cat_entrees', 'Assiette d’Alloco doré', 'Bananes plantains mûres frites à point, servies avec sauce pimentée maison.', 3500, 900, NULL, 1, 5, '[]', NOW()::text),
  ('itm_bissap', 'rest_sillage_01', 'cat_boissons', 'Bissap Signature Menthe', 'Infusion glacée de fleurs d’hibiscus, menthe fraîche, zeste d’orange sanguine et sirop de canne.', 3000, 600, '/src/assets/images/drink_bissap_signature_1795030467101.jpg', 1, 6, '[{"id":"opt_sans_sucre","label":"Sans sucre ajouté","priceDeltaXof":0}]', NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.dining_tables (id, restaurant_id, zone, label, capacity, status) VALUES
  ('tbl_1', 'rest_sillage_01', 'Terrasse Lagune', 'Table 01', 4, 'OCCUPIED'),
  ('tbl_2', 'rest_sillage_01', 'Terrasse Lagune', 'Table 02', 2, 'AVAILABLE'),
  ('tbl_3', 'rest_sillage_01', 'Terrasse Lagune', 'Table 03', 6, 'OCCUPIED'),
  ('tbl_4', 'rest_sillage_01', 'Salle Climatisée', 'Table 04', 4, 'RESERVED'),
  ('tbl_5', 'rest_sillage_01', 'Salle Climatisée', 'Table 05', 4, 'AVAILABLE'),
  ('tbl_6', 'rest_sillage_01', 'Salon VIP', 'VIP 01', 8, 'AVAILABLE')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.qr_codes (id, restaurant_id, table_id, token, version, status, created_at) VALUES
  ('qr_tbl_1', 'rest_sillage_01', 'tbl_1', 'sillage-table-01-v1', 1, 'ACTIVE', NOW()::text),
  ('qr_tbl_2', 'rest_sillage_01', 'tbl_2', 'sillage-table-02-v1', 1, 'ACTIVE', NOW()::text),
  ('qr_tbl_3', 'rest_sillage_01', 'tbl_3', 'sillage-table-03-v1', 1, 'ACTIVE', NOW()::text),
  ('qr_tbl_4', 'rest_sillage_01', 'tbl_4', 'sillage-table-04-v1', 1, 'ACTIVE', NOW()::text),
  ('qr_tbl_5', 'rest_sillage_01', 'tbl_5', 'sillage-table-05-v1', 1, 'ACTIVE', NOW()::text),
  ('qr_tbl_6', 'rest_sillage_01', 'tbl_6', 'sillage-vip-01-v1', 1, 'ACTIVE', NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.stocks (id, restaurant_id, name, unit, quantity, min_threshold, unit_cost_xof, supplier_name, updated_at) VALUES
  ('stk_1', 'rest_sillage_01', 'Filet de Capitaine frais', 'kg', 4.5, 8, 4200, 'Pêcherie du Port', NOW()::text),
  ('stk_2', 'rest_sillage_01', 'Attiéké qualité supérieure', 'kg', 24, 10, 800, 'Coopérative Dabou', NOW()::text),
  ('stk_3', 'rest_sillage_01', 'Poulet fermier', 'pièce', 18, 12, 2800, 'Fermes d’Azaguié', NOW()::text),
  ('stk_4', 'rest_sillage_01', 'Fleurs de Bissap séchées', 'kg', 2.2, 5, 1900, 'Marché d’Adjamé', NOW()::text),
  ('stk_5', 'rest_sillage_01', 'Banane plantain mûre', 'régime', 9, 4, 3500, 'Producteurs Agboville', NOW()::text)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.menu_item_recipes (id, restaurant_id, menu_item_id, stock_id, quantity_per_unit, created_at, updated_at) VALUES
  ('rec_1', 'rest_sillage_01', 'itm_capitaine', 'stk_1', 0.35, NOW()::text, NOW()::text),
  ('rec_2', 'rest_sillage_01', 'itm_capitaine', 'stk_2', 0.25, NOW()::text, NOW()::text),
  ('rec_3', 'rest_sillage_01', 'itm_poulet', 'stk_3', 0.5, NOW()::text, NOW()::text),
  ('rec_4', 'rest_sillage_01', 'itm_alloco', 'stk_5', 0.15, NOW()::text, NOW()::text),
  ('rec_5', 'rest_sillage_01', 'itm_bissap', 'stk_4', 0.05, NOW()::text, NOW()::text)
ON CONFLICT (id) DO NOTHING;
