import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  CreditCard,
  LifeBuoy,
  ShieldAlert,
  Store,
  Users,
} from 'lucide-react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { formatDateFr, formatFcfa, formatTimeFr } from '../../utils/format';

interface SuperAdminDashboardData {
  kpis: {
    totalRestaurants: number;
    activeRestaurants: number;
    trialRestaurants: number;
    suspendedRestaurants: number;
    activeSubscriptions: number;
    platformRevenueXof: number;
    pendingPaymentsXof: number;
    openTicketsCount: number;
    activeUsersCount: number;
    leadsCount: number;
  };
  recentRestaurants: Array<{
    id: string;
    name: string;
    city: string;
    status: string;
    createdAt: string;
    planName: string;
  }>;
  recentAudit: Array<{
    id: string;
    actorEmail: string;
    actorRole: string;
    action: string;
    details: string;
    createdAt: string;
  }>;
  monthlyPlatformSeries: Array<{
    month: string;
    revenue_xof: number;
    invoices: number;
  }>;
}

export function SuperAdminDashboardPage() {
  const { t } = useTranslation();
  const [data, setData] = useState<SuperAdminDashboardData | null>(null);

  const load = useCallback(() => {
    apiFetch<SuperAdminDashboardData>('/api/superadmin/dashboard')
      .then(setData)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SuperAdminLayout title={t('superadmin.dashboardTitle')} onRealtimeEvent={load}>
      {!data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-[var(--rm-surface)] border border-[var(--rm-border)] animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Platform KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <div className="flex justify-between text-xs text-[var(--rm-ink-muted)]">
                <span>{t('superadmin.registeredRestaurants')}</span>
                <Store className="w-4 h-4 text-[var(--rm-ink)]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                {data.kpis.totalRestaurants}
              </p>
              <p className="mt-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
                {t('superadmin.restaurantStats', {
                  active: data.kpis.activeRestaurants,
                  trial: data.kpis.trialRestaurants,
                  suspended: data.kpis.suspendedRestaurants,
                })}
              </p>
            </div>

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <div className="flex justify-between text-xs text-[var(--rm-ink-muted)]">
                <span>{t('superadmin.platformRevenue')}</span>
                <CreditCard className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                {formatFcfa(data.kpis.platformRevenueXof)}
              </p>
              <p className="mt-1 text-xs text-[#14B8A6]">
                {t('superadmin.strictSeparation')}
              </p>
            </div>

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <div className="flex justify-between text-xs text-[var(--rm-ink-muted)]">
                <span>{t('superadmin.pendingPayments')}</span>
                <ShieldAlert className="w-4 h-4 text-[#E5A32A]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#E5A32A] tabular-nums">
                {formatFcfa(data.kpis.pendingPaymentsXof)}
              </p>
              <Link
                to="/superadmin/billing"
                className="mt-1 inline-block text-xs font-semibold text-[var(--rm-ink)] hover:text-[#FF8738]"
              >
                {t('superadmin.viewBilling')}
              </Link>
            </div>

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <div className="flex justify-between text-xs text-[var(--rm-ink-muted)]">
                <span>{t('superadmin.activeUsers')}</span>
                <Users className="w-4 h-4 text-[#FF8738]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                {data.kpis.activeUsersCount}
              </p>
              <p className="mt-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
                {t('superadmin.activeSubsCount', { count: data.kpis.activeSubscriptions })}
              </p>
            </div>

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <div className="flex justify-between text-xs text-[var(--rm-ink-muted)]">
                <span>{t('superadmin.ticketsAndLeads')}</span>
                <LifeBuoy className="w-4 h-4 text-[#FF8738]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#FF8738] tabular-nums">
                {t('superadmin.openTicketsCount', { count: data.kpis.openTicketsCount })}
              </p>
              <p className="mt-1 text-xs text-[var(--rm-ink-muted)] tabular-nums">
                {t('superadmin.websiteLeadsCount', { count: data.kpis.leadsCount })}
              </p>
            </div>
          </div>

          {/* Restaurants & Audit Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--rm-border)] flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--rm-ink)]">
                  {t('superadmin.recentRestaurants')}
                </h2>
                <Link
                  to="/superadmin/restaurants"
                  className="text-xs font-semibold text-[#FF8738] hover:underline"
                >
                  {t('superadmin.manageAll')}
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">{t('superadmin.venueCol')}</th>
                      <th className="px-5 py-3 font-semibold">{t('superadmin.cityCol')}</th>
                      <th className="px-5 py-3 font-semibold">{t('superadmin.planCol')}</th>
                      <th className="px-5 py-3 font-semibold">{t('superadmin.statusCol')}</th>
                      <th className="px-5 py-3 font-semibold text-right">
                        {t('superadmin.createdAtCol')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                    {data.recentRestaurants.map((r) => (
                      <tr key={r.id} className="hover:bg-[var(--rm-surface-hover)] transition-colors">
                        <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                          {r.name}
                        </td>
                        <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                          {r.city}
                        </td>
                        <td className="px-5 py-3 text-xs font-medium text-[var(--rm-ink)]">
                          {r.planName || '—'}
                        </td>
                        <td className="px-5 py-3 text-xs font-semibold">
                          <span
                            className={
                              r.status === 'ACTIVE'
                                ? 'text-[#14B8A6]'
                                : r.status === 'SUSPENDED'
                                  ? 'text-[#E05252]'
                                  : 'text-[#FF8738]'
                            }
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right text-xs text-[var(--rm-ink-muted)] tabular-nums">
                          {formatDateFr(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[var(--rm-ink)]">
                  {t('superadmin.auditActivityTitle')}
                </h2>
                <Link
                  to="/superadmin/audit"
                  className="text-xs font-semibold text-[#FF8738] hover:underline"
                >
                  {t('superadmin.fullLog')}
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentAudit.map((a) => (
                  <div
                    key={a.id}
                    className="py-2 border-b border-[var(--rm-border-subtle)] last:border-0 text-xs"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-mono font-semibold text-[var(--rm-ink)]">
                        {a.action}
                      </span>
                      <span className="text-[var(--rm-ink-muted)] tabular-nums">
                        {formatTimeFr(a.createdAt)}
                      </span>
                    </div>
                    <p className="text-[var(--rm-ink-muted)] mt-0.5 truncate">
                      {a.actorEmail} {a.details ? `· ${a.details}` : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[var(--rm-ink)]">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                  <span>{t('superadmin.platformHealth')}</span>
                </div>
                <p className="text-[var(--rm-ink-muted)]">
                  {t('superadmin.platformHealthDesc')}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
