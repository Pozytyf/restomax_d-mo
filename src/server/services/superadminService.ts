import bcrypt from 'bcryptjs';
import { getDb, generateId } from '../db.ts';
import { type AuthContext, recordAudit } from '../auth.ts';
import { broadcastSuperAdminEvent } from '../ws.ts';
import {
  SuperadminRepository,
  superadminRepository,
} from '../repositories/superadminRepository.ts';
import { BaseService } from './BaseService.ts';
import { AppError } from './errors.ts';

export class SuperadminService extends BaseService<SuperadminRepository> {
  constructor(repo = superadminRepository) {
    super(repo);
  }

  getDashboard() {
    const {
      counts,
      activeSubs,
      platformRev,
      openTickets,
      usersCount,
      leadsCount,
      recentRestaurants,
      recentAudit,
      monthlyPlatformSeries,
    } = superadminRepository.getPlatformDashboardData();

    return {
      kpis: {
        totalRestaurants: Number(counts.total || 0),
        activeRestaurants: Number(counts.active || 0),
        trialRestaurants: Number(counts.trial || 0),
        suspendedRestaurants: Number(counts.suspended || 0),
        activeSubscriptions: Number(activeSubs.c || 0),
        platformRevenueXof: Number(platformRev.paid_xof || 0),
        pendingPaymentsXof: Number(platformRev.pending_xof || 0),
        openTicketsCount: Number(openTickets.c || 0),
        activeUsersCount: Number(usersCount.c || 0),
        leadsCount: Number(leadsCount.c || 0),
      },
      recentRestaurants,
      recentAudit,
      monthlyPlatformSeries,
    };
  }

  listRestaurants() {
    return superadminRepository.findAllRestaurants();
  }

