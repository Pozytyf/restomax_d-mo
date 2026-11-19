import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  BellRing,
  CheckCircle2,
  ChefHat,
  Clock,
  RefreshCw,
  UtensilsCrossed,
  Wifi,
  XCircle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../services/api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { useToast } from '../components/Toast';
import {
  formatFcfa,
  formatTimeFr,
  getDeliveryStatusLabel,
} from '../utils/format';

interface TrackedOrderItem {
  id: string;
  name: string;
  station?: 'KITCHEN' | 'BAR';
  quantity: number;
  options_summary: string;
  line_total_xof: number;
  notes?: string;
  prep_status: string;
}

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalXof: number;
  paidXof: number;
  customerName?: string;
  notes?: string;
  tableLabel: string;
  restaurantName: string;
  createdAt: string;
  updatedAt: string;
  items: TrackedOrderItem[];
}

interface DeliveryStep {
  key: 'PENDING' | 'IN_PREPARATION' | 'READY' | 'SERVED';
  icon: typeof Clock;
}

const DELIVERY_STEPS: DeliveryStep[] = [
  { key: 'PENDING', icon: Clock },
  { key: 'IN_PREPARATION', icon: ChefHat },
  { key: 'READY', icon: BellRing },
  { key: 'SERVED', icon: CheckCircle2 },
];

