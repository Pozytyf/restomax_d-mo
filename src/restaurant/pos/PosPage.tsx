import { useCallback, useEffect, useState } from 'react';
import {
  CheckCircle2,
  Minus,
  Plus,
  Printer,
  Search,
  Trash2,
} from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa, PAYMENT_METHOD_LABELS } from '../../utils/format';
import type {
  DiningTable,
  MenuCategory,
  MenuItem,
  Order,
  PaymentMethod,
} from '../../types';

interface CartLine {
  key: string;
  menuItem: MenuItem;
  optionIds: string[];
  optionsLabel: string;
  optionsDeltaXof: number;
  quantity: number;
  notes: string;
}

export function PosPage() {
  const { notify } = useToast();
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [openOrders, setOpenOrders] = useState<Order[]>([]);

  const [selectedCat, setSelectedCat] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [orderType, setOrderType] = useState<'DINE_IN' | 'TAKEAWAY'>('DINE_IN');
  const [tableId, setTableId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [discountXof, setDiscountXof] = useState<number>(0);
  const [cart, setCart] = useState<CartLine[]>([]);

  // Active payment / receipt modal state
  const [payModalOrder, setPayModalOrder] = useState<Order | null>(null);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('CASH');
  const [payAmount, setPayAmount] = useState<number>(0);
  const [receipt, setReceipt] = useState<{
    orderNumber: string;
    totalXof: number;
    paidAmount: number;
    method: PaymentMethod;
    reference: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(() => {
    Promise.all([
      apiFetch<{ categories: MenuCategory[]; items: MenuItem[] }>(
        '/api/restaurant/menu',
      ),
      apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables'),
      apiFetch<{ orders: Order[] }>('/api/restaurant/orders'),
    ])
      .then(([m, t, o]) => {
        setCategories(m.categories);
        setItems(m.items.filter((i) => i.available));
        setTables(t.tables);
        setOpenOrders(
          o.orders.filter(
            (ord) => ord.status !== 'PAID' && ord.status !== 'CANCELLED',
          ),
        );
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const addToCart = (item: MenuItem) => {
    const key = item.id;
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
          menuItem: item,
          optionIds: [],
          optionsLabel: '',
          optionsDeltaXof: 0,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const grossTotal = cart.reduce(
    (acc, c) =>
      acc + (c.menuItem.priceXof + c.optionsDeltaXof) * c.quantity,
    0,
  );
  const netTotal = Math.max(0, grossTotal - Math.max(0, discountXof));

  const submitOrder = async (payImmediately: boolean) => {
    if (cart.length === 0) return;
    setBusy(true);
    try {
      const idempotencyKey = `pos-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const res = await apiFetch<{
        order: { id: string; orderNumber: string; totalXof: number };
      }>('/api/restaurant/orders', {
        method: 'POST',
        body: JSON.stringify({
          orderType,
          tableId: orderType === 'DINE_IN' && tableId ? tableId : null,
          customerName:
            customerName.trim() ||
            (orderType === 'TAKEAWAY' ? 'À emporter' : 'Client salle'),
          discountXof: Math.max(0, discountXof),
          idempotencyKey,
          items: cart.map((c) => ({
            menuItemId: c.menuItem.id,
            optionIds: c.optionIds,
            quantity: c.quantity,
            notes: c.notes,
          })),
        }),
      });

      setCart([]);
      setDiscountXof(0);
      setCustomerName('');
      notify(`Commande ${res.order.orderNumber} envoyée en cuisine`, 'success');
      loadData();

      if (payImmediately) {
        setPayModalOrder({
          id: res.order.id,
          orderNumber: res.order.orderNumber,
          totalXof: res.order.totalXof,
          paidXof: 0,
        } as Order);
        setPayAmount(res.order.totalXof);
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur création commande.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const handlePayOrder = async () => {
    if (!payModalOrder) return;
    setBusy(true);
    try {
      const idempotencyKey = `pay-${payModalOrder.id}-${Date.now()}`;
      const res = await apiFetch<{
        payment: {
          amountXof: number;
          method: PaymentMethod;
          reference: string;
          fullyPaid: boolean;
        };
      }>(`/api/restaurant/orders/${payModalOrder.id}/pay`, {
        method: 'POST',
        body: JSON.stringify({
          amountXof: payAmount,
          method: payMethod,
          idempotencyKey,
        }),
      });

      notify(
        `Encaissement ${formatFcfa(res.payment.amountXof)} confirmé (${res.payment.reference})`,
        'success',
      );
      setReceipt({
        orderNumber: payModalOrder.orderNumber,
        totalXof: payModalOrder.totalXof,
        paidAmount: res.payment.amountXof,
        method: res.payment.method,
        reference: res.payment.reference,
      });
      setPayModalOrder(null);
      loadData();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur lors de l’encaissement.',
        'error',
      );
    } finally {
      setBusy(false);
    }
  };

  const filteredItems = items.filter((it) => {
    const matchCat = selectedCat === 'ALL' || it.categoryId === selectedCat;
    const matchSearch = it.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <RestaurantLayout title="Caisse POS" onRealtimeEvent={loadData}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Catalog + Open Bills */}
        <div className="lg:col-span-8 space-y-5">
          {/* Search & Category Tabs */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un plat ou une boisson…"
                className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF8738]"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedCat('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCat === 'ALL'
                    ? 'bg-[#182333] text-white'
                    : 'bg-[#F5F7FA] text-[#64748B] hover:text-[#182333]'
                }`}
              >
                Tout le menu
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCat(c.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCat === c.id
                      ? 'bg-[#182333] text-white'
                      : 'bg-[#F5F7FA] text-[#64748B] hover:text-[#182333]'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredItems.map((it) => (
              <button
                key={it.id}
                type="button"
                onClick={() => addToCart(it)}
                className="bg-white rounded-xl border border-slate-200 hover:border-[#FF8738] p-4 text-left transition-colors cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <p className="text-xs text-[#64748B]">{it.categoryName}</p>
                  <p className="mt-1 font-bold text-sm text-[#182333] line-clamp-2">
                    {it.name}
                  </p>
                </div>
                <p className="mt-3 text-sm font-extrabold text-[#FF8738] tabular-nums">
                  {formatFcfa(it.priceXof)}
                </p>
              </button>
            ))}
          </div>

          {/* Open Bills Ready to Settle */}
          {openOrders.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-bold text-[#182333] mb-3">
                Additions en cours à encaisser
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {openOrders.map((ord) => {
                  const due = Math.max(0, ord.totalXof - ord.paidXof);
                  return (
                    <div
                      key={ord.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-[#F5F7FA] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-[#182333]">
                          {ord.orderNumber} · {ord.tableLabel || ord.customerName}
                        </p>
                        <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
                          Reste dû : <strong>{formatFcfa(due)}</strong> /{' '}
                          {formatFcfa(ord.totalXof)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPayModalOrder(ord);
                          setPayAmount(due);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#182333] hover:bg-[#FF8738] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
                      >
                        Encaisser
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: Active Ticket Cart */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 sticky top-20 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#182333]">
                Nouveau ticket
              </h2>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={() => setCart([])}
                  className="text-xs text-[#E05252] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Vider</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setOrderType('DINE_IN')}
                className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  orderType === 'DINE_IN'
                    ? 'bg-[#182333] text-white'
                    : 'bg-[#F5F7FA] text-[#64748B]'
                }`}
              >
                Sur place
              </button>
              <button
                type="button"
                onClick={() => setOrderType('TAKEAWAY')}
                className={`py-2 rounded-lg text-xs font-semibold cursor-pointer ${
                  orderType === 'TAKEAWAY'
                    ? 'bg-[#182333] text-white'
                    : 'bg-[#F5F7FA] text-[#64748B]'
                }`}
              >
                À emporter
              </button>
            </div>

            {orderType === 'DINE_IN' && (
              <select
                value={tableId}
                onChange={(e) => setTableId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs bg-white"
              >
                <option value="">Sélectionner une table (optionnel)</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.zone})
                  </option>
                ))}
              </select>
            )}

            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Nom client (optionnel)"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs"
            />

            <div className="border-t border-b border-slate-100 py-3 max-h-64 overflow-y-auto space-y-2.5">
              {cart.length === 0 ? (
                <p className="text-xs text-[#64748B] text-center py-6">
                  Sélectionnez des articles à gauche pour composer le ticket.
                </p>
              ) : (
                cart.map((c) => (
                  <div
                    key={c.key}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[#182333] truncate">
                        {c.menuItem.name}
                      </p>
                      <p className="text-[#64748B] tabular-nums">
                        {formatFcfa(c.menuItem.priceXof)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => updateQty(c.key, -1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-5 text-center font-bold tabular-nums">
                        {c.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(c.key, 1)}
                        className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center hover:bg-slate-100 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[#64748B]">Remise (FCFA)</span>
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={discountXof}
                  onChange={(e) => setDiscountXof(Number(e.target.value) || 0)}
                  className="w-28 px-2 py-1 rounded border border-slate-200 text-right tabular-nums"
                />
              </div>
              <div className="flex items-center justify-between text-base font-extrabold text-[#182333] pt-2 border-t border-slate-100">
                <span>Total TTC</span>
                <span className="tabular-nums">{formatFcfa(netTotal)}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 pt-1">
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => submitOrder(true)}
                className="w-full py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Envoyer & Encaisser maintenant
              </button>
              <button
                type="button"
                disabled={busy || cart.length === 0}
                onClick={() => submitOrder(false)}
                className="w-full py-2.5 rounded-lg bg-[#182333] hover:bg-[#223044] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                Envoyer en cuisine (ouvrir addition)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal (Partial / Split / Mobile Money TEST / Cash) */}
      {payModalOrder && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-5">
            <div>
              <p className="text-xs font-semibold text-[#FF8738]">
                Encaissement direct restaurant (Circuit B · Mode TEST)
              </p>
              <h3 className="text-lg font-bold text-[#182333] mt-1">
                Commande {payModalOrder.orderNumber}
              </h3>
              <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                Total : {formatFcfa(payModalOrder.totalXof)} · Déjà payé :{' '}
                {formatFcfa(payModalOrder.paidXof)}
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-1">
                Montant à encaisser (FCFA) — paiement partiel possible
              </label>
              <input
                type="number"
                min={100}
                max={Math.max(0, payModalOrder.totalXof - payModalOrder.paidXof)}
                value={payAmount}
                onChange={(e) => setPayAmount(Number(e.target.value) || 0)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-base font-bold tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#182333] mb-2">
                Moyen de paiement
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    'CASH',
                    'WAVE',
                    'ORANGE_MONEY',
                    'MTN_MOMO',
                    'CARD',
                  ] as PaymentMethod[]
                ).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border cursor-pointer ${
                      payMethod === m
                        ? 'bg-[#182333] text-white border-[#182333]'
                        : 'bg-white text-[#182333] border-slate-200'
                    }`}
                  >
                    {PAYMENT_METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPayModalOrder(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold text-[#182333] cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={busy || payAmount <= 0}
                onClick={handlePayOrder}
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Valider l’encaissement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {receipt && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4">
            <div className="text-center space-y-1">
              <CheckCircle2 className="w-8 h-8 text-[#14B8A6] mx-auto" />
              <h3 className="text-base font-bold text-[#182333]">
                Reçu de caisse Resto’MAX
              </h3>
              <p className="text-xs font-mono text-[#64748B]">
                Réf : {receipt.reference}
              </p>
            </div>
            <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Commande</span>
                <span className="font-mono font-bold">{receipt.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Mode</span>
                <span>{PAYMENT_METHOD_LABELS[receipt.method]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Montant réglé</span>
                <span className="font-bold tabular-nums">
                  {formatFcfa(receipt.paidAmount)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="flex-1 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
