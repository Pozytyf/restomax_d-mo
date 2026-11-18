import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, ChefHat, Clock } from 'lucide-react';
import { apiFetch } from '../services/api';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { formatFcfa, ORDER_STATUS_LABELS } from '../utils/format';

interface TrackedOrder {
  id: string;
  orderNumber: string;
  status: string;
  totalXof: number;
  paidXof: number;
  tableLabel: string;
  restaurantName: string;
  createdAt: string;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    options_summary: string;
    line_total_xof: number;
    prep_status: string;
  }>;
}

export function QrOrderTrackingPage() {
  const { token, orderId } = useParams<{ token: string; orderId: string }>();
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!token || !orderId) return;
    apiFetch<{ order: TrackedOrder }>(
      `/api/public/qr/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}`,
    )
      .then((res) => setOrder(res.order))
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Commande introuvable.'),
      );
  }, [token, orderId]);

  useEffect(() => {
    load();
  }, [load]);

  useWebSocketRoom(orderId ? `order:${orderId}` : null, load);

  if (error) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 max-w-sm w-full text-center space-y-3">
          <p className="text-sm text-[#E05252] font-semibold">{error}</p>
          {token && (
            <Link
              to={`/q/${token}`}
              className="inline-block text-xs font-semibold text-[#FF8738]"
            >
              Retour au menu
            </Link>
          )}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6 text-sm text-[#64748B]">
        Chargement du suivi…
      </div>
    );
  }

  const steps = ['PENDING', 'IN_PREPARATION', 'READY', 'SERVED'];
  const currentIdx = Math.max(0, steps.indexOf(order.status));

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-4 sm:p-6">
      <div className="max-w-lg mx-auto space-y-5">
        <div className="bg-[#182333] text-white rounded-2xl p-6 text-center space-y-2">
          <CheckCircle2 className="w-9 h-9 text-[#14B8A6] mx-auto" />
          <p className="text-xs text-slate-300">
            {order.restaurantName} · {order.tableLabel}
          </p>
          <h1 className="text-xl font-extrabold font-mono">
            Commande {order.orderNumber}
          </h1>
          <p className="text-sm font-semibold text-[#FF8738]">
            {ORDER_STATUS_LABELS[order.status] || order.status}
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="text-sm font-bold text-[#182333] flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-[#FF8738]" />
            <span>Avancement en temps réel</span>
          </h2>
          <div className="grid grid-cols-4 gap-2 text-center text-[11px]">
            {steps.map((st, idx) => (
              <div key={st} className="space-y-1.5">
                <div
                  className={`h-2 rounded-full ${
                    idx <= currentIdx ? 'bg-[#14B8A6]' : 'bg-slate-200'
                  }`}
                />
                <span
                  className={
                    idx <= currentIdx
                      ? 'font-semibold text-[#182333]'
                      : 'text-[#64748B]'
                  }
                >
                  {ORDER_STATUS_LABELS[st]}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-[#64748B] flex items-center gap-1.5 pt-1">
            <Clock className="w-3.5 h-3.5" />
            <span>Cette page se met à jour automatiquement dès que la cuisine avance.</span>
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-bold text-[#182333]">Détail</h2>
          <div className="divide-y divide-slate-100 text-sm">
            {order.items.map((it) => (
              <div key={it.id} className="py-2 flex justify-between">
                <span>
                  <strong>{it.quantity}×</strong> {it.name}
                </span>
                <span className="tabular-nums font-semibold">
                  {formatFcfa(it.line_total_xof)}
                </span>
              </div>
            ))}
          </div>
          <div className="pt-3 border-t border-slate-200 flex justify-between font-extrabold text-[#182333]">
            <span>Total</span>
            <span className="tabular-nums">{formatFcfa(order.totalXof)}</span>
          </div>
        </div>

        {token && (
          <Link
            to={`/q/${token}`}
            className="block w-full text-center py-3 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-[#182333]"
          >
            Commander un autre article
          </Link>
        )}
      </div>
    </div>
  );
}
