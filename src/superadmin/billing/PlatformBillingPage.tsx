import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatDateFr,
  formatFcfa,
  getPaymentMethodLabel,
} from '../../utils/format';

export function PlatformBillingPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [invoices, setInvoices] = useState<
    Array<{
      id: string;
      invoiceNumber: string;
      restaurantName: string;
      amountXof: number;
      status: string;
      paymentMethod: string;
      mode: string;
      createdAt: string;
    }>
  >([]);

  const load = useCallback(() => {
    apiFetch<{ invoices: typeof invoices }>('/api/superadmin/billing')
      .then((res) => setInvoices(res.invoices))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const markPaid = async (id: string) => {
    try {
      await apiFetch(`/api/superadmin/billing/${id}/mark-paid`, {
        method: 'POST',
      });
      notify(t('superadminPages.billing.markedPaidToast'), 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.billingTitle')}>
      <div className="space-y-4">
        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-4 text-xs text-[var(--rm-ink-muted)]">
          {t('superadminPages.billing.isolationBanner')}
        </div>

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.billing.colInvoiceNo')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.billing.colVenue')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.billing.colMethod')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('superadminPages.billing.colStatus')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.billing.colAmount')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.billing.colDate')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('superadminPages.billing.colAction')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                  >
                    <td className="px-5 py-3 font-mono font-bold text-[var(--rm-ink)]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 font-medium text-[var(--rm-ink)]">
                      {inv.restaurantName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                      {getPaymentMethodLabel(inv.paymentMethod)} ({inv.mode})
                    </td>
                    <td className="px-5 py-3 text-xs font-bold">
                      <span
                        className={
                          inv.status === 'PAID'
                            ? 'text-[#14B8A6]'
                            : 'text-[#E5A32A]'
                        }
                      >
                        {inv.status === 'PAID'
                          ? t('superadminPages.billing.paidStatus')
                          : t('superadminPages.billing.pendingStatus')}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold text-[var(--rm-ink)] tabular-nums">
                      {formatFcfa(inv.amountXof)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[var(--rm-ink-muted)] tabular-nums">
                      {formatDateFr(inv.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => markPaid(inv.id)}
                          className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                        >
                          {t('superadminPages.billing.validatePayBtn')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
