import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { getRoleLabel } from '../../utils/format';

export function PlatformUsersPage() {
  const { t } = useTranslation();
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
          ? t('superadminPages.users.suspendedToast')
          : t('superadminPages.users.reactivatedToast'),
        'info',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.usersTitle')}>
      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.users.colName')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.users.colEmail')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.users.colVenue')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.users.colRole')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.users.colStatus')}
                </th>
                <th className="px-5 py-3 font-semibold text-right">
                  {t('superadminPages.users.colAction')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rm-border-subtle)]">
              {users.map((u) => (
                <tr
                  key={u.id}
                  className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                >
                  <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                    {u.fullName}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-[var(--rm-ink-muted)]">
                    {u.email}
                  </td>
                  <td className="px-5 py-3 text-xs text-[var(--rm-ink)]">
                    {u.restaurantName || t('superadminPages.users.adminFallback')}
                  </td>
                  <td className="px-5 py-3 text-xs font-medium text-[var(--rm-ink)]">
                    {u.globalRole === 'SUPER_ADMIN'
                      ? getRoleLabel('SUPER_ADMIN')
                      : getRoleLabel(u.restaurantRole || '')}
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
                        {u.status === 'ACTIVE'
                          ? t('superadminPages.users.suspendBtn')
                          : t('superadminPages.users.reactivateBtn')}
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
