import path from 'node:path';
import knex, { type Knex } from 'knex';
import { AppError } from './services/errors.ts';

let singletonKnex: Knex | null = null;

interface Sqlite3Connection {
  run: (sql: string, cb: (err?: Error | null) => void) => void;
}

export function createKnexInstance(dbPath?: string): Knex {
  const filename =
    dbPath ||
    process.env.DATABASE_PATH ||
    path.resolve(process.cwd(), 'data/restomax.db');

  return knex({
    client: 'sqlite3',
    connection: { filename },
    useNullAsDefault: true,
    pool: {
      afterCreate: (
        conn: Sqlite3Connection,
        done: (err: Error | null, conn: unknown) => void,
      ) => {
        conn.run('PRAGMA foreign_keys = ON;', (fkErr) => {
          if (fkErr) {
            done(fkErr, conn);
            return;
          }
          if (filename !== ':memory:') {
            conn.run('PRAGMA journal_mode = WAL;', (walErr) => {
              done(walErr ?? null, conn);
            });
          } else {
            done(null, conn);
          }
        });
      },
    },
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  });
}

export function getKnex(): Knex {
  if (!singletonKnex) {
    singletonKnex = createKnexInstance();
  }
  return singletonKnex;
}

export function setKnexInstance(instance: Knex): void {
  singletonKnex = instance;
}

export async function runKnexMigrations(instance: Knex = getKnex()) {
  return instance.migrate.latest();
}

/**
 * Helper d'isolation multi-tenant pour Knex :
 * impose un `tenantId` valide et applique systématiquement le filtre sur la colonne tenant.
 */
export function scopeByTenant<TRecord extends Record<string, unknown>, TResult>(
  qb: Knex.QueryBuilder<TRecord, TResult>,
  tenantId: string | null | undefined,
  tenantColumn = 'tenant_id',
): Knex.QueryBuilder<TRecord, TResult> {
  if (!tenantId || tenantId.trim().length === 0) {
    throw new AppError(
      403,
      'Isolation multi-tenant : identifiant tenant requis.',
    );
  }
  return qb.where(tenantColumn, tenantId);
}

/**
 * Construit un QueryBuilder Knex déjà isolé sur un tenant donné.
 */
export function forTenant(
  tableName: string,
  tenantId: string | null | undefined,
  tenantColumn = 'tenant_id',
  instance: Knex = getKnex(),
) {
  return scopeByTenant(instance(tableName), tenantId, tenantColumn);
}

/**
 * Vérifie qu'une ressource appartient bien au tenant courant avant toute opération.
 */
export function assertSameTenant(
  recordTenantId: string | null | undefined,
  activeTenantId: string | null | undefined,
): void {
  if (
    !activeTenantId ||
    !recordTenantId ||
    recordTenantId !== activeTenantId
  ) {
    throw new AppError(403, 'Accès inter-tenant interdit.');
  }
}
