import i18n, { getActiveIntlLocale } from '../i18n';

export function formatFcfa(amount: number | null | undefined): string {
  const safe = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  return `${new Intl.NumberFormat(getActiveIntlLocale()).format(safe)} FCFA`;
}

export function formatNumber(amount: number | null | undefined): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat(getActiveIntlLocale()).format(safe);
}

export function formatDateTimeFr(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(getActiveIntlLocale(), {
    timeZone: 'Africa/Abidjan',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeFr(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(getActiveIntlLocale(), {
    timeZone: 'Africa/Abidjan',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateFr(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(getActiveIntlLocale(), {
    timeZone: 'Africa/Abidjan',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super-admin',
  OWNER: 'Propriétaire',
  MANAGER: 'Manager',
  CASHIER: 'Caissier',
  WAITER: 'Serveur',
  KITCHEN_BAR: 'Cuisine / Bar',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PREPARING: 'En préparation',
  IN_PREPARATION: 'En préparation',
  READY: 'Prête',
  SERVED: 'Servie',
  PAID: 'Encaissée',
  CANCELLED: 'Annulée',
};

export const DELIVERY_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Commande reçue',
  PREPARING: 'En préparation',
  IN_PREPARATION: 'En préparation',
  READY: 'En cours de livraison',
  SERVED: 'Livrée à table',
  PAID: 'Livrée & encaissée',
  CANCELLED: 'Annulée',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  WAVE: 'Wave',
  CARD: 'Carte bancaire',
};

export function getRoleLabel(role: string): string {
  return i18n.t(`common.roles.${role}`, {
    defaultValue: ROLE_LABELS[role] || role,
  });
}

export function getOrderStatusLabel(status: string): string {
  return i18n.t(`common.orderStatus.${status}`, {
    defaultValue: ORDER_STATUS_LABELS[status] || status,
  });
}

export function getDeliveryStatusLabel(status: string): string {
  return i18n.t(`common.deliveryStatus.${status}`, {
    defaultValue: DELIVERY_STATUS_LABELS[status] || status,
  });
}

export function getPaymentMethodLabel(method: string): string {
  return i18n.t(`common.paymentMethods.${method}`, {
    defaultValue: PAYMENT_METHOD_LABELS[method] || method,
  });
}
