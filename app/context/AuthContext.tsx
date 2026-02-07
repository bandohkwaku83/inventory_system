'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Role = 'admin' | 'sales';

export interface User {
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: User | null;
  login: (name: string, role: Role) => void;
  logout: () => void;
  isAdmin: boolean;
  isSales: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'inventory_system_user';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as User;
        if (parsed?.name && (parsed.role === 'admin' || parsed.role === 'sales')) {
          setUser(parsed);
        }
      }
    } catch {
      // ignore invalid stored data
    }
    setMounted(true);
  }, []);

  const login = useCallback((name: string, role: Role) => {
    const u = { name: name.trim() || 'User', role };
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      // ignore
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const value: AuthContextValue = {
    user,
    login,
    logout,
    isAdmin: user?.role === 'admin',
    isSales: user?.role === 'sales',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

/** Paths only admin can access. Sales person is redirected to dashboard if they hit these. */
export const ADMIN_ONLY_PATHS = [
  '/dashboard/inventory',
  '/dashboard/purchases',
  '/dashboard/reports',
  '/dashboard/settings',
] as const;

export function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'));
}
