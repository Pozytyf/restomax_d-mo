import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  Clock,
  CreditCard,
  LayoutGrid,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  formatDateFr,
  formatFcfa,
  formatTimeFr,
  getOrderStatusLabel,
  getPaymentMethodLabel,
} from '../../../utils/format';
import type { DashboardData, FinanceOverviewData } from './types';

export function KpiOverviewWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
        <div className="flex items-center justify-between text-[var(--rm-ink-muted)] text-xs font-medium">
          <span>{t('dashboard.revenue')}</span>
          <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
          {formatFcfa(data.kpis.totalRevenueXof)}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
          {t('dashboard.collected', {
            amount: formatFcfa(data.kpis.collectedXof),
          })}
        </p>
      </div>

      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
        <div className="flex items-center justify-between text-[var(--rm-ink-muted)] text-xs font-medium">
          <span>{t('dashboard.orders')}</span>
          <ShoppingBag className="w-4 h-4 text-[#FF8738]" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
          {data.kpis.ordersCount}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-ink-muted)]">
          {t('dashboard.ordersExcludingCancelled')}
        </p>
      </div>

      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
        <div className="flex items-center justify-between text-[var(--rm-ink-muted)] text-xs font-medium">
          <span>{t('dashboard.avgBasket')}</span>
          <CreditCard className="w-4 h-4 text-[var(--rm-ink)]" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
          {formatFcfa(data.kpis.avgBasketXof)}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-ink-muted)]">
          {t('dashboard.perOrder')}
        </p>
      </div>

      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
        <div className="flex items-center justify-between text-[var(--rm-ink-muted)] text-xs font-medium">
          <span>{t('dashboard.pendingKitchen')}</span>
          <Clock className="w-4 h-4 text-[#E5A32A]" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-[#FF8738] tabular-nums">
          {data.kpis.pendingOrdersCount}
        </p>
        <Link
          to="/app/kitchen"
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[var(--rm-ink)] hover:text-[#FF8738]"
        >
          <span>{t('dashboard.viewKds')}</span>
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
        <div className="flex items-center justify-between text-[var(--rm-ink-muted)] text-xs font-medium">
          <span>{t('dashboard.occupiedTables')}</span>
          <LayoutGrid className="w-4 h-4 text-[#14B8A6]" />
        </div>
        <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
          {data.kpis.tablesOccupied} / {data.kpis.tablesTotal}
        </p>
        <p className="mt-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
          {t('dashboard.reservedTables', {
            count: data.kpis.tablesReserved,
          })}
        </p>
      </div>
    </div>
  );
}

