import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { formatDateTimeFr } from '../../utils/format';
import type { AuditLog } from '../../types';

export function AuditLogPage() {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    apiFetch<{ logs: AuditLog[] }>('/api/superadmin/audit')
      .then((res) => setLogs(res.logs))
      .catch(() => {});
  }, []);

  return (
    <SuperAdminLayout title={t('superadmin.auditTitle')}>
      <div className="bg-[var(--rm-surface)] rounded-xl border border-[var(--rm-border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--rm-surface-muted)] text-[var(--rm-ink-muted)]">
              <tr>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colDate')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colActor')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colRole')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colAction')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colTarget')}
                </th>
                <th className="px-5 py-3 font-semibold">
                  {t('superadminPages.audit.colDetails')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--rm-border-subtle)]">
              {logs.map((l) => (
                <tr
                  key={l.id}
                  className="hover:bg-[var(--rm-surface-hover)] transition-colors"
                >
                  <td className="px-5 py-3 text-[var(--rm-ink-muted)] tabular-nums whitespace-nowrap">
                    {formatDateTimeFr(l.createdAt)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[var(--rm-ink)]">
                    {l.actorEmail}
                  </td>
                  <td className="px-5 py-3 font-semibold text-[var(--rm-ink)]">
                    {l.actorRole}
                  </td>
                  <td className="px-5 py-3 font-mono font-bold text-[#FF8738]">
                    {l.action}
                  </td>
                  <td className="px-5 py-3 font-mono text-[var(--rm-ink-muted)]">
                    {l.targetType}:{l.targetId}
                  </td>
                  <td className="px-5 py-3 text-[var(--rm-ink)]">
                    {l.details || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </SuperAdminLayout>
  );
}
