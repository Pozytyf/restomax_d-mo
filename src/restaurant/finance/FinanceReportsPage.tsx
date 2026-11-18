import React, { useCallback, useEffect, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch, getStoredToken } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatDateFr,
  formatFcfa,
  PAYMENT_METHOD_LABELS,
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
  const { notify } = useToast();
  const [data, setData] = useState<FinanceData | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [showExp, setShowExp] = useState(false);
  const [expForm, setExpForm] = useState({
    category: 'Approvisionnement',
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
      notify('Dépense enregistrée.', 'success');
      setShowExp(false);
      setExpForm({ category: 'Approvisionnement', description: '', amountXof: 10000 });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const refundPayment = async (id: string) => {
    try {
      await apiFetch(`/api/restaurant/payments/${id}/refund`, {
        method: 'POST',
      });
      notify('Paiement remboursé et journalisé.', 'info');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
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
      title="Finances & Rapports"
      actions={
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowExp((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Dépense</span>
          </button>
          <button
            type="button"
            onClick={downloadCsv}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      }
    >
      {data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-[#64748B]">Ventes brutes TTC</p>
              <p className="mt-1 text-xl font-extrabold text-[#182333] tabular-nums">
                {formatFcfa(data.summary.grossSalesXof)}
              </p>
              <p className="text-xs text-[#64748B] mt-1 tabular-nums">
                TVA incluse : {formatFcfa(data.summary.taxCollectedXof)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-[#64748B]">Encaissements réels</p>
              <p className="mt-1 text-xl font-extrabold text-[#14B8A6] tabular-nums">
                {formatFcfa(data.summary.collectedXof)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-[#64748B]">Coût matière & dépenses</p>
              <p className="mt-1 text-xl font-extrabold text-[#E05252] tabular-nums">
                {formatFcfa(data.summary.cogsXof + data.summary.expensesXof)}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-xs text-[#64748B]">Marge nette estimée</p>
              <p className="mt-1 text-xl font-extrabold text-[#182333] tabular-nums">
                {formatFcfa(data.summary.netEstimatedMarginXof)}
              </p>
            </div>
          </div>

          {showExp && (
            <form
              onSubmit={addExpense}
              className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end"
            >
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Catégorie
                </label>
                <input
                  required
                  type="text"
                  value={expForm.category}
                  onChange={(e) =>
                    setExpForm({ ...expForm, category: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Description
                </label>
                <input
                  required
                  type="text"
                  value={expForm.description}
                  onChange={(e) =>
                    setExpForm({ ...expForm, description: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Montant (FCFA)
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
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm tabular-nums"
                />
              </div>
              <button
                type="submit"
                className="py-2.5 px-4 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
              >
                Ajouter dépense
              </button>
            </form>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-[#182333] mb-4">
                Transactions d’encaissement (Circuit B)
              </h2>
              <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-mono font-bold text-[#182333]">
                        {p.orderNumber} · {PAYMENT_METHOD_LABELS[p.method]}
                      </p>
                      <p className="text-[#64748B]">
                        {p.reference} · {p.mode}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 tabular-nums">
                      <span
                        className={`font-bold ${
                          p.status === 'REFUNDED'
                            ? 'line-through text-[#E05252]'
                            : 'text-[#182333]'
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
                          Rembourser
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-base font-bold text-[#182333] mb-4">
                Journal des dépenses
              </h2>
              <div className="space-y-2.5 max-h-80 overflow-y-auto text-xs">
                {data.expenses.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <p className="font-semibold text-[#182333]">
                        {ex.description}
                      </p>
                      <p className="text-[#64748B]">
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
