import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatTimeFr, ORDER_STATUS_LABELS } from '../../utils/format';
import type { Order } from '../../types';

export function KitchenKdsPage() {
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stationFilter, setStationFilter] = useState<'ALL' | 'KITCHEN' | 'BAR'>(
    'ALL',
  );

  const load = useCallback(() => {
    apiFetch<{ orders: Order[] }>('/api/restaurant/orders')
      .then((res) => {
        setOrders(
          res.orders.filter((o) =>
            ['PENDING', 'IN_PREPARATION', 'READY'].includes(o.status),
          ),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (orderId: string, status: string) => {
    try {
      await apiFetch(`/api/restaurant/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      notify(`Statut mis à jour : ${ORDER_STATUS_LABELS[status]}`, 'success');
      load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur mise à jour KDS.',
        'error',
      );
    }
  };

  return (
    <RestaurantLayout
      title="Cuisine & Bar (KDS Temps Réel)"
      onRealtimeEvent={load}
      actions={
        <div className="inline-flex p-1 rounded-lg bg-[#F5F7FA] border border-slate-200">
          {(['ALL', 'KITCHEN', 'BAR'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStationFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                stationFilter === st
                  ? 'bg-[#182333] text-white'
                  : 'text-[#64748B]'
              }`}
            >
              {st === 'ALL' ? 'Tous' : st === 'KITCHEN' ? 'Cuisine' : 'Bar'}
            </button>
          ))}
        </div>
      }
    >
      {orders.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-[#64748B]">
          Aucune commande en attente de préparation actuellement.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {orders.map((ord) => {
            const visibleItems =
              stationFilter === 'ALL'
                ? ord.items
                : ord.items.filter((i) => i.station === stationFilter);
            if (visibleItems.length === 0) return null;

            const elapsedMins = Math.max(
              1,
              Math.round(
                (Date.now() - new Date(ord.createdAt).getTime()) / 60000,
              ),
            );
            const urgent = elapsedMins >= 15;

            return (
              <div
                key={ord.id}
                className={`bg-white rounded-xl border p-5 flex flex-col justify-between ${
                  urgent ? 'border-[#E05252]' : 'border-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div>
                      <p className="font-mono text-sm font-extrabold text-[#182333]">
                        {ord.orderNumber}
                      </p>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {ord.tableLabel || ord.customerName} ·{' '}
                        {ord.orderType === 'QR_TABLE'
                          ? 'Client QR'
                          : ord.orderType === 'TAKEAWAY'
                            ? 'À emporter'
                            : 'Salle'}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums ${
                          urgent ? 'text-[#E05252]' : 'text-[#FF8738]'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {elapsedMins} min
                      </span>
                      <p className="text-[11px] text-[#64748B]">
                        {formatTimeFr(ord.createdAt)}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2.5">
                    {visibleItems.map((line) => (
                      <li
                        key={line.id}
                        className="flex items-start justify-between gap-2 text-sm"
                      >
                        <div>
                          <span className="font-bold text-[#182333] tabular-nums mr-2">
                            {line.quantity}×
                          </span>
                          <span className="font-medium text-[#182333]">
                            {line.name}
                          </span>
                          {line.optionsSummary && (
                            <p className="text-xs text-[#64748B] ml-6">
                              {line.optionsSummary}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[#64748B] shrink-0">
                          {line.station === 'BAR' ? 'Bar' : 'Cuisine'}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {ord.notes && (
                    <p className="mt-3 p-2.5 rounded-lg bg-amber-50 text-xs text-amber-900">
                      Note : {ord.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-slate-100 flex gap-2">
                  {ord.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'IN_PREPARATION')}
                      className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
                    >
                      Démarrer préparation
                    </button>
                  )}
                  {ord.status === 'IN_PREPARATION' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'READY')}
                      className="flex-1 py-2.5 rounded-lg bg-[#14B8A6] hover:opacity-90 text-white text-xs font-semibold cursor-pointer"
                    >
                      Marquer Prête
                    </button>
                  )}
                  {ord.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'SERVED')}
                      className="flex-1 py-2.5 rounded-lg bg-[#182333] hover:bg-[#223044] text-white text-xs font-semibold cursor-pointer"
                    >
                      Remise / Servie
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </RestaurantLayout>
  );
}