  createRestaurant(auth: AuthContext, body: Record<string, unknown>) {
    const { name, city, ownerName, ownerEmail, phone, planCode } = body || {};
    if (
      typeof name !== 'string' ||
      typeof ownerName !== 'string' ||
      typeof ownerEmail !== 'string'
    ) {
      throw new AppError(400, 'Nom, propriétaire et email requis.');
    }

    const cleanEmail = ownerEmail.trim().toLowerCase();
    const existing = superadminRepository.findUserByEmail(cleanEmail);
    if (existing) {
      throw new AppError(409, 'Email propriétaire déjà utilisé.');
    }

    const plan = superadminRepository.findPlanByCodeOrDefault(
      String(planCode || 'ESSENTIEL').toUpperCase(),
    );
    const now = new Date().toISOString();
    const rid = generateId('rest');
    const uid = generateId('usr');
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Math.floor(100 + Math.random() * 900)}`;

    const db = getDb();
    db.exec('BEGIN IMMEDIATE');
    try {
      superadminRepository.createRestaurantAdmin({
        rid,
        uid,
        name: name.trim(),
        slug,
        cleanEmail,
        phone: String(phone || ''),
        city: String(city || 'Abidjan'),
        ownerName: ownerName.trim(),
        passwordHash: bcrypt.hashSync('RestoMax2026!', 10),
        planId: plan.id,
        now,
        periodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      });

      recordAudit(db, {
        actorUserId: auth.userId,
        actorEmail: auth.email,
        actorRole: 'SUPER_ADMIN',
        restaurantId: rid,
        action: 'RESTAURANT_CREATED_BY_ADMIN',
        targetType: 'RESTAURANT',
        targetId: rid,
        details: name.trim(),
      });

      db.exec('COMMIT');
      return rid;
    } catch {
      db.exec('ROLLBACK');
      throw new AppError(500, 'Erreur création restaurant.');
    }
  }

  updateRestaurantStatus(
    auth: AuthContext,
    rid: string,
    body: Record<string, unknown>,
  ) {
    const { status, reason } = body || {};
    if (
      !['ACTIVE', 'TRIAL', 'SUSPENDED', 'DELETED'].includes(String(status))
    ) {
      throw new AppError(400, 'Statut invalide.');
    }

    superadminRepository.updateRestaurantStatus(rid, String(status));

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: 'SUPER_ADMIN',
      restaurantId: rid,
      action: `RESTAURANT_${status}`,
      targetType: 'RESTAURANT',
      targetId: rid,
      details: String(reason || ''),
    });

    broadcastSuperAdminEvent('restaurant:updated', {
      restaurantId: rid,
      status,
    });
  }

  listPlans() {
    const plans = superadminRepository.findAllPlans();
    return plans.map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      tagline: p.tagline,
      priceMonthlyXof: Number(p.price_monthly_xof),
      priceYearlyXof: Number(p.price_yearly_xof),
      trialDays: Number(p.trial_days),
      maxTables: Number(p.max_tables),
      maxStaff: Number(p.max_staff),
      maxMenuItems: Number(p.max_menu_items),
      isDemoPricing: Boolean(p.is_demo_pricing),
      isFeatured: Boolean(p.is_featured),
      features: JSON.parse(String(p.features_json || '[]')),
      active: Boolean(p.active),
    }));
  }

  updatePlan(
    auth: AuthContext,
    planId: string,
    body: Record<string, unknown>,
  ) {
    const {
      name,
      tagline,
      priceMonthlyXof,
      priceYearlyXof,
      trialDays,
      maxTables,
      maxStaff,
      active,
    } = body || {};

    superadminRepository.updatePlan(planId, {
      name: name ? String(name).trim() : null,
      tagline: tagline ? String(tagline).trim() : null,
      priceMonthlyXof: Number.isFinite(Number(priceMonthlyXof))
        ? Math.round(Number(priceMonthlyXof))
        : null,
      priceYearlyXof: Number.isFinite(Number(priceYearlyXof))
        ? Math.round(Number(priceYearlyXof))
        : null,
      trialDays: Number.isFinite(Number(trialDays))
        ? Math.round(Number(trialDays))
        : null,
      maxTables: Number.isFinite(Number(maxTables))
        ? Math.round(Number(maxTables))
        : null,
      maxStaff: Number.isFinite(Number(maxStaff))
        ? Math.round(Number(maxStaff))
        : null,
      active: typeof active === 'boolean' ? (active ? 1 : 0) : null,
    });

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: 'SUPER_ADMIN',
      restaurantId: null,
      action: 'PLAN_UPDATED',
      targetType: 'PLAN',
      targetId: planId,
      details: 'Mise à jour tarif/limites',
    });
  }

  listSubscriptions() {
    return superadminRepository.findAllSubscriptions();
  }

  listInvoices() {
    return superadminRepository.findPlatformInvoices();
  }

  markInvoicePaid(auth: AuthContext, invoiceId: string) {
    superadminRepository.markInvoicePaid(invoiceId);
    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: 'SUPER_ADMIN',
      restaurantId: null,
      action: 'PLATFORM_INVOICE_PAID',
      targetType: 'INVOICE',
      targetId: invoiceId,
    });
  }

  listUsers() {
    return superadminRepository.findAllUsers();
  }

  updateUserStatus(
    auth: AuthContext,
    targetUserId: string,
    status: unknown,
  ) {
    if (!['ACTIVE', 'SUSPENDED', 'REVOKED'].includes(String(status))) {
      throw new AppError(400, 'Statut invalide.');
    }
    if (targetUserId === auth.userId) {
      throw new AppError(
        400,
        'Impossible de modifier votre propre compte actif.',
      );
    }

    superadminRepository.updateUserStatus(targetUserId, String(status));
    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: 'SUPER_ADMIN',
      restaurantId: null,
      action: `USER_${status}`,
      targetType: 'USER',
      targetId: targetUserId,
    });
  }

  listTicketsAndLeads() {
    return superadminRepository.findAllTicketsAndLeads();
  }

  replyToTicket(
    auth: AuthContext,
    ticketId: string,
    body: Record<string, unknown>,
  ) {
    const { body: messageBody, status } = body || {};
    superadminRepository.addTicketReply(
      ticketId,
      auth.fullName,
      typeof messageBody === 'string' ? messageBody : undefined,
      status ? String(status) : undefined,
    );
  }

  listAuditLogs() {
    return superadminRepository.findAuditLogs();
  }

  getPlatformSettings(): Record<string, string> {
    const rows = superadminRepository.findPlatformSettings();
    const settings: Record<string, string> = {};
    for (const r of rows) {
      settings[r.key] = r.value;
    }
    return settings;
  }

  updatePlatformSettings(
    auth: AuthContext,
    updates: Record<string, unknown>,
  ) {
    const entries: Array<[string, string]> = [];
    for (const [k, v] of Object.entries(updates || {})) {
      if (typeof v === 'string') {
        entries.push([k, v.trim()]);
      }
    }
    superadminRepository.upsertPlatformSettings(entries);
    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: 'SUPER_ADMIN',
      restaurantId: null,
      action: 'PLATFORM_SETTINGS_UPDATED',
      targetType: 'SETTINGS',
      targetId: 'global',
    });
  }
}

export const superadminService = new SuperadminService();
