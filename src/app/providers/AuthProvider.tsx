import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch, getStoredToken, setStoredToken } from '../../services/api';
import type { AuthUser, Permission } from '../../types';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  registerRestaurant: (payload: {
    restaurantName: string;
    city: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    planCode?: string;
  }) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      try {
        const res = await apiFetch<{ user: AuthUser }>('/api/auth/me');
        setUser(res.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const res = await apiFetch<{ user: AuthUser }>('/api/auth/me');
      setUser(res.user);
    } catch {
      setStoredToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const res = await apiFetch<{ token: string; user: AuthUser }>(
      '/api/auth/login',
      {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      },
    );
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const registerRestaurant = async (payload: {
    restaurantName: string;
    city: string;
    ownerName: string;
    email: string;
    phone: string;
    password: string;
    planCode?: string;
  }): Promise<AuthUser> => {
    const res = await apiFetch<{ token: string; user: AuthUser }>(
      '/api/auth/register-restaurant',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
    setStoredToken(res.token);
    setUser(res.user);
    return res.user;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore error if already expired
    } finally {
      setStoredToken(null);
      setUser(null);
    }
  };

  const can = useCallback(
    (permission: Permission) => {
      if (!user) return false;
      if (user.permissions.includes('superadmin:all')) return true;
      return user.permissions.includes(permission);
    },
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        registerRestaurant,
        logout,
        refreshUser,
        can,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
