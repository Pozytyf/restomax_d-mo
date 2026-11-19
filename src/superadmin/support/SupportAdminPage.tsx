import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateTimeFr } from '../../utils/format';
import type { SupportTicket } from '../../types';

export function SupportAdminPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [leads, setLeads] = useState<
    Array<{
      id: string;
      lead_type: string;
      full_name: string;
      email: string;
      restaurant_name: string;
      message: string;
      created_at: string;
    }>
  >([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});

  const load = useCallback(() => {
    apiFetch<{ tickets: SupportTicket[]; leads: typeof leads }>(
      '/api/superadmin/tickets',
    )
      .then((res) => {
        setTickets(res.tickets);
        setLeads(res.leads);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sendReply = async (ticketId: string, status: string) => {
    try {
      await apiFetch(`/api/superadmin/tickets/${ticketId}/reply`, {
        method: 'POST',
        body: JSON.stringify({
          body: replyText[ticketId] || '',
          status,
        }),
      });
      notify('Ticket mis à jour.', 'success');
      setReplyText((r) => ({ ...r, [ticketId]: '' }));
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.supportTitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-[#182333]">
            Tickets clients ({tickets.length})
          </h2>
          {tickets.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-slate-200 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[#182333] text-sm">
                    {t.subject}
                  </h3>
                  <p className="text-xs text-[#64748B]">
                    {t.restaurantName || 'Plateforme'} · {t.createdByEmail} ·{' '}
                    {t.priority}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FF8738]">
                  {t.status}
                </span>
              </div>

              <div className="space-y-2 border-t border-b border-slate-100 py-3">
                {t.messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <span className="font-semibold text-[#182333]">
                      {m.author} ({m.role}) :
                    </span>{' '}
                    <span className="text-[#64748B]">{m.body}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Répondre au restaurant…"
                  value={replyText[t.id] || ''}
                  onChange={(e) =>
                    setReplyText({ ...replyText, [t.id]: e.target.value })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={() => sendReply(t.id, 'IN_PROGRESS')}
                  className="px-3 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer"
                >
                  Répondre
                </button>
                <button
                  type="button"
                  onClick={() => sendReply(t.id, 'RESOLVED')}
                  className="px-3 py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold cursor-pointer"
                >
                  Résolu
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-[#182333]">
            Prospects & Démos ({leads.length})
          </h2>
          <div className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100">
            {leads.length === 0 ? (
              <p className="p-6 text-xs text-[#64748B] text-center">
                Aucune demande soumise depuis le site vitrine pour le moment.
              </p>
            ) : (
              leads.map((l) => (
                <div key={l.id} className="p-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[#182333]">
                      {l.full_name}
                    </span>
                    <span className="text-[#FF8738] font-semibold">
                      {l.lead_type}
                    </span>
                  </div>
                  <p className="text-[#64748B]">
                    {l.email} · {l.restaurant_name || 'N/A'}
                  </p>
                  <p className="text-[#182333]">{l.message}</p>
                  <p className="text-[11px] text-[#64748B]">
                    {formatDateTimeFr(l.created_at)}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
