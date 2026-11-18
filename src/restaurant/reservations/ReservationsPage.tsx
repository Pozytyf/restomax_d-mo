import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateTimeFr } from '../../utils/format';
import type { DiningTable, Reservation } from '../../types';

export function ReservationsPage() {
  const { notify } = useToast();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 4,
    reservedAt: new Date(Date.now() + 3600 * 1000).toISOString().slice(0, 16),
    tableId: '',
    notes: '',
  });

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ reservations: Reservation[] }>('/api/restaurant/reservations'),
      apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables'),
    ])
      .then(([r, t]) => {
        setReservations(r.reservations);
        setTables(t.tables);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/reservations', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          reservedAt: new Date(form.reservedAt).toISOString(),
        }),
      });
      notify('Réservation enregistrée.', 'success');
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/restaurant/reservations/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout
      title="Réservations"
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle réservation</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Client</label>
              <input
                required
                type="text"
                value={form.customerName}
                onChange={(e) =>
                  setForm({ ...form, customerName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Téléphone
              </label>
              <input
                required
                type="text"
                value={form.customerPhone}
                onChange={(e) =>
                  setForm({ ...form, customerPhone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Couverts
              </label>
              <input
                required
                type="number"
                min={1}
                value={form.partySize}
                onChange={(e) =>
                  setForm({ ...form, partySize: Number(e.target.value) || 2 })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Date & heure
              </label>
              <input
                required
                type="datetime-local"
                value={form.reservedAt}
                onChange={(e) =>
                  setForm({ ...form, reservedAt: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Table</label>
              <select
                value={form.tableId}
                onChange={(e) => setForm({ ...form, tableId: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="">À attribuer</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
            >
              Enregistrer
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Client</th>
                  <th className="px-5 py-3 font-semibold">Date & heure</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Couverts
                  </th>
                  <th className="px-5 py-3 font-semibold">Table</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#182333]">
                        {r.customerName}
                      </p>
                      <p className="text-xs text-[#64748B] font-mono">
                        {r.customerPhone}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs tabular-nums">
                      {formatDateTimeFr(r.reservedAt)}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {r.partySize}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      {r.tableLabel || 'Non assignée'}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      <span
                        className={
                          r.status === 'CONFIRMED'
                            ? 'text-[#14B8A6]'
                            : r.status === 'CANCELLED'
                              ? 'text-[#E05252]'
                              : 'text-[#FF8738]'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2 text-xs">
                      {r.status !== 'SEATED' && r.status !== 'CANCELLED' && (
                        <>
                          <button
                            type="button"
                            onClick={() => setStatus(r.id, 'SEATED')}
                            className="font-semibold text-[#14B8A6] hover:underline cursor-pointer"
                          >
                            Installer
                          </button>
                          <button
                            type="button"
                            onClick={() => setStatus(r.id, 'CANCELLED')}
                            className="font-semibold text-[#E05252] hover:underline cursor-pointer"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RestaurantLayout>
  );
}
