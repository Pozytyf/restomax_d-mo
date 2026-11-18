import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  CreditCard,
  LayoutGrid,
  ShoppingBag,
  TrendingUp,
} from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import {
  formatFcfa,
  formatTimeFr,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
} from '../../utils/format';

interface DashboardData {
  kpis: {
    totalRevenueXof: number;
    collectedXof: number;
    expensesXof: number;
    ordersCount: number;
    avgBasketXof: number;
    pendingOrdersCount: number;
    tablesTotal: number;
    tablesOccupied: number;
    tablesReserved: number;
  };
  revenueSeries: Array<{ day: string; revenue_xof: number; orders: number }>;
  topItems: Array<{ name: string; qty: number; revenue_xof: number }>;
  lowStocks: Array<{
    id: string;
    name: string;
    unit: string;
    quantity: number;
    min_threshold: number;
    supplier_name: string;
  }>;
  paymentBreakdown: Array<{ method: string; total_xof: number; count: number }>;
  recentOrders: Array<{
    id: string;
    order_number: string;
    order_type: string;
    customer_name: string;
    status: string;
    total_xof: number;
    paid_xof: number;
    created_at: string;
    table_label: string | null;
  }>;
  staffActivity: Array<{
    actor_email: string;
    actor_role: string;
    action: string;
    details: string;
    created_at: string;
  }>;
}

