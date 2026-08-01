'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { message } from 'antd';
import { useActionLoader } from '../components/LoaderProvider';
import { useAuth } from './AuthContext';
import {
  DEFAULT_ROLES,
  canAccessGraReports as checkGraReports,
  hasFullCatalogAccess as checkFullCatalog,
  hasEntitlement,
  roleDisplayName,
  type Permission,
  type RoleDefinition,
} from '../lib/permissions';
import {
  createUser,
  deleteUserApi,
  fetchUsers,
  updateUserApi,
  type CreateUserBody,
  type UpdateUserBody,
} from '../lib/usersApi';

export type UserRole = string;

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleId: string;
  roleName: string;
  staffId: string | null;
  categoryIds: string[];
  active: boolean;
}

interface UsersContextValue {
  users: SystemUser[];
  usersLoading: boolean;
  refreshUsers: () => Promise<void>;
  addUser: (input: CreateUserBody) => Promise<SystemUser>;
  updateUser: (id: string, updates: UpdateUserBody) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  findUserByEmail: (email: string) => SystemUser | undefined;
}

const UsersContext = createContext<UsersContextValue | null>(null);

export function UsersProvider({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const { runWithLoader } = useActionLoader();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const refreshUsers = useCallback(async () => {
    const rows = await fetchUsers();
    setUsers(rows);
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    // Users list is admin-only; skip fetch for limited roles to avoid permission toasts.
    if (!hasEntitlement(user.entitlements, 'users')) {
      setUsers([]);
      setUsersLoading(false);
      return;
    }

    void (async () => {
      setUsersLoading(true);
      try {
        await refreshUsers();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load users');
      } finally {
        setUsersLoading(false);
      }
    })();
  }, [isBootstrapping, user, refreshUsers]);

  const addUser = useCallback(async (input: CreateUserBody): Promise<SystemUser> => {
    return runWithLoader(async () => {
      try {
        const created = await createUser(input);
        await refreshUsers();
        return created;
      } catch (e) {
        const err = e instanceof Error ? e.message : 'Failed to create user';
        message.error(err);
        throw new Error(err);
      }
    });
  }, [refreshUsers, runWithLoader]);

  const updateUser = useCallback(async (id: string, updates: UpdateUserBody) => {
    if (Object.keys(updates).length === 0) return;
    return runWithLoader(async () => {
      try {
        await updateUserApi(id, updates);
        await refreshUsers();
      } catch (e) {
        const err = e instanceof Error ? e.message : 'Failed to update user';
        message.error(err);
        throw new Error(err);
      }
    });
  }, [refreshUsers, runWithLoader]);

  const deleteUser = useCallback(async (id: string) => {
    return runWithLoader(async () => {
      try {
        await deleteUserApi(id);
        await refreshUsers();
      } catch (e) {
        const err = e instanceof Error ? e.message : 'Failed to delete user';
        message.error(err);
        throw new Error(err);
      }
    });
  }, [refreshUsers, runWithLoader]);

  const findUserByEmail = useCallback(
    (email: string) => users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase()),
    [users]
  );

  const value = useMemo(
    () => ({ users, usersLoading, refreshUsers, addUser, updateUser, deleteUser, findUserByEmail }),
    [users, usersLoading, refreshUsers, addUser, updateUser, deleteUser, findUserByEmail]
  );

  return <UsersContext.Provider value={value}>{children}</UsersContext.Provider>;
}

export function useUsers() {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error('useUsers must be used within UsersProvider');
  return ctx;
}

export function roleLabel(
  role: UserRole,
  roles: RoleDefinition[] = DEFAULT_ROLES,
  roleName?: string | null
): string {
  return roleDisplayName(role, roles, roleName);
}

export function hasFullCatalogAccess(
  role: UserRole,
  categoryIds: string[],
  roles: RoleDefinition[] = DEFAULT_ROLES,
  entitlements?: Permission[]
): boolean {
  return checkFullCatalog(role, categoryIds, roles, entitlements);
}

/** Whether user can view GRA reports. */
export function canAccessGraReports(
  role: UserRole,
  roles: RoleDefinition[] = DEFAULT_ROLES,
  entitlements?: Permission[]
): boolean {
  return checkGraReports(role, roles, entitlements);
}
