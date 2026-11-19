import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Clock,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiFetch } from '../services/api';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ResilientImage } from '../components/ResilientImage';
import { useToast } from '../components/Toast';
import { formatFcfa, getDeliveryStatusLabel } from '../utils/format';
import type { MenuCategory, MenuOption } from '../types';

interface GuestMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceXof: number;
  imageUrl: string | null;
  station?: 'KITCHEN' | 'BAR';
  options: MenuOption[];
}

interface QrPayload {
  sessionId: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    currency: string;
    taxRatePercent?: number;
    openingHours: string;
  };
  table: {
    id: string;
    label: string;
    zone: string;
  };
  categories: MenuCategory[];
  items: GuestMenuItem[];
}

interface CartEntry {
  key: string;
  item: GuestMenuItem;
  optionIds: string[];
  optionsLabel: string;
  optionsDelta: number;
  quantity: number;
  notes: string;
}

interface RecentTrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalXof: number;
}

function getStorageKey(token: string): string {
  return `restomax_qr_orders:${token}`;
}

function loadStoredOrderIds(token: string): string[] {
  try {
    const raw = window.localStorage.getItem(getStorageKey(token));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String).slice(0, 5) : [];
  } catch {
    return [];
  }
}

function saveStoredOrderId(token: string, orderId: string): void {
  try {
    const current = loadStoredOrderIds(token).filter((id) => id !== orderId);
    window.localStorage.setItem(
      getStorageKey(token),
      JSON.stringify([orderId, ...current].slice(0, 5)),
    );
  } catch {
    // Ignore storage errors on restricted mobile browsers
  }
}

