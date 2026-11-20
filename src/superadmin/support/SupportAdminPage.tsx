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
      notify(t('superadminPages.support.updatedToast'), 'success');
      setReplyText((r) => ({ ...r, [ticketId]: '' }));
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  return (
    <SuperAdminLayout title={t('superadmin.supportTitle')}>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-[var(--rm-ink)]">
            {t('superadminPages.support.ticketsTitle', { count: tickets.length })}
          </h2>
          {tickets.map((ticket) => (
            <div
              key={ticket.id}
              className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-[var(--rm-ink)] text-sm">
                    {ticket.subject}
                  </h3>
                  <p className="text-xs text-[var(--rm-ink-muted)]">
                    {ticket.restaurantName ||
                      t('superadminPages.support.platformFallback')}{' '}
                    · {ticket.createdByEmail} · {ticket.priority}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#FF8738]">
                  {ticket.status}
                </span>
              </div>

              <div className="space-y-2 border-t border-b border-[var(--rm-border-subtle)] py-3">
                {ticket.messages.map((m) => (
                  <div key={m.id} className="text-xs">
                    <span className="font-semibold text-[var(--rm-ink)]">
                      {m.author} ({m.role}) :
                    </span>{' '}
                    <span className="text-[var(--rm-ink-muted)]">{m.body}</span>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder={t('superadminPages.support.replyPlaceholder')}
                  value={replyText[ticket.id] || ''}
                  onChange={(e) =>
                    setReplyText({ ...replyText, [ticket.id]: e.target.value })
                  }
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <button
                  type="button"
                  onClick={() => sendReply(ticket.id, 'IN_PROGRESS')}
                  className="px-3 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('superadminPages.support.replyBtn')}
                </button>
                <button
                  type="button"
                  onClick={() => sendReply(ticket.id, 'RESOLVED')}
                  className="px-3 py-2 rounded-lg bg-[#14B8A6] text-white text-xs font-semibold cursor-pointer"
                >
                  {t('superadminPages.support.resolvedBtn')}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-5 space-y-4">
          <h2 className="text-base font-bold text-[var(--rm-ink)]">
            {t('superadminPages.support.leadsTitle', { count: leads.length })}
          </h2>
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] divide-y divide-[var(--rm-border-subtle)]">
            {leads.length === 0 ? (
              <p className="p-6 text-xs text-[var(--rm-ink-muted)] text-center">
                {t('superadminPages.support.noLeadsYet')}
              </p>
            ) : (
              leads.map((l) => (
                <div key={l.id} className="p-4 text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-bold text-[var(--rm-ink)]">
                      {l.full_name}
                    </span>
                    <span className="text-[#FF8738] font-semibold">
                      {l.lead_type}
                    </span>
                  </div>
                  <p className="text-[var(--rm-ink-muted)]">
                    {l.email} · {l.restaurant_name || 'N/A'}
                  </p>
                  <p className="text-[var(--rm-ink)]">{l.message}</p>
                  <p className="text-[11px] text-[var(--rm-ink-muted)]">
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
