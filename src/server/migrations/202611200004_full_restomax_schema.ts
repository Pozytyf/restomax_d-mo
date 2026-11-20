import type { Knex } from 'knex';

/**
 * Migration Knex complète (PostgreSQL / Supabase & SQLite) :
 * crée les tables métier restantes si absentes afin de pouvoir initialiser
 * une base Supabase PostgreSQL vierge via `npm run migrate:latest`.
 */
export async function up(knex: Knex): Promise<void> {
  if (!(await knex.schema.hasTable('platform_settings'))) {
    await knex.schema.createTable('platform_settings', (t) => {
      t.string('key').primary();
      t.text('value').notNullable();
      t.string('updated_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('plans'))) {
    await knex.schema.createTable('plans', (t) => {
      t.string('id').primary();
      t.string('code').notNullable().unique();
      t.string('name').notNullable();
      t.text('tagline').notNullable();
      t.integer('price_monthly_xof').notNullable();
      t.integer('price_yearly_xof').notNullable();
      t.integer('trial_days').notNullable().defaultTo(14);
      t.integer('max_tables').notNullable();
      t.integer('max_staff').notNullable();
      t.integer('max_menu_items').notNullable();
      t.integer('is_demo_pricing').notNullable().defaultTo(1);
      t.integer('is_featured').notNullable().defaultTo(0);
      t.text('features_json').notNullable().defaultTo('[]');
      t.integer('active').notNullable().defaultTo(1);
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('restaurants'))) {
    await knex.schema.createTable('restaurants', (t) => {
      t.string('id').primary();
      t.string('name').notNullable();
      t.string('slug').notNullable().unique();
      t.string('email').notNullable();
      t.string('phone').notNullable().defaultTo('');
      t.string('address').notNullable().defaultTo('');
      t.string('city').notNullable().defaultTo('Abidjan');
      t.string('country').notNullable().defaultTo("Côte d'Ivoire");
      t.string('currency').notNullable().defaultTo('XOF');
      t.string('timezone').notNullable().defaultTo('Africa/Abidjan');
      t.float('tax_rate_percent').notNullable().defaultTo(18.0);
      t.float('service_fee_percent').notNullable().defaultTo(0.0);
      t.string('opening_hours').notNullable().defaultTo('08:00 - 23:30');
      t.string('paydunya_mode').notNullable().defaultTo('TEST');
      t.string('paydunya_public_key').notNullable().defaultTo('');
      t.string('paydunya_private_key').notNullable().defaultTo('');
      t.string('paydunya_token').notNullable().defaultTo('');
      t.text('printer_settings_json')
        .notNullable()
        .defaultTo(
          '{"paperWidth":"80mm","connectionType":"BROWSER","printerHost":"","printerPort":9100,"autoPrintReceipt":false,"autoPrintKitchenTicket":false}',
        );
      t.string('status').notNullable().defaultTo('TRIAL');
      t.string('deleted_at');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('restaurant_members'))) {
    await knex.schema.createTable('restaurant_members', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('user_id').notNullable();
      t.string('role').notNullable();
      t.text('custom_permissions_json').notNullable().defaultTo('[]');
      t.string('status').notNullable().defaultTo('ACTIVE');
      t.string('created_at').notNullable();
      t.unique(['restaurant_id', 'user_id']);
    });
  }

  if (!(await knex.schema.hasTable('sessions'))) {
    await knex.schema.createTable('sessions', (t) => {
      t.string('id').primary();
      t.string('user_id').notNullable();
      t.string('restaurant_id');
      t.string('expires_at').notNullable();
      t.string('revoked_at');
      t.string('user_agent');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('subscriptions'))) {
    await knex.schema.createTable('subscriptions', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('plan_id').notNullable();
      t.string('billing_cycle').notNullable().defaultTo('MONTHLY');
      t.string('status').notNullable().defaultTo('TRIAL');
      t.string('trial_ends_at');
      t.string('current_period_start').notNullable();
      t.string('current_period_end').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('platform_invoices'))) {
    await knex.schema.createTable('platform_invoices', (t) => {
      t.string('id').primary();
      t.string('invoice_number').notNullable().unique();
      t.string('restaurant_id').notNullable();
      t.string('subscription_id');
      t.integer('amount_xof').notNullable();
      t.string('status').notNullable().defaultTo('PAID');
      t.string('payment_method').notNullable();
      t.string('mode').notNullable().defaultTo('TEST');
      t.string('paid_at');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('menu_categories'))) {
    await knex.schema.createTable('menu_categories', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('name').notNullable();
      t.string('station').notNullable().defaultTo('KITCHEN');
      t.integer('sort_order').notNullable().defaultTo(0);
      t.integer('active').notNullable().defaultTo(1);
    });
  }

  if (!(await knex.schema.hasTable('menu_items'))) {
    await knex.schema.createTable('menu_items', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('category_id').notNullable();
      t.string('name').notNullable();
      t.text('description').notNullable().defaultTo('');
      t.integer('price_xof').notNullable();
      t.integer('cost_price_xof').notNullable().defaultTo(0);
      t.string('image_url');
      t.integer('available').notNullable().defaultTo(1);
      t.integer('sort_order').notNullable().defaultTo(0);
      t.text('options_json').notNullable().defaultTo('[]');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('dining_tables'))) {
    await knex.schema.createTable('dining_tables', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('zone').notNullable().defaultTo('Salle principale');
      t.string('label').notNullable();
      t.integer('capacity').notNullable().defaultTo(4);
      t.string('status').notNullable().defaultTo('AVAILABLE');
    });
  }

  if (!(await knex.schema.hasTable('qr_codes'))) {
    await knex.schema.createTable('qr_codes', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('table_id').notNullable();
      t.string('token').notNullable().unique();
      t.integer('version').notNullable().defaultTo(1);
      t.string('status').notNullable().defaultTo('ACTIVE');
      t.string('created_at').notNullable();
      t.string('revoked_at');
    });
  }

  if (!(await knex.schema.hasTable('qr_table_sessions'))) {
    await knex.schema.createTable('qr_table_sessions', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('table_id').notNullable();
      t.string('qr_token').notNullable();
      t.string('expires_at').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('orders'))) {
    await knex.schema.createTable('orders', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('order_number').notNullable();
      t.string('order_type').notNullable();
      t.string('table_id');
      t.string('customer_name').notNullable().defaultTo('Client comptoir');
      t.string('status').notNullable().defaultTo('PENDING');
      t.integer('subtotal_xof').notNullable();
      t.integer('discount_xof').notNullable().defaultTo(0);
      t.integer('tax_xof').notNullable().defaultTo(0);
      t.integer('total_xof').notNullable();
      t.integer('paid_xof').notNullable().defaultTo(0);
      t.text('notes').notNullable().defaultTo('');
      t.string('idempotency_key');
      t.string('created_by_user_id');
      t.string('created_at').notNullable();
      t.string('updated_at').notNullable();
      t.unique(['restaurant_id', 'idempotency_key']);
    });
  }

  if (!(await knex.schema.hasTable('order_items'))) {
    await knex.schema.createTable('order_items', (t) => {
      t.string('id').primary();
      t.string('order_id').notNullable();
      t.string('menu_item_id').notNullable();
      t.string('name').notNullable();
      t.string('station').notNullable();
      t.integer('unit_price_xof').notNullable();
      t.string('options_summary').notNullable().defaultTo('');
      t.integer('options_delta_xof').notNullable().defaultTo(0);
      t.integer('quantity').notNullable();
      t.integer('line_total_xof').notNullable();
      t.text('notes').notNullable().defaultTo('');
      t.string('prep_status').notNullable().defaultTo('PENDING');
    });
  }

  if (!(await knex.schema.hasTable('payments'))) {
    await knex.schema.createTable('payments', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('order_id').notNullable();
      t.integer('amount_xof').notNullable();
      t.string('method').notNullable();
      t.string('status').notNullable().defaultTo('PAID');
      t.string('mode').notNullable().defaultTo('TEST');
      t.string('reference').notNullable();
      t.string('idempotency_key');
      t.string('created_by_user_id');
      t.string('created_at').notNullable();
      t.unique(['restaurant_id', 'idempotency_key']);
    });
  }

  if (!(await knex.schema.hasTable('stocks'))) {
    await knex.schema.createTable('stocks', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('name').notNullable();
      t.string('unit').notNullable().defaultTo('kg');
      t.float('quantity').notNullable().defaultTo(0);
      t.float('min_threshold').notNullable().defaultTo(5);
      t.integer('unit_cost_xof').notNullable().defaultTo(0);
      t.string('supplier_name').notNullable().defaultTo('');
      t.string('updated_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('stock_movements'))) {
    await knex.schema.createTable('stock_movements', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('stock_id').notNullable();
      t.string('movement_type').notNullable();
      t.float('quantity_delta').notNullable();
      t.text('reason').notNullable().defaultTo('');
      t.string('created_by_user_id');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('stock_alert_settings'))) {
    await knex.schema.createTable('stock_alert_settings', (t) => {
      t.string('restaurant_id').primary();
      t.integer('in_app_enabled').notNullable().defaultTo(1);
      t.integer('email_enabled').notNullable().defaultTo(1);
      t.text('recipient_emails').notNullable().defaultTo('');
      t.string('smtp_host').notNullable().defaultTo('');
      t.integer('smtp_port').notNullable().defaultTo(587);
      t.integer('smtp_secure').notNullable().defaultTo(0);
      t.string('smtp_user').notNullable().defaultTo('');
      t.string('smtp_pass').notNullable().defaultTo('');
      t.string('smtp_from').notNullable().defaultTo('');
      t.string('updated_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('notifications'))) {
    await knex.schema.createTable('notifications', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('type').notNullable();
      t.string('title').notNullable();
      t.text('message').notNullable();
      t.string('stock_id');
      t.integer('email_dispatched').notNullable().defaultTo(0);
      t.text('email_recipients').notNullable().defaultTo('');
      t.string('email_status').notNullable().defaultTo('SKIPPED');
      t.integer('is_read').notNullable().defaultTo(0);
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('customers'))) {
    await knex.schema.createTable('customers', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('full_name').notNullable();
      t.string('phone').notNullable();
      t.string('email').notNullable().defaultTo('');
      t.integer('loyalty_points').notNullable().defaultTo(0);
      t.integer('total_spent_xof').notNullable().defaultTo(0);
      t.integer('visits_count').notNullable().defaultTo(0);
      t.text('preferences').notNullable().defaultTo('');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('reservations'))) {
    await knex.schema.createTable('reservations', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('customer_name').notNullable();
      t.string('customer_phone').notNullable();
      t.integer('party_size').notNullable().defaultTo(2);
      t.string('reserved_at').notNullable();
      t.string('table_id');
      t.string('status').notNullable().defaultTo('CONFIRMED');
      t.text('notes').notNullable().defaultTo('');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('expenses'))) {
    await knex.schema.createTable('expenses', (t) => {
      t.string('id').primary();
      t.string('restaurant_id').notNullable();
      t.string('category').notNullable();
      t.text('description').notNullable();
      t.integer('amount_xof').notNullable();
      t.string('expense_date').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('support_tickets'))) {
    await knex.schema.createTable('support_tickets', (t) => {
      t.string('id').primary();
      t.string('restaurant_id');
      t.string('created_by_email').notNullable();
      t.string('subject').notNullable();
      t.string('category').notNullable();
      t.string('priority').notNullable().defaultTo('MEDIUM');
      t.string('status').notNullable().defaultTo('OPEN');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('ticket_messages'))) {
    await knex.schema.createTable('ticket_messages', (t) => {
      t.string('id').primary();
      t.string('ticket_id').notNullable();
      t.string('author').notNullable();
      t.string('role').notNullable();
      t.text('body').notNullable();
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('audit_logs'))) {
    await knex.schema.createTable('audit_logs', (t) => {
      t.string('id').primary();
      t.string('actor_user_id');
      t.string('actor_email').notNullable();
      t.string('actor_role').notNullable();
      t.string('restaurant_id');
      t.string('action').notNullable();
      t.string('target_type').notNullable();
      t.string('target_id').notNullable();
      t.text('details').notNullable().defaultTo('');
      t.string('created_at').notNullable();
    });
  }

  if (!(await knex.schema.hasTable('contact_leads'))) {
    await knex.schema.createTable('contact_leads', (t) => {
      t.string('id').primary();
      t.string('lead_type').notNullable();
      t.string('full_name').notNullable();
      t.string('email').notNullable();
      t.string('phone').notNullable().defaultTo('');
      t.string('restaurant_name').notNullable().defaultTo('');
      t.string('city').notNullable().defaultTo('');
      t.text('message').notNullable().defaultTo('');
      t.string('created_at').notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'contact_leads',
    'audit_logs',
    'ticket_messages',
    'support_tickets',
    'expenses',
    'reservations',
    'customers',
    'notifications',
    'stock_alert_settings',
    'stock_movements',
    'stocks',
    'payments',
    'order_items',
    'orders',
    'qr_table_sessions',
    'qr_codes',
    'dining_tables',
    'menu_items',
    'menu_categories',
    'platform_invoices',
    'subscriptions',
    'sessions',
    'restaurant_members',
    'restaurants',
    'plans',
    'platform_settings',
  ];
  for (const tbl of tables) {
    await knex.schema.dropTableIfExists(tbl);
  }
}