export function OwnerDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    apiFetch<DashboardData>('/api/restaurant/dashboard')
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxRev = Math.max(
    1,
    ...(data?.revenueSeries.map((r) => r.revenue_xof) || [1]),
  );

  return (
    <RestaurantLayout
      title="Tableau de bord Propriétaire"
      onRealtimeEvent={load}
      actions={
        <Link
          to="/app/pos"
          className="px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          Ouvrir la caisse POS
        </Link>
      }
    >
      {loading || !data ? (
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
          {/* Primary KPI Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
                <span>Chiffre d’affaires</span>
                <TrendingUp className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {formatFcfa(data.kpis.totalRevenueXof)}
              </p>
              <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                Encaissé : {formatFcfa(data.kpis.collectedXof)}
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
                <span>Commandes</span>
                <ShoppingBag className="w-4 h-4 text-[#FF8738]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {data.kpis.ordersCount}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                Total hors annulations
              </p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
                <span>Panier moyen</span>
                <CreditCard className="w-4 h-4 text-[#182333]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {formatFcfa(data.kpis.avgBasketXof)}
              </p>
              <p className="mt-1 text-xs text-[#64748B]">Par commande</p>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
                <span>En attente / Cuisine</span>
                <Clock className="w-4 h-4 text-[#E5A32A]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#FF8738] tabular-nums">
                {data.kpis.pendingOrdersCount}
              </p>
              <Link
                to="/app/kitchen"
                className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-[#182333] hover:text-[#FF8738]"
              >
                <span>Voir KDS</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-medium">
                <span>Tables occupées</span>
                <LayoutGrid className="w-4 h-4 text-[#14B8A6]" />
              </div>
              <p className="mt-2 text-2xl font-extrabold text-[#182333] tabular-nums">
                {data.kpis.tablesOccupied} / {data.kpis.tablesTotal}
              </p>
              <p className="mt-1 text-xs text-[#64748B] tabular-nums">
                {data.kpis.tablesReserved} réservée(s)
              </p>
            </div>
          </div>

          {/* Performance Chart + Financial Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-base font-bold text-[#182333]">
                    Performance des ventes (FCFA)
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Historique journalier calculé sur vos commandes réelles
                  </p>
                </div>
              </div>

              {data.revenueSeries.length === 0 ? (
                <div className="h-52 flex items-center justify-center text-sm text-[#64748B]">
                  Aucune vente enregistrée pour le moment.
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
                        <span className="text-[11px] font-mono text-[#64748B] mb-1.5 opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                          {Math.round(pt.revenue_xof / 1000)}k
                        </span>
                        <div
                          style={{ height: `${pct}%` }}
                          className="w-full max-w-[44px] rounded-t-md bg-[#182333] group-hover:bg-[#FF8738] transition-colors"
                          title={`${pt.day}: ${formatFcfa(pt.revenue_xof)}`}
                        />
                        <span className="mt-2 text-[11px] text-[#64748B] font-mono">
                          {pt.day.slice(5)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="lg:col-span-4 bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-[#182333]">
                  Résumé financier
                </h2>
                <p className="text-xs text-[#64748B]">
                  Encaissements & charges enregistrées
                </p>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-[#64748B]">Volume facturé</span>
                    <span className="font-bold text-[#182333] tabular-nums">
                      {formatFcfa(data.kpis.totalRevenueXof)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-[#64748B]">Total encaissé</span>
                    <span className="font-bold text-[#14B8A6] tabular-nums">
                      {formatFcfa(data.kpis.collectedXof)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-[#64748B]">Dépenses saisies</span>
                    <span className="font-bold text-[#E05252] tabular-nums">
                      {formatFcfa(data.kpis.expensesXof)}
                    </span>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="text-xs font-semibold text-[#182333] mb-2">
                    Répartition encaissements
                  </p>
                  <div className="space-y-2">
                    {data.paymentBreakdown.map((pm) => (
                      <div
                        key={pm.method}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-[#64748B]">
                          {PAYMENT_METHOD_LABELS[pm.method] || pm.method} (
                          {pm.count})
                        </span>
                        <span className="font-semibold text-[#182333] tabular-nums">
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
                <span>Voir le détail financier</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Top Items + Critical Stocks + Recent Orders & Staff Activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Selling Articles */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-[#182333] mb-4">
                Articles les plus vendus
              </h2>
              <div className="space-y-3">
                {data.topItems.map((it, idx) => (
                  <div
                    key={it.name}
                    className="flex items-center justify-between gap-3 py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[#182333] truncate">
                        {idx + 1}. {it.name}
                      </p>
                      <p className="text-xs text-[#64748B] tabular-nums">
                        {it.qty} vendus
                      </p>
                    </div>
                    <span className="text-xs font-bold text-[#182333] tabular-nums whitespace-nowrap">
                      {formatFcfa(it.revenue_xof)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Critical Stocks */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-[#182333]">
                  Stocks critiques
                </h2>
                <Link
                  to="/app/stocks"
                  className="text-xs font-semibold text-[#FF8738] hover:underline"
                >
                  Gérer
                </Link>
              </div>
              {data.lowStocks.length === 0 ? (
                <p className="text-sm text-[#64748B] py-6 text-center">
                  Tous les niveaux de stock sont conformes.
                </p>
              ) : (
                <div className="space-y-3">
                  {data.lowStocks.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 rounded-lg bg-red-50/70 border border-red-200 flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-[#182333]">
                            {st.name}
                          </p>
                          <p className="text-xs text-[#64748B]">
                            Fournisseur : {st.supplier_name || 'Non défini'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right tabular-nums shrink-0">
                        <p className="text-xs font-bold text-[#E05252]">
                          {st.quantity} {st.unit}
                        </p>
                        <p className="text-[11px] text-[#64748B]">
                          Seuil : {st.min_threshold}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff Activity */}
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-[#182333] mb-4">
                Activité du personnel
              </h2>
              <div className="space-y-3">
                {data.staffActivity.map((act, i) => (
                  <div
                    key={`${act.created_at}-${i}`}
                    className="py-2 border-b border-slate-100 last:border-0 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-[#182333] truncate">
                        {act.action}
                      </span>
                      <span className="text-[#64748B] tabular-nums shrink-0">
                        {formatTimeFr(act.created_at)}
                      </span>
                    </div>
                    <p className="text-[#64748B] mt-0.5 truncate">
                      {act.actor_email} {act.details ? `· ${act.details}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-bold text-[#182333]">
                Dernières commandes
              </h2>
              <Link
                to="/app/orders"
                className="text-xs font-semibold text-[#FF8738] hover:underline"
              >
                Tout voir
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                  <tr>
                    <th className="px-6 py-3 font-semibold">N°</th>
                    <th className="px-6 py-3 font-semibold">Client / Table</th>
                    <th className="px-6 py-3 font-semibold">Canal</th>
                    <th className="px-6 py-3 font-semibold">Statut</th>
                    <th className="px-6 py-3 font-semibold text-right">Total</th>
                    <th className="px-6 py-3 font-semibold text-right">Heure</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-mono font-semibold text-[#182333]">
                        {ord.order_number}
                      </td>
                      <td className="px-6 py-3 text-[#182333]">
                        {ord.table_label || ord.customer_name}
                      </td>
                      <td className="px-6 py-3 text-xs text-[#64748B]">
                        {ord.order_type === 'QR_TABLE'
                          ? 'QR Table'
                          : ord.order_type === 'TAKEAWAY'
                            ? 'À emporter'
                            : 'Sur place'}
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
                          {ORDER_STATUS_LABELS[ord.status] || ord.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold text-[#182333] tabular-nums">
                        {formatFcfa(ord.total_xof)}
                      </td>
                      <td className="px-6 py-3 text-right text-xs text-[#64748B] tabular-nums">
                        {formatTimeFr(ord.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
