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
      notify(
        'Plan mis à jour (répercuté en direct sur la page Tarifs du site vitrine).',
        'success',
      );
      setEditing(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.subscriptionsTitle')}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-bold text-[#182333]">{p.name}</h2>
                  <span className="text-xs font-mono text-[#64748B]">
                    {p.code}
                  </span>
                </div>
                <p className="text-xs text-[#64748B] mt-1">{p.tagline}</p>
                <p className="mt-4 text-2xl font-extrabold text-[#182333] tabular-nums">
                  {formatFcfa(p.priceMonthlyXof)} / mois
                </p>
                <p className="text-xs text-[#64748B] tabular-nums">
                  Annuel : {formatFcfa(p.priceYearlyXof)} · Essai {p.trialDays} j
                </p>
                <p className="mt-3 text-xs text-[#182333] tabular-nums">
                  Limites : {p.maxTables} tables · {p.maxStaff} employés
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing({ ...p })}
                className="mt-5 w-full py-2 rounded-lg border border-slate-200 hover:border-[#FF8738] text-xs font-semibold text-[#182333] cursor-pointer"
              >
                Modifier tarif & limites
              </button>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#182333]">
              Abonnements actifs & essais
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Restaurant</th>
                  <th className="px-5 py-3 font-semibold">Plan</th>
                  <th className="px-5 py-3 font-semibold">Cycle</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Montant
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Fin période
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subs.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-[#182333]">
                      {s.restaurantName}
                    </td>
                    <td className="px-5 py-3 text-xs">{s.planName}</td>
                    <td className="px-5 py-3 text-xs text-[#64748B]">
                      {s.billingCycle}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-[#14B8A6]">
                      {s.status}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatFcfa(s.priceMonthlyXof)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[#64748B] tabular-nums">
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
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-[#182333]">
              Configurer l’offre {editing.name}
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold mb-1">
                  Mensuel (FCFA)
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">
                  Annuel (FCFA)
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max tables</label>
                <input
                  type="number"
                  value={editing.maxTables}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      maxTables: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Max équipe</label>
                <input
                  type="number"
                  value={editing.maxStaff}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      maxStaff: Number(e.target.value) || 1,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 tabular-nums"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={savePlan}
                className="flex-1 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
