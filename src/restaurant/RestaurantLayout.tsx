import React, { useCallback, useState } from 'react';
import {
  BarChart3,
  CalendarClock,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LayoutGrid,
  Package,
  QrCode,
  Settings,
  UserCheck,
  Users,
  Utensils,
} from 'lucide-react';
import { AppShell, type NavItem } from '../components/AppShell';
import { useAuth } from '../app/providers/AuthProvider';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { formatTimeFr } from '../utils/format';
import type { Permission } from '../types';

const ALL_NAV: Array<NavItem & { permission: Permission }> = [
  {
    to: '/app',
    label: 'Tableau de bord',
    icon: LayoutDashboard,
    end: true,
    permission: 'dashboard:read',
  },
  {
    to: '/app/pos',
    label: 'Caisse POS',
    icon: CreditCard,
    permission: 'pos:use',
  },
  {
    to: '/app/orders',
    label: 'Commandes',
    icon: ClipboardList,
    permission: 'orders:read',
  },
  {
    to: '/app/floor',
    label: 'Salle & Tables',
    icon: LayoutGrid,
    permission: 'floor:read',
  },
  {
    to: '/app/kitchen',
    label: 'Cuisine & Bar (KDS)',
    icon: ChefHat,
    permission: 'kitchen:read',
  },
  {
    to: '/app/menu',
    label: 'Menu & Catalogue',
    icon: Utensils,
    permission: 'menu:read',
  },
  {
    to: '/app/stocks',
    label: 'Stocks & Achats',
    icon: Package,
    permission: 'stocks:read',
  },
  {
    to: '/app/staff',
    label: 'Personnel & Droits',
    icon: Users,
    permission: 'staff:read',
  },
  {
    to: '/app/customers',
    label: 'Clients & Fidélité',
    icon: UserCheck,
    permission: 'customers:read',
  },
  {
    to: '/app/reservations',
    label: 'Réservations',
    icon: CalendarClock,
    permission: 'reservations:read',
  },
  {
    to: '/app/qr',
    label: 'QR Codes Tables',
    icon: QrCode,
    permission: 'qr:read',
  },
  {
    to: '/app/finance',
    label: 'Finances & Rapports',
    icon: BarChart3,
    permission: 'finance:read',
  },
  {
    to: '/app/settings',
    label: 'Paramètres',
    icon: Settings,
    permission: 'settings:read',
  },
];

export function RestaurantLayout({
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
  const { user, can } = useAuth();
  const [alerts, setAlerts] = useState<
    Array<{ id: string; text: string; time: string }>
  >([]);

  const handleWs = useCallback(
    (msg: { type: string; payload?: unknown; timestamp?: string }) => {
      if (msg.type === 'connection:ready') return;
      const time = msg.timestamp ? formatTimeFr(msg.timestamp) : 'À l’instant';
      let text = '';
      if (msg.type === 'order:created') {
        const p = msg.payload as { orderNumber?: string; orderType?: string } | undefined;
        text = `Nouvelle commande ${p?.orderNumber || ''} (${p?.orderType === 'QR_TABLE' ? 'QR Table' : 'Salle'})`;
      } else if (msg.type === 'order:updated') {
        const p = msg.payload as { status?: string } | undefined;
        text = `Commande mise à jour : ${p?.status || ''}`;
      } else if (msg.type === 'payment:created') {
        text = 'Nouvel encaissement enregistré';
      } else if (msg.type === 'stock:alert') {
        const p = msg.payload as { name?: string } | undefined;
        text = `Alerte stock critique : ${p?.name || ''}`;
      }
      if (text) {
        setAlerts((prev) => [
          { id: `${Date.now()}-${Math.random()}`, text, time },
          ...prev.slice(0, 14),
        ]);
      }
      if (onRealtimeEvent) {
        onRealtimeEvent(msg.type);
      }
    },
    [onRealtimeEvent],
  );

  useWebSocketRoom(
    user?.restaurantId ? `restaurant:${user.restaurantId}` : null,
    handleWs,
  );

  const visibleNav = ALL_NAV.filter((item) => can(item.permission));

  return (
    <AppShell
      title={title}
      breadcrumb={`Resto’MAX / ${user?.restaurantName || 'Établissement'}`}
      navItems={visibleNav}
      alerts={alerts}
      actions={actions}
    >
      {children}
    </AppShell>
  );
}
