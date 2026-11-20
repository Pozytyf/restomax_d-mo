import type {
  DashboardWidgetDefinition,
  DashboardWidgetId,
  DashboardWidgetPreference,
} from './types';

export const DASHBOARD_WIDGET_REGISTRY: DashboardWidgetDefinition[] = [
  {
    id: 'daily-revenue',
    titleKey: 'dashboard.widgets.dailyRevenueTitle',
    descriptionKey: 'dashboard.widgets.dailyRevenueDesc',
    colSpanClass: 'lg:col-span-4',
  },
  {
    id: 'active-orders',
    titleKey: 'dashboard.widgets.activeOrdersTitle',
    descriptionKey: 'dashboard.widgets.activeOrdersDesc',
    colSpanClass: 'lg:col-span-4',
  },
  {
    id: 'stock-alerts',
    titleKey: 'dashboard.widgets.stockAlertsTitle',
    descriptionKey: 'dashboard.widgets.stockAlertsDesc',
    colSpanClass: 'lg:col-span-4',
  },
  {
    id: 'kpi-overview',
    titleKey: 'dashboard.widgets.kpisTitle',
    colSpanClass: 'lg:col-span-12',
  },
  {
    id: 'realtime-finance',
    titleKey: 'dashboard.widgets.realtimeFinanceTitle',
    colSpanClass: 'lg:col-span-12',
    requiresFinance: true,
  },
  {
    id: 'sales-chart',
    titleKey: 'dashboard.widgets.salesChartTitle',
    colSpanClass: 'lg:col-span-8',
  },
  {
    id: 'financial-summary',
    titleKey: 'dashboard.widgets.financialSummaryTitle',
    colSpanClass: 'lg:col-span-4',
  },
  {
    id: 'top-items',
    titleKey: 'dashboard.widgets.topItemsTitle',
    colSpanClass: 'lg:col-span-6',
  },
  {
    id: 'staff-activity',
    titleKey: 'dashboard.widgets.staffActivityTitle',
    colSpanClass: 'lg:col-span-6',
  },
  {
    id: 'recent-orders',
    titleKey: 'dashboard.widgets.recentOrdersTitle',
    colSpanClass: 'lg:col-span-12',
  },
];

export const WIDGET_DEFINITION_MAP: Record<
  DashboardWidgetId,
  DashboardWidgetDefinition
> = Object.fromEntries(
  DASHBOARD_WIDGET_REGISTRY.map((w) => [w.id, w]),
) as Record<DashboardWidgetId, DashboardWidgetDefinition>;

export function getDefaultWidgetPreferences(): DashboardWidgetPreference[] {
  return DASHBOARD_WIDGET_REGISTRY.map((def, idx) => ({
    id: def.id,
    visible: true,
    order: idx,
  }));
}

export function normalizeWidgetPreferences(
  raw: unknown,
): DashboardWidgetPreference[] {
  const defaults = getDefaultWidgetPreferences();
  if (!Array.isArray(raw)) return defaults;

  const byId = new Map<DashboardWidgetId, DashboardWidgetPreference>();
  for (const item of raw) {
    if (
      item &&
      typeof item === 'object' &&
      'id' in item &&
      typeof item.id === 'string' &&
      item.id in WIDGET_DEFINITION_MAP
    ) {
      const id = item.id as DashboardWidgetId;
      byId.set(id, {
        id,
        visible: typeof item.visible === 'boolean' ? item.visible : true,
        order: typeof item.order === 'number' ? item.order : 999,
      });
    }
  }

  const merged = defaults.map((def) => {
    const saved = byId.get(def.id);
    if (saved) return saved;
    return { ...def, order: defaults.length + def.order };
  });
  merged.sort((a, b) => a.order - b.order);
  return merged.map((item, idx) => ({ ...item, order: idx }));
}

export function toggleWidgetVisibility(
  prefs: DashboardWidgetPreference[],
  id: DashboardWidgetId,
): DashboardWidgetPreference[] {
  return prefs.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
}

export function moveWidgetOrder(
  prefs: DashboardWidgetPreference[],
  id: DashboardWidgetId,
  direction: 'UP' | 'DOWN',
): DashboardWidgetPreference[] {
  const sorted = [...prefs].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((p) => p.id === id);
  if (idx === -1) return sorted;

  const swapIdx = direction === 'UP' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= sorted.length) return sorted;

  const next = [...sorted];
  const current = next[idx];
  next[idx] = next[swapIdx];
  next[swapIdx] = current;
  return next.map((item, position) => ({ ...item, order: position }));
}

export function getWidgetStorageKey(
  restaurantId?: string | null,
  userId?: string | null,
): string {
  return `restomax_dashboard_widgets_${restaurantId || 'default'}_${userId || 'anon'}`;
}

export function loadWidgetPreferences(
  storageKey: string,
): DashboardWidgetPreference[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return getDefaultWidgetPreferences();
    }
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return getDefaultWidgetPreferences();
    return normalizeWidgetPreferences(JSON.parse(raw));
  } catch {
    return getDefaultWidgetPreferences();
  }
}

export function saveWidgetPreferences(
  storageKey: string,
  prefs: DashboardWidgetPreference[],
): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(storageKey, JSON.stringify(prefs));
    }
  } catch {
    // ignore storage errors
  }
}
