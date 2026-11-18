import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../providers/AuthProvider';
import type { Permission } from '../../types';

export function ProtectedRoute({
  children,
  requireSuperAdmin = false,
  permission,
}: {
  children: React.ReactNode;
  requireSuperAdmin?: boolean;
  permission?: Permission;
}) {
  const { user, loading, can } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="text-sm font-medium text-[#64748B]">
          Chargement de votre espace Resto’MAX…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/connexion" state={{ from: location.pathname }} replace />;
  }

  if (requireSuperAdmin && user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/app" replace />;
  }

  if (!requireSuperAdmin && user.role === 'SUPER_ADMIN') {
    return <Navigate to="/superadmin" replace />;
  }

  if (permission && !can(permission)) {
    return (
      <div className="p-8 bg-white rounded-xl border border-slate-200 max-w-lg mx-auto mt-12">
        <h2 className="text-lg font-bold text-[#182333]">Accès restreint</h2>
        <p className="text-sm text-[#64748B] mt-2">
          Votre rôle ({user.role}) ne dispose pas des droits requis pour consulter ce module.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
