import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateFr, formatFcfa } from '../../utils/format';
import type { Restaurant } from '../../types';

export function SettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [resto, setResto] = useState<Restaurant | null>(null);
  const [sub, setSub] = useState<{
    planName: string;
    status: string;
    priceMonthlyXof: number;
    currentPeriodEnd: string;
  } | null>(null);
  const [tickets, setTickets] = useState<
    Array<{ id: string; subject: string; status: string; priority: string }>
  >([]);

  const [paydunyaKeys, setPaydunyaKeys] = useState({
    paydunyaPublicKey: '',
    paydunyaPrivateKey: '',
    paydunyaToken: '',
  });
  const [ticketForm, setTicketForm] = useState({
    subject: '',
    category: 'Technique',
    priority: 'MEDIUM',
    message: '',
  });

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ restaurant: Restaurant; subscription: typeof sub }>(
        '/api/restaurant/settings',
      ),
      apiFetch<{ tickets: typeof tickets }>('/api/restaurant/tickets'),
    ])
      .then(([s, t]) => {
        setResto(s.restaurant);
        setSub(s.subscription);
        setTickets(t.tickets);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resto) return;
    try {
      await apiFetch('/api/restaurant/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          name: resto.name,
          phone: resto.phone,
          address: resto.address,
          city: resto.city,
          openingHours: resto.openingHours,
          taxRatePercent: resto.taxRatePercent,
          paydunyaMode: resto.paydunyaMode,
          ...paydunyaKeys,
        }),
      });
      notify('Paramètres enregistrés.', 'success');
      setPaydunyaKeys({
        paydunyaPublicKey: '',
        paydunyaPrivateKey: '',
        paydunyaToken: '',
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });
      notify('Ticket de support envoyé.', 'success');
      setTicketForm({ subject: '', category: 'Technique', priority: 'MEDIUM', message: '' });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  return (
    <RestaurantLayout title={t('pages.settingsTitle')}>
      {resto && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form
            onSubmit={saveSettings}
            className="lg:col-span-7 bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 space-y-5"
          >
            <h2 className="text-base font-bold text-[var(--rm-ink)]">
              Profil de l’établissement & fiscalité
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  Nom
                </label>
                <input
                  type="text"
                  value={resto.name}
                  onChange={(e) => setResto({ ...resto, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  Téléphone
                </label>
                <input
                  type="text"
                  value={resto.phone}
                  onChange={(e) => setResto({ ...resto, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  Horaires
                </label>
                <input
                  type="text"
                  value={resto.openingHours}
                  onChange={(e) =>
                    setResto({ ...resto, openingHours: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  Taux TVA (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={resto.taxRatePercent}
                  onChange={(e) =>
                    setResto({
                      ...resto,
                      taxRatePercent: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--rm-border)] space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-[var(--rm-ink)]">
                    Compte marchand PayDunya (Encaissements directs)
                  </h3>
                  <p className="text-xs text-[var(--rm-ink-muted)]">
                    Les fonds clients sont réglés directement sur votre compte marchand. Les clés restent chiffrées côté serveur.
                  </p>
                </div>
                <select
                  value={resto.paydunyaMode}
                  onChange={(e) =>
                    setResto({
                      ...resto,
                      paydunyaMode: e.target.value as 'TEST' | 'LIVE',
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-[var(--rm-border-input)] text-xs font-semibold bg-[var(--rm-surface)] text-[var(--rm-ink)]"
                >
                  <option value="TEST">MODE TEST</option>
                  <option value="LIVE">MODE LIVE</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="password"
                  placeholder="Clé publique PayDunya"
                  value={paydunyaKeys.paydunyaPublicKey}
                  onChange={(e) =>
                    setPaydunyaKeys({
                      ...paydunyaKeys,
                      paydunyaPublicKey: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <input
                  type="password"
                  placeholder="Clé privée PayDunya"
                  value={paydunyaKeys.paydunyaPrivateKey}
                  onChange={(e) =>
                    setPaydunyaKeys({
                      ...paydunyaKeys,
                      paydunyaPrivateKey: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <input
                  type="password"
                  placeholder="Token PayDunya"
                  value={paydunyaKeys.paydunyaToken}
                  onChange={(e) =>
                    setPaydunyaKeys({
                      ...paydunyaKeys,
                      paydunyaToken: e.target.value,
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
            >
              Enregistrer les paramètres
            </button>
          </form>

          <div className="lg:col-span-5 space-y-6">
            {sub && (
              <div className="bg-[#182333] dark:bg-[var(--rm-surface)] dark:border dark:border-[var(--rm-border)] text-white dark:text-[var(--rm-ink)] rounded-xl p-6 space-y-2">
                <p className="text-xs text-[#FF8738] font-semibold">
                  Abonnement SaaS (Circuit A)
                </p>
                <h3 className="text-xl font-bold">{sub.planName}</h3>
                <p className="text-sm text-slate-300 dark:text-[var(--rm-ink-muted)] tabular-nums">
                  {formatFcfa(sub.priceMonthlyXof)} / mois · Statut : {sub.status}
                </p>
                <p className="text-xs text-slate-400 dark:text-[var(--rm-ink-muted)]">
                  Échéance en cours : {formatDateFr(sub.currentPeriodEnd)}
                </p>
              </div>
            )}

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 space-y-4">
              <h3 className="text-base font-bold text-[var(--rm-ink)]">
                Contacter le support Resto’MAX
              </h3>
              <form onSubmit={createTicket} className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder="Sujet de votre demande"
                  value={ticketForm.subject}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <textarea
                  required
                  rows={3}
                  placeholder="Décrivez votre besoin…"
                  value={ticketForm.message}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, message: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
                >
                  Ouvrir un ticket support
                </button>
              </form>

              {tickets.length > 0 && (
                <div className="pt-3 border-t border-[var(--rm-border-subtle)] space-y-2">
                  <p className="text-xs font-semibold text-[var(--rm-ink-muted)]">
                    Vos tickets récents
                  </p>
                  {tickets.map((t) => (
                    <div
                      key={t.id}
                      className="text-xs flex justify-between py-1"
                    >
                      <span className="truncate font-medium text-[var(--rm-ink)]">
                        {t.subject}
                      </span>
                      <span className="text-[#FF8738] font-semibold shrink-0 ml-2">
                        {t.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </RestaurantLayout>
  );
}