function getStoredOrderIds(token: string): string[] {
  try {
    const raw = window.localStorage.getItem(`restomax_qr_orders:${token}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 5) : [];
  } catch {
    return [];
  }
}

export function QrOrderTrackingPage() {
  const { t } = useTranslation();
  const { token, orderId } = useParams<{ token: string; orderId?: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [tableOrders, setTableOrders] = useState<TrackedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const prevStatusRef = useRef<string | null>(null);

  useEffect(() => {
    if (!token || orderId) return;
    const storedIds = getStoredOrderIds(token);
    if (storedIds.length > 0) {
      navigate(
        `/q/${encodeURIComponent(token)}/suivi/${encodeURIComponent(storedIds[0])}`,
        { replace: true },
      );
    } else {
      setLoading(false);
    }
  }, [token, orderId, navigate]);

  useEffect(() => {
    if (!token) return;
    const storedIds = getStoredOrderIds(token);
    const idsToLoad = orderId
      ? Array.from(new Set([orderId, ...storedIds]))
      : storedIds;
    if (idsToLoad.length === 0) {
      setTableOrders([]);
      return;
    }
    let active = true;
    Promise.all(
      idsToLoad.map((id) =>
        apiFetch<{ order: TrackedOrder }>(
          `/api/public/qr/${encodeURIComponent(token)}/orders/${encodeURIComponent(id)}`,
        )
          .then((r) => r.order)
          .catch(() => null),
      ),
    ).then((list) => {
      if (!active) return;
      setTableOrders(list.filter((o): o is TrackedOrder => o !== null));
    });
    return () => {
      active = false;
    };
  }, [token, orderId, order?.status]);

  const load = useCallback(
    (manual = false) => {
      if (!token || !orderId) return;
      if (manual) setRefreshing(true);
      apiFetch<{ order: TrackedOrder }>(
        `/api/public/qr/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`,
      )
        .then((res) => {
          const next = res.order;
          if (
            prevStatusRef.current &&
            prevStatusRef.current !== next.status
          ) {
            const label = getDeliveryStatusLabel(next.status);
            notify(t('customer.statusUpdateToast', { status: label }), 'info');
          }
          prevStatusRef.current = next.status;
          setOrder(next);
          setError(null);
        })
        .catch((err) => {
          setError(
            err instanceof Error ? err.message : t('customer.orderNotFound'),
          );
        })
        .finally(() => {
          setLoading(false);
          setRefreshing(false);
        });
    },
    [token, orderId, notify, t],
  );

  useEffect(() => {
    prevStatusRef.current = null;
    if (orderId) {
      setLoading(true);
      load();
    }
  }, [orderId, load]);

  const { connected } = useWebSocketRoom(
    orderId ? `order:${orderId}` : null,
    () => load(false),
  );

  useEffect(() => {
    if (!order || order.status === 'PAID' || order.status === 'CANCELLED') {
      return;
    }
    const timer = window.setInterval(() => load(false), 8000);
    return () => window.clearInterval(timer);
  }, [order, load]);

  const elapsedMinutes = useMemo(() => {
    if (!order) return 0;
    return Math.max(
      1,
      Math.round((Date.now() - new Date(order.createdAt).getTime()) / 60000),
    );
  }, [order]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6 text-sm text-[#64748B]">
        {t('customer.trackingLoading')}
      </div>
    );
  }

  if (!orderId && !order) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 max-w-md w-full text-center space-y-4">
          <UtensilsCrossed className="w-8 h-8 text-[#FF8738] mx-auto" />
          <h1 className="text-lg font-bold text-[#182333]">
            {t('customer.noActiveOrderTitle')}
          </h1>
          <p className="text-xs text-[#64748B] leading-relaxed">
            {t('customer.noActiveOrderDesc')}
          </p>
          {token && (
            <Link
              to={`/q/${encodeURIComponent(token)}`}
              className="inline-flex items-center justify-center w-full h-11 rounded-xl bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-semibold"
            >
              {t('customer.openQrMenuBtn')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-7 max-w-md w-full text-center space-y-3">
          <XCircle className="w-8 h-8 text-[#E05252] mx-auto" />
          <h1 className="text-base font-bold text-[#182333]">
            {t('customer.trackingUnavailable')}
          </h1>
          <p className="text-xs text-[#64748B]">
            {error || t('customer.orderNotFound')}
          </p>
          {token && (
            <Link
              to={`/q/${encodeURIComponent(token)}`}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#182333] text-white text-xs font-semibold"
            >
              {t('customer.backToMenu')}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const isPaid = order.status === 'PAID';
  const isCancelled = order.status === 'CANCELLED';
  const stepIndex = isPaid
    ? DELIVERY_STEPS.length - 1
    : Math.max(
        0,
        DELIVERY_STEPS.findIndex((s) => s.key === order.status),
      );
  const progressPercent = isCancelled
    ? 0
    : Math.round(((stepIndex + 1) / DELIVERY_STEPS.length) * 100);
  const remainingXof = Math.max(0, order.totalXof - order.paidXof);

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">
      {/* Compact Sticky Top Bar */}
      <header className="sticky top-0 z-30 bg-[#182333] text-white px-4 py-3 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {token ? (
            <Link
              to={`/q/${encodeURIComponent(token)}`}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -ml-2 text-xs font-semibold text-slate-200 hover:text-white whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('customer.menuShort')}</span>
            </Link>
          ) : (
            <span className="w-12" />
          )}
          <div className="min-w-0 text-center">
            <h1 className="text-sm font-extrabold truncate">
              {t('customer.deliveryTrackingTitle')}
            </h1>
            <p className="text-[11px] text-slate-300 truncate">
              {order.restaurantName} · {order.tableLabel}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher variant="dark" />
            <button
              type="button"
              onClick={() => load(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 min-h-[44px] px-3 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`}
              />
              <span className="hidden sm:inline">{t('common.refresh')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-5">
        {/* Multi-order Switcher */}
        {tableOrders.length > 1 && token && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {tableOrders.map((ord) => {
              const active = ord.id === order.id;
              return (
                <button
                  key={ord.id}
                  type="button"
                  onClick={() =>
                    navigate(
                      `/q/${encodeURIComponent(token)}/suivi/${encodeURIComponent(ord.id)}`,
                    )
                  }
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                    active
                      ? 'bg-[#182333] text-white'
                      : 'bg-white border border-slate-200 text-[#64748B] hover:text-[#182333]'
                  }`}
                >
                  {ord.orderNumber} · {getDeliveryStatusLabel(ord.status)}
                </button>
              );
            })}
          </div>
        )}

        {/* Primary Delivery Status Hero */}
        <section className="bg-[#182333] text-white rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs text-slate-300 font-mono">
                {t('customer.orderNumberAt', {
                  orderNumber: order.orderNumber,
                  time: formatTimeFr(order.createdAt),
                })}
              </p>
              <h2
                className={`text-xl sm:text-2xl font-extrabold ${
                  isCancelled
                    ? 'text-[#E05252]'
                    : isPaid || order.status === 'SERVED'
                      ? 'text-[#14B8A6]'
                      : 'text-[#FF8738]'
                }`}
              >
                {getDeliveryStatusLabel(order.status)}
              </h2>
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-300 tabular-nums">
              <div className="flex items-center gap-1.5">
                <Wifi
                  className={`w-3.5 h-3.5 ${
                    connected ? 'text-[#14B8A6]' : 'text-slate-400'
                  }`}
                />
                <span>
                  {connected
                    ? t('customer.liveUpdates')
                    : t('customer.autoRefresh')}
                </span>
              </div>
              <span aria-hidden="true">·</span>
              <span>{elapsedMinutes} min</span>
            </div>
          </div>

          {!isCancelled && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-300 tabular-nums">
                <span>{t('customer.progressLabel')}</span>
                <span className="font-bold text-white">{progressPercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-white/15 overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#14B8A6] transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </section>

        {/* Responsive 2-Column Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Column: Detailed Delivery Timeline */}
          <section className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-[#182333]">
                {t('customer.stepsTitle')}
              </h3>
              <span className="text-xs text-[#64748B] tabular-nums">
                {t('customer.updatedAtTime', {
                  time: formatTimeFr(order.updatedAt || order.createdAt),
                })}
              </span>
            </div>

            {isCancelled ? (
              <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-[#E05252] flex items-start gap-2.5">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{t('customer.cancelledBanner')}</span>
              </div>
            ) : (
              <ol className="space-y-4">
                {DELIVERY_STEPS.map((step, idx) => {
                  const Icon = step.icon;
                  const completed =
                    idx < stepIndex || isPaid || order.status === 'SERVED';
                  const current =
                    idx === stepIndex && !isPaid && order.status !== 'SERVED';
                  const reached = idx <= stepIndex;

                  return (
                    <li key={step.key} className="flex items-start gap-3.5">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          completed
                            ? 'bg-[#14B8A6]/15 text-[#14B8A6]'
                            : current
                              ? 'bg-[#FF8738] text-white'
                              : 'bg-[#F5F7FA] text-[#64748B]'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <p
                            className={`text-sm font-bold ${
                              reached ? 'text-[#182333]' : 'text-[#64748B]'
                            }`}
                          >
                            {t(`customer.steps.${step.key}.title`)}
                          </p>
                          <span
                            className={`text-[11px] font-semibold whitespace-nowrap ${
                              completed
                                ? 'text-[#14B8A6]'
                                : current
                                  ? 'text-[#FF8738]'
                                  : 'text-[#64748B]'
                            }`}
                          >
                            {completed
                              ? t('customer.stepCompleted')
                              : current
                                ? t('customer.stepCurrent')
                                : t('customer.stepUpcoming')}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">
                          {t(`customer.steps.${step.key}.desc`)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          {/* Right Column: Items Preparation & Payment Summary */}
          <section className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#182333]">
                {t('customer.orderDetailsTitle')}
              </h3>
              <span className="text-xs text-[#64748B] tabular-nums">
                {t('customer.articlesCount', {
                  count: order.items.reduce((sum, it) => sum + it.quantity, 0),
                })}
              </span>
            </div>

            <div className="divide-y divide-slate-100 text-sm">
              {order.items.map((it) => (
                <div key={it.id} className="py-3 flex justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[#182333] font-medium">
                      <strong className="tabular-nums">{it.quantity}×</strong>{' '}
                      {it.name}
                    </p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">
                      {it.station === 'BAR'
                        ? t('common.bar')
                        : t('common.kitchen')}{' '}
                      ·{' '}
                      <span
                        className={
                          it.prep_status === 'SERVED'
                            ? 'text-[#14B8A6] font-semibold'
                            : it.prep_status === 'READY' ||
                                it.prep_status === 'PREPARING'
                              ? 'text-[#FF8738] font-semibold'
                              : 'text-[#64748B]'
                        }
                      >
                        {getDeliveryStatusLabel(it.prep_status)}
                      </span>
                    </p>
                    {it.options_summary && (
                      <p className="text-xs text-[#64748B] mt-0.5">
                        {it.options_summary}
                      </p>
                    )}
                    {it.notes && (
                      <p className="text-[11px] text-[#64748B] italic mt-0.5">
                        {t('common.note')} : {it.notes}
                      </p>
                    )}
                  </div>
                  <span className="tabular-nums font-semibold text-[#182333] shrink-0">
                    {formatFcfa(it.line_total_xof)}
                  </span>
                </div>
              ))}
            </div>

            {order.notes && (
              <div className="p-3 rounded-xl bg-[#F5F7FA] text-xs text-[#64748B]">
                {t('customer.instructionPrefix', { text: order.notes })}
              </div>
            )}

            <div className="pt-3 border-t border-slate-200 space-y-1.5">
              <div className="flex justify-between font-extrabold text-[#182333]">
                <span>{t('common.totalTtc')}</span>
                <span className="tabular-nums">
                  {formatFcfa(order.totalXof)}
                </span>
              </div>
              <div className="flex justify-between text-xs text-[#64748B]">
                <span>{t('customer.alreadyPaidLabel')}</span>
                <span className="tabular-nums font-semibold text-[#14B8A6]">
                  {formatFcfa(order.paidXof)}
                </span>
              </div>
              {remainingXof > 0 && !isCancelled && (
                <div className="flex justify-between text-xs text-[#64748B]">
                  <span>{t('customer.remainingAtTableLabel')}</span>
                  <span className="tabular-nums font-semibold text-[#FF8738]">
                    {formatFcfa(remainingXof)}
                  </span>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Mobile & Desktop Thumb-Zone Bottom CTA */}
      {token && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
          <div className="max-w-5xl mx-auto">
            <Link
              to={`/q/${encodeURIComponent(token)}`}
              className="w-full h-12 rounded-xl bg-[#182333] hover:bg-[#223044] text-white text-sm font-bold flex items-center justify-center"
            >
              {t('customer.orderMoreBtn')}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
