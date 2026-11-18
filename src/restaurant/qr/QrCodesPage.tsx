import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Printer, RefreshCw } from 'lucide-react';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import type { DiningTable } from '../../types';

export function QrCodesPage() {
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

  return (
    <RestaurantLayout
      title="QR Codes Tables"
      actions={
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#182333] text-white text-xs font-semibold cursor-pointer no-print"
        >
          <Printer className="w-4 h-4" />
          <span>Imprimer la planche QR</span>
        </button>
      }
    >
      <div className="space-y-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm text-[#64748B] no-print">
          Chaque table possède un QR code unique et versionné. En cas de perte ou de réimpression, régénérez le token pour révoquer immédiatement l’ancienne version.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {tables.map((tbl) => (
            <div
              key={tbl.id}
              className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col items-center text-center"
            >
              <p className="text-xs text-[#64748B]">{tbl.zone}</p>
              <h3 className="text-lg font-bold text-[#182333] mt-0.5">
                {tbl.label}
              </h3>
              <p className="text-[11px] font-mono text-[#64748B] mt-1">
                Version v{tbl.qrVersion || 1} · Actif
              </p>

              {tbl.qrToken && (
                <div className="my-5 p-3 rounded-xl border border-slate-200 bg-white">
                  <img
                    src={`/api/public/qr-image/${encodeURIComponent(tbl.qrToken)}`}
                    alt={`QR Code ${tbl.label}`}
                    className="w-40 h-40"
                  />
                </div>
              )}

              <div className="w-full flex flex-col gap-2 no-print">
                {tbl.qrToken && (
                  <Link
                    to={`/q/${tbl.qrToken}`}
                    target="_blank"
                    className="w-full py-2 rounded-lg bg-[#FF8738] hover:bg-[#F07322] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Tester le parcours client</span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => regenerate(tbl)}
                  className="w-full py-2 rounded-lg border border-slate-200 hover:border-[#182333] text-[#182333] text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Révoquer & Régénérer</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </RestaurantLayout>
  );
}
