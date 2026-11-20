import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { useAuth } from '../../app/providers/AuthProvider';
import { apiFetch } from '../../services/api';
import {
  ActiveOrdersWidget,
  DailyRevenueWidget,
  StockAlertsWidget,
} from './widgets/SummaryWidgets';
import {
  FinancialSummaryWidget,
  KpiOverviewWidget,
  RealtimeFinanceWidget,
  RecentOrdersWidget,
  SalesChartWidget,
  StaffActivityWidget,
  TopItemsWidget,
} from './widgets/AnalyticsWidgets';
import { WidgetFrame } from './widgets/WidgetFrame';
import { WidgetCustomizerPanel } from './widgets/WidgetCustomizerPanel';
import {
  WIDGET_DEFINITION_MAP,
  getDefaultWidgetPreferences,
  getWidgetStorageKey,
  loadWidgetPreferences,
  moveWidgetOrder,
  saveWidgetPreferences,
  toggleWidgetVisibility,
} from './widgets/widgetRegistry';
import type {
  DashboardData,
  DashboardWidgetId,
  DashboardWidgetPreference,
  FinanceOverviewData,
} from './widgets/types';

export function OwnerDashboardPage() {
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const canReadFinance = can('finance:read');
  const [data, setData] = useState<DashboardData | null>(null);
  const [finance, setFinance] = useState<FinanceOverviewData | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);

  const storageKey = useMemo(
    () => getWidgetStorageKey(user?.restaurantId, user?.id),
    [user?.restaurantId, user?.id],
  );

  const [widgetPrefs, setWidgetPrefs] = useState<DashboardWidgetPreference[]>(
    () => loadWidgetPreferences(storageKey),
  );

  useEffect(() => {
    setWidgetPrefs(loadWidgetPreferences(storageKey));
  }, [storageKey]);

  const updatePrefs = useCallback(
    (
      updater: (
        prev: DashboardWidgetPreference[],
      ) => DashboardWidgetPreference[],
    ) => {
      setWidgetPrefs((prev) => {
        const next = updater(prev);
        saveWidgetPreferences(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const load = useCallback(() => {
    const dashboardReq = apiFetch<DashboardData>('/api/restaurant/dashboard');
    const financeReq = canReadFinance
      ? apiFetch<FinanceOverviewData>('/api/restaurant/finance').catch(
          () => null,
        )
      : Promise.resolve(null);

    Promise.all([dashboardReq, financeReq])
      .then(([dashRes, finRes]) => {
        setData(dashRes);
        if (finRes) {
          setFinance(finRes);
        }
        setLastSyncedAt(new Date().toISOString());
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [canReadFinance]);

  useEffect(() => {
    load();
  }, [load]);

  const visibleWidgets = useMemo(() => {
    return [...widgetPrefs]
      .sort((a, b) => a.order - b.order)
      .filter((pref) => {
        if (!pref.visible) return false;
        const def = WIDGET_DEFINITION_MAP[pref.id];
        if (!def) return false;
        if (def.requiresFinance && !finance) return false;
        return true;
      });
  }, [finance, widgetPrefs]);

  const renderWidgetContent = (id: DashboardWidgetId) => {
    if (!data) return null;
    switch (id) {
      case 'daily-revenue':
        return <DailyRevenueWidget data={data} finance={finance} />;
      case 'active-orders':
        return <ActiveOrdersWidget data={data} />;
      case 'stock-alerts':
        return <StockAlertsWidget data={data} />;
      case 'kpi-overview':
        return <KpiOverviewWidget data={data} />;
      case 'realtime-finance':
        return finance ? (
          <RealtimeFinanceWidget
            finance={finance}
            lastSyncedAt={lastSyncedAt}
          />
        ) : null;
      case 'sales-chart':
        return <SalesChartWidget data={data} />;
      case 'financial-summary':
        return <FinancialSummaryWidget data={data} />;
      case 'top-items':
        return <TopItemsWidget data={data} />;
      case 'staff-activity':
        return <StaffActivityWidget data={data} />;
      case 'recent-orders':
        return <RecentOrdersWidget data={data} />;
      default:
        return null;
    }
  };

  return (
    <RestaurantLayout
      title={t('dashboard.title')}
      onRealtimeEvent={load}
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditMode((v) => !v)}
            data-testid="dashboard-customize-btn"
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
              editMode
                ? 'bg-[#182333] dark:bg-[#223044] text-white border-[#182333] dark:border-[#FF8738]'
                : 'bg-[var(--rm-surface)] text-[var(--rm-ink)] border-[var(--rm-border)] hover:border-[#FF8738]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>
              {editMode
                ? t('dashboard.doneCustomizing')
                : t('dashboard.customizeWidgets')}
            </span>
          </button>

          <Link
            to="/app/pos"
            className="px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold transition-colors whitespace-nowrap"
          >
            {t('dashboard.openPos')}
          </Link>
        </div>
      }
    >
      {loading || !data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-40 rounded-xl bg-[var(--rm-surface)] border border-[var(--rm-border)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {editMode && (
            <WidgetCustomizerPanel
              preferences={widgetPrefs}
              canReadFinance={canReadFinance}
              onToggleVisibility={(id) =>
                updatePrefs((prev) => toggleWidgetVisibility(prev, id))
              }
              onReset={() => updatePrefs(() => getDefaultWidgetPreferences())}
              onClose={() => setEditMode(false)}
            />
          )}

          {visibleWidgets.length === 0 ? (
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-10 text-center text-sm text-[var(--rm-ink-muted)]">
              {t('dashboard.hiddenWidgetsEmpty')}
            </div>
          ) : (
            <div
              data-testid="dashboard-widgets-grid"
              className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch"
            >
              {visibleWidgets.map((pref, idx) => {
                const def = WIDGET_DEFINITION_MAP[pref.id];
                const content = renderWidgetContent(pref.id);
                if (!content) return null;

                return (
                  <WidgetFrame
                    key={pref.id}
                    id={pref.id}
                    title={t(def.titleKey)}
                    colSpanClass={def.colSpanClass}
                    editMode={editMode}
                    canMoveUp={idx > 0}
                    canMoveDown={idx < visibleWidgets.length - 1}
                    onMoveUp={() =>
                      updatePrefs((prev) => moveWidgetOrder(prev, pref.id, 'UP'))
                    }
                    onMoveDown={() =>
                      updatePrefs((prev) =>
                        moveWidgetOrder(prev, pref.id, 'DOWN'),
                      )
                    }
                    onHide={() =>
                      updatePrefs((prev) => toggleWidgetVisibility(prev, pref.id))
                    }
                  >
                    {content}
                  </WidgetFrame>
                );
              })}
            </div>
          )}
        </div>
      )}
    </RestaurantLayout>
  );
}
