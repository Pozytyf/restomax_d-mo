import { useCallback, useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatTimeFr, getOrderStatusLabel } from '../../utils/format';
import type { Order } from '../../types';

export function KitchenKdsPage() {
  const { t } = useTranslation();
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
      notify(
        t('kitchen.statusUpdated', { status: getOrderStatusLabel(status) }),
        'success',
      );
      load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('kitchen.updateError'),
        'error',
      );
    }
  };

  return (
    <RestaurantLayout
      title={t('kitchen.title')}
      onRealtimeEvent={load}
      actions={
        <div className="inline-flex p-1 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)]">
          {(['ALL', 'KITCHEN', 'BAR'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStationFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                stationFilter === st
                  ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                  : 'text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
              }`}
            >
              {st === 'ALL'
                ? t('common.all')
                : st === 'KITCHEN'
                  ? t('common.kitchen')
                  : t('common.bar')}
            </button>
          ))}
        </div>
      }
    >
      {orders.length === 0 ? (
        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-12 text-center text-sm text-[var(--rm-ink-muted)]">
          {t('kitchen.noPendingOrders')}
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
                className={`bg-[var(--rm-surface)] rounded-xl border p-5 flex flex-col justify-between ${
                  urgent
                    ? 'border-[#E05252]'
                    : 'border-[var(--rm-border)]'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--rm-border-subtle)]">
                    <div>
                      <p className="font-mono text-sm font-extrabold text-[var(--rm-ink)]">
                        {ord.orderNumber}
                      </p>
                      <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                        {ord.tableLabel || ord.customerName} ·{' '}
                        {ord.orderType === 'QR_TABLE'
                          ? t('kitchen.qrGuest')
                          : ord.orderType === 'TAKEAWAY'
                            ? t('common.takeaway')
                            : t('kitchen.roomGuest')}
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
                      <p className="text-[11px] text-[var(--rm-ink-muted)]">
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
                          <span className="font-bold text-[var(--rm-ink)] tabular-nums mr-2">
                            {line.quantity}×
                          </span>
                          <span className="font-medium text-[var(--rm-ink)]">
                            {line.name}
                          </span>
                          {line.optionsSummary && (
                            <p className="text-xs text-[var(--rm-ink-muted)] ml-6">
                              {line.optionsSummary}
                            </p>
                          )}
                        </div>
                        <span className="text-[11px] font-semibold text-[var(--rm-ink-muted)] shrink-0">
                          {line.station === 'BAR'
                            ? t('common.bar')
                            : t('common.kitchen')}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {ord.notes && (
                    <p className="mt-3 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/50">
                      {t('common.note')} : {ord.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-4 border-t border-[var(--rm-border-subtle)] flex gap-2">
                  {ord.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'IN_PREPARATION')}
                      className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
                    >
                      {t('kitchen.startPrep')}
                    </button>
                  )}
                  {ord.status === 'IN_PREPARATION' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'READY')}
                      className="flex-1 py-2.5 rounded-lg bg-[#14B8A6] hover:opacity-90 text-white text-xs font-semibold cursor-pointer"
                    >
                      {t('kitchen.markReady')}
                    </button>
                  )}
                  {ord.status === 'READY' && (
                    <button
                      type="button"
                      onClick={() => updateStatus(ord.id, 'SERVED')}
                      className="flex-1 py-2.5 rounded-lg bg-[#182333] hover:bg-[#223044] dark:bg-[#223044] dark:hover:bg-[#2D4059] text-white text-xs font-semibold cursor-pointer"
                    >
                      {t('kitchen.servedBtn')}
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
