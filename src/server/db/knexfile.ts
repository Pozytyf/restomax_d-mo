import fs from 'node:fs';
import path from 'node:path';
import type { Knex } from 'knex';

export interface Sqlite3RawConnection {
  run: (sql: string, cb: (err?: Error | null) => void) => void;
}

const defaultDbPath =
  process.env.DATABASE_PATH ||
  path.resolve(process.cwd(), 'data/restomax.db');

const migrationsDir = path.resolve(process.cwd(), 'src/server/migrations');

function ensureParentDir(filename: string): void {
  if (!filename || filename === ':memory:') return;
  const dir = path.dirname(filename);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function createSqlitePoolConfig(filename: string): Knex.PoolConfig {
  const isMemory = filename === ':memory:';

  return {
    // SQLite :memory: databases are isolated per connection, so max must stay 1.
    // File-backed SQLite with WAL mode safely supports multiple concurrent readers.
    min: 1,
    max: isMemory ? 1 : 5,
    acquireTimeoutMillis: 30_000,
    createTimeoutMillis: 15_000,
    idleTimeoutMillis: 30_000,
    reapIntervalMillis: 1_000,
    afterCreate: (
      conn: Sqlite3RawConnection,
      done: (err: Error | null, conn: unknown) => void,
    ) => {
      conn.run('PRAGMA foreign_keys = ON;', (fkErr) => {
        if (fkErr) {
          done(fkErr, conn);
          return;
        }
        conn.run('PRAGMA busy_timeout = 5000;', (busyErr) => {
          if (busyErr) {
            done(busyErr, conn);
            return;
          }
          if (isMemory) {
            done(null, conn);
            return;
          }
          conn.run('PRAGMA journal_mode = WAL;', (walErr) => {
            if (walErr) {
              done(walErr, conn);
              return;
            }
            conn.run('PRAGMA synchronous = NORMAL;', (syncErr) => {
              done(syncErr ?? null, conn);
            });
          });
        });
      });
    },
  };
}

export function buildKnexConfig(dbPath: string = defaultDbPath): Knex.Config {
  ensureParentDir(dbPath);

  return {
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
    pool: createSqlitePoolConfig(dbPath),
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  };
}

const knexConfig: Record<'development' | 'test' | 'production', Knex.Config> = {
  development: buildKnexConfig(defaultDbPath),
  test: buildKnexConfig(':memory:'),
  production: buildKnexConfig(defaultDbPath),
};

export default knexConfig;
