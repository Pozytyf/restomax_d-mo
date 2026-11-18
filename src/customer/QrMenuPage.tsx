import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, UtensilsCrossed } from 'lucide-react';
import { apiFetch } from '../services/api';
import { ResilientImage } from '../components/ResilientImage';
import { useToast } from '../components/Toast';
import { formatFcfa } from '../utils/format';
import type { MenuCategory, MenuOption } from '../types';

interface GuestMenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  priceXof: number;
  imageUrl: string | null;
  options: MenuOption[];
}

interface QrPayload {
  sessionId: string;
  restaurant: {
    id: string;
    name: string;
    city: string;
    currency: string;
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

export function QrMenuPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { notify } = useToast();

  const [data, setData] = useState<QrPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCat, setActiveCat] = useState<string>('ALL');

  const [cart, setCart] = useState<CartEntry[]>([]);
  const [selectedItem, setSelectedItem] = useState<GuestMenuItem | null>(null);
  const [chosenOpts, setChosenOpts] = useState<string[]>([]);
  const [itemNote, setItemNote] = useState('');

  const [cartOpen, setCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiFetch<QrPayload>(`/api/public/qr/${encodeURIComponent(token)}`)
      .then((res) => {
        setData(res);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'QR Code invalide.');
      })
      .finally(() => setLoading(false));
  }, [token]);

  const addItemToCart = (
    item: GuestMenuItem,
    optIds: string[],
    note: string,
  ) => {
    const matched = item.options.filter((o) => optIds.includes(o.id));
    const delta = matched.reduce((a, o) => a + o.priceDeltaXof, 0);
    const label = matched.map((o) => o.label).join(', ');
    const key = `${item.id}::${optIds.sort().join(',')}::${note}`;

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
          optionIds: optIds,
          optionsLabel: label,
          optionsDelta: delta,
          quantity: 1,
          notes: note,
        },
      ];
    });
    setSelectedItem(null);
    setChosenOpts([]);
    setItemNote('');
    notify(`${item.name} ajouté au panier`, 'success');
  };

  const updateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.key === key ? { ...c, quantity: c.quantity + delta } : c,
        )
        .filter((c) => c.quantity > 0),
    );
  };

  const totalCount = cart.reduce((a, c) => a + c.quantity, 0);
  const totalXof = cart.reduce(
    (a, c) => a + (c.item.priceXof + c.optionsDelta) * c.quantity,
    0,
  );

  const handleCheckout = async () => {
    if (!token || !data || cart.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const idempotencyKey = `qr-${data.sessionId}-${Date.now()}`;
      const res = await apiFetch<{ order: { id: string } }>(
        `/api/public/qr/${encodeURIComponent(token)}/orders`,
        {
          method: 'POST',
          body: JSON.stringify({
            sessionId: data.sessionId,
            customerName: customerName.trim(),
            notes: orderNotes.trim(),
            idempotencyKey,
            items: cart.map((c) => ({
              menuItemId: c.item.id,
              optionIds: c.optionIds,
              quantity: c.quantity,
              notes: c.notes,
            })),
          }),
        },
      );
      setCart([]);
      setCartOpen(false);
      navigate(`/q/${encodeURIComponent(token)}/suivi/${res.order.id}`);
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Erreur d’envoi de la commande.',
        'error',
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <p className="text-sm text-[#64748B]">Vérification de votre table…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-7 text-center space-y-3">
          <UtensilsCrossed className="w-8 h-8 text-[#E05252] mx-auto" />
          <h1 className="text-lg font-bold text-[#182333]">QR Code indisponible</h1>
          <p className="text-sm text-[#64748B]">{error}</p>
        </div>
      </div>
    );
  }

  const visibleItems = data.items.filter(
    (it) => activeCat === 'ALL' || it.categoryId === activeCat,
  );

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
            </p>
          </div>
          <span className="text-xs font-semibold text-[#FF8738] shrink-0">
            Menu QR
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 pt-5 space-y-5">
        {/* Category Scroller */}
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
            Tout le menu
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

        {/* Menu Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visibleItems.map((it) => (
            <div
              key={it.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full bg-[#182333] overflow-hidden">
                  <ResilientImage
                    src={it.imageUrl}
                    alt={it.name}
                    className="w-full h-full object-cover"
                    fallbackTitle={it.name}
                  />
                </div>
                <div className="p-4">
                  <h2 className="text-base font-bold text-[#182333]">
                    {it.name}
                  </h2>
                  <p className="mt-1 text-xs text-[#64748B] leading-relaxed">
                    {it.description}
                  </p>
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
                  Ajouter
                </button>
              </div>
            </div>
          ))}
        </div>
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
                <span>Voir mon panier ({totalCount})</span>
              </span>
              <span className="tabular-nums">{formatFcfa(totalXof)}</span>
            </button>
          </div>
        </div>
      )}

      {/* Item Options Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#182333]">
                  {selectedItem.name}
                </h3>
                <p className="text-sm font-bold text-[#FF8738] tabular-nums">
                  {formatFcfa(selectedItem.priceXof)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="text-xs text-[#64748B]"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-[#182333]">
                Options & suppléments
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
                          setChosenOpts((p) => p.filter((x) => x !== opt.id));
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
                      : 'Inclus'}
                  </span>
                </label>
              ))}
            </div>

            <input
              type="text"
              placeholder="Instruction particulière (ex: sans oignon)"
              value={itemNote}
              onChange={(e) => setItemNote(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
            />

            <button
              type="button"
              onClick={() => addItemToCart(selectedItem, chosenOpts, itemNote)}
              className="w-full h-12 rounded-xl bg-[#FF8738] text-white text-sm font-bold cursor-pointer"
            >
              Ajouter au panier
            </button>
          </div>
        </div>
      )}

      {/* Cart Checkout Bottom Sheet */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#182333]">
                Votre commande · {data.table.label}
              </h3>
              <button
                type="button"
                onClick={() => setCartOpen(false)}
                className="text-xs text-[#64748B]"
              >
                Fermer
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
                    <p className="text-xs font-bold text-[#FF8738] tabular-nums mt-0.5">
                      {formatFcfa((c.item.priceXof + c.optionsDelta) * c.quantity)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => updateCartQty(c.key, -1)}
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-5 text-center text-sm font-bold tabular-nums">
                      {c.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCartQty(c.key, 1)}
                      className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2.5 pt-2">
              <input
                type="text"
                placeholder="Votre prénom (optionnel)"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
              <textarea
                rows={2}
                placeholder="Commentaire pour la cuisine…"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-base font-extrabold text-[#182333]">
              <span>Total à régler</span>
              <span className="tabular-nums">{formatFcfa(totalXof)}</span>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleCheckout}
              className="w-full h-12 rounded-xl bg-[#FF8738] hover:bg-[#F07322] text-white text-sm font-bold cursor-pointer disabled:opacity-60"
            >
              {submitting
                ? 'Transmission au restaurant…'
                : 'Confirmer la commande'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
