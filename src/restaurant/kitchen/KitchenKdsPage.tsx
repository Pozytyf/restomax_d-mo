import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  Clock,
  Flame,
  Layers,
  Printer,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatTimeFr, getOrderStatusLabel } from '../../utils/format';
import { executeThermalPrint } from '../../utils/thermalPrint';
import {
  countKdsStatuses,
  getElapsedMinutes,
  groupKdsOrders,
  groupKdsOrdersByPrepTime,
  type KdsGroupMode,
  type KdsPrepTimeTier,
  type KdsStationFilter,
  type KdsStatusFilter,
} from './kdsGrouping';
import type { Order, OrderItem, OrderStatus } from '../../types';

function getKdsStatusMeta(
  status: OrderStatus,
  t: (key: string) => string,
): {
  label: string;
  barClass: string;
  textClass: string;
  surfaceClass: string;
  Icon: typeof Bell;
} {
  if (status === 'IN_PREPARATION') {
    return {
      label: t('kitchen.statusPreparing'),
      barClass: 'bg-[#2563EB]',
      textClass: 'text-[#2563EB] dark:text-[#60A5FA]',
      surfaceClass:
        'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200/70 dark:border-blue-800/50',
      Icon: Flame,
    };
  }
  if (status === 'READY') {
    return {
      label: t('kitchen.statusReady'),
      barClass: 'bg-[#16A34A]',
      textClass: 'text-[#16A34A] dark:text-[#34D399]',
      surfaceClass:
        'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200/70 dark:border-emerald-800/50',
      Icon: CheckCircle2,
    };
  }
  return {
    label: t('kitchen.statusNew'),
    barClass: 'bg-[#FF8738]',
    textClass: 'text-[#D97706] dark:text-[#FF8738]',
    surfaceClass:
      'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200/70 dark:border-amber-800/50',
    Icon: Bell,
  };
}

function getTierMeta(
  tier: KdsPrepTimeTier,
  t: (key: string) => string,
): {
  label: string;
  barClass: string;
  textClass: string;
  borderClass: string;
} {
  if (tier === 'CRITICAL') {
    return {
      label: t('kitchen.prepTierCritical'),
      barClass: 'bg-[#DC2626]',
      textClass: 'text-[#DC2626] dark:text-[#F87171]',
      borderClass: 'border-[#E05252]/60',
    };
  }
  if (tier === 'ACTIVE') {
    return {
      label: t('kitchen.prepTierActive'),
      barClass: 'bg-[#D97706]',
      textClass: 'text-[#D97706] dark:text-[#FBBF24]',
      borderClass: 'border-[var(--rm-border)]',
    };
  }
  return {
    label: t('kitchen.prepTierFresh'),
    barClass: 'bg-[#14B8A6]',
    textClass: 'text-[#0D9488] dark:text-[#2DD4BF]',
    borderClass: 'border-[var(--rm-border)]',
  };
}

