import path from 'node:path';
import type { Knex } from 'knex';

const defaultDbPath =
  process.env.DATABASE_PATH ||
  path.resolve(process.cwd(), 'data/restomax.db');

interface Sqlite3Connection {
  run: (sql: string, cb: (err?: Error | null) => void) => void;
}

const commonPool: Knex.PoolConfig = {
  afterCreate: (
    conn: Sqlite3Connection,
    done: (err: Error | null, conn: unknown) => void,
  ) => {
    conn.run('PRAGMA foreign_keys = ON;', (err) => {
      done(err ?? null, conn);
    });
  },
};

const config: Record<string, Knex.Config> = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: defaultDbPath,
    },
    useNullAsDefault: true,
    pool: commonPool,
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },
  test: {
    client: 'sqlite3',
    connection: {
      filename: ':memory:',
    },
    useNullAsDefault: true,
    pool: commonPool,
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },
  production: {
    client: 'sqlite3',
    connection: {
      filename: defaultDbPath,
    },
    useNullAsDefault: true,
    pool: commonPool,
    migrations: {
      directory: path.resolve(process.cwd(), 'src/server/migrations'),
      extension: 'ts',
      tableName: 'knex_migrations',
    },
  },
};

export default config;
