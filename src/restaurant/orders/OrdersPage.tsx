import { useCallback, useEffect, useState } from 'react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatFcfa,
  formatTimeFr,
  ORDER_STATUS_LABELS,
} from '../../utils/format';
import type { Order } from '../../types';

export function OrdersPage() {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<string>('ALL');
  const [selected, setSelected] = useState<Order | null>(null);

  const load = useCallback(() => {
    apiFetch<{ orders: Order[] }>('/api/restaurant/orders')
      .then((res) => setOrders(res.orders))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify('Statut mis à jour.', 'success');
      setSelected(null);
      load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur mise à jour.',
        'error',
      );
    }
  };

  const visible = orders.filter((o) => {
    if (filter === 'ALL') return true;
    if (filter === 'QR_TABLE' || filter === 'DINE_IN' || filter === 'TAKEAWAY') {
      return o.orderType === filter;
    }
    return o.status === filter;
  });

  return (
    <RestaurantLayout title="Commandes" onRealtimeEvent={load}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'ALL', label: 'Toutes' },
            { id: 'PENDING', label: 'En attente' },
            { id: 'IN_PREPARATION', label: 'En préparation' },
            { id: 'READY', label: 'Prêtes' },
            { id: 'PAID', label: 'Encaissées' },
            { id: 'QR_TABLE', label: 'Via QR Code' },
            { id: 'TAKEAWAY', label: 'À emporter' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === tab.id
                  ? 'bg-[#182333] text-white'
                  : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#182333]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">N°</th>
                  <th className="px-5 py-3 font-semibold">Client / Table</th>
                  <th className="px-5 py-3 font-semibold">Canal</th>
                  <th className="px-5 py-3 font-semibold">Articles</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">Total</th>
                  <th className="px-5 py-3 font-semibold text-right">Payé</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-[#182333]">
                      {ord.orderNumber}
                      <div className="text-[11px] font-normal text-[#64748B]">
                        {formatTimeFr(ord.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[#182333]">
                      {ord.tableLabel || ord.customerName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#64748B]">
                      {ord.orderType === 'QR_TABLE'
                        ? 'QR Table'
                        : ord.orderType === 'TAKEAWAY'
                          ? 'À emporter'
                          : 'Sur place'}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#64748B]">
                      {ord.items.map((i) => `${i.quantity}× ${i.name}`).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
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
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatFcfa(ord.totalXof)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[#64748B]">
                      {formatFcfa(ord.paidXof)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(ord)}
                        className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                      >
                        Détails
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#182333] font-mono">
                  {selected.orderNumber}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {selected.tableLabel || selected.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-[#64748B] hover:text-[#182333] cursor-pointer"
              >
                Fermer
              </button>
            </div>

            <div className="border-t border-b border-slate-100 py-3 space-y-2 text-xs">
              {selected.items.map((it) => (
                <div key={it.id} className="flex justify-between">
                  <span>
                    <strong>{it.quantity}×</strong> {it.name}
                  </span>
                  <span className="tabular-nums font-semibold">
                    {formatFcfa(it.lineTotalXof)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-between text-sm font-bold text-[#182333]">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatFcfa(selected.totalXof)}</span>
            </div>

            {selected.status !== 'PAID' && selected.status !== 'CANCELLED' && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'SERVED')}
                  className="flex-1 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
                >
                  Marquer Servie
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'CANCELLED')}
                  className="py-2 px-4 rounded-lg border border-red-200 text-[#E05252] text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
