import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa, formatTimeFr } from '../../utils/format';
import type { StockItem } from '../../types';

interface MovementRow {
  id: string;
  stockName: string;
  movementType: string;
  quantityDelta: number;
  reason: string;
  createdAt: string;
}

export function StocksPage() {
  const { notify } = useToast();
  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newStock, setNewStock] = useState({
    name: '',
    unit: 'kg',
    quantity: 10,
    minThreshold: 5,
    unitCostXof: 2000,
    supplierName: '',
  });
  const [moveTarget, setMoveTarget] = useState<StockItem | null>(null);
  const [moveForm, setMoveForm] = useState({
    movementType: 'IN',
    quantity: 5,
    reason: 'Approvisionnement fournisseur',
  });

  const load = useCallback(() => {
    apiFetch<{ stocks: StockItem[]; movements: MovementRow[] }>(
      '/api/restaurant/stocks',
    )
      .then((res) => {
        setStocks(res.stocks);
        setMovements(res.movements);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/stocks', {
        method: 'POST',
        body: JSON.stringify(newStock),
      });
      notify('Article de stock créé.', 'success');
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    try {
      await apiFetch(`/api/restaurant/stocks/${moveTarget.id}/move`, {
        method: 'POST',
        body: JSON.stringify(moveForm),
      });
      notify('Mouvement de stock enregistré.', 'success');
      setMoveTarget(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout
      title="Stocks & Achats"
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvel ingrédient</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Nom</label>
              <input
                required
                type="text"
                value={newStock.name}
                onChange={(e) =>
                  setNewStock({ ...newStock, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Unité</label>
              <input
                required
                type="text"
                value={newStock.unit}
                onChange={(e) =>
                  setNewStock({ ...newStock, unit: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Quantité init.
              </label>
              <input
                required
                type="number"
                step="0.1"
                value={newStock.quantity}
                onChange={(e) =>
                  setNewStock({ ...newStock, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Seuil alerte
              </label>
              <input
                required
                type="number"
                step="0.1"
                value={newStock.minThreshold}
                onChange={(e) =>
                  setNewStock({
                    ...newStock,
                    minThreshold: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Fournisseur
              </label>
              <input
                type="text"
                value={newStock.supplierName}
                onChange={(e) =>
                  setNewStock({ ...newStock, supplierName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ingrédient</th>
                  <th className="px-5 py-3 font-semibold">Fournisseur</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Stock actuel
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Seuil min
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Coût unitaire
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Mouvement
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stocks.map((st) => {
                  const critical = st.quantity <= st.minThreshold;
                  return (
                    <tr key={st.id} className="hover:bg-slate-50">
                      <td className="px-5 py-3 font-semibold text-[#182333] flex items-center gap-2">
                        {critical && (
                          <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0" />
                        )}
                        <span>{st.name}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[#64748B]">
                        {st.supplierName || '—'}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold tabular-nums ${
                          critical ? 'text-[#E05252]' : 'text-[#182333]'
                        }`}
                      >
                        {st.quantity} {st.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-[#64748B] tabular-nums">
                        {st.minThreshold} {st.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-xs tabular-nums">
                        {formatFcfa(st.unitCostXof)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setMoveTarget(st)}
                          className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                        >
                          Entrée / Sortie
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Stock Movements */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h2 className="text-base font-bold text-[#182333] mb-4">
            Derniers mouvements de stock
          </h2>
          {movements.length === 0 ? (
            <p className="text-xs text-[#64748B]">Aucun mouvement récent.</p>
          ) : (
            <div className="space-y-2 text-xs">
              {movements.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <span className="font-semibold text-[#182333]">
                      {m.stockName}
                    </span>{' '}
                    · <span className="text-[#64748B]">{m.reason}</span>
                  </div>
                  <div className="flex items-center gap-4 tabular-nums">
                    <span
                      className={`font-bold ${
                        m.quantityDelta >= 0
                          ? 'text-[#14B8A6]'
                          : 'text-[#E05252]'
                      }`}
                    >
                      {m.quantityDelta >= 0 ? `+${m.quantityDelta}` : m.quantityDelta}
                    </span>
                    <span className="text-[#64748B]">
                      {formatTimeFr(m.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {moveTarget && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <form
            onSubmit={handleMove}
            className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[#182333]">
              Mouvement : {moveTarget.name}
            </h3>
            <div>
              <label className="block text-xs font-semibold mb-1">Type</label>
              <select
                value={moveForm.movementType}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, movementType: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="IN">Entrée / Achat (+)</option>
                <option value="OUT">Sortie cuisine (-)</option>
                <option value="LOSS">Perte / Casse (-)</option>
                <option value="INVENTORY">Ajustement inventaire (=)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Quantité ({moveTarget.unit})
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.1"
                value={moveForm.quantity}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Motif</label>
              <input
                type="text"
                value={moveForm.reason}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, reason: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      )}
    </RestaurantLayout>
  );
}
