import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { useAuth } from '../app/providers/AuthProvider';
import { ROLE_LABELS } from '../utils/format';

export interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

export function AppShell({
  title,
  breadcrumb,
  navItems,
  alerts = [],
  actions,
  children,
}: {
  title: string;
  breadcrumb: string;
  navItems: NavItem[];
  alerts?: Array<{ id: string; text: string; time: string }>;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/connexion');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#182333] text-white">
      <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
        <Link to="/" className="flex items-center">
          <BrandLogo theme="dark" />
        </Link>
        <button
          type="button"
          onClick={() => setDrawerOpen(false)}
          className="lg:hidden p-2 text-white/70 hover:text-white"
          aria-label="Fermer le menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {user?.restaurantName && (
        <div className="px-5 py-3.5 border-b border-white/10">
          <p className="text-xs text-slate-400">Établissement actif</p>
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
              {user ? ROLE_LABELS[user.role] || user.role : ''}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-200 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Déconnexion</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 border-r border-[#182333]">
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
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-lg text-[#182333] hover:bg-slate-100"
              aria-label="Ouvrir la navigation"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-xs text-[#64748B] truncate">{breadcrumb}</p>
              <h1 className="text-base sm:text-lg font-bold text-[#182333] truncate">
                {title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {actions}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((o) => !o)}
                className="relative p-2 rounded-lg border border-slate-200 text-[#182333] hover:bg-slate-50 cursor-pointer"
                aria-label="Notifications"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF8738] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {alerts.length}
                  </span>
                )}
              </button>
              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg p-3 z-40">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <span className="text-xs font-semibold text-[#182333]">
                      Alertes & activité
                    </span>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-xs text-[#64748B] hover:text-[#182333]"
                    >
                      Fermer
                    </button>
                  </div>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {alerts.length === 0 ? (
                      <p className="text-xs text-[#64748B] py-3 text-center">
                        Aucune alerte en cours.
                      </p>
                    ) : (
                      alerts.map((a) => (
                        <div
                          key={a.id}
                          className="text-xs p-2 rounded-lg bg-[#F5F7FA] text-[#182333]"
                        >
                          <p className="font-medium">{a.text}</p>
                          <p className="text-[11px] text-[#64748B] mt-0.5">
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
