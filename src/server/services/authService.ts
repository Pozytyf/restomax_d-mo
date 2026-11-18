import bcrypt from 'bcryptjs';
import { getDb, generateId } from '../db.ts';
import {
  type AuthContext,
  recordAudit,
  resolveAuthContext,
  signSessionToken,
} from '../auth.ts';
import { resolveEffectivePermissions } from '../rbac.ts';
import { authRepository } from '../repositories/authRepository.ts';
import { AppError } from './errors.ts';
import type { Role } from '../../types/index.ts';

export const authService = {
  login(body: Record<string, unknown>, userAgent: string) {
    const { email, password } = body || {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError(400, 'Email et mot de passe requis.');
    }

    const user = authRepository.findUserByEmail(email.trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      throw new AppError(401, 'Identifiants incorrects.');
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'Ce compte utilisateur est suspendu ou révoqué.');
    }

    let restaurantId: string | null = null;
    let restaurantName: string | null = null;
    let restaurantSlug: string | null = null;
    let restaurantStatus: string | null = null;
    let effectiveRole: Role = 'OWNER';
    let customPerms: string[] = [];

    if (user.global_role === 'SUPER_ADMIN') {
      effectiveRole = 'SUPER_ADMIN';
    } else {
      const member = authRepository.findPrimaryMembershipForUser(user.id);
      if (!member || member.member_status !== 'ACTIVE') {
        throw new AppError(403, 'Aucun accès actif à un restaurant.');
      }
      if (member.deleted_at || member.restaurant_status === 'DELETED') {
        throw new AppError(403, 'Établissement supprimé.');
      }
      if (member.restaurant_status === 'SUSPENDED') {
        throw new AppError(
          403,
          'Votre établissement est temporairement suspendu. Contactez le support Resto’MAX.',
        );
      }

      restaurantId = String(member.restaurant_id);
      restaurantName = String(member.restaurant_name);
      restaurantSlug = String(member.restaurant_slug);
      restaurantStatus = String(member.restaurant_status);
      effectiveRole = member.role as Role;
      try {
        customPerms = JSON.parse(String(member.custom_permissions_json || '[]'));
      } catch {
        customPerms = [];
      }
    }

    const sessionId = generateId('ses');
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    authRepository.createSession({
      sessionId,
      userId: user.id,
      restaurantId,
      expiresAt,
      userAgent: userAgent.slice(0, 200),
      now,
    });

    const db = getDb();
    recordAudit(db, {
      actorUserId: user.id,
      actorEmail: user.email,
      actorRole: effectiveRole,
      restaurantId,
      action: 'USER_LOGIN',
      targetType: 'SESSION',
      targetId: sessionId,
      details: 'Connexion réussie',
    });

    const token = signSessionToken({ sessionId, userId: user.id });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        role: effectiveRole,
        status: user.status,
        restaurantId,
        restaurantName,
        restaurantSlug,
        restaurantStatus,
        permissions: resolveEffectivePermissions(
          effectiveRole,
          customPerms as never[],
        ),
      },
    };
  },

  registerRestaurant(body: Record<string, unknown>, userAgent: string) {
    const {
      restaurantName,
      city,
      ownerName,
      email,
      phone,
      password,
      planCode,
    } = body || {};

    if (
      typeof restaurantName !== 'string' ||
      restaurantName.trim().length < 2 ||
      typeof ownerName !== 'string' ||
      ownerName.trim().length < 2 ||
      typeof email !== 'string' ||
      !email.includes('@') ||
      typeof password !== 'string' ||
      password.length < 8
    ) {
      throw new AppError(
        400,
        'Veuillez fournir le nom du restaurant, votre nom, un email valide et un mot de passe (min. 8 caractères).',
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = authRepository.findUserByEmail(normalizedEmail);
    if (existing) {
      throw new AppError(409, 'Un compte existe déjà avec cet email.');
    }

    const selectedPlan = authRepository.findPlanForRegistration(
      String(planCode || 'ESSENTIEL').toUpperCase(),
    );

    const now = new Date().toISOString();
    const trialDays = selectedPlan?.trial_days || 14;
    const trialEndsAt = new Date(Date.now() + trialDays * 86400000).toISOString();
    const restaurantId = generateId('rest');
    const userId = generateId('usr');
    const memberId = generateId('mem');
    const subId = generateId('sub');
    const sessionId = generateId('ses');

    const slugBase = restaurantName
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const slug = `${slugBase || 'restaurant'}-${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = bcrypt.hashSync(password, 10);

    const db = getDb();
    try {
      db.exec('BEGIN IMMEDIATE');

      authRepository.createRestaurantWithOwnerAndStarterData({
        restaurantId,
        restaurantName: restaurantName.trim(),
        slug,
        email: normalizedEmail,
        phone: String(phone || '').trim(),
        city: String(city || 'Abidjan').trim(),
        userId,
        ownerName: ownerName.trim(),
        passwordHash,
        memberId,
        subId,
        planId: selectedPlan.id,
        trialEndsAt,
        sessionId,
        sessionExpiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        userAgent: userAgent.slice(0, 200),
        now,
      });

      recordAudit(db, {
        actorUserId: userId,
        actorEmail: normalizedEmail,
        actorRole: 'OWNER',
        restaurantId,
        action: 'RESTAURANT_REGISTERED',
        targetType: 'RESTAURANT',
        targetId: restaurantId,
        details: `Création restaurant ${restaurantName.trim()} (${trialDays} jours essai)`,
      });

      db.exec('COMMIT');

      const token = signSessionToken({ sessionId, userId });
      return {
        token,
        user: {
          id: userId,
          email: normalizedEmail,
          fullName: ownerName.trim(),
          phone: String(phone || '').trim() || null,
          role: 'OWNER' as Role,
          status: 'ACTIVE',
          restaurantId,
          restaurantName: restaurantName.trim(),
          restaurantSlug: slug,
          restaurantStatus: 'TRIAL',
          permissions: resolveEffectivePermissions('OWNER'),
        },
      };
    } catch {
      db.exec('ROLLBACK');
      throw new AppError(500, 'Erreur lors de la création du restaurant.');
    }
  },

  getMe(token: string | null) {
    if (!token) {
      throw new AppError(401, 'Non authentifié.');
    }
    const db = getDb();
    const ctx = resolveAuthContext(db, token);
    if (!ctx) {
      throw new AppError(401, 'Session invalide ou expirée.');
    }
    return {
      id: ctx.userId,
      email: ctx.email,
      fullName: ctx.fullName,
      phone: null,
      role: ctx.role,
      status: ctx.userStatus,
      restaurantId: ctx.restaurantId,
      restaurantName: ctx.restaurantName,
      restaurantSlug: ctx.restaurantSlug,
      restaurantStatus: ctx.restaurantStatus,
      permissions: ctx.permissions,
    };
  },

  logout(auth?: AuthContext) {
    if (auth) {
      authRepository.revokeSession(auth.sessionId);
      recordAudit(getDb(), {
        actorUserId: auth.userId,
        actorEmail: auth.email,
        actorRole: auth.role,
        restaurantId: auth.restaurantId,
        action: 'USER_LOGOUT',
        targetType: 'SESSION',
        targetId: auth.sessionId,
      });
    }
  },

  changePassword(auth: AuthContext, body: Record<string, unknown>) {
    const { currentPassword, newPassword } = body || {};
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new AppError(400, 'Nouveau mot de passe trop court (min 8).');
    }
    const user = authRepository.findUserPasswordHash(auth.userId);
    if (
      !user ||
      !bcrypt.compareSync(String(currentPassword || ''), user.password_hash)
    ) {
      throw new AppError(400, 'Mot de passe actuel incorrect.');
    }

    authRepository.updateUserPasswordHash(
      auth.userId,
      bcrypt.hashSync(newPassword, 10),
    );

    recordAudit(getDb(), {
      actorUserId: auth.userId,
      actorEmail: auth.email,
      actorRole: auth.role,
      restaurantId: auth.restaurantId,
      action: 'PASSWORD_CHANGED',
      targetType: 'USER',
      targetId: auth.userId,
    });
  },
};
