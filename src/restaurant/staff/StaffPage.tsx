import React, { useCallback, useEffect, useState } from 'react';
import { Plus, Shield } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { ROLE_LABELS } from '../../utils/format';
import type { Permission, Role, StaffMember } from '../../types';

export function StaffPage() {
  const { notify } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [ceilings, setCeilings] = useState<Record<string, Permission[]>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    role: 'WAITER' as Role,
    password: '',
  });
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);

  const load = useCallback(() => {
    apiFetch<{
      staff: StaffMember[];
      roleCeilings: Record<string, Permission[]>;
    }>('/api/restaurant/staff')
      .then((res) => {
        setStaff(res.staff);
        setCeilings(res.roleCeilings);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/staff', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify('Collaborateur créé avec succès.', 'success');
      setShowAdd(false);
      setForm({ fullName: '', email: '', phone: '', role: 'WAITER', password: '' });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const toggleStatus = async (m: StaffMember) => {
    const next = m.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/api/restaurant/staff/${m.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      notify(
        next === 'SUSPENDED'
          ? `${m.fullName} suspendu et sessions révoquées.`
          : `${m.fullName} réactivé.`,
        'info',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const savePermissions = async () => {
    if (!editingMember) return;
    try {
      await apiFetch(`/api/restaurant/staff/${editingMember.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ customPermissions: selectedPerms }),
      });
      notify('Permissions mises à jour dans la limite du rôle.', 'success');
      setEditingMember(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout
      title="Personnel & Permissions"
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un employé</span>
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
              <label className="block text-xs font-semibold mb-1">
                Nom complet
              </label>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Rôle</label>
              <select
                value={form.role}
                onChange={(e) =>
                  setForm({ ...form, role: e.target.value as Role })
                }
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white"
              >
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Caissier</option>
                <option value="WAITER">Serveur</option>
                <option value="KITCHEN_BAR">Cuisine / Bar</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">
                Mot de passe initial
              </label>
              <input
                type="password"
                minLength={8}
                placeholder="RestoMax2026!"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
            >
              Créer le compte
            </button>
          </form>
        )}

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Employé</th>
                  <th className="px-5 py-3 font-semibold">Email</th>
                  <th className="px-5 py-3 font-semibold">Rôle</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staff.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-semibold text-[#182333]">
                      {m.fullName}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-[#64748B]">
                      {m.email}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold text-[#182333]">
                      {ROLE_LABELS[m.role] || m.role}
                    </td>
                    <td className="px-5 py-3 text-xs font-semibold">
                      <span
                        className={
                          m.status === 'ACTIVE'
                            ? 'text-[#14B8A6]'
                            : 'text-[#E05252]'
                        }
                      >
                        {m.status === 'ACTIVE' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right space-x-3">
                      {m.role !== 'OWNER' && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMember(m);
                              const maxPerms = ceilings[m.role] || [];
                              setSelectedPerms(
                                m.customPermissions.length > 0
                                  ? m.customPermissions
                                  : maxPerms,
                              );
                            }}
                            className="text-xs font-semibold text-[#182333] hover:text-[#FF8738] cursor-pointer"
                          >
                            Permissions
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleStatus(m)}
                            className="text-xs font-semibold text-[#E05252] hover:underline cursor-pointer"
                          >
                            {m.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
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

      {editingMember && (
        <div className="fixed inset-0 z-50 bg-[#182333]/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#FF8738]" />
              <h3 className="text-base font-bold text-[#182333]">
                Droits délégués : {editingMember.fullName}
              </h3>
            </div>
            <p className="text-xs text-[#64748B]">
              Plafond maximal du rôle {ROLE_LABELS[editingMember.role]} appliqué automatiquement côté serveur.
            </p>
            <div className="max-h-64 overflow-y-auto space-y-2 border-t border-b border-slate-100 py-3">
              {(ceilings[editingMember.role] || []).map((perm) => (
                <label
                  key={perm}
                  className="flex items-center gap-2.5 text-xs text-[#182333] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedPerms.includes(perm)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedPerms((p) => [...p, perm]);
                      } else {
                        setSelectedPerms((p) => p.filter((x) => x !== perm));
                      }
                    }}
                  />
                  <span className="font-mono">{perm}</span>
                </label>
              ))}
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setEditingMember(null)}
                className="flex-1 py-2 rounded-lg border border-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={savePermissions}
                className="flex-1 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
              >
                Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
