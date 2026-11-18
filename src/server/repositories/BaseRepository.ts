import type { Database as SqliteDatabase } from 'better-sqlite3';
import type { Knex } from 'knex';
import { getDb, generateId } from '../db.ts';
import { getKnex, scopeByTenant } from '../knex.ts';
import { AppError } from '../services/errors.ts';

export interface BaseRepositoryOptions {
  tableName?: string;
  tenantColumn?: string;
}

/**
 * Classe de base pour tous les repositories backend.
 * Garantit l'isolation multi-tenant par défaut (`tenantId`) sur les opérations SQLite/Knex
 * et fournit une gestion unifiée des transactions.
 */
export abstract class BaseRepository<
  TRecord extends Record<string, unknown> = Record<string, unknown>,
> {
  protected readonly tableName: string;
  protected readonly tenantColumn: string;

  constructor(options: BaseRepositoryOptions = {}) {
    this.tableName = options.tableName || '';
    this.tenantColumn = options.tenantColumn || 'restaurant_id';
  }

  protected get db(): SqliteDatabase {
    return getDb();
  }

  protected get knex(): Knex {
    return getKnex();
  }

  protected nextId(prefix: string): string {
    return generateId(prefix);
  }

  /**
   * Valide qu'un identifiant de tenant non vide est présent avant toute requête isolée.
   */
  public requireTenantId(tenantId: string | null | undefined): string {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim().length === 0) {
      throw new AppError(
        403,
        'Isolation multi-tenant : identifiant tenant manquant.',
      );
    }
    return tenantId.trim();
  }

  /**
   * Vérifie qu'un enregistrement appartient bien au tenant attendu.
   */
  public assertOwnership(
    recordTenantId: string | null | undefined,
    expectedTenantId: string,
  ): void {
    const validTenant = this.requireTenantId(expectedTenantId);
    if (!recordTenantId || recordTenantId !== validTenant) {
      throw new AppError(403, 'Accès inter-tenant interdit.');
    }
  }

  /**
   * Retourne un QueryBuilder Knex pré-filtré par `tenantId` sur la table du repository.
   */
  protected queryForTenant(
    tenantId: string | null | undefined,
    tableOverride?: string,
    columnOverride?: string,
  ) {
    const targetTable = tableOverride || this.tableName;
    if (!targetTable) {
      throw new Error('BaseRepository: tableName requis pour queryForTenant.');
    }
    return scopeByTenant(
      this.knex(targetTable),
      this.requireTenantId(tenantId),
      columnOverride || this.tenantColumn,
    );
  }

  /**
   * Lecture synchrone (better-sqlite3) strictement bornée au tenant courant.
   */
  public findAllByTenant(
    tenantId: string | null | undefined,
    orderByClause?: string,
  ): TRecord[] {
    const validTenant = this.requireTenantId(tenantId);
    const orderSql = orderByClause ? ` ORDER BY ${orderByClause}` : '';
    return this.db
      .prepare(
        `SELECT * FROM ${this.tableName} WHERE ${this.tenantColumn} = ?${orderSql}`,
      )
      .all(validTenant) as TRecord[];
  }

  /**
   * Lecture d'un enregistrement par ID + tenantId (empêche toute fuite cross-tenant).
   */
  public findByIdAndTenant(
    id: string,
    tenantId: string | null | undefined,
  ): TRecord | undefined {
    const validTenant = this.requireTenantId(tenantId);
    return this.db
      .prepare(
        `SELECT * FROM ${this.tableName} WHERE id = ? AND ${this.tenantColumn} = ?`,
      )
      .get(id, validTenant) as TRecord | undefined;
  }

  /**
   * Insertion sécurisée : force systématiquement la colonne tenant au `tenantId` actif.
   */
  public insertForTenant(
    tenantId: string | null | undefined,
    data: Record<string, unknown>,
  ): void {
    const validTenant = this.requireTenantId(tenantId);
    const payload: Record<string, unknown> = {
      ...data,
      [this.tenantColumn]: validTenant,
    };
    const cols = Object.keys(payload);
    const placeholders = cols.map(() => '?').join(', ');
    const values = cols.map((c) => payload[c]);

    this.db
      .prepare(
        `INSERT INTO ${this.tableName} (${cols.join(', ')}) VALUES (${placeholders})`,
      )
      .run(...values);
  }

  /**
   * Mise à jour strictement bornée au tenant (impossible de modifier `id` ou la colonne tenant).
   */
  public updateByIdAndTenant(
    id: string,
    tenantId: string | null | undefined,
    patch: Record<string, unknown>,
  ): number {
    const validTenant = this.requireTenantId(tenantId);
    const entries = Object.entries(patch).filter(
      ([k, v]) =>
        k !== 'id' && k !== this.tenantColumn && v !== undefined,
    );
    if (entries.length === 0) return 0;

    const setSql = entries.map(([k]) => `${k} = ?`).join(', ');
    const values = entries.map(([, v]) => v);
    const info = this.db
      .prepare(
        `UPDATE ${this.tableName} SET ${setSql} WHERE id = ? AND ${this.tenantColumn} = ?`,
      )
      .run(...values, id, validTenant);
    return info.changes;
  }

  /**
   * Suppression strictement bornée au tenant.
   */
  public deleteByIdAndTenant(
    id: string,
    tenantId: string | null | undefined,
  ): number {
    const validTenant = this.requireTenantId(tenantId);
    const info = this.db
      .prepare(
        `DELETE FROM ${this.tableName} WHERE id = ? AND ${this.tenantColumn} = ?`,
      )
      .run(id, validTenant);
    return info.changes;
  }

  /**
   * Comptage strictement borné au tenant.
   */
  public countByTenant(tenantId: string | null | undefined): number {
    const validTenant = this.requireTenantId(tenantId);
    const row = this.db
      .prepare(
        `SELECT COUNT(*) as c FROM ${this.tableName} WHERE ${this.tenantColumn} = ?`,
      )
      .get(validTenant) as { c: number };
    return row.c;
  }

  /**
   * Exécute un bloc dans une transaction SQLite immédiate (BEGIN IMMEDIATE / COMMIT / ROLLBACK).
   */
  public runInTransaction<T>(fn: (db: SqliteDatabase) => T): T {
    const db = this.db;
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = fn(db);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}
