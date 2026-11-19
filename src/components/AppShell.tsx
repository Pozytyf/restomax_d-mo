import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useAuth } from '../app/providers/AuthProvider';
import { getRoleLabel } from '../utils/format';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export interface ShellAlert {
  id: string;
  text: string;
  subtitle?: string;
  time: string;
  read?: boolean;
  persistent?: boolean;
}

export interface ThemeToggleConfig {
  theme: 'light' | 'dark';
  onToggle: () => void;
}

export function AppShell({
  title,
  breadcrumb,
  navItems,
  alerts = [],
  unreadCount,
  onMarkAllRead,
  onMarkRead,
  actions,
  themeToggle,
  children,
}: {
  title: string;
  breadcrumb: string;
  navItems: NavItem[];
  alerts?: ShellAlert[];
  unreadCount?: number;
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
  actions?: React.ReactNode;
  themeToggle?: ThemeToggleConfig;
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const badgeCount =
    typeof unreadCount === 'number'
      ? unreadCount
      : alerts.filter((a) => !a.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/connexion');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[var(--rm-sidebar)] text-white transition-colors duration-200">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center">
          <BrandLogo theme="dark" />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-2 text-white/70 hover:text-white"
          aria-label={t('header.closeMenu')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {user?.restaurantName && (
        <div className="px-5 py-3.5 border-b border-white/10">
          <p className="text-xs text-slate-400">{t('header.activeVenue')}</p>
          <p className="text-sm font-semibold text-white truncate mt-0.5">
            {user.restaurantName}
          </p>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setDrawerOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-[#FF8738] text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#223044] border border-white/15 flex items-center justify-center text-xs font-bold text-[#FF8738] shrink-0">
            {user?.fullName?.slice(0, 2).toUpperCase() || 'RM'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">
              {user?.fullName}
            </p>
            <p className="text-xs text-slate-400 truncate">
              {user ? getRoleLabel(user.role) : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>{t('header.logout')}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--rm-canvas)] text-[var(--rm-ink)] flex transition-colors duration-200">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[var(--rm-sidebar-border)]">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile / Tablet Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-[#182333]/60 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
          />
          <aside className="relative w-72 max-w-[85vw] h-full z-10 shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 bg-[var(--rm-surface)] border-b border-[var(--rm-border)] px-4 sm:px-6 flex items-center justify-between gap-4 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)]"
              aria-label={t('header.openNav')}
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[var(--rm-ink-muted)] truncate">
                {breadcrumb}
              </p>
              <h1 className="text-base sm:text-lg font-bold text-[var(--rm-ink)] truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {actions}
            <LanguageSwitcher variant="app" />
            {themeToggle && (
              <button
                type="button"
                onClick={themeToggle.onToggle}
                aria-label={
                  themeToggle.theme === 'dark'
                    ? t('header.enableLightMode')
                    : t('header.enableDarkMode')
                }
                aria-pressed={themeToggle.theme === 'dark'}
                data-testid="restaurant-theme-toggle"
                className="inline-flex items-center gap-1.5 min-h-[36px] px-2.5 sm:px-3 rounded-lg border border-[var(--rm-border)] bg-[var(--rm-surface-muted)] text-xs font-semibold text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] transition-colors cursor-pointer whitespace-nowrap"
              >
                {themeToggle.theme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-[#FF8738] shrink-0" />
                    <span className="hidden sm:inline">
                      {t('header.lightMode')}
                    </span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[var(--rm-ink-muted)] shrink-0" />
                    <span className="hidden sm:inline">
                      {t('header.darkMode')}
                    </span>
                  </>
                )}
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg border border-[var(--rm-border)] text-[var(--rm-ink)] hover:bg-[var(--rm-surface-hover)] cursor-pointer transition-colors"
                aria-label={t('header.notifications')}
              >
                <Bell className="w-4 h-4" />
                {badgeCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8738] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {badgeCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[var(--rm-surface)] border border-[var(--rm-border)] rounded-xl shadow-lg p-3 z-40">
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--rm-border-subtle)]">
                    <span className="text-xs font-semibold text-[var(--rm-ink)]">
                      {t('header.alertsTitle')}
                    </span>
                    <div className="flex items-center gap-3">
                      {onMarkAllRead && badgeCount > 0 && (
                        <button
                          type="button"
                          onClick={onMarkAllRead}
                          className="text-[11px] font-semibold text-[#FF8738] hover:underline cursor-pointer"
                        >
                          {t('header.markAllRead')}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setNotifOpen(false)}
                        className="text-xs text-[var(--rm-ink-muted)] hover:text-[var(--rm-ink)] cursor-pointer"
                      >
                        {t('common.close')}
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="text-xs text-[var(--rm-ink-muted)] py-3 text-center">
                        {t('header.noAlerts')}
                      </p>
                    ) : (
                      alerts.map((a) => (
                        <div
                          key={a.id}
                          onClick={() => {
                            if (a.persistent && !a.read && onMarkRead) {
                              onMarkRead(a.id);
                            }
                          }}
                          className={`text-xs p-2.5 rounded-lg border transition-colors ${
                            a.read
                              ? 'bg-[var(--rm-surface-muted)] border-transparent text-[var(--rm-ink-muted)]'
                              : 'bg-orange-50/60 dark:bg-[#FF8738]/12 border-orange-200/80 dark:border-[#FF8738]/35 text-[var(--rm-ink)]'
                          } ${a.persistent && !a.read ? 'cursor-pointer' : ''}`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-semibold">{a.text}</p>
                            {!a.read && (
                              <span className="w-2 h-2 rounded-full bg-[#FF8738] shrink-0 mt-1" />
                            )}
                          </div>
                          {a.subtitle && (
                            <p className="text-[11px] text-[var(--rm-ink-muted)] mt-0.5">
                              {a.subtitle}
                            </p>
                          )}
                          <p className="text-[11px] text-[var(--rm-ink-muted)] mt-1">
                            {a.time}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
