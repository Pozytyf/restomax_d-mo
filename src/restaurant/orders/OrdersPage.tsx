import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatFcfa,
  formatTimeFr,
  getOrderStatusLabel,
} from '../../utils/format';
import type { Order } from '../../types';

const FILTER_IDS = [
  'ALL',
  'PENDING',
  'IN_PREPARATION',
  'READY',
  'PAID',
  'QR_TABLE',
  'TAKEAWAY',
] as const;

export function OrdersPage() {
  const { t } = useTranslation();
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
      notify(t('orders.statusUpdated'), 'success');
      setSelected(null);
      load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('orders.statusUpdateError'),
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
    <RestaurantLayout title={t('orders.title')} onRealtimeEvent={load}>
      <div className="space-y-5">
        <div className="flex flex-wrap gap-2">
          {FILTER_IDS.map((tabId) => (
            <button
              key={tabId}
              type="button"
              onClick={() => setFilter(tabId)}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                filter === tabId
                  ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                  : 'bg-[var(--rm-surface)] border border-[var(--rm-border)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
              }`}
            >
              {t(`orders.filters.${tabId}`)}
            </button>
          ))}
        </div>

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t('dashboard.orderNoCol')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('dashboard.customerTableCol')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('common.channel')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('orders.itemsCol')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('common.status')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('common.total')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('common.paid')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('common.action')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {visible.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-[var(--rm-ink)]">
                      {ord.orderNumber}
                      <div className="text-[11px] font-normal text-[var(--rm-ink-muted)]">
                        {formatTimeFr(ord.createdAt)}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-[var(--rm-ink)]">
                      {ord.tableLabel || ord.customerName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                      {ord.orderType === 'QR_TABLE'
                        ? t('common.qrTable')
                        : ord.orderType === 'TAKEAWAY'
                          ? t('common.takeaway')
                          : t('common.dineIn')}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
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
                        {getOrderStatusLabel(ord.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--rm-ink)] tabular-nums">
                      {formatFcfa(ord.totalXof)}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums text-[var(--rm-ink-muted)]">
                      {formatFcfa(ord.paidXof)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(ord)}
                        className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                      >
                        {t('common.details')}
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
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[var(--rm-ink)] font-mono">
                  {selected.orderNumber}
                </h3>
                <p className="text-xs text-[var(--rm-ink-muted)]">
                  {selected.tableLabel || selected.customerName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="border-t border-b border-[var(--rm-border-subtle)] py-3 space-y-2 text-xs text-[var(--rm-ink)]">
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

            <div className="flex justify-between text-sm font-bold text-[var(--rm-ink)]">
              <span>{t('common.totalTtc')}</span>
              <span className="tabular-nums">{formatFcfa(selected.totalXof)}</span>
            </div>

            {selected.status !== 'PAID' && selected.status !== 'CANCELLED' && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'SERVED')}
                  className="flex-1 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('orders.markServed')}
                </button>
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'CANCELLED')}
                  className="py-2 px-4 rounded-lg border border-red-200 dark:border-red-900/60 text-[#E05252] text-xs font-semibold cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