export function RealtimeFinanceWidget({
  finance,
  lastSyncedAt,
}: {
  finance: FinanceOverviewData;
  lastSyncedAt: string | null;
}) {
  const { t } = useTranslation();

  return (
    <section
      aria-label={t('dashboard.todayRevenueTitle')}
      className="bg-[#182333] dark:bg-[var(--rm-surface)] text-white dark:text-[var(--rm-ink)] rounded-xl p-6 border border-[#223044] dark:border-[var(--rm-border)]"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 border-b border-white/10 dark:border-[var(--rm-border)]">
        <div>
          <p className="text-xs font-semibold text-[#FF8738]">
            {t('dashboard.realtimeSalesSubtitle', {
              date: formatDateFr(`${finance.today.date}T12:00:00.000Z`),
            })}
          </p>
          <h2 className="text-lg font-bold text-white dark:text-[var(--rm-ink)] mt-0.5">
            {t('dashboard.todayRevenueTitle')}
          </h2>
        </div>
        <div className="flex items-center gap-4">
          {lastSyncedAt && (
            <span className="text-xs text-slate-400 dark:text-[var(--rm-ink-muted)] tabular-nums">
              {t('dashboard.updatedAt', {
                time: formatTimeFr(lastSyncedAt),
              })}
            </span>
          )}
          <Link
            to="/app/finance"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#FF8738] hover:underline whitespace-nowrap"
          >
            <span>{t('dashboard.openFinance')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
        <div className="rounded-xl bg-white/5 dark:bg-[var(--rm-surface-muted)] border border-white/10 dark:border-[var(--rm-border)] p-4">
          <p className="text-xs text-slate-300 dark:text-[var(--rm-ink-muted)]">
            {t('dashboard.todayGross')}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#FF8738] tabular-nums">
            {formatFcfa(finance.today.revenueXof)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[var(--rm-ink-muted)] tabular-nums">
            {t('dashboard.cumulativeGross', {
              amount: formatFcfa(finance.summary.grossSalesXof),
            })}
          </p>
        </div>

        <div className="rounded-xl bg-white/5 dark:bg-[var(--rm-surface-muted)] border border-white/10 dark:border-[var(--rm-border)] p-4">
          <p className="text-xs text-slate-300 dark:text-[var(--rm-ink-muted)]">
            {t('dashboard.collectedToday')}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-[#14B8A6] tabular-nums">
            {formatFcfa(finance.today.collectedXof)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[var(--rm-ink-muted)] tabular-nums">
            {t('dashboard.totalCollectedLabel', {
              amount: formatFcfa(finance.summary.collectedXof),
            })}
          </p>
        </div>

        <div className="rounded-xl bg-white/5 dark:bg-[var(--rm-surface-muted)] border border-white/10 dark:border-[var(--rm-border)] p-4">
          <p className="text-xs text-slate-300 dark:text-[var(--rm-ink-muted)]">
            {t('dashboard.todayOrders')}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-white dark:text-[var(--rm-ink)] tabular-nums">
            {finance.today.ordersCount}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[var(--rm-ink-muted)] tabular-nums">
            {t('dashboard.avgBasketLabel', {
              amount: formatFcfa(finance.today.avgBasketXof),
            })}
          </p>
        </div>

        <div className="rounded-xl bg-white/5 dark:bg-[var(--rm-surface-muted)] border border-white/10 dark:border-[var(--rm-border)] p-4">
          <p className="text-xs text-slate-300 dark:text-[var(--rm-ink-muted)]">
            {t('dashboard.netMargin')}
          </p>
          <p className="mt-1.5 text-2xl font-extrabold text-white dark:text-[var(--rm-ink)] tabular-nums">
            {formatFcfa(finance.summary.netEstimatedMarginXof)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-[var(--rm-ink-muted)] tabular-nums">
            {t('dashboard.vatIncluded', {
              amount: formatFcfa(finance.summary.taxCollectedXof),
            })}
          </p>
        </div>
      </div>
    </section>
  );
}

export function SalesChartWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();
  const maxRev = Math.max(
    1,
    ...(data.revenueSeries.map((r) => r.revenue_xof) || [1]),
  );

  return (
    <div className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-base font-bold text-[var(--rm-ink)]">
            {t('dashboard.salesPerfTitle')}
          </h2>
          <p className="text-xs text-[var(--rm-ink-muted)]">
            {t('dashboard.salesPerfSubtitle')}
          </p>
        </div>
      </div>

      {data.revenueSeries.length === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-[var(--rm-ink-muted)]">
          {t('dashboard.noSalesYet')}
        </div>
      ) : (
        <div className="h-56 flex items-end gap-3 pt-4">
          {data.revenueSeries.map((pt) => {
            const pct = Math.max(
              8,
              Math.round((pt.revenue_xof / maxRev) * 100),
            );
            return (
              <div
                key={pt.day}
                className="flex-1 flex flex-col items-center justify-end h-full group"
              >
                <span className="text-[11px] font-mono text-[var(--rm-ink-muted)] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                  {Math.round(pt.revenue_xof / 1000)}k
                </span>
                <div
                  style={{ height: `${pct}%` }}
                  className="w-full max-w-[44px] rounded-t-md bg-[#182333] dark:bg-slate-300 group-hover:bg-[#FF8738] dark:group-hover:bg-[#FF8738] transition-colors"
                  title={`${pt.day}: ${formatFcfa(pt.revenue_xof)}`}
                />
                <span className="mt-2 text-[11px] text-[var(--rm-ink-muted)] font-mono">
                  {pt.day.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function FinancialSummaryWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 flex flex-col justify-between">
      <div>
        <h2 className="text-base font-bold text-[var(--rm-ink)]">
          {t('dashboard.financialSummaryTitle')}
        </h2>
        <p className="text-xs text-[var(--rm-ink-muted)]">
          {t('dashboard.financialSummarySubtitle')}
        </p>

        <div className="mt-5 space-y-3 text-sm">
          <div className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)]">
            <span className="text-[var(--rm-ink-muted)]">
              {t('dashboard.billedVolume')}
            </span>
            <span className="font-bold text-[var(--rm-ink)] tabular-nums">
              {formatFcfa(data.kpis.totalRevenueXof)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)]">
            <span className="text-[var(--rm-ink-muted)]">
              {t('dashboard.totalCollectedRow')}
            </span>
            <span className="font-bold text-[#14B8A6] tabular-nums">
              {formatFcfa(data.kpis.collectedXof)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)]">
            <span className="text-[var(--rm-ink-muted)]">
              {t('dashboard.recordedExpenses')}
            </span>
            <span className="font-bold text-[#E05252] tabular-nums">
              {formatFcfa(data.kpis.expensesXof)}
            </span>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold text-[var(--rm-ink)] mb-2">
            {t('dashboard.paymentBreakdown')}
          </p>
          <div className="space-y-2">
            {data.paymentBreakdown.map((pm) => (
              <div
                key={pm.method}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-[var(--rm-ink-muted)]">
                  {getPaymentMethodLabel(pm.method)} ({pm.count})
                </span>
                <span className="font-semibold text-[var(--rm-ink)] tabular-nums">
                  {formatFcfa(pm.total_xof)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Link
        to="/app/finance"
        className="mt-6 text-xs font-semibold text-[#FF8738] hover:underline inline-flex items-center gap-1"
      >
        <span>{t('dashboard.seeFinancialDetails')}</span>
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export function TopItemsWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
      <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
        {t('dashboard.topItemsTitle')}
      </h2>
      <div className="space-y-3">
        {data.topItems.map((it, idx) => (
          <div
            key={it.name}
            className="flex items-center justify-between gap-3 py-2 border-b border-[var(--rm-border-subtle)] last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-[var(--rm-ink)] truncate">
                {idx + 1}. {it.name}
              </p>
              <p className="text-xs text-[var(--rm-ink-muted)] tabular-nums">
                {t('dashboard.soldCount', { count: it.qty })}
              </p>
            </div>
            <span className="text-xs font-bold text-[var(--rm-ink)] tabular-nums whitespace-nowrap">
              {formatFcfa(it.revenue_xof)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StaffActivityWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="h-full bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
      <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
        {t('dashboard.staffActivityTitle')}
      </h2>
      <div className="space-y-3">
        {data.staffActivity.map((act, i) => (
          <div
            key={`${act.created_at}-${i}`}
            className="py-2 border-b border-[var(--rm-border-subtle)] last:border-0 text-xs"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[var(--rm-ink)] truncate">
                {act.action}
              </span>
              <span className="text-[var(--rm-ink-muted)] tabular-nums shrink-0">
                {formatTimeFr(act.created_at)}
              </span>
            </div>
            <p className="text-[var(--rm-ink-muted)] mt-0.5 truncate">
              {act.actor_email} {act.details ? `· ${act.details}` : ''}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RecentOrdersWidget({ data }: { data: DashboardData }) {
  const { t } = useTranslation();

  return (
    <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
      <div className="px-6 py-4 border-b border-[var(--rm-border)] flex items-center justify-between">
        <h2 className="text-base font-bold text-[var(--rm-ink)]">
          {t('dashboard.recentOrdersTitle')}
        </h2>
        <Link
          to="/app/orders"
          className="text-xs font-semibold text-[#FF8738] hover:underline"
        >
          {t('common.seeAll')}
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
            <tr>
              <th className="px-6 py-3 font-semibold">
                {t('dashboard.orderNoCol')}
              </th>
              <th className="px-6 py-3 font-semibold">
                {t('dashboard.customerTableCol')}
              </th>
              <th className="px-6 py-3 font-semibold">
                {t('common.channel')}
              </th>
              <th className="px-6 py-3 font-semibold">
                {t('common.status')}
              </th>
              <th className="px-6 py-3 font-semibold text-right">
                {t('common.total')}
              </th>
              <th className="px-6 py-3 font-semibold text-right">
                {t('dashboard.timeCol')}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--rm-border-subtle)]">
            {data.recentOrders.map((ord) => (
              <tr
                key={ord.id}
                className="hover:bg-[var(--rm-surface-hover)] transition-colors"
              >
                <td className="px-6 py-3 font-mono font-semibold text-[var(--rm-ink)]">
                  {ord.order_number}
                </td>
                <td className="px-6 py-3 text-[var(--rm-ink)]">
                  {ord.table_label || ord.customer_name}
                </td>
                <td className="px-6 py-3 text-xs text-[var(--rm-ink-muted)]">
                  {ord.order_type === 'QR_TABLE'
                    ? t('common.qrTable')
                    : ord.order_type === 'TAKEAWAY'
                      ? t('common.takeaway')
                      : t('common.dineIn')}
                </td>
                <td className="px-6 py-3 text-xs font-semibold">
                  <span
                    className={
                      ord.status === 'PAID'
                        ? 'text-[#14B8A6]'
                        : ord.status === 'CANCELLED'
                          ? 'text-[#E05252]'
                          : 'text-[#FF8738]'
                    }
                  >
                    {getOrderStatusLabel(ord.status)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right font-semibold text-[var(--rm-ink)] tabular-nums">
                  {formatFcfa(ord.total_xof)}
                </td>
                <td className="px-6 py-3 text-right text-xs text-[var(--rm-ink-muted)] tabular-nums">
                  {formatTimeFr(ord.created_at)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
