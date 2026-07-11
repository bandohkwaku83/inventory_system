'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserRole } from './UsersContext';
import type { Permission } from '../lib/permissions';
import {
  clearStoredToken,
  fetchMe,
  getStoredToken,
  loginApi,
  type AuthUserResponse,
} from '../lib/authApi';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  entitlements: Permission[];
  categoryIds: string[];
}

function normalizeEntitlements(apiUser: AuthUserResponse): Permission[] {
  const raw = apiUser.entitlements?.length
    ? apiUser.entitlements
    : (apiUser.role?.entitlements ?? []);
  return raw.filter((value): value is Permission => typeof value === 'string');
}

function mapAuthUser(apiUser: AuthUserResponse): User {
  return {
    id: apiUser._id,
    name: apiUser.name,
    email: apiUser.email,
    role: apiUser.role?.slug ?? apiUser.roleId,
    entitlements: normalizeEntitlements(apiUser),
    categoryIds: Array.isArray(apiUser.categoryIds) ? apiUser.categoryIds : [],
  };
}

interface AuthContextValue {
  user: User | null;
  isBootstrapping: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'inventory_system_user';

function persistUser(nextUser: User): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  } catch {
    /* ignore */
  }
}

function clearPersistedUser(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        if (!getStoredToken()) return;

        const apiUser = await fetchMe();
        const nextUser = mapAuthUser(apiUser);
        setUser(nextUser);
        persistUser(nextUser);
      } catch {
        clearStoredToken();
        clearPersistedUser();
        setUser(null);
      } finally {
        setIsBootstrapping(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      throw new Error('Enter your email and password.');
    }

    const { user: apiUser } = await loginApi(trimmedEmail, password);
    const nextUser = mapAuthUser(apiUser);
    setUser(nextUser);
    persistUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearStoredToken();
    clearPersistedUser();
  }, []);

  const value: AuthContextValue = {
    user,
    isBootstrapping,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
