import type { Knex } from 'knex';

/**
 * Migration Knex : création des tables `tenants` (restaurants) et `users`
 * avec clé étrangère `tenant_id`, contraintes d'isolation multi-tenant,
 * champs d'authentification et contrôle d'accès basé sur les rôles (RBAC).
 */
export async function up(knex: Knex): Promise<void> {
  const hasTenants = await knex.schema.hasTable('tenants');
  if (!hasTenants) {
    await knex.schema.createTable('tenants', (table) => {
      table.string('id').primary();
      table.string('name').notNullable();
      table.string('slug').notNullable().unique();
      table.string('email').notNullable();
      table.string('phone').notNullable().defaultTo('');
      table.string('address').notNullable().defaultTo('');
      table.string('city').notNullable().defaultTo('Abidjan');
      table.string('country').notNullable().defaultTo("Côte d'Ivoire");
      table.string('currency').notNullable().defaultTo('XOF');
      table.string('timezone').notNullable().defaultTo('Africa/Abidjan');
      table.float('tax_rate_percent').notNullable().defaultTo(18.0);
      table.float('service_fee_percent').notNullable().defaultTo(0.0);
      table.string('opening_hours').notNullable().defaultTo('08:00 - 23:30');
      table.string('paydunya_mode').notNullable().defaultTo('TEST');
      table.string('paydunya_public_key').notNullable().defaultTo('');
      table.string('paydunya_private_key').notNullable().defaultTo('');
      table.string('paydunya_token').notNullable().defaultTo('');
      table
        .string('status')
        .notNullable()
        .defaultTo('TRIAL')
        .index('idx_tenants_status');
      table.string('deleted_at').nullable();
      table.string('created_at').notNullable();

      table.check(
        "status IN ('TRIAL', 'ACTIVE', 'SUSPENDED', 'DELETED')",
        [],
        'chk_tenants_status',
      );
    });
  }

  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) {
    await knex.schema.createTable('users', (table) => {
      // Identifiant et rattachement multi-tenant
      table.string('id').primary();
      table
        .string('tenant_id')
        .nullable()
        .references('id')
        .inTable('tenants')
        .onDelete('CASCADE');

      // Authentification & profil
      table.string('email').notNullable().unique();
      table.string('password_hash').notNullable();
      table.string('full_name').notNullable();
      table.string('phone').nullable();
      table.string('status').notNullable().defaultTo('ACTIVE');
      table.integer('token_version').notNullable().defaultTo(1);
      table.string('last_login_at').nullable();

      // Contrôle d'accès basé sur les rôles (RBAC)
      table.string('role').notNullable().defaultTo('OWNER');
      table.string('global_role').notNullable().defaultTo('USER');
      table.text('permissions_json').notNullable().defaultTo('[]');

      table.string('created_at').notNullable();
      table.string('updated_at').nullable();

      // Contraintes d'intégrité multi-tenant et RBAC
      table.check(
        "global_role = 'SUPER_ADMIN' OR tenant_id IS NOT NULL",
        [],
        'chk_users_tenant_required',
      );
      table.check(
        "role IN ('SUPER_ADMIN', 'OWNER', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN_BAR')",
        [],
        'chk_users_role',
      );
      table.check(
        "status IN ('ACTIVE', 'SUSPENDED', 'REVOKED')",
        [],
        'chk_users_status',
      );

      // Contraintes d'unicité et index dédiés à l'isolation multi-tenant
      table.unique(['tenant_id', 'id'], { indexName: 'uq_users_tenant_user' });
      table.unique(['tenant_id', 'email'], {
        indexName: 'uq_users_tenant_email',
      });
      table.index(['tenant_id'], 'idx_users_tenant_id');
      table.index(['tenant_id', 'status'], 'idx_users_tenant_status');
      table.index(['tenant_id', 'role'], 'idx_users_tenant_role');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
  await knex.schema.dropTableIfExists('tenants');
}
