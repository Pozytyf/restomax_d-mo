import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateFr, formatFcfa } from '../../utils/format';
import type { Plan } from '../../types';

export function PlansSubscriptionsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subs, setSubs] = useState<
    Array<{
      id: string;
      restaurantName: string;
      planName: string;
      priceMonthlyXof: number;
      billingCycle: string;
      status: string;
      currentPeriodEnd: string;
    }>
  >([]);
  const [editing, setEditing] = useState<Plan | null>(null);

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ plans: Plan[] }>('/api/superadmin/plans'),
      apiFetch<{ subscriptions: typeof subs }>('/api/superadmin/subscriptions'),
    ])
      .then(([p, s]) => {
        setPlans(p.plans);
        setSubs(s.subscriptions);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const savePlan = async () => {
    if (!editing) return;
    try {
      await apiFetch(`/api/superadmin/plans/${editing.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name: editing.name,
          tagline: editing.tagline,
          priceMonthlyXof: editing.priceMonthlyXof,
          priceYearlyXof: editing.priceYearlyXof,
          trialDays: editing.trialDays,
          maxTables: editing.maxTables,
          maxStaff: editing.maxStaff,
        }),
      });
      notify(t('superadminPages.subscriptions.planUpdatedToast'), 'success');
      setEditing(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.subscriptionsTitle')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[var(--rm-ink)]">
                    {p.name}
                  </h2>
                  <span className="text-xs font-mono text-[var(--rm-ink-muted)]">
                    {p.code}
                  </span>
                </div>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-1">
                  {p.tagline}
                </p>
                <p className="mt-4 text-2xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                  {t('superadminPages.subscriptions.perMonth', {
                    amount: formatFcfa(p.priceMonthlyXof),
                  })}
                </p>
                <p className="text-xs text-[var(--rm-ink-muted)] tabular-nums">
                  {t('superadminPages.subscriptions.yearlyTrialMeta', {
                    amount: formatFcfa(p.priceYearlyXof),
                    days: p.trialDays,
                  })}
                </p>
                <p className="mt-3 text-xs text-[var(--rm-ink)] tabular-nums">
                  {t('superadminPages.subscriptions.limitsMeta', {
                    tables: p.maxTables,
                    staff: p.maxStaff,
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing({ ...p })}
                className="mt-5 w-full py-2 rounded-lg border border-[var(--rm-border)] hover:border-[#FF8738] text-xs font-semibold text-[var(--rm-ink)] cursor-pointer transition-colors"
              >
                {t('superadminPages.subscriptions.editPlanBtn')}
              </button>
            </div>
          ))}
        </div>

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--rm-border)]">
            <h2 className="text-base font-bold text-[var(--rm-ink)]">
              {t('superadminPages.subscriptions.activeSubsTitle')}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.subscriptions.colRestaurant')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.subscriptions.colPlan')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.subscriptions.colCycle')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.subscriptions.colStatus')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.subscriptions.colAmount')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.subscriptions.colPeriodEnd')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {subs.map((s) => (
                  <tr
                    key={s.id}
                    className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                      {s.restaurantName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink)]">
                      {s.planName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                      {s.billingCycle}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-[#14B8A6]">
                      {s.status}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--rm-ink)] tabular-nums">
                      {formatFcfa(s.priceMonthlyXof)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[var(--rm-ink-muted)] tabular-nums">
                      {formatDateFr(s.currentPeriodEnd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[var(--rm-ink)]">
              {t('superadminPages.subscriptions.editModalTitle', {
                name: editing.name,
              })}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--rm-ink)] mb-1">
                  {t('superadminPages.subscriptions.monthlyXofLabel')}
                </label>
                <input
                  type="number"
                  value={editing.priceMonthlyXof}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priceMonthlyXof: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--rm-ink)] mb-1">
                  {t('superadminPages.subscriptions.yearlyXofLabel')}
                </label>
                <input
                  type="number"
                  value={editing.priceYearlyXof}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      priceYearlyXof: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--rm-ink)] mb-1">
                  {t('superadminPages.subscriptions.maxTablesLabel')}
                </label>
                <input
                  type="number"
                  value={editing.maxTables}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      maxTables: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold text-[var(--rm-ink)] mb-1">
                  {t('superadminPages.subscriptions.maxStaffLabel')}
                </label>
                <input
                  type="number"
                  value={editing.maxStaff}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      maxStaff: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] tabular-nums"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={savePlan}
                className="flex-1 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
