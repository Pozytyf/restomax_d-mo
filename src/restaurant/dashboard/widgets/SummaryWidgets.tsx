import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  ChefHat,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatFcfa } from '../../../utils/format';
import type { DashboardData, FinanceOverviewData } from './types';

export function DailyRevenueWidget({
  data,
  finance,
}: {
  data: DashboardData;
  finance: FinanceOverviewData | null;
}) {
  const { t } = useTranslation();
  const dailyRevenue = finance ? finance.today.revenueXof : data.kpis.totalRevenueXof;
  const dailyCollected = finance ? finance.today.collectedXof : data.kpis.collectedXof;
  const dailyOrders = finance ? finance.today.ordersCount : data.kpis.ordersCount;

  return (
    <section
      data-testid="summary-card-daily-revenue"
      className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--rm-ink)]">
              {t('dashboard.widgets.dailyRevenueTitle')}
            </h2>
            <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
              {t('dashboard.widgets.dailyRevenueDesc')}
            </p>
          </div>
          <TrendingUp className="w-4 h-4 text-[#14B8A6] shrink-0 mt-0.5" />
        </div>

        <p className="mt-4 text-3xl font-extrabold text-[var(--rm-ink)] tabular-nums tracking-tight">
          {formatFcfa(dailyRevenue)}
        </p>

        <div className="mt-3 pt-3 border-t border-[var(--rm-border-subtle)] flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
          <span className="font-semibold text-[#14B8A6]">
            {t('dashboard.dailyRevenueCollectedToday', {
              amount: formatFcfa(dailyCollected),
            })}
          </span>
          <span aria-hidden="true">·</span>
          <span>
            {t('dashboard.dailyRevenueOrdersToday', { count: dailyOrders })}
          </span>
        </div>
      </div>

      <Link
        to="/app/finance"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#FF8738] hover:underline whitespace-nowrap"
      >
        <span>{t('dashboard.openFinance')}</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

export function ActiveOrdersWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const newCount = data.recentOrders.filter((o) => o.status === 'PENDING').length;
  const prepCount = data.recentOrders.filter(
    (o) => o.status === 'IN_PREPARATION',
  ).length;
  const readyCount = data.recentOrders.filter((o) => o.status === 'READY').length;

  return (
    <section
      data-testid="summary-card-active-orders"
      className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 flex flex-col justify-between"
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--rm-ink)]">
              {t('dashboard.widgets.activeOrdersTitle')}
            </h2>
            <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
              {t('dashboard.widgets.activeOrdersDesc')}
            </p>
          </div>
          <ChefHat className="w-4 h-4 text-[#FF8738] shrink-0 mt-0.5" />
        </div>

        <p className="mt-4 text-3xl font-extrabold text-[#FF8738] tabular-nums tracking-tight">
          {data.kpis.pendingOrdersCount}
        </p>

        <div className="mt-3 pt-3 border-t border-[var(--rm-border-subtle)] space-y-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
          <p className="font-medium text-[var(--rm-ink)]">
            {t('dashboard.activeOrdersBreakdown', {
              newCount,
              prepCount,
              readyCount,
            })}
          </p>
          <p>
            {t('dashboard.occupiedTables')} : {data.kpis.tablesOccupied} /{' '}
            {data.kpis.tablesTotal}
          </p>
        </div>
      </div>

      <Link
        to="/app/kitchen"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#FF8738] hover:underline whitespace-nowrap"
      >
        <span>{t('dashboard.viewKds')}</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}

export function StockAlertsWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const alertsCount = data.lowStocks.length;
  const hasAlerts = alertsCount > 0;

  return (
    <section
      data-testid="summary-card-stock-alerts"
      className={`h-full bg-[var(--rm-surface)] rounded-xl border p-5 flex flex-col justify-between ${
        hasAlerts ? 'border-[#E05252]/50' : 'border-[var(--rm-border)]'
      }`}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--rm-ink)]">
              {t('dashboard.widgets.stockAlertsTitle')}
            </h2>
            <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
              {t('dashboard.widgets.stockAlertsDesc')}
            </p>
          </div>
          {hasAlerts ? (
            <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0 mt-0.5" />
          )}
        </div>

        <p
          className={`mt-4 text-3xl font-extrabold tabular-nums tracking-tight ${
            hasAlerts
              ? 'text-[#E05252]'
              : 'text-[#16A34A] dark:text-[#34D399]'
          }`}
        >
          {alertsCount}
        </p>

        <div className="mt-3 pt-3 border-t border-[var(--rm-border-subtle)]">
          {!hasAlerts ? (
            <p className="text-xs text-[var(--rm-ink-muted)]">
              {t('dashboard.allStocksOk')}
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {data.lowStocks.slice(0, 3).map((st) => (
                <li
                  key={st.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="font-medium text-[var(--rm-ink)] truncate">
                    {st.name}
                  </span>
                  <span className="font-semibold text-[#E05252] tabular-nums shrink-0">
                    {st.quantity} / {st.min_threshold} {st.unit}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Link
        to="/app/stocks"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[#FF8738] hover:underline whitespace-nowrap"
      >
        <span>{t('dashboard.stockAlertsAction')}</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </section>
  );
}
