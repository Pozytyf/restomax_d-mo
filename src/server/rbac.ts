import type { Permission, Role } from '../types/index.ts';

export const ROLE_PERMISSION_CEILING: Record<Role, Permission[]> = {
  SUPER_ADMIN: ['superadmin:all'],
  OWNER: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'pos:use',
    'pos:pay',
    'pos:refund',
    'floor:read',
    'floor:write',
    'kitchen:read',
    'kitchen:write',
    'menu:read',
    'menu:write',
    'stocks:read',
    'stocks:write',
    'staff:read',
    'staff:manage',
    'customers:read',
    'customers:write',
    'reservations:read',
    'reservations:write',
    'qr:read',
    'qr:manage',
    'finance:read',
    'reports:read',
    'settings:read',
    'settings:write',
  ],
  MANAGER: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'pos:use',
    'pos:pay',
    'pos:refund',
    'floor:read',
    'floor:write',
    'kitchen:read',
    'kitchen:write',
    'menu:read',
    'menu:write',
    'stocks:read',
    'stocks:write',
    'staff:read',
    'customers:read',
    'customers:write',
    'reservations:read',
    'reservations:write',
    'qr:read',
    'qr:manage',
    'finance:read',
    'reports:read',
    'settings:read',
  ],
  CASHIER: [
    'dashboard:read',
    'orders:read',
    'orders:write',
    'pos:use',
    'pos:pay',
    'floor:read',
    'menu:read',
    'customers:read',
    'customers:write',
  ],
  WAITER: [
    'orders:read',
    'orders:write',
    'pos:use',
    'floor:read',
    'floor:write',
    'menu:read',
    'reservations:read',
    'reservations:write',
    'qr:read',
  ],
  KITCHEN_BAR: [
    'orders:read',
    'kitchen:read',
    'kitchen:write',
    'menu:read',
    'stocks:read',
  ],
};

export function resolveEffectivePermissions(
  role: Role,
  customPermissions: Permission[] = [],
): Permission[] {
  const ceiling = ROLE_PERMISSION_CEILING[role] || [];
  if (role === 'SUPER_ADMIN' || role === 'OWNER') {
    return [...ceiling];
  }
  const base = new Set<Permission>(ceiling);
  // Custom permissions can refine within ceiling or add non-privileged operational rights,
  // but NEVER exceed the role's maximum ceiling.
  if (customPermissions.length > 0) {
    const allowedCustom = customPermissions.filter((p) => ceiling.includes(p));
    return Array.from(new Set(allowedCustom));
  }
  return Array.from(base);
}

export function hasPermission(
  userPermissions: Permission[],
  required: Permission,
): boolean {
  if (userPermissions.includes('superadmin:all')) {
    return true;
  }
  return userPermissions.includes(required);
}
