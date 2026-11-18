import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Users } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type { DiningTable } from '../../types';

export function FloorTablesPage() {
  const { notify } = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    zone: 'Terrasse Lagune',
    label: '',
    capacity: 4,
  });

  const load = useCallback(() => {
    apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables')
      .then((res) => setTables(res.tables))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/tables', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Table créée avec son QR code associé.', 'success');
      setForm({ zone: 'Terrasse Lagune', label: '', capacity: 4 });
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/restaurant/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const zones = Array.from(new Set(tables.map((t) => t.zone)));

  return (
    <RestaurantLayout
      title="Salle & Tables"
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouvelle table</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Zone</label>
              <input
                required
                type="text"
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Nom de table
              </label>
              <input
                required
                type="text"
                placeholder="Ex : Table 07"
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Capacité
              </label>
              <input
                required
                type="number"
                min={1}
                max={24}
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) || 4 })
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

        {zones.map((zone) => (
          <div key={zone} className="space-y-3">
            <h2 className="text-sm font-bold text-[#182333]">{zone}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables
                .filter((t) => t.zone === zone)
                .map((tbl) => (
                  <div
                    key={tbl.id}
                    className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[#182333]">
                          {tbl.label}
                        </h3>
                        <p className="text-xs text-[#64748B] flex items-center gap-1 mt-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>{tbl.capacity} places</span>
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          tbl.status === 'OCCUPIED'
                            ? 'text-[#FF8738]'
                            : tbl.status === 'RESERVED'
                              ? 'text-[#E5A32A]'
                              : 'text-[#14B8A6]'
                        }`}
                      >
                        {tbl.status === 'OCCUPIED'
                          ? 'Occupée'
                          : tbl.status === 'RESERVED'
                            ? 'Réservée'
                            : 'Libre'}
                      </span>
                    </div>

                    {tbl.activeOrderTotalXof ? (
                      <div className="p-3 rounded-lg bg-[#F5F7FA] text-xs flex justify-between">
                        <span className="text-[#64748B]">Addition en cours</span>
                        <span className="font-bold text-[#182333] tabular-nums">
                          {formatFcfa(tbl.activeOrderTotalXof)}
                        </span>
                      </div>
                    ) : null}

                    <div className="flex gap-2 pt-2 border-t border-slate-100">
                      {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(tbl.id, st)}
                            className={`flex-1 py-1.5 rounded text-[11px] font-semibold cursor-pointer ${
                              tbl.status === st
                                ? 'bg-[#182333] text-white'
                                : 'bg-[#F5F7FA] text-[#64748B] hover:text-[#182333]'
                            }`}
                          >
                            {st === 'AVAILABLE'
                              ? 'Libre'
                              : st === 'OCCUPIED'
                                ? 'Occupée'
                                : 'Réservée'}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </RestaurantLayout>
  );
}
