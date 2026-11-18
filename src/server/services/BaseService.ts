import { getDb } from '../db.ts';
import { type AuthContext, recordAudit } from '../auth.ts';
import type { BaseRepository } from '../repositories/BaseRepository.ts';
import { AppError } from './errors.ts';

/**
 * Classe de base pour tous les services métier.
 * Impose la résolution et la vérification du `tenantId` par défaut,
 * centralise la journalisation d'audit et les transactions métier.
 */
export abstract class BaseService<
  TRepo extends BaseRepository = BaseRepository,
> {
  protected readonly repository: TRepo;

  constructor(repository: TRepo) {
    this.repository = repository;
  }

  /**
   * Extrait et valide le `tenantId` (restaurantId) à partir du contexte d'authentification.
   */
  public requireTenantContext(auth: AuthContext | undefined): string {
    if (!auth || !auth.restaurantId || auth.restaurantId.trim().length === 0) {
      throw new AppError(
        403,
        'Isolation multi-tenant : aucun établissement actif dans le contexte.',
      );
    }
    return auth.restaurantId;
  }

  /**
   * Valide un `tenantId` explicite via le repository sous-jacent.
   */
  public ensureTenantId(tenantId: string | null | undefined): string {
    return this.repository.requireTenantId(tenantId);
  }

  /**
   * Vérifie que l'utilisateur authentifié a le droit d'accéder à la ressource du tenant cible.
   */
  public assertTenantAccess(
    auth: AuthContext,
    resourceTenantId: string | null | undefined,
  ): void {
    if (auth.role === 'SUPER_ADMIN') {
      return;
    }
    const activeTenant = this.requireTenantContext(auth);
    this.repository.assertOwnership(resourceTenantId, activeTenant);
  }

  /**
   * Exécute un traitement métier dans une transaction SQLite atomique.
   */
  protected runTransaction<T>(fn: () => T): T {
    return this.repository.runInTransaction(() => fn());
  }

  /**
   * Enregistre une entrée dans le journal d'audit multi-tenant.
   */
  protected audit(
    auth: AuthContext,
    params: {
      action: string;
      targetType: string;
      targetId: string;
      details?: string;
      restaurantId?: string | null;
    },
  ): void {
    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId:
        params.restaurantId !== undefined
          ? params.restaurantId
          : auth.restaurantId,
      action: params.action,
      targetType: params.targetType,
      targetId: params.targetId,
      details: params.details,
    });
  }
}
