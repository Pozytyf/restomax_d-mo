import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BellRing, Mail, Plus, Settings2 } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { useAuth } from '../../app/providers/AuthProvider';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateTimeFr, formatFcfa, formatTimeFr } from '../../utils/format';
import type {
  RestaurantNotification,
  StockAlertSettings,
  StockItem,
} from '../../types';

interface MovementRow {
  id: string;
  stockName: string;
  movementType: string;
  quantityDelta: number;
  reason: string;
  createdAt: string;
}

const EMAIL_STATUS_LABELS: Record<string, string> = {
  SENT: 'E-mail envoyé',
  QUEUED_NO_SMTP: 'Prêt (SMTP non configuré)',
  SKIPPED: 'E-mail désactivé',
  FAILED: 'Échec SMTP',
};

export function StocksPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const { can } = useAuth();
  const canWriteStocks = can('stocks:write');

  const [stocks, setStocks] = useState<StockItem[]>([]);
  const [movements, setMovements] = useState<MovementRow[]>([]);
  const [alertSettings, setAlertSettings] = useState<StockAlertSettings | null>(
    null,
  );
  const [recentAlerts, setRecentAlerts] = useState<RestaurantNotification[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);

  const [newStock, setNewStock] = useState({
    name: '',
    unit: 'kg',
    quantity: 10,
    minThreshold: 5,
    unitCostXof: 2000,
    supplierName: '',
  });
  const [moveTarget, setMoveTarget] = useState<StockItem | null>(null);
  const [moveForm, setMoveForm] = useState({
    movementType: 'IN',
    quantity: 5,
    reason: 'Approvisionnement fournisseur',
  });

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ stocks: StockItem[]; movements: MovementRow[] }>(
        '/api/restaurant/stocks',
      ),
      apiFetch<{
        settings: StockAlertSettings;
        recentAlerts: RestaurantNotification[];
      }>('/api/restaurant/stocks/alerts/config'),
    ])
      .then(([s, a]) => {
        setStocks(s.stocks);
        setMovements(s.movements);
        setAlertSettings(a.settings);
        setRecentAlerts(a.recentAlerts);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/stocks', {
        method: 'POST',
        body: JSON.stringify(newStock),
      });
      notify(
        newStock.quantity <= newStock.minThreshold
          ? 'Ingrédient créé sous le seuil critique : alerte automatique déclenchée.'
          : 'Article de stock créé.',
        newStock.quantity <= newStock.minThreshold ? 'info' : 'success',
      );
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const handleMove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!moveTarget) return;
    try {
      const res = await apiFetch<{ quantity: number; alertTriggered?: boolean }>(
        `/api/restaurant/stocks/${moveTarget.id}/move`,
        {
          method: 'POST',
          body: JSON.stringify(moveForm),
        },
      );
      notify(
        res.alertTriggered
          ? `Mouvement enregistré. Alerte critique envoyée pour ${moveTarget.name} !`
          : 'Mouvement de stock enregistré.',
        res.alertTriggered ? 'info' : 'success',
      );
      setMoveTarget(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const handleSaveAlertConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSettings) return;
    setSavingAlerts(true);
    try {
      const res = await apiFetch<{ settings: StockAlertSettings }>(
        '/api/restaurant/stocks/alerts/config',
        {
          method: 'PATCH',
          body: JSON.stringify({
            inAppEnabled: alertSettings.inAppEnabled,
            emailEnabled: alertSettings.emailEnabled,
            recipientEmails: alertSettings.recipientEmails,
          }),
        },
      );
      setAlertSettings(res.settings);
      notify('Paramètres d’alertes automatiques enregistrés.', 'success');
      setShowAlertConfig(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleManualAlert = async (st: StockItem) => {
    try {
      const res = await apiFetch<{
        emailStatus: string;
        recipients: string[];
      }>(`/api/restaurant/stocks/${st.id}/alert-test`, {
        method: 'POST',
      });
      notify(
        `Alerte de réapprovisionnement déclenchée pour ${st.name} (${EMAIL_STATUS_LABELS[res.emailStatus] || res.emailStatus}).`,
        'success',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const criticalItems = stocks.filter((st) => st.quantity <= st.minThreshold);

  return (
    <RestaurantLayout
      title={t('pages.stocksTitle')}
      onRealtimeEvent={load}
      actions={
        <div className="flex items-center gap-2">
          {canWriteStocks && (
            <>
              <button
                type="button"
                onClick={() => setShowAlertConfig((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface)] text-xs font-semibold text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] cursor-pointer transition-colors"
              >
                <Settings2 className="w-4 h-4 text-[#FF8738]" />
                <span>{t('pages.autoAlertsBtn')}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowAdd((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>{t('pages.newIngredientBtn')}</span>
              </button>
            </>
          )}
        </div>
      }
    >
      <div className="space-y-6">
        {criticalItems.length > 0 && (
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-[#E05252] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-[var(--rm-ink)]">
                  {criticalItems.length} ingrédient(s) sous le seuil critique de réapprovisionnement
                </p>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                  {criticalItems.map((c) => `${c.name} (${c.quantity} ${c.unit})`).join(' · ')}
                </p>
              </div>
            </div>
            {alertSettings && (
              <div className="flex items-center gap-3 text-xs text-[var(--rm-ink)] shrink-0">
                <span className="inline-flex items-center gap-1 font-medium">
                  <BellRing className="w-3.5 h-3.5 text-[#FF8738]" />
                  In-app : {alertSettings.inAppEnabled ? 'Actif' : 'Inactif'}
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#14B8A6]" />
                  E-mail : {alertSettings.emailEnabled ? 'Actif' : 'Inactif'}
                </span>
              </div>
            )}
          </div>
        )}

        {showAlertConfig && alertSettings && canWriteStocks && (
          <form
            onSubmit={handleSaveAlertConfig}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 space-y-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--rm-ink)]">
                  Configuration des alertes automatiques de réapprovisionnement
                </h2>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                  Déclenchement automatique dès qu’un mouvement ou ajout fait passer un ingrédient sous son seuil minimal.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--rm-border)] cursor-pointer hover:bg-[var(--rm-surface-hover)] transition-colors">
                <input
                  type="checkbox"
                  checked={alertSettings.inAppEnabled}
                  onChange={(e) =>
                    setAlertSettings({
                      ...alertSettings,
                      inAppEnabled: e.target.checked,
                    })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-[var(--rm-ink)]">
                    Notifications in-app temps réel
                  </p>
                  <p className="text-[var(--rm-ink-muted)] mt-0.5">
                    Affiche une alerte persistante dans la cloche et met à jour le tableau en direct.
                  </p>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3.5 rounded-lg border border-[var(--rm-border)] cursor-pointer hover:bg-[var(--rm-surface-hover)] transition-colors">
                <input
                  type="checkbox"
                  checked={alertSettings.emailEnabled}
                  onChange={(e) =>
                    setAlertSettings({
                      ...alertSettings,
                      emailEnabled: e.target.checked,
                    })
                  }
                  className="mt-0.5"
                />
                <div className="text-xs">
                  <p className="font-bold text-[var(--rm-ink)]">
                    Notifications par e-mail
                  </p>
                  <p className="text-[var(--rm-ink-muted)] mt-0.5">
                    Envoie un e-mail récapitulatif aux gestionnaires dès qu’un seuil est franchi.
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  Destinataires e-mail (optionnel, séparés par virgule)
                </label>
                <input
                  type="text"
                  placeholder={
                    alertSettings.resolvedRecipients.join(', ') ||
                    'gestionnaire@restaurant.ci'
                  }
                  value={alertSettings.recipientEmails}
                  onChange={(e) =>
                    setAlertSettings({
                      ...alertSettings,
                      recipientEmails: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <p className="text-[11px] text-[var(--rm-ink-muted)] mt-1">
                  Par défaut (si vide) :{' '}
                  {alertSettings.resolvedRecipients.length > 0
                    ? alertSettings.resolvedRecipients.join(', ')
                    : 'Propriétaire & Managers actifs'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAlertConfig(false)}
                className="px-4 py-2 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                type="submit"
                disabled={savingAlerts}
                className="px-4 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                Enregistrer la configuration
              </button>
            </div>
          </form>
        )}

        {showAdd && canWriteStocks && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Nom
              </label>
              <input
                required
                type="text"
                value={newStock.name}
                onChange={(e) =>
                  setNewStock({ ...newStock, name: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Unité
              </label>
              <input
                required
                type="text"
                value={newStock.unit}
                onChange={(e) =>
                  setNewStock({ ...newStock, unit: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Quantité init.
              </label>
              <input
                required
                type="number"
                step="0.1"
                value={newStock.quantity}
                onChange={(e) =>
                  setNewStock({ ...newStock, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Seuil alerte
              </label>
              <input
                required
                type="number"
                step="0.1"
                value={newStock.minThreshold}
                onChange={(e) =>
                  setNewStock({
                    ...newStock,
                    minThreshold: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Fournisseur
              </label>
              <input
                type="text"
                value={newStock.supplierName}
                onChange={(e) =>
                  setNewStock({ ...newStock, supplierName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <button
              type="submit"
              className="py-2.5 px-4 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer"
            >
              Ajouter
            </button>
          </form>
        )}

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">Ingrédient</th>
                  <th className="px-5 py-3 font-semibold">Fournisseur</th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Stock actuel
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Seuil min
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Coût unitaire
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--rm-border-subtle)]">
                {stocks.map((st) => {
                  const critical = st.quantity <= st.minThreshold;
                  return (
                    <tr
                      key={st.id}
                      className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                    >
                      <td className="px-5 py-3 font-semibold text-[var(--rm-ink)] flex items-center gap-2">
                        {critical && (
                          <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0" />
                        )}
                        <span>{st.name}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-[var(--rm-ink-muted)]">
                        {st.supplierName || '—'}
                      </td>
                      <td
                        className={`px-5 py-3 text-right font-bold tabular-nums ${
                          critical ? 'text-[#E05252]' : 'text-[var(--rm-ink)]'
                        }`}
                      >
                        {st.quantity} {st.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-[var(--rm-ink-muted)] tabular-nums">
                        {st.minThreshold} {st.unit}
                      </td>
                      <td className="px-5 py-3 text-right text-xs text-[var(--rm-ink)] tabular-nums">
                        {formatFcfa(st.unitCostXof)}
                      </td>
                      <td className="px-5 py-3 text-right space-x-3 whitespace-nowrap">
                        {canWriteStocks && critical && (
                          <button
                            type="button"
                            onClick={() => handleManualAlert(st)}
                            className="text-xs font-semibold text-[var(--rm-ink)] hover:text-[#FF8738] cursor-pointer"
                          >
                            Notifier
                          </button>
                        )}
                        {canWriteStocks && (
                          <button
                            type="button"
                            onClick={() => setMoveTarget(st)}
                            className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                          >
                            Entrée / Sortie
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Stock Movements */}
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
            <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
              Derniers mouvements de stock
            </h2>
            {movements.length === 0 ? (
              <p className="text-xs text-[var(--rm-ink-muted)]">
                Aucun mouvement récent.
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)] last:border-0"
                  >
                    <div>
                      <span className="font-semibold text-[var(--rm-ink)]">
                        {m.stockName}
                      </span>{' '}
                      ·{' '}
                      <span className="text-[var(--rm-ink-muted)]">
                        {m.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 tabular-nums">
                      <span
                        className={`font-bold ${
                          m.quantityDelta >= 0
                            ? 'text-[#14B8A6]'
                            : 'text-[#E05252]'
                        }`}
                      >
                        {m.quantityDelta >= 0
                          ? `+${m.quantityDelta}`
                          : m.quantityDelta}
                      </span>
                      <span className="text-[var(--rm-ink-muted)]">
                        {formatTimeFr(m.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Automated Stock Alerts History */}
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6">
            <h2 className="text-base font-bold text-[var(--rm-ink)] mb-4">
              Alertes automatiques déclenchées
            </h2>
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-[var(--rm-ink-muted)]">
                Aucune alerte critique déclenchée pour le moment.
              </p>
            ) : (
              <div className="space-y-2.5 text-xs">
                {recentAlerts.map((al) => (
                  <div
                    key={al.id}
                    className="p-3 rounded-lg bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-[var(--rm-ink)]">
                        {al.title}
                      </span>
                      <span className="text-[11px] text-[var(--rm-ink-muted)] tabular-nums shrink-0">
                        {formatDateTimeFr(al.createdAt)}
                      </span>
                    </div>
                    <p className="text-[var(--rm-ink-muted)]">{al.message}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                      <span className="text-[var(--rm-ink)] font-medium">
                        {EMAIL_STATUS_LABELS[al.emailStatus] || al.emailStatus}
                        {al.emailRecipients ? ` → ${al.emailRecipients}` : ''}
                      </span>
                      <span
                        className={
                          al.isRead
                            ? 'text-[var(--rm-ink-muted)]'
                            : 'font-semibold text-[#FF8738]'
                        }
                      >
                        {al.isRead ? 'Lue' : 'Non lue'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {moveTarget && (
        <div className="fixed inset-0 z-50 bg-[#0B1220]/70 flex items-center justify-center p-4">
          <form
            onSubmit={handleMove}
            className="bg-[var(--rm-surface)] rounded-2xl border border-[var(--rm-border)] max-w-md w-full p-6 space-y-4"
          >
            <h3 className="text-lg font-bold text-[var(--rm-ink)]">
              Mouvement : {moveTarget.name}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Type
              </label>
              <select
                value={moveForm.movementType}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, movementType: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-sm bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                <option value="IN">Entrée / Achat (+)</option>
                <option value="OUT">Sortie cuisine (-)</option>
                <option value="LOSS">Perte / Casse (-)</option>
                <option value="INVENTORY">Ajustement inventaire (=)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Quantité ({moveTarget.unit})
              </label>
              <input
                required
                type="number"
                min={0}
                step="0.1"
                value={moveForm.quantity}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, quantity: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                Motif
              </label>
              <input
                type="text"
                value={moveForm.reason}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, reason: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMoveTarget(null)}
                className="flex-1 py-2.5 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
              >
                Valider
              </button>
            </div>
          </form>
        </div>
      )}
    </RestaurantLayout>
  );
}
