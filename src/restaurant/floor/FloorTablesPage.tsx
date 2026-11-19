import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, QrCode, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { RestaurantLayout } from '../RestaurantLayout';
import { apiFetch } from '../../services/api';
import { useToast } from '../../components/Toast';
import { formatFcfa } from '../../utils/format';
import type { DiningTable } from '../../types';

export function FloorTablesPage() {
  const { t } = useTranslation();
  const { notify } = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    zone: 'Terrasse Lagune',
    label: '',
    capacity: 4,
  });

  const load = useCallback(() => {
    apiFetch<{ tables: DiningTable[] }>('/api/restaurant/tables')
      .then((res) => setTables(res.tables))
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/api/restaurant/tables', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      notify(t('floor.tableCreatedToast'), 'success');
      setForm({ zone: 'Terrasse Lagune', label: '', capacity: 4 });
      setShowAdd(false);
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const setStatus = async (id: string, status: string) => {
    try {
      await apiFetch(`/api/restaurant/tables/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      load();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Erreur.', 'error');
    }
  };

  const zones = Array.from(new Set(tables.map((tbl) => tbl.zone)));

  return (
    <RestaurantLayout
      title={t('floor.title')}
      onRealtimeEvent={load}
      actions={
        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#FF8738] text-white text-xs font-semibold cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('floor.newTable')}</span>
        </button>
      }
    >
      <div className="space-y-6">
        {showAdd && (
          <form
            onSubmit={handleCreate}
            className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 grid grid-cols-1 sm:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('floor.zoneLabel')}
              </label>
              <input
                required
                type="text"
                value={form.zone}
                onChange={(e) => setForm({ ...form, zone: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('floor.tableNameLabel')}
              </label>
              <input
                required
                type="text"
                placeholder={t('floor.tablePlaceholder')}
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-[var(--rm-border-input)] bg-[var(--rm-surface)] text-[var(--rm-ink)] placeholder:text-[var(--rm-ink-muted)] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--rm-ink)] mb-1">
                {t('floor.capacityLabel')}
              </label>
              <input
                required
                type="number"
                min={1}
                max={24}
                value={form.capacity}
                onChange={(e) =>
                  setForm({ ...form, capacity: Number(e.target.value) || 4 })
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

        {zones.map((zone) => (
          <div key={zone} className="space-y-3">
            <h2 className="text-sm font-bold text-[var(--rm-ink)]">{zone}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables
                .filter((tbl) => tbl.zone === zone)
                .map((tbl) => (
                  <div
                    key={tbl.id}
                    className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] p-5 flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="text-base font-bold text-[var(--rm-ink)]">
                          {tbl.label}
                        </h3>
                        <p className="text-xs text-[var(--rm-ink-muted)] flex items-center gap-1 mt-1">
                          <Users className="w-3.5 h-3.5" />
                          <span>
                            {t('floor.seatsCount', { count: tbl.capacity })}
                          </span>
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold ${
                          tbl.status === 'OCCUPIED'
                            ? 'text-[#FF8738]'
                            : tbl.status === 'RESERVED'
                              ? 'text-[#E5A32A]'
                              : 'text-[#14B8A6]'
                        }`}
                      >
                        {t(`floor.statuses.${tbl.status}`)}
                      </span>
                    </div>

                    {tbl.activeOrderTotalXof ? (
                      <div className="p-3 rounded-lg bg-[var(--rm-surface-muted)] text-xs flex justify-between">
                        <span className="text-[var(--rm-ink-muted)]">
                          {t('floor.activeTab')}
                        </span>
                        <span className="font-bold text-[var(--rm-ink)] tabular-nums">
                          {formatFcfa(tbl.activeOrderTotalXof)}
                        </span>
                      </div>
                    ) : null}

                    {tbl.qrToken && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--rm-ink-muted)] font-mono truncate">
                          QR v{tbl.qrVersion || 1}
                        </span>
                        <Link
                          to={`/q/${encodeURIComponent(tbl.qrToken)}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 font-semibold text-[#FF8738] hover:underline"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          <span>{t('floor.openQrMenu')}</span>
                        </Link>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-[var(--rm-border-subtle)]">
                      {(['AVAILABLE', 'OCCUPIED', 'RESERVED'] as const).map(
                        (st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatus(tbl.id, st)}
                            className={`flex-1 py-1.5 rounded text-[11px] font-semibold cursor-pointer transition-colors ${
                              tbl.status === st
                                ? 'bg-[#182333] dark:bg-[#FF8738] text-white'
                                : 'bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)]'
                            }`}
                          >
                            {t(`floor.statuses.${st}`)}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>
    </RestaurantLayout>
  );
}
