import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateFr } from '../../utils/format';
import type { Restaurant } from '../../types';

export function RestaurantsAdminPage() {
  const { t } = useTranslation();
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
      notify(t('superadminPages.restaurants.createdToast'), 'success');
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
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
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
      notify(
        t('superadminPages.restaurants.statusUpdatedToast', { status }),
        'info',
      );
      setSelected(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout
      title={t('superadmin.restaurantsTitle')}
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('superadmin.createRestaurantBtn')}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('superadminPages.restaurants.nameLabel')}
              </label>
              <input
                required
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('superadminPages.restaurants.cityLabel')}
              </label>
              <input
                required
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('superadminPages.restaurants.ownerLabel')}
              </label>
              <input
                required
                type="text"
                value={form.ownerName}
                onChange={(e) =>
                  setForm({ ...form, ownerName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('superadminPages.restaurants.ownerEmailLabel')}
              </label>
              <input
                required
                type="email"
                value={form.ownerEmail}
                onChange={(e) =>
                  setForm({ ...form, ownerEmail: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('superadminPages.restaurants.planLabel')}
              </label>
              <select
                value={form.planCode}
                onChange={(e) => setForm({ ...form, planCode: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-sm bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                <option value="ESSENTIEL">{t('auth.plans.ESSENTIEL')}</option>
                <option value="PROFESSIONNEL">{t('auth.plans.PROFESSIONNEL')}</option>
                <option value="PREMIUM">{t('auth.plans.PREMIUM')}</option>
              </select>
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
            >
              {t('superadminPages.restaurants.createBtn')}
            </button>
          </form>
        )}

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.restaurants.colVenue')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.restaurants.colOwner')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.restaurants.colPlan')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.restaurants.colStatus')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.restaurants.colOrders')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.restaurants.colAction')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {restaurants.map((r) => (
                  <tr
                    key={r.id}
                    className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                  >
                    <td className="px-5 py-3">
                      <p className="font-semibold text-[var(--rm-ink)]">{r.name}</p>
                      <p className="text-xs text-[var(--rm-ink-muted)]">{r.city}</p>
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <p className="font-medium text-[var(--rm-ink)]">
                        {r.ownerName || '—'}
                      </p>
                      <p className="text-[var(--rm-ink-muted)] font-mono">
                        {r.ownerEmail || r.email}
                      </p>
                    </td>
                    <td className="px-5 py-3 text-xs font-medium text-[var(--rm-ink)]">
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
                    <td className="px-5 py-3 text-right text-[var(--rm-ink)] tabular-nums">
                      {r.ordersCount ?? 0}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(r)}
                        className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                      >
                        {t('common.manage')}
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
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <div className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-md w-full p-6 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-bold text-[var(--rm-ink)]">
                  {selected.name}
                </h3>
                <p className="text-xs text-[var(--rm-ink-muted)]">
                  {t('superadminPages.restaurants.createdAtMeta', {
                    city: selected.city,
                    date: formatDateFr(selected.createdAt),
                  })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="text-xs text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] cursor-pointer"
              >
                {t('common.close')}
              </button>
            </div>

            <div className="text-xs text-[var(--rm-ink)] space-y-1.5 border-t border-b border-[var(--rm-border-subtle)] py-3">
              <p>
                <strong>{t('superadminPages.restaurants.ownerMetaLabel')}</strong>{' '}
                {selected.ownerName} ({selected.ownerEmail})
              </p>
              <p>
                <strong>{t('superadminPages.restaurants.planMetaLabel')}</strong>{' '}
                {selected.planName} ({selected.subscriptionStatus})
              </p>
              <p>
                <strong>
                  {t('superadminPages.restaurants.currentStatusLabel')}
                </strong>{' '}
                {selected.status}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selected.status !== 'ACTIVE' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'ACTIVE')}
                  className="py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('superadminPages.restaurants.activateBtn')}
                </button>
              )}
              {selected.status !== 'SUSPENDED' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'SUSPENDED')}
                  className="py-2 rounded-lg bg-[#E5A32A] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('superadminPages.restaurants.suspendBtn')}
                </button>
              )}
              {selected.status !== 'DELETED' && (
                <button
                  type="button"
                  onClick={() => changeStatus(selected.id, 'DELETED')}
                  className="col-span-2 py-2 rounded-lg border border-red-200 dark:border-red-900/60 text-[#E05252] text-xs font-semibold cursor-pointer"
                >
                  {t('superadminPages.restaurants.softDeleteBtn')}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </SuperAdminLayout>
  );
}
