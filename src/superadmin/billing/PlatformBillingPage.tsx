import { useCallback, useEffect, useState } from 'react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import {
  formatDateFr,
  formatFcfa,
  PAYMENT_METHOD_LABELS,
} from '../../utils/format';

export function PlatformBillingPage() {
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
      notify('Facture plateforme marquée payée.', 'success');
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout title="Facturation SaaS (Circuit A)">
      <div className="space-y-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 text-xs text-[#64748B]">
          Cette section suit exclusivement les abonnements payés par les restaurants à Resto’MAX. Les encaissements des convives ne transitent jamais ici.
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#F5F7FA] text-xs text-[#64748B]">
                <tr>
                  <th className="px-5 py-3 font-semibold">N° Facture</th>
                  <th className="px-5 py-3 font-semibold">Établissement</th>
                  <th className="px-5 py-3 font-semibold">Moyen</th>
                  <th className="px-5 py-3 font-semibold">Statut</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Montant
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">Date</th>
                  <th className="px-5 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-5 py-3 font-mono font-bold text-[#182333]">
                      {inv.invoiceNumber}
                    </td>
                    <td className="px-5 py-3 font-medium">
                      {inv.restaurantName}
                    </td>
                    <td className="px-5 py-3 text-xs text-[#64748B]">
                      {PAYMENT_METHOD_LABELS[inv.paymentMethod] ||
                        inv.paymentMethod}{' '}
                      ({inv.mode})
                    </td>
                    <td className="px-5 py-3 text-xs font-bold">
                      <span
                        className={
                          inv.status === 'PAID'
                            ? 'text-[#14B8A6]'
                            : 'text-[#E5A32A]'
                        }
                      >
                        {inv.status === 'PAID' ? 'Payée' : 'En attente'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-bold tabular-nums">
                      {formatFcfa(inv.amountXof)}
                    </td>
                    <td className="px-5 py-3 text-right text-xs text-[#64748B] tabular-nums">
                      {formatDateFr(inv.createdAt)}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {inv.status !== 'PAID' && (
                        <button
                          type="button"
                          onClick={() => markPaid(inv.id)}
                          className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                        >
                          Valider paiement
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
