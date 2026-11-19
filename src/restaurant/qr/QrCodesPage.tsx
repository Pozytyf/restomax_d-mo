import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Copy, ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import type { DiningTable } from '../../types';

export function QrCodesPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);

  const load = useCallback(() => {
    apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables')
      .then((res) => setTables(res.tables))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const regenerate = async (table: DiningTable) => {
    try {
      const res = await apiFetch<{ token: string; version: number }>(
        `/api/restaurant/tables/${table.id}/qr-regenerate`,
        { method: 'POST' },
      );
      notify(
        `QR Code de ${table.label} régénéré (v${res.version}). L’ancien QR est révoqué.`,
        'success',
      );
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const copyLink = async (table: DiningTable) => {
    if (!table.qrToken) return;
    const url = `${window.location.origin}/q/${encodeURIComponent(table.qrToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      notify(`Lien QR de ${table.label} copié.`, 'success');
    } catch {
      notify(url, 'info');
    }
  };

  return (
    <RestaurantLayout
      title={t('pages.qrTitle')}
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#182333] dark:bg-[#223044] hover:bg-[#223044] dark:hover:bg-[#2D4059] dark:border dark:border-[var(--rm-border)] text-white text-xs font-semibold cursor-pointer no-print"
        >
          <Printer className="w-4 h-4" />
          <span>{t('pages.printQrSheetBtn')}</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 text-sm text-[var(--rm-ink-muted)] no-print">
          Chaque table possède un QR code unique et versionné relié directement au menu client. En cas de perte ou de réimpression, régénérez le token pour révoquer immédiatement l’ancienne version.
        </div>

        {tables.length === 0 ? (
          <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-10 text-center space-y-3">
            <p className="text-sm font-semibold text-[var(--rm-ink)]">
              Aucune table configurée pour le moment.
            </p>
            <p className="text-xs text-[var(--rm-ink-muted)]">
              Créez vos premières tables dans Salle & Tables pour générer automatiquement leurs QR codes.
            </p>
            <Link
              to="/app/floor"
              className="inline-flex items-center px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold"
            >
              Configurer les tables
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tables.map((tbl) => (
              <div
                key={tbl.id}
                className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-6 flex flex-col items-center text-center"
              >
                <p className="text-xs text-[var(--rm-ink-muted)]">{tbl.zone}</p>
                <h3 className="text-lg font-bold text-[var(--rm-ink)] mt-0.5">
                  {tbl.label}
                </h3>
                <p className="text-[11px] font-mono text-[var(--rm-ink-muted)] mt-1">
                  Version v{tbl.qrVersion || 1} · Actif
                </p>

                {tbl.qrToken && (
                  <div className="my-5 p-3 rounded-xl border border-slate-200 bg-white">
                    <img
                      src={`/api/public/qr-image/${encodeURIComponent(tbl.qrToken)}`}
                      alt={`QR Code ${tbl.label}`}
                      className="w-40 h-40"
                    />
                    <p className="mt-2 text-[10px] font-mono text-[#64748B] break-all max-w-[180px]">
                      /q/{tbl.qrToken}
                    </p>
                  </div>
                )}

                <div className="w-full flex flex-col gap-2 no-print">
                  {tbl.qrToken && (
                    <>
                      <Link
                        to={`/q/${encodeURIComponent(tbl.qrToken)}`}
                        target="_blank"
                        className="w-full py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Tester le parcours client</span>
                      </Link>
                      <button
                        type="button"
                        onClick={() => copyLink(tbl)}
                        className="w-full py-2 rounded-lg border border-[var(--rm-border)] hover:border-[#FF8738] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le lien menu</span>
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => regenerate(tbl)}
                    className="w-full py-2 rounded-lg border border-[var(--rm-border)] hover:border-[var(--rm-border-input)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Révoquer & Régénérer</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </RestaurantLayout>
  );
}
