import fs from 'node:fs';
import path from 'node:path';
import type { Knex } from 'knex';

export interface BetterSqlite3RawConnection {
  pragma?: (sql: string) => unknown;
  run?: (sql: string, cb: (err?: Error | null) => void) => void;
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
      conn: BetterSqlite3RawConnection,
      done: (err: Error | null, conn: unknown) => void,
    ) => {
      try {
        if (typeof conn.pragma === 'function') {
          conn.pragma('foreign_keys = ON');
          conn.pragma('busy_timeout = 5000');
          if (!isMemory) {
            conn.pragma('journal_mode = WAL');
            conn.pragma('synchronous = NORMAL');
          }
          done(null, conn);
          return;
        }
        done(null, conn);
      } catch (err) {
        done(err instanceof Error ? err : new Error(String(err)), conn);
      }
    },
  };
}

export function buildKnexConfig(dbPath: string = defaultDbPath): Knex.Config {
  ensureParentDir(dbPath);

  return {
    client: 'better-sqlite3',
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
