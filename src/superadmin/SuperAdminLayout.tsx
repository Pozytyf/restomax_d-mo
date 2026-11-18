import React, { useCallback, useState } from 'react';
import {
  Activity,
  CreditCard,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Receipt,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import { AppShell, type NavItem } from '../components/AppShell';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { formatTimeFr } from '../utils/format';

const SUPERADMIN_NAV: NavItem[] = [
  { to: '/superadmin', label: 'Vue Globale', icon: LayoutDashboard, end: true },
  { to: '/superadmin/restaurants', label: 'Restaurants clients', icon: Store },
  { to: '/superadmin/subscriptions', label: 'Plans & Abonnements', icon: CreditCard },
  { to: '/superadmin/billing', label: 'Facturation SaaS', icon: Receipt },
  { to: '/superadmin/users', label: 'Utilisateurs', icon: Users },
  { to: '/superadmin/support', label: 'Support & Leads', icon: LifeBuoy },
  { to: '/superadmin/audit', label: 'Journal d’audit', icon: FileText },
  { to: '/superadmin/settings', label: 'Paramètres', icon: Settings },
];

export function SuperAdminLayout({
  title,
  actions,
  onRealtimeEvent,
  children,
}: {
  title: string;
  actions?: React.ReactNode;
  onRealtimeEvent?: (eventType: string) => void;
  children: React.ReactNode;
}) {
  const [alerts, setAlerts] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);

  const handleWs = useCallback(
    (msg: { type: string; timestamp?: string }) => {
      if (msg.type === 'connection:ready') return;
      setAlerts((prev) => [
        {
          id: `${Date.now()}`,
          text: `Événement plateforme : ${msg.type}`,
          time: msg.timestamp ? formatTimeFr(msg.timestamp) : 'À l’instant',
        },
        ...prev.slice(0, 10),
      ]);
      if (onRealtimeEvent) onRealtimeEvent(msg.type);
    },
    [onRealtimeEvent],
  );

  useWebSocketRoom('superadmin', handleWs);

  return (
    <AppShell
      title={title}
      breadcrumb="Resto’MAX / Portail Super-admin"
      navItems={SUPERADMIN_NAV}
      alerts={alerts}
      actions={
        actions || (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#14B8A6]">
            <Activity className="w-3.5 h-3.5" />
            <span>Plateforme opérationnelle</span>
          </span>
        )
      }
    >
      {children}
    </AppShell>
  );
}
