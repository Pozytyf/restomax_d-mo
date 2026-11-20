import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  BellRing,
  Mail,
  Plus,
  Send,
  Settings2,
} from 'lucide-react';
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
  const [smtpPassInput, setSmtpPassInput] = useState('');
  const [recentAlerts, setRecentAlerts] = useState<RestaurantNotification[]>([]);

  const [showAdd, setShowAdd] = useState(false);
  const [showAlertConfig, setShowAlertConfig] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);

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
    reason: '',
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
          ? t('stocks.createdCriticalToast')
          : t('stocks.createdSuccessToast'),
        newStock.quantity <= newStock.minThreshold ? 'info' : 'success',
      );
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
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
          body: JSON.stringify({
            ...moveForm,
            reason: moveForm.reason || t('stocks.moveDefaultReason'),
          }),
        },
      );
      notify(
        res.alertTriggered
          ? t('stocks.moveCriticalToast', { name: moveTarget.name })
          : t('stocks.moveSuccessToast'),
        res.alertTriggered ? 'info' : 'success',
      );
      setMoveTarget(null);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const persistAlertSettings = async () => {
    if (!alertSettings) return null;
    const payload: Record<string, unknown> = {
      inAppEnabled: alertSettings.inAppEnabled,
      emailEnabled: alertSettings.emailEnabled,
      recipientEmails: alertSettings.recipientEmails,
      smtpHost: alertSettings.smtpHost || '',
      smtpPort: alertSettings.smtpPort || 587,
      smtpSecure: Boolean(alertSettings.smtpSecure),
      smtpUser: alertSettings.smtpUser || '',
      smtpFrom: alertSettings.smtpFrom || '',
    };
    if (smtpPassInput.trim().length > 0) {
      payload.smtpPass = smtpPassInput;
    }
    const res = await apiFetch<{ settings: StockAlertSettings }>(
      '/api/restaurant/stocks/alerts/config',
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
      },
    );
    setAlertSettings(res.settings);
    setSmtpPassInput('');
    return res.settings;
  };

  const handleSaveAlertConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alertSettings) return;
    setSavingAlerts(true);
    try {
      await persistAlertSettings();
      notify(t('stocks.alertsSavedToast'), 'success');
      setShowAlertConfig(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTestSmtpEmail = async () => {
    if (!alertSettings) return;
    setTestingSmtp(true);
    try {
      await persistAlertSettings();
      const res = await apiFetch<{
        dispatched: boolean;
        status: string;
        recipients: string[];
      }>('/api/restaurant/stocks/alerts/test-email', {
        method: 'POST',
      });
      if (res.dispatched) {
        notify(
          t('stocks.testEmailSentToast', {
            recipients: res.recipients.join(', '),
          }),
          'success',
        );
      } else if (res.status === 'QUEUED_NO_SMTP') {
        notify(t('stocks.testEmailQueuedToast'), 'info');
      } else {
        notify(t('stocks.testEmailErrorToast'), 'error');
      }
      load();
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('stocks.testEmailErrorToast'),
        'error',
      );
    } finally {
      setTestingSmtp(false);
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
      const translatedStatus = t(`stocks.emailStatuses.${res.emailStatus}`, {
        defaultValue: res.emailStatus,
      });
      notify(
        t('stocks.manualAlertToast', {
          name: st.name,
          status: translatedStatus,
        }),
        'success',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
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
                  {t('stocks.criticalBannerTitle', {
                    count: criticalItems.length,
                  })}
                </p>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                  {criticalItems
                    .map((c) => `${c.name} (${c.quantity} ${c.unit})`)
                    .join(' · ')}
                </p>
              </div>
            </div>
            {alertSettings && (
              <div className="flex items-center gap-3 text-xs text-[var(--rm-ink)] shrink-0">
                <span className="inline-flex items-center gap-1 font-medium">
                  <BellRing className="w-3.5 h-3.5 text-[#FF8738]" />
                  {t('stocks.inAppStatus', {
                    state: alertSettings.inAppEnabled
                      ? t('stocks.activeState')
                      : t('stocks.inactiveState'),
                  })}
                </span>
                <span className="inline-flex items-center gap-1 font-medium">
                  <Mail className="w-3.5 h-3.5 text-[#14B8A6]" />
                  {t('stocks.emailStatus', {
                    state: alertSettings.emailEnabled
                      ? t('stocks.activeState')
                      : t('stocks.inactiveState'),
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {showAlertConfig && alertSettings && canWriteStocks && (
          <form
            onSubmit={handleSaveAlertConfig}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 space-y-5"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-bold text-[var(--rm-ink)]">
                  {t('stocks.configTitle')}
                </h2>
                <p className="text-xs text-[var(--rm-ink-muted)] mt-0.5">
                  {t('stocks.configSubtitle')}
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
                    {t('stocks.inAppLabel')}
                  </p>
                  <p className="text-[var(--rm-ink-muted)] mt-0.5">
                    {t('stocks.inAppDesc')}
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
                    {t('stocks.emailLabel')}
                  </p>
                  <p className="text-[var(--rm-ink-muted)] mt-0.5">
                    {t('stocks.emailDesc')}
                  </p>
                </div>
              </label>

              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  {t('stocks.recipientsLabel')}
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
                  {t('stocks.defaultRecipientsHint', {
                    list:
                      alertSettings.resolvedRecipients.length > 0
                        ? alertSettings.resolvedRecipients.join(', ')
                        : t('stocks.defaultManagersFallback'),
                  })}
                </p>
              </div>
            </div>

            {/* Production SMTP Settings */}
            <div className="pt-4 border-t border-[var(--rm-border-subtle)] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-[var(--rm-ink)]">
                  {t('stocks.smtpSectionTitle')}
                </h3>
                <span
                  className={`text-[11px] font-semibold ${
                    alertSettings.envSmtpConfigured
                      ? 'text-[#14B8A6]'
                      : 'text-[var(--rm-ink-muted)]'
                  }`}
                >
                  {alertSettings.envSmtpConfigured
                    ? t('stocks.smtpEnvActiveChip')
                    : t('stocks.smtpEnvMissingChip')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.smtpHostLabel')}
                  </label>
                  <input
                    type="text"
                    value={alertSettings.smtpHost || ''}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        smtpHost: e.target.value,
                      })
                    }
                    placeholder="smtp.example.com"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.smtpPortLabel')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={65535}
                    value={alertSettings.smtpPort ?? 587}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        smtpPort: Number(e.target.value) || 587,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.smtpUserLabel')}
                  </label>
                  <input
                    type="text"
                    value={alertSettings.smtpUser || ''}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        smtpUser: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.smtpPassLabel')}
                  </label>
                  <input
                    type="password"
                    value={smtpPassInput}
                    onChange={(e) => setSmtpPassInput(e.target.value)}
                    placeholder={
                      alertSettings.smtpPassConfigured
                        ? t('stocks.smtpPassConfiguredPlaceholder')
                        : '••••••••'
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[var(--rm-ink)] mb-1">
                    {t('stocks.smtpFromLabel')}
                  </label>
                  <input
                    type="text"
                    value={alertSettings.smtpFrom || ''}
                    onChange={(e) =>
                      setAlertSettings({
                        ...alertSettings,
                        smtpFrom: e.target.value,
                      })
                    }
                    placeholder="Resto’MAX <alerts@restaurant.ci>"
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs"
                  />
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs text-[var(--rm-ink)] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(alertSettings.smtpSecure)}
                  onChange={(e) =>
                    setAlertSettings({
                      ...alertSettings,
                      smtpSecure: e.target.checked,
                    })
                  }
                />
                <span>{t('stocks.smtpSecureLabel')}</span>
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={testingSmtp}
                onClick={() => void handleTestSmtpEmail()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink)] hover:border-[#FF8738] text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 text-[#FF8738]" />
                <span>
                  {testingSmtp
                    ? t('stocks.testingSmtpBtn')
                    : t('stocks.testSmtpBtn')}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setShowAlertConfig(false)}
                className="px-4 py-2 rounded-lg border border-[var(--rm-border-input)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold cursor-pointer"
              >
                {t('common.close')}
              </button>
              <button
                type="submit"
                disabled={savingAlerts}
                className="px-4 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
              >
                {t('stocks.saveConfigBtn')}
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
                {t('stocks.nameLabel')}
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
                {t('stocks.unitLabel')}
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
                {t('stocks.initQtyLabel')}
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
                {t('stocks.thresholdLabel')}
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
                {t('stocks.supplierLabel')}
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
              {t('common.add')}
            </button>
          </form>
        )}

        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[var(--rm-surface-muted)] text-xs text-[var(--rm-ink-muted)]">
                <tr>
                  <th className="px-5 py-3 font-semibold">
                    {t('stocks.colIngredient')}
                  </th>
                  <th className="px-5 py-3 font-semibold">
                    {t('stocks.colSupplier')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('stocks.colCurrentStock')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('stocks.colMinThreshold')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('stocks.colUnitCost')}
                  </th>
                  <th className="px-5 py-3 font-semibold text-right">
                    {t('stocks.colActions')}
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
                      <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {critical && (
                            <AlertTriangle className="w-4 h-4 text-[#E05252] shrink-0" />
                          )}
                          <span>{st.name}</span>
                          {(st.usedInRecipesCount ?? 0) > 0 && (
                            <span className="text-[11px] font-semibold text-[#14B8A6]">
                              ·{' '}
                              {t('stocks.recipesBadge', {
                                count: st.usedInRecipesCount,
                              })}
                            </span>
                          )}
                        </div>
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
                            {t('stocks.notifyBtn')}
                          </button>
                        )}
                        {canWriteStocks && (
                          <button
                            type="button"
                            onClick={() => setMoveTarget(st)}
                            className="text-xs font-semibold text-[#FF8738] hover:underline cursor-pointer"
                          >
                            {t('stocks.moveBtn')}
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
              {t('stocks.recentMovementsTitle')}
            </h2>
            {movements.length === 0 ? (
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('stocks.noMovementsYet')}
              </p>
            ) : (
              <div className="space-y-2 text-xs">
                {movements.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between py-2 border-b border-[var(--rm-border-subtle)] last:border-0 gap-2"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-[var(--rm-ink)]">
                        {m.stockName}
                      </span>
                      {m.movementType === 'AUTO_ORDER' && (
                        <span className="ml-2 text-[11px] font-semibold text-[#FF8738]">
                          [{t('stocks.autoOrderBadge')}]
                        </span>
                      )}{' '}
                      ·{' '}
                      <span className="text-[var(--rm-ink-muted)]">
                        {m.reason}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 tabular-nums shrink-0">
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
              {t('stocks.recentAlertsTitle')}
            </h2>
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-[var(--rm-ink-muted)]">
                {t('stocks.noAlertsYet')}
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
                        {t(`stocks.emailStatuses.${al.emailStatus}`, {
                          defaultValue: al.emailStatus,
                        })}
                        {al.emailRecipients ? ` → ${al.emailRecipients}` : ''}
                      </span>
                      <span
                        className={
                          al.isRead
                            ? 'text-[var(--rm-ink-muted)]'
                            : 'font-semibold text-[#FF8738]'
                        }
                      >
                        {al.isRead
                          ? t('stocks.readState')
                          : t('stocks.unreadState')}
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
              {t('stocks.moveModalTitle', { name: moveTarget.name })}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('stocks.moveTypeLabel')}
              </label>
              <select
                value={moveForm.movementType}
                onChange={(e) =>
                  setMoveForm({ ...moveForm, movementType: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-sm bg-[var(--rm-surface)] text-[var(--rm-ink)]"
              >
                <option value="IN">{t('stocks.moveTypes.IN')}</option>
                <option value="OUT">{t('stocks.moveTypes.OUT')}</option>
                <option value="LOSS">{t('stocks.moveTypes.LOSS')}</option>
                <option value="INVENTORY">
                  {t('stocks.moveTypes.INVENTORY')}
                </option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('stocks.moveQtyLabel', { unit: moveTarget.unit })}
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
                {t('stocks.moveReasonLabel')}
              </label>
              <input
                type="text"
                placeholder={t('stocks.moveDefaultReason')}
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
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
              >
                {t('stocks.validateBtn')}
              </button>
            </div>
          </form>
        </div>
      )}
    </RestaurantLayout>
  );
}
