import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch, getStoredToken } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatDateFr,
  formatFcfa,
  getPaymentMethodLabel,
} from '../../utils/format';
import type { PaymentRecord } from '../../types';

interface FinanceData {
  summary: {
    grossSalesXof: number;
    collectedXof: number;
    taxCollectedXof: number;
    cogsXof: number;
    expensesXof: number;
    netEstimatedMarginXof: number;
  };
  expenses: Array<{
    id: string;
    category: string;
    description: string;
    amountXof: number;
    expenseDate: string;
  }>;
  byMethod: Array<{ method: string; amountXof: number; count: number }>;
}

export function FinanceReportsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showExp, setShowExp] = useState(false);
  const [expForm, setExpForm] = useState({
    category: t('finance.defaultCategory'),
    description: '',
    amountXof: 10000,
  });

  const load = useCallback(() => {
    Promise.all([
      apiFetch<FinanceData>('/api/restaurant/finance'),
      apiFetch<{ payments: PaymentRecord[] }>('/api/restaurant/payments'),
    ])
      .then(([f, p]) => {
        setData(f);
        setPayments(p.payments);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const addExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/expenses', {
        method: 'POST',
        body: JSON.stringify(expForm),
      });
      notify(t('finance.expenseAddedToast'), 'success');
      setShowExp(false);
      setExpForm({
        category: t('finance.defaultCategory'),
        description: '',
        amountXof: 10000,
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const refundPayment = async (id: string) => {
    try {
      await apiFetch(`/api/restaurant/payments/${id}/refund`, {
        method: 'POST',
      });
      notify(t('finance.paymentRefundedToast'), 'info');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const downloadCsv = async () => {
    const token = getStoredToken();
    const res = await fetch('/api/restaurant/reports/export', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'rapport-ventes-restomax.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <RestaurantLayout
      title={t('pages.financeTitle')}
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowExp((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] hover:bg-[var(--rm-surface-hover)] text-[var(--rm-ink)] text-xs font-semibold cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('pages.expenseBtn')}</span>
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{t('pages.exportCsvBtn')}</span>
          </button>
        </div>
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('finance.grossSalesLabel')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                {formatFcfa(data.summary.grossSalesXof)}
              </p>
              <p className="text-xs text-[var(--rm-ink-muted)] mt-1 tabular-nums">
                {t('finance.vatIncludedLabel', {
                  amount: formatFcfa(data.summary.taxCollectedXof),
                })}
              </p>
            </div>
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('finance.collectedLabel')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-[#14B8A6] tabular-nums">
                {formatFcfa(data.summary.collectedXof)}
              </p>
            </div>
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('finance.cogsAndExpensesLabel')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-[#E05252] tabular-nums">
                {formatFcfa(data.summary.cogsXof + data.summary.expensesXof)}
              </p>
            </div>
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5">
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('finance.netMarginLabel')}
              </p>
              <p className="mt-1 text-xl font-extrabold text-[var(--rm-ink)] tabular-nums">
                {formatFcfa(data.summary.netEstimatedMarginXof)}
              </p>
            </div>
          </div>

          {showExp && (
            <form
              onSubmit={addExpense}
              className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  {t('finance.categoryLabel')}
                </label>
                <input
                  required
                  type="text"
                  value={expForm.category}
                  onChange={(e) =>
                    setExpForm({ ...expForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  {t('finance.descriptionLabel')}
                </label>
                <input
                  required
                  type="text"
                  value={expForm.description}
                  onChange={(e) =>
                    setExpForm({ ...expForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  {t('finance.amountLabel')}
                </label>
                <input
                  required
                  type="number"
                  min={100}
                  value={expForm.amountXof}
                  onChange={(e) =>
                    setExpForm({
                      ...expForm,
                      amountXof: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
              >
                {t('finance.addExpenseBtn')}
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
              <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
                {t('finance.transactionsTitle')}
              </h2>
              <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)] last:border-0"
                  >
                    <div>
                      <p className="font-mono font-bold text-[var(--rm-ink)]">
                        {p.orderNumber} · {getPaymentMethodLabel(p.method)}
                      </p>
                      <p className="text-[var(--rm-ink-muted)]">
                        {p.reference} · {p.mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span
                        className={`font-bold ${
                          p.status === 'REFUNDED'
                            ? 'line-through text-[#E05252]'
                            : 'text-[var(--rm-ink)]'
                        }`}
                      >
                        {formatFcfa(p.amountXof)}
                      </span>
                      {p.status === 'PAID' && (
                        <button
                          type="button"
                          onClick={() => refundPayment(p.id)}
                          className="text-[#E05252] hover:underline font-semibold cursor-pointer"
                        >
                          {t('finance.refundBtn')}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
              <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
                {t('finance.expensesJournalTitle')}
              </h2>
              <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
                {data.expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)] last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-[var(--rm-ink)]">
                        {ex.description}
                      </p>
                      <p className="text-[var(--rm-ink-muted)]">
                        {ex.category} · {formatDateFr(ex.expenseDate)}
                      </p>
                    </div>
                    <span className="font-bold text-[#E05252] tabular-nums">
                      -{formatFcfa(ex.amountXof)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
