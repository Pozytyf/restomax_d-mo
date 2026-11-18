import { useCallback, useEffect, useState } from 'react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { ROLE_LABELS } from '../../utils/format';

export function PlatformUsersPage() {
  const { notify } = useToast();
  const [users, setUsers] = useState<
    Array<{
      id: string;
      email: string;
      fullName: string;
      globalRole: string;
      status: string;
      restaurantName: string | null;
      restaurantRole: string | null;
    }>
  >([]);

  const load = useCallback(() => {
    apiFetch<{ users: typeof users }>('/api/superadmin/users')
      .then((res) => setUsers(res.users))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleUser = async (id: string, currentStatus: string) => {
    const next = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await apiFetch(`/api/superadmin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      });
      notify(
        next === 'SUSPENDED'
          ? 'Compte suspendu et sessions révoquées immédiatement.'
          : 'Compte réactivé.',
        'info',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout title="Utilisateurs de la plateforme">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
              <tr>
                <th className="px-5 py-3 font-semibold">Nom</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Établissement</th>
                <th className="px-5 py-3 font-semibold">Rôle</th>
                <th className="px-5 py-3 font-semibold">Statut</th>
                <th className="px-5 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 font-semibold text-[#182333]">
                    {u.fullName}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-[#64748B]">
                    {u.email}
                  </td>
                  <td className="px-5 py-3 text-xs">
                    {u.restaurantName || 'Administration Resto’MAX'}
                  </td>
                  <td className="px-5 py-3 text-xs font-medium">
                    {u.globalRole === 'SUPER_ADMIN'
                      ? 'Super-admin'
                      : ROLE_LABELS[u.restaurantRole || ''] ||
                        u.restaurantRole}
                  </td>
                  <td className="px-5 py-3 text-xs font-bold">
                    <span
                      className={
                        u.status === 'ACTIVE'
                          ? 'text-[#14B8A6]'
                          : 'text-[#E05252]'
                      }
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    {u.globalRole !== 'SUPER_ADMIN' && (
                      <button
                        type="button"
                        onClick={() => toggleUser(u.id, u.status)}
                        className="text-xs font-semibold text-[#E05252] hover:underline cursor-pointer"
                      >
                        {u.status === 'ACTIVE' ? 'Suspendre' : 'Réactiver'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
