import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type { CustomerProfile } from '../../types';

export function CustomersPage() {
  const { t } = useTranslation();
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
      notify(t('customers.createdToast'), 'success');
      setForm({ fullName: '', phone: '', email: '', preferences: '' });
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <RestaurantLayout
      title={t('pages.customersTitle')}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('pages.newCustomerBtn')}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('customers.nameLabel')}
              </label>
              <input
                required
                type="text"
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('customers.phoneLabel')}
              </label>
              <input
                required
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('customers.emailLabel')}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('customers.preferencesLabel')}
              </label>
              <input
                type="text"
                value={form.preferences}
                onChange={(e) =>
                  setForm({ ...form, preferences: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
            >
              {t('common.save')}
            </button>
          </form>
        )}

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">{t('customers.colCustomer')}</th>
                  <th className="px-5 py-3 font-semibold">{t('customers.colPhone')}</th>
                  <th className="px-5 py-3 font-semibold">{t('customers.colPreferences')}</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('customers.colVisits')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('customers.colLoyaltyPoints')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('customers.colTotalSpent')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {customers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                  >
                    <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                      {c.fullName}
                    </td>
                    <td className="px-5 py-3 text-xs font-mono text-[var(--rm-ink-muted)]">
                      {c.phone}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                      {c.preferences || '—'}
                    </td>
                    <td className="px-5 py-3 text-right text-[var(--rm-ink)] tabular-nums">
                      {c.visitsCount}
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[#FF8738] tabular-nums">
                      {t('customers.pointsUnit', { count: c.loyaltyPoints })}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-[var(--rm-ink)] tabular-nums">
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