export function KitchenKdsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stationFilter, setStationFilter] = useState<KdsStationFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<KdsStatusFilter>('ALL');
  const [groupMode, setGroupMode] = useState<KdsGroupMode>('TIME');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const load = useCallback(() => {
    apiFetch<{ orders: Order[] }>('/api/restaurant/orders')
      .then((res) => {
        setOrders(
          res.orders.filter((o) =>
            ['PENDING', 'IN_PREPARATION', 'READY'].includes(o.status),
          ),
        );
        setNowMs(Date.now());
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => setNowMs(Date.now()), 15000);
    return () => window.clearInterval(timer);
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

  const updateBatchStatus = async (orderIds: string[], status: string) => {
    if (orderIds.length === 0) return;
    try {
      await Promise.all(
        orderIds.map((id) =>
          apiFetch(`/api/restaurant/orders/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
          }),
        ),
      );
      notify(
        t('kitchen.batchUpdated', {
          count: orderIds.length,
          status: getOrderStatusLabel(status),
        }),
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

  const statusCounts = useMemo(
    () => countKdsStatuses(orders, stationFilter),
    [orders, stationFilter],
  );

  const timeBuckets = useMemo(
    () => groupKdsOrdersByPrepTime(orders, stationFilter, statusFilter, nowMs),
    [orders, stationFilter, statusFilter, nowMs],
  );

  const groups = useMemo(
    () =>
      groupKdsOrders(
        orders,
        stationFilter,
        groupMode,
        {
          takeawayGroup: t('kitchen.takeawayGroup'),
          unassignedGroup: t('kitchen.unassignedGroup'),
          prepTierCritical: t('kitchen.prepTierCritical'),
          prepTierActive: t('kitchen.prepTierActive'),
          prepTierFresh: t('kitchen.prepTierFresh'),
        },
        statusFilter,
        nowMs,
      ),
    [groupMode, nowMs, orders, stationFilter, statusFilter, t],
  );

  const printKitchenTicket = async (
    ord: Order,
    visibleItems: OrderItem[],
  ) => {
    try {
      await executeThermalPrint({
        kind: 'KITCHEN',
        orderNumber: ord.orderNumber,
        tableLabel: ord.tableLabel,
        customerName: ord.customerName,
        stationLabel:
          stationFilter === 'BAR'
            ? t('common.bar')
            : stationFilter === 'KITCHEN'
              ? t('common.kitchen')
              : `${t('common.kitchen')} / ${t('common.bar')}`,
        notes: ord.notes,
        items: visibleItems.map((line) => ({
          name: line.name,
          quantity: line.quantity,
          optionsSummary: line.optionsSummary,
          notes: line.notes,
        })),
      });
      notify(t('kitchen.ticketPrinted'), 'success');
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('kitchen.ticketPrintError'),
        'error',
      );
    }
  };

  const renderStatusIndicator = (status: OrderStatus) => {
    const meta = getKdsStatusMeta(status, t);
    const StatusIcon = meta.Icon;
    return (
      <span
        data-kds-status={status}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-bold whitespace-nowrap ${meta.surfaceClass} ${meta.textClass}`}
      >
        <StatusIcon className="w-3 h-3 shrink-0" />
        <span>{meta.label}</span>
      </span>
    );
  };

  const renderOrderActionRow = (ord: Order, visibleItems: OrderItem[]) => (
    <div className="flex items-center gap-2 pt-3 border-t border-[var(--rm-border-subtle)]">
      <button
        type="button"
        onClick={() => void printKitchenTicket(ord, visibleItems)}
        title={t('kitchen.printTicketBtn')}
        aria-label={t('kitchen.printTicketBtn')}
        className="px-2.5 py-2 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink-muted)] hover:text-[#FF8738] hover:border-[#FF8738] text-xs font-semibold cursor-pointer inline-flex items-center justify-center transition-colors"
      >
        <Printer className="w-3.5 h-3.5" />
      </button>
      {ord.status === 'PENDING' && (
        <button
          type="button"
          onClick={() => void updateStatus(ord.id, 'IN_PREPARATION')}
          className="flex-1 py-2 px-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
        >
          {t('kitchen.startPrep')}
        </button>
      )}
      {ord.status === 'IN_PREPARATION' && (
        <button
          type="button"
          onClick={() => void updateStatus(ord.id, 'READY')}
          className="flex-1 py-2 px-3 rounded-lg bg-[#14B8A6] hover:opacity-90 text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
        >
          {t('kitchen.markReady')}
        </button>
      )}
      {ord.status === 'READY' && (
        <button
          type="button"
          onClick={() => void updateStatus(ord.id, 'SERVED')}
          className="flex-1 py-2 px-3 rounded-lg bg-[#182333] hover:bg-[#223044] dark:bg-[#223044] dark:hover:bg-[#2D4059] text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
        >
          {t('kitchen.servedBtn')}
        </button>
      )}
    </div>
  );

  return (
    <RestaurantLayout
      title={t('kitchen.title')}
      onRealtimeEvent={load}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {/* Group mode toggle */}
          <div className="inline-flex items-center p-1 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)]">
            <Layers className="w-3.5 h-3.5 text-[var(--rm-ink-muted)] mx-1.5 hidden sm:block" />
            {(
              [
                { id: 'TIME', label: t('kitchen.groupByTime') },
                { id: 'TABLE', label: t('kitchen.groupByTable') },
                { id: 'ZONE', label: t('kitchen.groupByZone') },
                { id: 'NONE', label: t('kitchen.groupByOrder') },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                type="button"
                onClick={() => setGroupMode(mode.id)}
                className={`px-2.5 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                  groupMode === mode.id
                    ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                    : 'text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>

          {/* Station filter */}
          <div className="inline-flex p-1 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)]">
            {(['ALL', 'KITCHEN', 'BAR'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStationFilter(st)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
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
        </div>
      }
    >
      <div className="space-y-5">
        {/* Status Indicator Legend & Interactive Filter Bar */}
        <div
          data-testid="kds-status-bar"
          className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] px-4 py-3 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[var(--rm-ink-muted)] mr-1">
              {t('kitchen.statusFilterLabel')} :
            </span>
            {(
              [
                {
                  id: 'ALL',
                  label: t('common.all'),
                  count: statusCounts.ALL,
                  colorDot: 'bg-[var(--rm-ink)]',
                },
                {
                  id: 'PENDING',
                  label: t('kitchen.statusNew'),
                  count: statusCounts.PENDING,
                  colorDot: 'bg-[#FF8738]',
                },
                {
                  id: 'IN_PREPARATION',
                  label: t('kitchen.statusPreparing'),
                  count: statusCounts.IN_PREPARATION,
                  colorDot: 'bg-[#2563EB]',
                },
                {
                  id: 'READY',
                  label: t('kitchen.statusReady'),
                  count: statusCounts.READY,
                  colorDot: 'bg-[#16A34A]',
                },
              ] as const
            ).map((opt) => {
              const active = statusFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setStatusFilter(opt.id)}
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 border transition-colors ${
                    active
                      ? 'bg-[#182333] dark:bg-[var(--rm-surface-muted)] text-white dark:text-[var(--rm-ink)] border-[#182333] dark:border-[#FF8738]'
                      : 'bg-[var(--rm-surface)] text-[var(--rm-ink-muted)] border-[var(--rm-border)] hover:text-[var(--rm-ink)]'
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`w-2 h-2 rounded-xs shrink-0 ${
                      active && opt.id === 'ALL' ? 'bg-[#FF8738]' : opt.colorDot
                    }`}
                  />
                  <span>{opt.label}</span>
                  <span className="font-mono tabular-nums opacity-85">
                    {opt.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--rm-ink-muted)] tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#DC2626]" />
              {t('kitchen.prepTierCritical')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#D97706]" />
              {t('kitchen.prepTierActive')}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-xs bg-[#14B8A6]" />
              {t('kitchen.prepTierFresh')}
            </span>
          </div>
        </div>

        {statusCounts.ALL === 0 ? (
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-12 text-center text-sm text-[var(--rm-ink-muted)]">
            {t('kitchen.noPendingOrders')}
          </div>
        ) : groupMode === 'TIME' ? (
          /* Visual Grouping by Preparation Time Columns */
          <div
            data-testid="kds-prep-time-board"
            className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start"
          >
            {timeBuckets.map((bucket) => {
              const tierMeta = getTierMeta(bucket.tier, t);
              const oldestMins =
                bucket.oldestCreatedAtMs !== null
                  ? Math.max(
                      1,
                      Math.round((nowMs - bucket.oldestCreatedAtMs) / 60000),
                    )
                  : null;

              return (
                <section
                  key={bucket.tier}
                  data-testid={`kds-time-tier-${bucket.tier}`}
                  className={`bg-[var(--rm-surface)] rounded-xl border overflow-hidden flex flex-col ${tierMeta.borderClass}`}
                >
                  <div className={`h-1 w-full ${tierMeta.barClass}`} />
                  <div className="px-4 py-3.5 border-b border-[var(--rm-border)] flex items-center justify-between gap-3">
                    <div>
                      <h2
                        className={`text-sm font-extrabold tracking-tight ${tierMeta.textClass}`}
                      >
                        {tierMeta.label}
                      </h2>
                      <p className="text-xs text-[var(--rm-ink-muted)] tabular-nums mt-0.5">
                        {t('kitchen.ordersCount', {
                          count: bucket.orders.length,
                        })}{' '}
                        ·{' '}
                        {t('kitchen.itemsCount', {
                          count: bucket.totalItemsCount,
                        })}
                      </p>
                    </div>
                    {oldestMins !== null && (
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums shrink-0 ${tierMeta.textClass}`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {t('kitchen.elapsedLabel', { mins: oldestMins })}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-3.5">
                    {bucket.orders.length === 0 ? (
                      <p className="py-8 text-center text-xs text-[var(--rm-ink-muted)]">
                        {t('kitchen.prepTierEmpty')}
                      </p>
                    ) : (
                      bucket.orders.map(({ order: ord, visibleItems }) => {
                        const elapsedMins = getElapsedMinutes(
                          ord.createdAt,
                          nowMs,
                        );
                        const statusMeta = getKdsStatusMeta(ord.status, t);

                        return (
                          <article
                            key={ord.id}
                            data-testid={`kds-order-card-${ord.id}`}
                            className="bg-[var(--rm-surface-muted)] rounded-xl border border-[var(--rm-border)] overflow-hidden flex flex-col"
                          >
                            <div
                              className={`h-1 w-full ${statusMeta.barClass}`}
                            />
                            <div className="p-4 space-y-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-sm font-extrabold text-[var(--rm-ink)]">
                                      {ord.orderNumber}
                                    </span>
                                    {renderStatusIndicator(ord.status)}
                                  </div>
                                  <p className="text-xs text-[var(--rm-ink-muted)] mt-1 truncate">
                                    {ord.tableLabel || ord.customerName}
                                    {ord.tableZone ? ` · ${ord.tableZone}` : ''}{' '}
                                    ·{' '}
                                    {ord.orderType === 'QR_TABLE'
                                      ? t('kitchen.qrGuest')
                                      : ord.orderType === 'TAKEAWAY'
                                        ? t('common.takeaway')
                                        : t('kitchen.roomGuest')}
                                  </p>
                                </div>
                                <div className="text-right shrink-0 tabular-nums">
                                  <span
                                    className={`inline-flex items-center gap-1 text-xs font-bold ${tierMeta.textClass}`}
                                  >
                                    <Clock className="w-3 h-3" />
                                    {t('kitchen.elapsedLabel', {
                                      mins: elapsedMins,
                                    })}
                                  </span>
                                  <p className="text-[11px] text-[var(--rm-ink-muted)]">
                                    {formatTimeFr(ord.createdAt)}
                                  </p>
                                </div>
                              </div>

                              <ul className="space-y-1.5">
                                {visibleItems.map((line) => (
                                  <li
                                    key={line.id}
                                    className="flex items-start justify-between gap-2 text-xs"
                                  >
                                    <div>
                                      <span className="font-bold text-[var(--rm-ink)] tabular-nums mr-1.5">
                                        {line.quantity}×
                                      </span>
                                      <span className="font-medium text-[var(--rm-ink)]">
                                        {line.name}
                                      </span>
                                      {line.optionsSummary && (
                                        <p className="text-[11px] text-[var(--rm-ink-muted)] ml-5">
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
                                <p className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/50">
                                  {t('common.note')} : {ord.notes}
                                </p>
                              )}

                              {renderOrderActionRow(ord, visibleItems)}
                            </div>
                          </article>
                        );
                      })
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : groups.length === 0 ? (
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-12 text-center text-sm text-[var(--rm-ink-muted)]">
            {t('kitchen.noPendingOrders')}
          </div>
        ) : groupMode === 'NONE' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {groups.map((grp) => {
              const { order: ord, visibleItems } = grp.orders[0];
              const elapsedMins = getElapsedMinutes(ord.createdAt, nowMs);
              const urgent = elapsedMins >= 15;
              const statusMeta = getKdsStatusMeta(ord.status, t);

              return (
                <div
                  key={ord.id}
                  className={`bg-[var(--rm-surface)] rounded-xl border overflow-hidden flex flex-col justify-between ${
                    urgent ? 'border-[#E05252]' : 'border-[var(--rm-border)]'
                  }`}
                >
                  <div className={`h-1 w-full ${statusMeta.barClass}`} />
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--rm-border-subtle)]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-mono text-sm font-extrabold text-[var(--rm-ink)]">
                              {ord.orderNumber}
                            </p>
                            {renderStatusIndicator(ord.status)}
                          </div>
                          <p className="text-xs text-[var(--rm-ink-muted)] mt-1">
                            {ord.tableLabel || ord.customerName}
                            {ord.tableZone ? ` · ${ord.tableZone}` : ''} ·{' '}
                            {ord.orderType === 'QR_TABLE'
                              ? t('kitchen.qrGuest')
                              : ord.orderType === 'TAKEAWAY'
                                ? t('common.takeaway')
                                : t('kitchen.roomGuest')}
                          </p>
                        </div>
                        <div className="text-right tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-bold ${
                              urgent ? 'text-[#E05252]' : 'text-[#FF8738]'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            {t('kitchen.elapsedLabel', { mins: elapsedMins })}
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

                    <div className="mt-5">
                      {renderOrderActionRow(ord, visibleItems)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {groups.map((grp) => {
              const elapsedMins = Math.max(
                1,
                Math.round((nowMs - grp.oldestCreatedAtMs) / 60000),
              );
              const urgent = elapsedMins >= 15;
              const tierMeta = getTierMeta(grp.prepTier, t);
              const pendingIds = grp.orders
                .filter((o) => o.order.status === 'PENDING')
                .map((o) => o.order.id);
              const prepIds = grp.orders
                .filter((o) => o.order.status === 'IN_PREPARATION')
                .map((o) => o.order.id);
              const readyIds = grp.orders
                .filter((o) => o.order.status === 'READY')
                .map((o) => o.order.id);

              return (
                <div
                  key={grp.groupKey}
                  className={`bg-[var(--rm-surface)] rounded-xl border overflow-hidden flex flex-col justify-between ${
                    urgent ? 'border-[#E05252]' : 'border-[var(--rm-border)]'
                  }`}
                >
                  <div className={`h-1 w-full ${tierMeta.barClass}`} />
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-4">
                      {/* Group Header */}
                      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--rm-border-subtle)]">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-base font-extrabold text-[var(--rm-ink)]">
                              {grp.title}
                            </h2>
                            <span className="text-xs text-[var(--rm-ink-muted)] tabular-nums">
                              {t('kitchen.ordersCount', {
                                count: grp.orders.length,
                              })}{' '}
                              ·{' '}
                              {t('kitchen.itemsCount', {
                                count: grp.totalItemsCount,
                              })}
                            </span>
                          </div>
                          {grp.subtitle && (
                            <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                              {grp.subtitle}
                            </p>
                          )}
                        </div>
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold tabular-nums shrink-0 ${tierMeta.textClass}`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {t('kitchen.elapsedLabel', { mins: elapsedMins })}
                        </span>
                      </div>

                      {/* Combined Batch Prep Summary when multiple orders share a table/zone */}
                      {grp.orders.length > 1 && (
                        <div className="p-3.5 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] space-y-2">
                          <p className="text-xs font-bold text-[var(--rm-ink-muted)]">
                            {t('kitchen.batchSummaryTitle')}
                          </p>
                          <ul className="space-y-1">
                            {grp.batchSummary.map((line) => (
                              <li
                                key={line.key}
                                className="flex items-center justify-between gap-2 text-xs"
                              >
                                <span className="text-[var(--rm-ink)]">
                                  <strong className="font-extrabold tabular-nums mr-1.5 text-[#FF8738]">
                                    {line.totalQuantity}×
                                  </strong>
                                  <span className="font-semibold">
                                    {line.name}
                                  </span>
                                  {line.optionsSummary && (
                                    <span className="text-[var(--rm-ink-muted)]">
                                      {' '}
                                      ({line.optionsSummary})
                                    </span>
                                  )}
                                </span>
                                <span className="text-[11px] font-semibold text-[var(--rm-ink-muted)] shrink-0">
                                  {line.station === 'BAR'
                                    ? t('common.bar')
                                    : t('common.kitchen')}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Individual Orders inside this Table/Zone Group */}
                      <div className="space-y-3">
                        {grp.orders.map(({ order: ord, visibleItems }) => (
                          <div
                            key={ord.id}
                            className="p-3.5 rounded-lg border border-[var(--rm-border-subtle)] bg-[var(--rm-surface-muted)] space-y-2.5"
                          >
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <span className="font-mono text-xs font-extrabold text-[var(--rm-ink)]">
                                  {ord.orderNumber}
                                </span>
                                {renderStatusIndicator(ord.status)}
                                <span className="text-xs text-[var(--rm-ink-muted)]">
                                  {groupMode === 'ZONE' && ord.tableLabel
                                    ? `${ord.tableLabel} · `
                                    : ''}
                                  {ord.customerName} ·{' '}
                                  {ord.orderType === 'QR_TABLE'
                                    ? t('kitchen.qrGuest')
                                    : ord.orderType === 'TAKEAWAY'
                                      ? t('common.takeaway')
                                      : t('kitchen.roomGuest')}
                                </span>
                              </div>
                              <span className="text-[11px] text-[var(--rm-ink-muted)] tabular-nums shrink-0">
                                {formatTimeFr(ord.createdAt)}
                              </span>
                            </div>

                            <ul className="space-y-1.5">
                              {visibleItems.map((line) => (
                                <li
                                  key={line.id}
                                  className="flex items-start justify-between gap-2 text-xs"
                                >
                                  <div>
                                    <span className="font-bold text-[var(--rm-ink)] tabular-nums mr-1.5">
                                      {line.quantity}×
                                    </span>
                                    <span className="font-medium text-[var(--rm-ink)]">
                                      {line.name}
                                    </span>
                                    {line.optionsSummary && (
                                      <span className="text-[var(--rm-ink-muted)] ml-1.5">
                                        · {line.optionsSummary}
                                      </span>
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
                              <p className="p-2 rounded bg-amber-50 dark:bg-amber-950/40 text-xs text-amber-900 dark:text-amber-200 border border-amber-200/60 dark:border-amber-800/50">
                                {t('common.note')} : {ord.notes}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button
                                type="button"
                                onClick={() =>
                                  void printKitchenTicket(ord, visibleItems)
                                }
                                title={t('kitchen.printTicketBtn')}
                                aria-label={t('kitchen.printTicketBtn')}
                                className="p-1.5 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink-muted)] hover:text-[#FF8738] cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                              </button>
                              {ord.status === 'PENDING' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateStatus(ord.id, 'IN_PREPARATION')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
                                >
                                  {t('kitchen.startPrep')}
                                </button>
                              )}
                              {ord.status === 'IN_PREPARATION' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateStatus(ord.id, 'READY')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#14B8A6] hover:opacity-90 text-white text-xs font-semibold cursor-pointer"
                                >
                                  {t('kitchen.markReady')}
                                </button>
                              )}
                              {ord.status === 'READY' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    void updateStatus(ord.id, 'SERVED')
                                  }
                                  className="px-3 py-1.5 rounded-lg bg-[#182333] hover:bg-[#223044] dark:bg-[#223044] dark:hover:bg-[#2D4059] text-white text-xs font-semibold cursor-pointer"
                                >
                                  {t('kitchen.servedBtn')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Batch Action Bar when group has multiple orders */}
                    {grp.orders.length > 1 &&
                      (pendingIds.length > 0 ||
                        prepIds.length > 0 ||
                        readyIds.length > 0) && (
                        <div className="pt-3 border-t border-[var(--rm-border-subtle)] flex flex-wrap gap-2">
                          {pendingIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateBatchStatus(
                                  pendingIds,
                                  'IN_PREPARATION',
                                )
                              }
                              className="flex-1 py-2 px-3 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
                            >
                              {t('kitchen.batchStartAll', {
                                count: pendingIds.length,
                              })}
                            </button>
                          )}
                          {prepIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateBatchStatus(prepIds, 'READY')
                              }
                              className="flex-1 py-2 px-3 rounded-lg bg-[#14B8A6] hover:opacity-90 text-white text-xs font-semibold cursor-pointer"
                            >
                              {t('kitchen.batchReadyAll', {
                                count: prepIds.length,
                              })}
                            </button>
                          )}
                          {readyIds.length > 0 && (
                            <button
                              type="button"
                              onClick={() =>
                                void updateBatchStatus(readyIds, 'SERVED')
                              }
                              className="flex-1 py-2 px-3 rounded-lg bg-[#182333] hover:bg-[#223044] dark:bg-[#223044] dark:hover:bg-[#2D4059] text-white text-xs font-semibold cursor-pointer"
                            >
                              {t('kitchen.batchServedAll', {
                                count: readyIds.length,
                              })}
                            </button>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
