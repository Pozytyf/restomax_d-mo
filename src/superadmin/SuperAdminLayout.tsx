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
import { useTranslation } from 'react-i18next';
import { AppShell, type NavItem } from '../components/AppShell';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { formatTimeFr } from '../utils/format';

const SUPERADMIN_NAV_DEF: Array<{
  to: string;
  labelKey: string;
  icon: NavItem['icon'];
  end?: boolean;
}> = [
  { to: '/superadmin', labelKey: 'nav.saOverview', icon: LayoutDashboard, end: true },
  { to: '/superadmin/restaurants', labelKey: 'nav.saRestaurants', icon: Store },
  { to: '/superadmin/subscriptions', labelKey: 'nav.saSubscriptions', icon: CreditCard },
  { to: '/superadmin/billing', labelKey: 'nav.saBilling', icon: Receipt },
  { to: '/superadmin/users', labelKey: 'nav.saUsers', icon: Users },
  { to: '/superadmin/support', labelKey: 'nav.saSupport', icon: LifeBuoy },
  { to: '/superadmin/audit', labelKey: 'nav.saAudit', icon: FileText },
  { to: '/superadmin/settings', labelKey: 'nav.saSettings', icon: Settings },
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
  const { t } = useTranslation();
  const [alerts, setAlerts] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);

  const handleWs = useCallback(
    (msg: { type: string; timestamp?: string }) => {
      if (msg.type === 'connection:ready') return;
      setAlerts((prev) => [
        {
          id: `${Date.now()}`,
          text: t('alerts.platformEvent', { type: msg.type }),
          time: msg.timestamp ? formatTimeFr(msg.timestamp) : t('alerts.justNow'),
        },
        ...prev.slice(0, 10),
      ]);
      if (onRealtimeEvent) onRealtimeEvent(msg.type);
    },
    [onRealtimeEvent, t],
  );

  useWebSocketRoom('superadmin', handleWs);

  const navItems: NavItem[] = SUPERADMIN_NAV_DEF.map((item) => ({
    to: item.to,
    label: t(item.labelKey),
    icon: item.icon,
    end: item.end,
  }));

  return (
    <AppShell
      title={title}
      breadcrumb={t('superadmin.breadcrumb')}
      navItems={navItems}
      alerts={alerts}
      actions={
        actions || (
          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-[#14B8A6]">
            <Activity className="w-3.5 h-3.5" />
            <span>{t('superadmin.platformOperational')}</span>
          </span>
        )
      }
    >
      {children}
    </AppShell>
  );
}
