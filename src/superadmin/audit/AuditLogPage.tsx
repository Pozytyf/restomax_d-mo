import { useEffect, useState } from 'react';
import { SuperAdminLayout } from '../SuperAdminLayout';
import { apiFetch } from '../../services/api';
import { formatDateTimeFr } from '../../utils/format';
import type { AuditLog } from '../../types';

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    apiFetch<{ logs: AuditLog[] }>('/api/superadmin/audit')
      .then((res) => setLogs(res.logs))
      .catch(() => {});
  }, []);

  return (
    <SuperAdminLayout title="Journal d’audit & sécurité">
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F5F7FA] text-[#64748B]">
              <tr>
                <th className="px-5 py-3 font-semibold">Date & heure</th>
                <th className="px-5 py-3 font-semibold">Acteur</th>
                <th className="px-5 py-3 font-semibold">Rôle</th>
                <th className="px-5 py-3 font-semibold">Action</th>
                <th className="px-5 py-3 font-semibold">Cible</th>
                <th className="px-5 py-3 font-semibold">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-5 py-3 text-[#64748B] tabular-nums whitespace-nowrap">
                    {formatDateTimeFr(l.createdAt)}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#182333]">
                    {l.actorEmail}
                  </td>
                  <td className="px-5 py-3 font-semibold">{l.actorRole}</td>
                  <td className="px-5 py-3 font-mono font-bold text-[#FF8738]">
                    {l.action}
                  </td>
                  <td className="px-5 py-3 font-mono text-[#64748B]">
                    {l.targetType}:{l.targetId}
                  </td>
                  <td className="px-5 py-3 text-[#182333]">
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
