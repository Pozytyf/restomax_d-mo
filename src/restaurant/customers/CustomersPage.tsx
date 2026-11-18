import React, { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type { CustomerProfile } from '../../types';

export function CustomersPage() {
  const { notify } = useToast();
  const [customers, setCustomers] = useState<CustomerProfile[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    preferences: '',
  });

  const load = useCallback(() => {
    apiFetch<{ customers: CustomerProfile[] }>('/api/restaurant/customers')
      .then((res) => setCustomers(res.customers))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/customers', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Fiche client créée.', 'success');
      setForm({ fullName: '', phone: '', email: '', preferences: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout
      title="Clients & Fidélité"
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau client</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold mb-1">Nom</label>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
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
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Préférences
              </label>
              <input
                type="text"
                value={form.preferences}
                onChange={(e) =>
                  setForm({ ...form, preferences: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
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
                  <th className="px-5 py-3 font-semibold">Téléphone</th>
                  <th className="px-5 py-3 font-semibold">Préférences</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Visites
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Points fidélité
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Total dépensé
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-[#182333]">
                      {c.fullName}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-[#64748B]">
                      {c.phone}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#64748B]">
                      {c.preferences || '—'}
                    </td>
                    <td className="px-5 py-3 text-right tabular-nums">
                      {c.visitsCount}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#FF8738] tabular-nums">
                      {c.loyaltyPoints} pts
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {formatFcfa(c.totalSpentXof)}
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
