import React, { useCallback, useEffect, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { AppShell, type NavItem, type ShellAlert } from '../components/AppShell';
import { useAuth } from '../app/providers/AuthProvider';
import { useRestaurantTheme } from '../app/hooks/useRestaurantTheme';
import { useWebSocketRoom } from '../hooks/useWebSocket';
import { apiFetch } from '../services/api';
import { formatTimeFr, getOrderStatusLabel } from '../utils/format';
import type { Permission, RestaurantNotification } from '../types';

const ALL_NAV: Array<{
  to: string;
  labelKey: string;
  icon: NavItem['icon'];
  end?: boolean;
  permission: Permission;
}> = [
  {
    to: '/app',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
    end: true,
    permission: 'dashboard:read',
  },
  {
    to: '/app/pos',
    labelKey: 'nav.pos',
    icon: CreditCard,
    permission: 'pos:use',
  },
  {
    to: '/app/orders',
    labelKey: 'nav.orders',
    icon: ClipboardList,
    permission: 'orders:read',
  },
  {
    to: '/app/floor',
    labelKey: 'nav.floor',
    icon: LayoutGrid,
    permission: 'floor:read',
  },
  {
    to: '/app/kitchen',
    labelKey: 'nav.kitchen',
    icon: ChefHat,
    permission: 'kitchen:read',
  },
  {
    to: '/app/menu',
    labelKey: 'nav.menu',
    icon: Utensils,
    permission: 'menu:read',
  },
  {
    to: '/app/stocks',
    labelKey: 'nav.stocks',
    icon: Package,
    permission: 'stocks:read',
  },
  {
    to: '/app/staff',
    labelKey: 'nav.staff',
    icon: Users,
    permission: 'staff:read',
  },
  {
    to: '/app/customers',
    labelKey: 'nav.customers',
    icon: UserCheck,
    permission: 'customers:read',
  },
  {
    to: '/app/reservations',
    labelKey: 'nav.reservations',
    icon: CalendarClock,
    permission: 'reservations:read',
  },
  {
    to: '/app/qr',
    labelKey: 'nav.qr',
    icon: QrCode,
    permission: 'qr:read',
  },
  {
    to: '/app/finance',
    labelKey: 'nav.finance',
    icon: BarChart3,
    permission: 'finance:read',
  },
  {
    to: '/app/settings',
    labelKey: 'nav.settings',
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
  const { t } = useTranslation();
  const { user, can } = useAuth();
  const { theme, toggleTheme } = useRestaurantTheme();
  const [liveAlerts, setLiveAlerts] = useState<ShellAlert[]>([]);
  const [dbNotifications, setDbNotifications] = useState<
    RestaurantNotification[]
  >([]);

  const loadNotifications = useCallback(() => {
    if (!user?.restaurantId) return;
    apiFetch<{ notifications: RestaurantNotification[] }>(
      '/api/restaurant/notifications',
    )
      .then((res) => setDbNotifications(res.notifications))
      .catch(() => {});
  }, [user?.restaurantId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleWs = useCallback(
    (msg: { type: string; payload?: unknown; timestamp?: string }) => {
      if (msg.type === 'connection:ready') return;
      const time = msg.timestamp
        ? formatTimeFr(msg.timestamp)
        : t('alerts.justNow');
      let text = '';
      if (msg.type === 'order:created') {
        const p = msg.payload as
          | { orderNumber?: string; orderType?: string }
          | undefined;
        text = t('alerts.newOrder', {
          orderNumber: p?.orderNumber || '',
          channel:
            p?.orderType === 'QR_TABLE'
              ? t('common.qrTable')
              : t('common.dineIn'),
        });
      } else if (msg.type === 'order:updated') {
        const p = msg.payload as { status?: string } | undefined;
        text = t('alerts.orderUpdated', {
          status: p?.status ? getOrderStatusLabel(p.status) : '',
        });
      } else if (msg.type === 'payment:created') {
        text = t('alerts.paymentCreated');
      } else if (
        msg.type === 'stock:alert' ||
        msg.type === 'notifications:updated'
      ) {
        loadNotifications();
      }
      if (text) {
        setLiveAlerts((prev) => [
          { id: `${Date.now()}-${Math.random()}`, text, time, read: false },
          ...prev.slice(0, 10),
        ]);
      }
      if (onRealtimeEvent) {
        onRealtimeEvent(msg.type);
      }
    },
    [loadNotifications, onRealtimeEvent, t],
  );

  useWebSocketRoom(
    user?.restaurantId ? `restaurant:${user.restaurantId}` : null,
    handleWs,
  );

  const handleMarkAllRead = async () => {
    setLiveAlerts((prev) => prev.map((a) => ({ ...a, read: true })));
    try {
      await apiFetch('/api/restaurant/notifications/read', {
        method: 'PATCH',
        body: JSON.stringify({ all: true }),
      });
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const handleMarkOneRead = async (id: string) => {
    try {
      await apiFetch('/api/restaurant/notifications/read', {
        method: 'PATCH',
        body: JSON.stringify({ id }),
      });
      loadNotifications();
    } catch {
      // ignore
    }
  };

  const persistentAlerts: ShellAlert[] = dbNotifications.map((n) => ({
    id: n.id,
    text: n.title,
    subtitle: n.message,
    time: formatTimeFr(n.createdAt),
    read: n.isRead,
    persistent: true,
  }));

  const mergedAlerts = [...persistentAlerts, ...liveAlerts].slice(0, 20);
  const unreadCount = mergedAlerts.filter((a) => !a.read).length;

  const visibleNav: NavItem[] = ALL_NAV.filter((item) =>
    can(item.permission),
  ).map((item) => ({
    to: item.to,
    label: t(item.labelKey),
    icon: item.icon,
    end: item.end,
  }));

  return (
    <AppShell
      title={title}
      breadcrumb={`${t('common.brand')} / ${user?.restaurantName || t('header.venueFallback')}`}
      navItems={visibleNav}
      alerts={mergedAlerts}
      unreadCount={unreadCount}
      onMarkAllRead={handleMarkAllRead}
      onMarkRead={handleMarkOneRead}
      actions={actions}
      themeToggle={{ theme, onToggle: toggleTheme }}
    >
      {children}
    </AppShell>
  );
}
