import type { Knex } from 'knex';

/**
 * Migration de mise à niveau idempotente :
 * garantit la présence des colonnes d'authentification et de contrôle d'accès
 * basé sur les rôles (role, permissions_json, token_version, last_login_at, updated_at)
 * sur une base existante déjà migrée.
 */
export async function up(knex: Knex): Promise<void> {
  const hasUsers = await knex.schema.hasTable('users');
  if (!hasUsers) return;

  const ensureColumn = async (col: string, ddl: string) => {
    const exists = await knex.schema.hasColumn('users', col);
    if (!exists) {
      await knex.raw(`ALTER TABLE users ADD COLUMN ${ddl}`);
    }
  };

  await ensureColumn(
    'tenant_id',
    'tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE',
  );
  await ensureColumn('role', "role TEXT NOT NULL DEFAULT 'OWNER'");
  await ensureColumn('permissions_json', "permissions_json TEXT NOT NULL DEFAULT '[]'");
  await ensureColumn('token_version', 'token_version INTEGER NOT NULL DEFAULT 1');
  await ensureColumn('last_login_at', 'last_login_at TEXT');
  await ensureColumn('updated_at', 'updated_at TEXT');

  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)',
  );
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_users_tenant_status ON users(tenant_id, status)',
  );
  await knex.raw(
    'CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role)',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_user ON users(tenant_id, id)',
  );
  await knex.raw(
    'CREATE UNIQUE INDEX IF NOT EXISTS uq_users_tenant_email ON users(tenant_id, email)',
  );
}

export async function down(_knex: Knex): Promise<void> {
  // Colonnes conservées pour préserver l'intégrité des comptes existants
}