export function QrMenuPage() {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [data, setData] = useState<QrPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const [cart, setCart] = useState<CartEntry[]>([]);
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null);
  const [chosenOpts, setChosenOpts] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentTrackedOrder[]>([]);

  // Stable idempotency key per cart session; refreshed when cart items mutate or checkout completes
  const checkoutKeyRef = useRef<string>('');
  const refreshCheckoutKey = () => {
    checkoutKeyRef.current = `qr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<QrPayload>(`/api/public/qr/${encodeURIComponent(token)}`)
      .then((res) => {
        setData(res);
        setError(null);
        refreshCheckoutKey();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : t('customer.invalidQr'));
      })
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    if (!token) return;
    const ids = loadStoredOrderIds(token);
    if (ids.length === 0) {
      setRecentOrders([]);
      return;
    }
    let active = true;
    Promise.all(
      ids.map((id) =>
        apiFetch<{ order: RecentTrackedOrder }>(
          `/api/public/qr/${encodeURIComponent(token)}/orders/${encodeURIComponent(id)}`,
        )
          .then((r) => r.order)
          .catch(() => null),
      ),
    ).then((results) => {
      if (!active) return;
      const valid = results.filter(
        (o): o is RecentTrackedOrder =>
          o !== null && o.status !== 'CANCELLED',
      );
      setRecentOrders(valid);
    });
    return () => {
      active = false;
    };
  }, [token]);

  const addItemToCart = (
    item: GuestMenuItem,
    optIds: string[],
    note: string,
  ) => {
    const cleanNote = note.trim();
    const sortedIds = [...optIds].sort();
    const matched = item.options.filter((o) => sortedIds.includes(o.id));
    const delta = matched.reduce((a, o) => a + o.priceDeltaXof, 0);
    const label = matched.map((o) => o.label).join(', ');
    const key = `${item.id}::${sortedIds.join(',')}::${cleanNote}`;

    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: next[idx].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          key,
          item,
          optionIds: sortedIds,
          optionsLabel: label,
          optionsDelta: delta,
          quantity: 1,
          notes: cleanNote,
        },
      ];
    });
    refreshCheckoutKey();
    setSelectedItem(null);
    setChosenOpts([]);
    setItemNote('');
    notify(t('customer.addedToCartToast', { name: item.name }), 'success');
  };

  const updateCartQty = (key: string, delta: number) => {
    refreshCheckoutKey();
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const removeCartEntry = (key: string) => {
    refreshCheckoutKey();
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const totalCount = cart.reduce((a, c) => a + c.quantity, 0);
  const totalXof = cart.reduce(
    (a, c) => a + (c.item.priceXof + c.optionsDelta) * c.quantity,
    0,
  );

  const selectedOptsDelta = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.options
      .filter((o) => chosenOpts.includes(o.id))
      .reduce((acc, o) => acc + Number(o.priceDeltaXof || 0), 0);
  }, [selectedItem, chosenOpts]);

  const handleCheckout = async () => {
    if (!token || !data || cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      if (!checkoutKeyRef.current) {
        refreshCheckoutKey();
      }
      const res = await apiFetch<{ order: { id: string } }>(
        `/api/public/qr/${encodeURIComponent(token)}/orders`,
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId: data.sessionId,
            customerName: customerName.trim(),
            notes: orderNotes.trim(),
            idempotencyKey: checkoutKeyRef.current,
            items: cart.map((c) => ({
              menuItemId: c.item.id,
              optionIds: c.optionIds,
              quantity: c.quantity,
              notes: c.notes,
            })),
          }),
        },
      );
      saveStoredOrderId(token, res.order.id);
      setCart([]);
      setOrderNotes('');
      setCartOpen(false);
      refreshCheckoutKey();
      navigate(`/q/${encodeURIComponent(token)}/suivi/${res.order.id}`);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('customer.orderSendError'),
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <p className="text-sm text-[#64748B]">{t('customer.verifyingTable')}</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-7 text-center space-y-3">
          <UtensilsCrossed className="w-8 h-8 text-[#E05252] mx-auto" />
          <h1 className="text-lg font-bold text-[#182333]">
            {t('customer.qrUnavailable')}
          </h1>
          <p className="text-sm text-[#64748B]">{error}</p>
        </div>
      </div>
    );
  }

  const query = searchQuery.trim().toLowerCase();
  const visibleItems = data.items.filter((it) => {
    const matchesCat = activeCat === 'ALL' || it.categoryId === activeCat;
    const matchesQuery =
      !query ||
      it.name.toLowerCase().includes(query) ||
      it.description.toLowerCase().includes(query);
    return matchesCat && matchesQuery;
  });

  const activeRecentOrder =
    recentOrders.find((o) => o.status !== 'PAID') || recentOrders[0];

  return (
    <div className="min-h-screen bg-[#F5F7FA] pb-24">
      {/* Compact Sticky Top Header */}
      <header className="sticky top-0 z-30 bg-[#182333] text-white px-4 py-3.5 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-extrabold truncate">
              {data.restaurant.name}
            </h1>
            <p className="text-xs text-slate-300 truncate">
              {data.table.label} · {data.table.zone}
              {data.restaurant.openingHours
                ? ` · ${data.restaurant.openingHours}`
                : ''}
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <LanguageSwitcher variant="dark" />
            <span className="hidden sm:inline text-xs font-semibold text-[#FF8738]">
              {t('customer.menuQrBadge')}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* Active table order tracking shortcut */}
        {activeRecentOrder && token && (
          <Link
            to={`/q/${encodeURIComponent(token)}/suivi/${encodeURIComponent(activeRecentOrder.id)}`}
            className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-[#14B8A6]/40 p-4 hover:border-[#14B8A6] transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#14B8A6]/10 text-[#14B8A6] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#182333] truncate">
                  {t('customer.trackingLinkTitle', {
                    orderNumber: activeRecentOrder.orderNumber,
                  })}
                  <span className="text-[#FF8738]">
                    {getDeliveryStatusLabel(activeRecentOrder.status)}
                  </span>
                </p>
                <p className="text-[11px] text-[#64748B]">
                  {t('customer.trackingLinkDesc', {
                    amount: formatFcfa(activeRecentOrder.totalXof),
                  })}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-[#182333] shrink-0" />
          </Link>
        )}

        {/* Search + Category Scroller */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="search"
              placeholder={t('customer.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-[#182333] focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveCat('ALL')}
              className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                activeCat === 'ALL'
                  ? 'bg-[#182333] text-white'
                  : 'bg-white border border-slate-200 text-[#64748B]'
              }`}
            >
              {t('customer.allMenuCount', { count: data.items.length })}
            </button>
            {data.categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCat(c.id)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer ${
                  activeCat === c.id
                    ? 'bg-[#182333] text-white'
                    : 'bg-white border border-slate-200 text-[#64748B]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Grid or Empty State */}
        {visibleItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
            <UtensilsCrossed className="w-7 h-7 text-[#64748B] mx-auto" />
            <p className="text-sm font-bold text-[#182333]">
              {t('customer.emptyCategoryTitle')}
            </p>
            <p className="text-xs text-[#64748B]">
              {data.items.length === 0
                ? t('customer.emptyMenuPublished')
                : t('customer.emptyMenuFilter')}
            </p>
            {(activeCat !== 'ALL' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setActiveCat('ALL');
                  setSearchQuery('');
                }}
                className="mt-2 px-4 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
              >
                {t('customer.showAllMenu')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {visibleItems.map((it) => (
              <div
                key={it.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between"
              >
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedItem(it);
                    setChosenOpts([]);
                    setItemNote('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedItem(it);
                      setChosenOpts([]);
                      setItemNote('');
                    }
                  }}
                  className="text-left cursor-pointer"
                >
                  <div className="h-44 w-full bg-[#182333] overflow-hidden">
                    <ResilientImage
                      src={it.imageUrl}
                      alt={it.name}
                      className="w-full h-full object-cover"
                      fallbackTitle={it.name}
                    />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base font-bold text-[#182333]">
                        {it.name}
                      </h2>
                      <span className="text-[11px] font-semibold text-[#64748B] shrink-0">
                        {it.station === 'BAR'
                          ? t('common.bar')
                          : t('common.kitchen')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
                      {it.description}
                    </p>
                    {it.options.length > 0 && (
                      <p className="mt-2 text-[11px] font-semibold text-[#FF8738]">
                        {t('customer.optionsChoiceCount', {
                          count: it.options.length,
                        })}
                      </p>
                    )}
                  </div>
                </div>
                <div className="px-4 pb-4 pt-2 flex items-center justify-between gap-3">
                  <span className="text-base font-extrabold text-[#182333] tabular-nums">
                    {formatFcfa(it.priceXof)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (it.options.length > 0) {
                        setSelectedItem(it);
                        setChosenOpts([]);
                        setItemNote('');
                      } else {
                        addItemToCart(it, [], '');
                      }
                    }}
                    className="min-h-[44px] px-4 rounded-xl bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
                  >
                    {it.options.length > 0 ? t('common.choose') : t('common.add')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Sticky Cart Bar (Compact thumb-zone CTA) */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200">
          <div className="max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="w-full h-12 rounded-xl bg-[#182333] text-white px-5 flex items-center justify-between text-sm font-bold cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-[#FF8738]" />
                <span>{t('customer.viewCart', { count: totalCount })}</span>
              </span>
              <span className="tabular-nums">{formatFcfa(totalXof)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Item Options & Note Modal */}
      {selectedItem && (
        <div
          className="fixed inset-0 z-50 bg-[#182333]/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-[#182333]">
                  {selectedItem.name}
                </h3>
                <p className="text-sm font-bold text-[#FF8738] tabular-nums">
                  {formatFcfa(selectedItem.priceXof + selectedOptsDelta)}
                </p>
              </div>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#182333] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedItem.description && (
              <p className="text-xs text-[#64748B] leading-relaxed">
                {selectedItem.description}
              </p>
            )}

            {selectedItem.options.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-[#182333]">
                  {t('customer.optionsAndExtras')}
                </p>
                {selectedItem.options.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-200 text-xs cursor-pointer"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={chosenOpts.includes(opt.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setChosenOpts((p) => [...p, opt.id]);
                          } else {
                            setChosenOpts((p) =>
                              p.filter((x) => x !== opt.id),
                            );
                          }
                        }}
                      />
                      <span className="font-medium text-[#182333]">
                        {opt.label}
                      </span>
                    </span>
                    <span className="font-semibold tabular-nums text-[#64748B]">
                      {opt.priceDeltaXof > 0
                        ? `+${formatFcfa(opt.priceDeltaXof)}`
                        : t('common.included')}
                    </span>
                  </label>
                ))}
              </div>
            )}

            <input
              type="text"
              placeholder={t('customer.specialInstructionPlaceholder')}
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />

            <button
              type="button"
              onClick={() => addItemToCart(selectedItem, chosenOpts, itemNote)}
              className="w-full h-12 rounded-xl bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-bold cursor-pointer tabular-nums"
            >
              {t('customer.addToCartBtn', {
                amount: formatFcfa(selectedItem.priceXof + selectedOptsDelta),
              })}
            </button>
          </div>
        </div>
      )}

      {/* Cart Checkout Bottom Sheet */}
      {cartOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#182333]/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setCartOpen(false)}
        >
          <div
            className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-[#182333]">
                {t('customer.yourOrderTitle', { table: data.table.label })}
              </h3>
              <button
                type="button"
                aria-label={t('common.close')}
                onClick={() => setCartOpen(false)}
                className="p-1.5 rounded-lg text-[#64748B] hover:text-[#182333] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {cart.map((c) => (
                <div
                  key={c.key}
                  className="py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#182333]">
                      {c.item.name}
                    </p>
                    {c.optionsLabel && (
                      <p className="text-xs text-[#64748B]">{c.optionsLabel}</p>
                    )}
                    {c.notes && (
                      <p className="text-[11px] text-[#64748B] italic">
                        {t('common.note')} : {c.notes}
                      </p>
                    )}
                    <p className="text-xs font-bold text-[#FF8738] tabular-nums mt-0.5">
                      {formatFcfa(
                        (c.item.priceXof + c.optionsDelta) * c.quantity,
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      aria-label={t('customer.decreaseQty')}
                      onClick={() => updateCartQty(c.key, -1)}
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums">
                      {c.quantity}
                    </span>
                    <button
                      type="button"
                      aria-label={t('customer.increaseQty')}
                      onClick={() => updateCartQty(c.key, 1)}
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.delete')}
                      onClick={() => removeCartEntry(c.key)}
                      className="w-8 h-9 rounded-lg text-[#64748B] hover:text-[#E05252] flex items-center justify-center cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-2">
              <input
                type="text"
                placeholder={t('customer.firstNamePlaceholder')}
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <textarea
                rows={2}
                placeholder={t('customer.kitchenCommentPlaceholder')}
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-[#182333]">
              <span>{t('customer.totalToPay')}</span>
              <span className="tabular-nums">{formatFcfa(totalXof)}</span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="w-full h-12 rounded-xl bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? t('customer.sendingToKitchen')
                : t('customer.confirmOrderBtn')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
