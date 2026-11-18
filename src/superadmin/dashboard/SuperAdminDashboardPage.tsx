import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
    <SuperAdminLayout title="Dashboard Super-admin" onRealtimeEvent={load}>
      {!data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 rounded-xl bg-white border border-slate-200 animate-pulse"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Platform KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Restaurants enregistrés</span>
                <Store className="w-4 h-4 text-[#182333]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {data.kpis.totalRestaurants}
              </p>
              <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                {data.kpis.activeRestaurants} actifs · {data.kpis.trialRestaurants}{' '}
                essai · {data.kpis.suspendedRestaurants} suspendus
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Revenus plateforme (Circuit A)</span>
                <CreditCard className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {formatFcfa(data.kpis.platformRevenueXof)}
              </p>
              <p className="mt-1 text-xs text-[#14B8A6]">
                Strictement séparé des caisses restaurants
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Paiements en attente</span>
                <ShieldAlert className="w-4 h-4 text-[#E5A32A]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#E5A32A] tabular-nums">
                {formatFcfa(data.kpis.pendingPaymentsXof)}
              </p>
              <Link
                to="/superadmin/billing"
                className="mt-1 inline-block text-xs font-semibold text-[#182333] hover:text-[#FF8738]"
              >
                Voir facturation
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Utilisateurs actifs</span>
                <Users className="w-4 h-4 text-[#FF8738]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {data.kpis.activeUsersCount}
              </p>
              <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                {data.kpis.activeSubscriptions} abonnements actifs/essai
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>Tickets & Prospects</span>
                <LifeBuoy className="w-4 h-4 text-[#FF8738]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#FF8738] tabular-nums">
                {data.kpis.openTicketsCount} ouverts
              </p>
              <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                {data.kpis.leadsCount} demandes site vitrine
              </p>
            </div>
          </div>

          {/* Restaurants & Audit Blocks */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <h2 className="text-base font-bold text-[#182333]">
                  Restaurants clients récents
                </h2>
                <Link
                  to="/superadmin/restaurants"
                  className="text-xs font-semibold text-[#FF8738] hover:underline"
                >
                  Gérer tous
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Établissement</th>
                      <th className="px-5 py-3 font-semibold">Ville</th>
                      <th className="px-5 py-3 font-semibold">Offre</th>
                      <th className="px-5 py-3 font-semibold">Statut</th>
                      <th className="px-5 py-3 font-semibold text-right">
                        Créé le
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.recentRestaurants.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="px-5 py-3 font-semibold text-[#182333]">
                          {r.name}
                        </td>
                        <td className="px-5 py-3 text-xs text-[#64748B]">
                          {r.city}
                        </td>
                        <td className="px-5 py-3 text-xs font-medium">
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
                        <td className="px-5 py-3 text-right text-xs text-[#64748B] tabular-nums">
                          {formatDateFr(r.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-[#182333]">
                  Activité & Audit Sécurité
                </h2>
                <Link
                  to="/superadmin/audit"
                  className="text-xs font-semibold text-[#FF8738] hover:underline"
                >
                  Journal complet
                </Link>
              </div>
              <div className="space-y-3">
                {data.recentAudit.map((a) => (
                  <div
                    key={a.id}
                    className="py-2 border-b border-slate-100 last:border-0 text-xs"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="font-mono font-semibold text-[#182333]">
                        {a.action}
                      </span>
                      <span className="text-[#64748B] tabular-nums">
                        {formatTimeFr(a.createdAt)}
                      </span>
                    </div>
                    <p className="text-[#64748B] mt-0.5 truncate">
                      {a.actorEmail} {a.details ? `· ${a.details}` : ''}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#F5F7FA] border border-slate-200 space-y-1.5 text-xs">
                <div className="flex items-center gap-2 font-semibold text-[#182333]">
                  <CheckCircle2 className="w-4 h-4 text-[#14B8A6]" />
                  <span>Santé de la plateforme</span>
                </div>
                <p className="text-[#64748B]">
                  Base multi-tenant SQLite WAL active · WebSockets temps réel · Mode paiement TEST actif
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
