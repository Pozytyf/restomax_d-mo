import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateFr } from '../../utils/format';
import type { Restaurant } from '../../types';

export function RestaurantsAdminPage() {
  const { notify } = useToast();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [form, setForm] = useState({
    name: '',
    city: 'Abidjan',
    ownerName: '',
    ownerEmail: '',
    phone: '',
    planCode: 'PROFESSIONNEL',
  });

  const load = useCallback(() => {
    apiFetch<{ restaurants: Restaurant[] }>('/api/superadmin/restaurants')
      .then((res) => setRestaurants(res.restaurants))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/superadmin/restaurants', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Restaurant créé avec succès.', 'success');
      setShowAdd(false);
      setForm({
        name: '',
        city: 'Abidjan',
        ownerName: '',
        ownerEmail: '',
        phone: '',
        planCode: 'PROFESSIONNEL',
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const changeStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/superadmin/restaurants/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status,
          reason: `Action Super-admin -> ${status}`,
        }),
      });
      notify(`Statut mis à jour : ${status}`, 'info');
      setSelected(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout
      title="Restaurants clients"
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Créer un restaurant</span>
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
              <label className="block text-xs font-semibold mb-1">Nom</label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Ville</label>
              <input
                required
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Propriétaire
              </label>
              <input
                required
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Email propriétaire
              </label>
              <input
                required
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm({ ...form, ownerEmail: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Offre</label>
              <select
                value={form.planCode}
                onChange={(e) => setForm({ ...form, planCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="ESSENTIEL">Essentiel</option>
                <option value="PROFESSIONNEL">Professionnel</option>
                <option value="PREMIUM">Premium</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
            >
              Créer
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Établissement</th>
                  <th className="px-5 py-3 font-semibold">Propriétaire</th>
                  <th className="px-5 py-3 font-semibold">Offre</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Commandes
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {restaurants.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[#182333]">{r.name}</p>
                      <p className="text-xs text-[#64748B]">{r.city}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-medium text-[#182333]">
                        {r.ownerName || '—'}
                      </p>
                      <p className="text-[#64748B] font-mono">
                        {r.ownerEmail || r.email}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium">
                      {r.planName || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold">
                      <span
                        className={
                          r.status === 'ACTIVE'
                            ? 'text-[#14B8A6]'
                            : r.status === 'SUSPENDED' || r.status === 'DELETED'
                              ? 'text-[#E05252]'
                              : 'text-[#FF8738]'
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {r.ordersCount ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                      >
                        Gérer
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
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[#182333]">
                  {selected.name}
                </h3>
                <p className="text-xs text-[#64748B]">
                  {selected.city} · Créé le {formatDateFr(selected.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-[#64748B]"
              >
                Fermer
              </button>
            </div>

            <div className="text-xs space-y-1.5 border-t border-b border-slate-100 py-3">
              <p>
                <strong>Propriétaire :</strong> {selected.ownerName} (
                {selected.ownerEmail})
              </p>
              <p>
                <strong>Plan :</strong> {selected.planName} (
                {selected.subscriptionStatus})
              </p>
              <p>
                <strong>Statut actuel :</strong> {selected.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selected.status !== 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'ACTIVE')}
                  className="py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold cursor-pointer"
                >
                  Activer / Réactiver
                </button>
              )}
              {selected.status !== 'SUSPENDED' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'SUSPENDED')}
                  className="py-2 rounded-lg bg-[#E5A32A] text-white text-xs font-semibold cursor-pointer"
                >
                  Suspendre
                </button>
              )}
              {selected.status !== 'DELETED' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'DELETED')}
                  className="col-span-2 py-2 rounded-lg border border-red-200 text-[#E05252] text-xs font-semibold cursor-pointer"
                >
                  Suppression logique (préserve l’historique)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
