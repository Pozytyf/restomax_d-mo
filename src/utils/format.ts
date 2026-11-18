export function formatFcfa(amount: number | null | undefined): string {
  const safe = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  return `${new Intl.NumberFormat('fr-FR').format(safe)} FCFA`;
}

export function formatNumber(amount: number | null | undefined): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0;
  return new Intl.NumberFormat('fr-FR').format(safe);
}

export function formatDateTimeFr(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
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
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Abidjan',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateFr(iso: string | Date): string {
  const date = typeof iso === 'string' ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
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
  IN_PREPARATION: 'En préparation',
  READY: 'Prête',
  SERVED: 'Servie',
  PAID: 'Encaissée',
  CANCELLED: 'Annulée',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MTN_MOMO: 'MTN MoMo',
  WAVE: 'Wave',
  CARD: 'Carte bancaire',
};
