import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatDateFr, formatFcfa } from '../../utils/format';
import type { ThermalPrintResponse } from '../../utils/thermalPrint';
import type { PrinterSettings, Restaurant } from '../../types';

const DEFAULT_PRINTER: PrinterSettings = {
  paperWidth: '80mm',
  connectionType: 'BROWSER',
  printerHost: '',
  printerPort: 9100,
  autoPrintReceipt: false,
  autoPrintKitchenTicket: false,
};

export function SettingsPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [resto, setResto] = useState<Restaurant | null>(null);
  const [printer, setPrinter] = useState<PrinterSettings>(DEFAULT_PRINTER);
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
  const [testingPrint, setTestingPrint] = useState(false);
  const [testPreview, setTestPreview] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([
      apiFetch<{ restaurant: Restaurant; subscription: typeof sub }>(
        '/api/restaurant/settings',
      ),
      apiFetch<{ tickets: typeof tickets }>('/api/restaurant/tickets'),
    ])
      .then(([s, tk]) => {
        setResto(s.restaurant);
        setPrinter({
          ...DEFAULT_PRINTER,
          ...(s.restaurant.printerSettings || {}),
        });
        setSub(s.subscription);
        setTickets(tk.tickets);
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
          printerSettings: printer,
          ...paydunyaKeys,
        }),
      });
      notify(t('settings.savedToast'), 'success');
      setPaydunyaKeys({
        paydunyaPublicKey: '',
        paydunyaPrivateKey: '',
        paydunyaToken: '',
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
    }
  };

  const handleTestPrinter = async () => {
    if (!resto) return;
    setTestingPrint(true);
    try {
      await apiFetch('/api/restaurant/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          printerSettings: printer,
        }),
      });
      const res = await apiFetch<ThermalPrintResponse>(
        '/api/restaurant/print/escpos',
        {
          method: 'POST',
          body: JSON.stringify({
            kind: 'RECEIPT',
            orderNumber: 'TEST-ESCPOS',
            totalXof: 12500,
            paidAmountXof: 12500,
            paymentMethod: 'WAVE',
            paymentReference: 'TEST-PRINTER-OK',
            items: [
              {
                name: 'Poisson Braisé Lagune',
                quantity: 1,
                lineTotalXof: 9500,
              },
              {
                name: 'Bissap Frais',
                quantity: 2,
                lineTotalXof: 3000,
              },
            ],
          }),
        },
      );
      setTestPreview(res.previewText);
      if (res.mode === 'NETWORK_ESCPOS' && res.networkResult && !res.networkResult.ok) {
        notify(
          res.networkResult.error || t('pos.thermalPrintError'),
          'info',
        );
      } else {
        notify(t('settings.testPrinterOk', { mode: res.mode }), 'success');
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : t('pos.thermalPrintError'),
        'error',
      );
    } finally {
      setTestingPrint(false);
    }
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/tickets', {
        method: 'POST',
        body: JSON.stringify(ticketForm),
      });
      notify(t('settings.ticketSentToast'), 'success');
      setTicketForm({
        subject: '',
        category: 'Technique',
        priority: 'MEDIUM',
        message: '',
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : t('menu.errorGeneric'), 'error');
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
              {t('settings.profileSectionTitle')}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                  {t('settings.nameLabel')}
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
                  {t('settings.phoneLabel')}
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
                  {t('settings.hoursLabel')}
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
                  {t('settings.vatRateLabel')}
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
                    {t('settings.paydunyaTitle')}
                  </h3>
                  <p className="text-xs text-[var(--rm-ink-muted)]">
                    {t('settings.paydunyaDesc')}
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
                  <option value="TEST">{t('settings.testMode')}</option>
                  <option value="LIVE">{t('settings.liveMode')}</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="password"
                  placeholder={t('settings.paydunyaPublicPlaceholder')}
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
                  placeholder={t('settings.paydunyaPrivatePlaceholder')}
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
                  placeholder={t('settings.paydunyaTokenPlaceholder')}
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

            {/* Dedicated ESC/POS Thermal Printer Section */}
            <div className="pt-4 border-t border-[var(--rm-border)] space-y-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--rm-ink)]">
                  {t('settings.printerSectionTitle')}
                </h3>
                <p className="text-xs text-[var(--rm-ink-muted)]">
                  {t('settings.printerSectionDesc')}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                    {t('settings.printerModeLabel')}
                  </label>
                  <select
                    value={printer.connectionType}
                    onChange={(e) =>
                      setPrinter({
                        ...printer,
                        connectionType: e.target
                          .value as PrinterSettings['connectionType'],
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-xs bg-[var(--rm-surface)] text-[var(--rm-ink)]"
                  >
                    <option value="BROWSER">
                      {t('settings.printerModeBrowser')}
                    </option>
                    <option value="NETWORK_ESCPOS">
                      {t('settings.printerModeNetwork')}
                    </option>
                    <option value="WEB_SERIAL">
                      {t('settings.printerModeUsb')}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                    {t('settings.paperWidthLabel')}
                  </label>
                  <select
                    value={printer.paperWidth}
                    onChange={(e) =>
                      setPrinter({
                        ...printer,
                        paperWidth: e.target.value as '58mm' | '80mm',
                      })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] text-xs bg-[var(--rm-surface)] text-[var(--rm-ink)]"
                  >
                    <option value="80mm">80mm (42 col.)</option>
                    <option value="58mm">58mm (32 col.)</option>
                  </select>
                </div>

                {printer.connectionType === 'NETWORK_ESCPOS' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                        {t('settings.printerHostLabel')}
                      </label>
                      <input
                        type="text"
                        placeholder="192.168.1.100"
                        value={printer.printerHost}
                        onChange={(e) =>
                          setPrinter({
                            ...printer,
                            printerHost: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                        {t('settings.printerPortLabel')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={65535}
                        value={printer.printerPort}
                        onChange={(e) =>
                          setPrinter({
                            ...printer,
                            printerPort: Number(e.target.value) || 9100,
                          })
                        }
                        className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-xs font-mono tabular-nums"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 text-xs text-[var(--rm-ink)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printer.autoPrintReceipt}
                    onChange={(e) =>
                      setPrinter({
                        ...printer,
                        autoPrintReceipt: e.target.checked,
                      })
                    }
                  />
                  <span>{t('settings.autoPrintReceiptLabel')}</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-[var(--rm-ink)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={printer.autoPrintKitchenTicket}
                    onChange={(e) =>
                      setPrinter({
                        ...printer,
                        autoPrintKitchenTicket: e.target.checked,
                      })
                    }
                  />
                  <span>{t('settings.autoPrintKitchenLabel')}</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button
                  type="button"
                  disabled={testingPrint}
                  onClick={() => void handleTestPrinter()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink)] hover:border-[#FF8738] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  <Printer className="w-3.5 h-3.5 text-[#FF8738]" />
                  <span>
                    {testingPrint
                      ? t('settings.testingPrinterBtn')
                      : t('settings.testPrinterBtn')}
                  </span>
                </button>
              </div>

              {testPreview && (
                <div className="p-3.5 rounded-xl bg-[var(--rm-surface-muted)] border border-[var(--rm-border)] space-y-1.5">
                  <p className="text-[11px] font-semibold text-[var(--rm-ink-muted)]">
                    {t('settings.testPrinterPreviewTitle', {
                      width: printer.paperWidth,
                    })}
                  </p>
                  <pre className="text-[11px] font-mono text-[var(--rm-ink)] whitespace-pre-wrap leading-relaxed overflow-x-auto">
                    {testPreview}
                  </pre>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold cursor-pointer"
            >
              {t('settings.saveSettingsBtn')}
            </button>
          </form>

          <div className="lg:col-span-5 space-y-6">
            {sub && (
              <div className="bg-[#182333] dark:bg-[var(--rm-surface)] dark:border dark:border-[var(--rm-border)] text-white dark:text-[var(--rm-ink)] rounded-xl p-6 space-y-2">
                <p className="text-xs text-[#FF8738] font-semibold">
                  {t('settings.saasSubTitle')}
                </p>
                <h3 className="text-xl font-bold">{sub.planName}</h3>
                <p className="text-sm text-slate-300 dark:text-[var(--rm-ink-muted)] tabular-nums">
                  {t('settings.perMonthStatus', {
                    amount: formatFcfa(sub.priceMonthlyXof),
                    status: sub.status,
                  })}
                </p>
                <p className="text-xs text-slate-400 dark:text-[var(--rm-ink-muted)]">
                  {t('settings.currentPeriodEnd', {
                    date: formatDateFr(sub.currentPeriodEnd),
                  })}
                </p>
              </div>
            )}

            <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 space-y-4">
              <h3 className="text-base font-bold text-[var(--rm-ink)]">
                {t('settings.supportSectionTitle')}
              </h3>
              <form onSubmit={createTicket} className="space-y-3">
                <input
                  required
                  type="text"
                  placeholder={t('settings.ticketSubjectPlaceholder')}
                  value={ticketForm.subject}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, subject: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-xs"
                />
                <textarea
                  required
                  rows={3}
                  placeholder={t('settings.ticketMessagePlaceholder')}
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
                  {t('settings.openTicketBtn')}
                </button>
              </form>

              {tickets.length > 0 && (
                <div className="pt-3 border-t border-[var(--rm-border-subtle)] space-y-2">
                  <p className="text-xs font-semibold text-[var(--rm-ink-muted)]">
                    {t('settings.recentTicketsTitle')}
                  </p>
                  {tickets.map((tk) => (
                    <div
                      key={tk.id}
                      className="text-xs flex justify-between py-1"
                    >
                      <span className="truncate font-medium text-[var(--rm-ink)]">
                        {tk.subject}
                      </span>
                      <span className="text-[#FF8738] font-semibold shrink-0 ml-2">
                        {tk.status}
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
