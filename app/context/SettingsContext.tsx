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
import { apiUrl, readApiError } from '../lib/productsApi';
import {
  createRole,
  deleteRoleApi,
  fetchEntitlementGroups,
  fetchRoles,
  resolveRoleApiId,
  updateRoleApi,
} from '../lib/rolesApi';
import { fetchAppSettings, updateAppSettings, uploadBusinessLogo, clearBusinessLogo, mapBusinessLogoUrl, type ApiReceiptSettings } from '../lib/settingsApi';
import { SYSTEM_LOGO } from '../lib/brand';
import {
  DEFAULT_ROLES,
  normalizeSystemRoles,
  PERMISSION_GROUPS,
  type Permission,
  type PermissionGroup,
  type RoleDefinition,
} from '../lib/permissions';
import {
  DEFAULT_DEPARTMENTS,
  collectDescendantIds,
  normalizeDepartments,
  uniqueDepartmentId,
  type Department,
} from '../lib/departments';

export type { Department };
export {
  buildDepartmentTree,
  collectDescendantIds,
  departmentDisplayName,
  departmentSelectGroups,
  getChildDepartments,
  getDepartments,
  getDivisions,
  getRootDepartments,
} from '../lib/departments';

export interface ProductCategory {
  id: string;
  name: string;
}

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logoUrl: string | null;
}

export interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  showTaxId: boolean;
  footerMessage: string;
}

export interface InventoryPreferences {
  lowStockThreshold: number;
}

export interface PosPreferences {
  defaultPaymentMethod: 'Cash' | 'Mobile Money';
  discountsEnabledByDefault: boolean;
  requireCustomerName: boolean;
}

const STORAGE_KEY = 'inventory_system_settings';

const DEFAULT_BUSINESS: BusinessInfo = {
  name: 'Onyx Build & Partners Limited',
  address: 'Accra, Ghana',
  phone: '+233 XX XXX XXXX',
  email: 'info@ladepuls.com',
  taxId: 'C0000000000',
  logoUrl: SYSTEM_LOGO,
};

const DEFAULT_RECEIPT: ReceiptSettings = {
  showLogo: true,
  showAddress: true,
  showPhone: true,
  showEmail: true,
  showTaxId: false,
  footerMessage: 'Thank you for your business!',
};

const DEFAULT_INVENTORY_PREFERENCES: InventoryPreferences = {
  lowStockThreshold: 10,
};

const DEFAULT_POS_PREFERENCES: PosPreferences = {
  defaultPaymentMethod: 'Cash',
  discountsEnabledByDefault: false,
  requireCustomerName: false,
};

const DEFAULT_CATEGORIES: ProductCategory[] = [
  { id: 'cat-lighting', name: 'Lighting' },
  { id: 'cat-sanitary', name: 'Sanitary Ware' },
  { id: 'cat-general', name: 'General' },
];

interface StoredSettings {
  businessInfo?: BusinessInfo;
  receiptSettings?: ReceiptSettings;
  categories?: ProductCategory[];
  departments?: Department[];
  inventoryPreferences?: InventoryPreferences;
  posPreferences?: PosPreferences;
}

interface SettingsContextValue {
  businessInfo: BusinessInfo;
  receiptSettings: ReceiptSettings;
  inventoryPreferences: InventoryPreferences;
  posPreferences: PosPreferences;
  categories: ProductCategory[];
  departments: Department[];
  roles: RoleDefinition[];
  rolesLoading: boolean;
  settingsLoading: boolean;
  settingsSaving: boolean;
  entitlementGroups: PermissionGroup[];
  refreshRoles: () => Promise<void>;
  refreshAppSettings: () => Promise<void>;
  updateBusinessInfo: (info: Partial<BusinessInfo>) => void;
  updateReceiptSettings: (settings: Partial<ReceiptSettings>) => void;
  updateInventoryPreferences: (prefs: Partial<InventoryPreferences>) => void;
  updatePosPreferences: (prefs: Partial<PosPreferences>) => void;
  addCategory: (name: string) => Promise<ProductCategory>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addDepartment: (input: {
    name: string;
    description?: string;
    parentId?: string | null;
  }) => Department;
  saveDepartmentBranch: (input: {
    name: string;
    divisions?: string[];
  }) => Department;
  updateDepartment: (
    id: string,
    updates: Partial<Pick<Department, 'name' | 'description' | 'parentId'>>
  ) => void;
  updateDepartmentBranch: (
    id: string,
    input: { name: string; divisions: { id?: string; name: string }[] }
  ) => void;
  deleteDepartment: (id: string) => void;
  saveBusinessInfo: () => Promise<void>;
  saveReceiptSettings: () => Promise<void>;
  uploadLogo: (file: File) => Promise<void>;
  clearLogo: () => Promise<void>;
  addRole: (input: { name: string; description: string; permissions: Permission[] }) => Promise<RoleDefinition>;
  updateRole: (
    id: string,
    updates: Partial<Pick<RoleDefinition, 'name' | 'description' | 'permissions'>>
  ) => Promise<void>;
  deleteRole: (id: string) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

function slugify(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function loadDepartments(stored?: Department[]): Department[] {
  if (!stored?.length) return DEFAULT_DEPARTMENTS;
  return normalizeDepartments(stored);
}

function loadSettings(): StoredSettings {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSettings) : {};
  } catch {
    return {};
  }
}

function persist(partial: StoredSettings) {
  if (typeof window === 'undefined') return;
  const current = loadSettings();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, ...partial }));
}

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { runWithLoader } = useActionLoader();
  const stored = useMemo(() => loadSettings(), []);
  const storedCategories = stored.categories;
  const storedDepartments = stored.departments;
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo>({
    ...DEFAULT_BUSINESS,
    ...stored.businessInfo,
  });
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>({
    ...DEFAULT_RECEIPT,
    ...stored.receiptSettings,
  });
  const [inventoryPreferences, setInventoryPreferences] = useState<InventoryPreferences>({
    ...DEFAULT_INVENTORY_PREFERENCES,
    ...stored.inventoryPreferences,
  });
  const [posPreferences, setPosPreferences] = useState<PosPreferences>({
    ...DEFAULT_POS_PREFERENCES,
    ...stored.posPreferences,
  });
  const [categories, setCategories] = useState<ProductCategory[]>(
    stored.categories?.length ? stored.categories : DEFAULT_CATEGORIES
  );
  const [departments, setDepartments] = useState<Department[]>(() =>
    loadDepartments(storedDepartments)
  );
  const [roles, setRoles] = useState<RoleDefinition[]>(DEFAULT_ROLES);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [entitlementGroups, setEntitlementGroups] = useState<PermissionGroup[]>(PERMISSION_GROUPS);

  useEffect(() => {
    persist({
      businessInfo,
      receiptSettings,
      categories,
      departments,
      inventoryPreferences,
      posPreferences,
    });
  }, [businessInfo, receiptSettings, categories, departments, inventoryPreferences, posPreferences]);

  const applyAppSettings = useCallback(
    (data: {
      business: BusinessInfo | { name: string; address: string; phone: string; email: string; taxId: string; logoUrl?: string | null };
      receipt: ApiReceiptSettings;
    }) => {
      setBusinessInfo({
        ...DEFAULT_BUSINESS,
        ...data.business,
        logoUrl: mapBusinessLogoUrl(data.business.logoUrl) ?? SYSTEM_LOGO,
      });
      setReceiptSettings((prev) => ({
        ...DEFAULT_RECEIPT,
        ...data.receipt,
        showTaxId: prev.showTaxId ?? DEFAULT_RECEIPT.showTaxId,
      }));
    },
    []
  );

  const refreshAppSettings = useCallback(async () => {
    const data = await fetchAppSettings();
    applyAppSettings({ business: data.business, receipt: data.receipt });
  }, [applyAppSettings]);

  const refreshCategories = useCallback(async () => {
    const res = await fetch(apiUrl('/api/categories'));
    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('Invalid categories response');
    }
    const next = (data as { _id?: string; id?: string; name: string }[])
      .map((c) => ({
        id: c._id ?? c.id ?? c.name,
        name: c.name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    setCategories(next);
  }, []);

  const refreshRoles = useCallback(async () => {
    const [nextRoles, nextGroups] = await Promise.all([fetchRoles(), fetchEntitlementGroups()]);
    setRoles(normalizeSystemRoles(nextRoles));
    setEntitlementGroups(nextGroups);
  }, []);

  useEffect(() => {
    void (async () => {
      setSettingsLoading(true);
      try {
        await refreshAppSettings();
      } catch {
        /* keep localStorage / defaults until server is available */
      } finally {
        setSettingsLoading(false);
      }
    })();
  }, [refreshAppSettings]);

  useEffect(() => {
    if (!user) {
      setRoles(DEFAULT_ROLES);
      setRolesLoading(false);
      return;
    }

    void (async () => {
      setRolesLoading(true);
      try {
        await refreshRoles();
      } catch {
        // Non-admins often cannot list roles; keep built-in defaults quietly.
        setRoles(DEFAULT_ROLES);
        setEntitlementGroups(PERMISSION_GROUPS);
      } finally {
        setRolesLoading(false);
      }
    })();
  }, [user, refreshRoles]);

  useEffect(() => {
    void (async () => {
      try {
        await refreshCategories();
      } catch {
        if (storedCategories?.length) {
          setCategories(storedCategories);
        } else {
          setCategories(DEFAULT_CATEGORIES);
        }
      }
    })();
  }, [refreshCategories, storedCategories]);

  const addCategory = useCallback(
    async (name: string): Promise<ProductCategory> => {
      return runWithLoader(async () => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Category name is required');

        const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
        if (existing) return existing;

        const res = await fetch(apiUrl('/api/categories'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          throw new Error(await readApiError(res));
        }

        const data = (await res.json()) as { _id?: string; id?: string; name?: string };
        const created: ProductCategory = {
          id: data._id ?? data.id ?? `cat-${slugify(trimmed)}`,
          name: data.name ?? trimmed,
        };
        await refreshCategories();
        return created;
      });
    },
    [categories, refreshCategories, runWithLoader]
  );

  const updateCategory = useCallback(
    async (id: string, name: string) => {
      return runWithLoader(async () => {
        const trimmed = name.trim();
        if (!trimmed) throw new Error('Category name is required');
        const res = await fetch(apiUrl(`/api/categories/${encodeURIComponent(id)}`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: trimmed }),
        });
        if (!res.ok) {
          throw new Error(await readApiError(res));
        }
        await refreshCategories();
      });
    },
    [refreshCategories, runWithLoader]
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const res = await fetch(apiUrl(`/api/categories/${encodeURIComponent(id)}`), {
          method: 'DELETE',
        });
        if (!res.ok) {
          throw new Error(await readApiError(res));
        }
        await refreshCategories();
      });
    },
    [refreshCategories, runWithLoader]
  );

  const addDepartment = useCallback(
    (input: {
      name: string;
      description?: string;
      parentId?: string | null;
    }): Department => {
      const name = input.name.trim();
      if (!name) throw new Error('Department name is required');
      const parentId = input.parentId ?? null;
      if (parentId && !departments.some((d) => d.id === parentId && !d.parentId)) {
        throw new Error('Parent department not found');
      }
      const created: Department = {
        id: uniqueDepartmentId(name, departments),
        name,
        description: input.description?.trim() || '',
        parentId,
      };
      setDepartments((prev) => [...prev, created]);
      return created;
    },
    [departments]
  );

  const saveDepartmentBranch = useCallback((input: { name: string; divisions?: string[] }) => {
    const name = input.name.trim();
    if (!name) throw new Error('Department name is required');
    const divisionNames = (input.divisions ?? []).map((d) => d.trim()).filter(Boolean);
    let created: Department | null = null;
    setDepartments((prev) => {
      const parent: Department = {
        id: uniqueDepartmentId(name, prev),
        name,
        description: '',
        parentId: null,
      };
      created = parent;
      const next: Department[] = [...prev, parent];
      for (const divName of divisionNames) {
        next.push({
          id: uniqueDepartmentId(divName, next),
          name: divName,
          description: '',
          parentId: parent.id,
        });
      }
      return next;
    });
    if (!created) throw new Error('Could not create department');
    return created;
  }, []);

  const updateDepartmentBranch = useCallback(
    (id: string, input: { name: string; divisions: { id?: string; name: string }[] }) => {
      const name = input.name.trim();
      if (!name) throw new Error('Department name is required');
      setDepartments((prev) => {
        const dept = prev.find((d) => d.id === id && !d.parentId);
        if (!dept) throw new Error('Department not found');
        const divisionRows = input.divisions
          .map((row) => ({ id: row.id, name: row.name.trim() }))
          .filter((row) => row.name);
        const keptIds = new Set(divisionRows.map((row) => row.id).filter(Boolean) as string[]);
        const existingChildren = prev.filter((d) => d.parentId === id);
        const removedIds = new Set(
          existingChildren.filter((child) => !keptIds.has(child.id)).map((child) => child.id)
        );
        let next = prev
          .filter((d) => !removedIds.has(d.id))
          .map((d) => (d.id === id ? { ...d, name } : d));
        for (const row of divisionRows) {
          if (row.id) {
            next = next.map((d) => (d.id === row.id ? { ...d, name: row.name } : d));
          } else {
            next.push({
              id: uniqueDepartmentId(row.name, next),
              name: row.name,
              description: '',
              parentId: id,
            });
          }
        }
        return next;
      });
    },
    []
  );

  const updateDepartment = useCallback(
    (
      id: string,
      updates: Partial<Pick<Department, 'name' | 'description' | 'parentId'>>
    ) => {
      setDepartments((prev) =>
        prev.map((dept) => {
          if (dept.id !== id) return dept;
          const nextParentId =
            updates.parentId !== undefined ? updates.parentId : dept.parentId;
          if (nextParentId === id) return dept;
          return {
            ...dept,
            ...(updates.name !== undefined ? { name: updates.name.trim() || dept.name } : {}),
            ...(updates.description !== undefined
              ? { description: updates.description.trim() }
              : {}),
            ...(updates.parentId !== undefined ? { parentId: nextParentId } : {}),
          };
        })
      );
    },
    []
  );

  const deleteDepartment = useCallback((id: string) => {
    setDepartments((prev) => {
      const toRemove = collectDescendantIds(prev, id);
      return prev.filter((d) => !toRemove.has(d.id));
    });
  }, []);

  const updateBusinessInfo = useCallback((info: Partial<BusinessInfo>) => {
    setBusinessInfo((prev) => ({ ...prev, ...info }));
  }, []);

  const updateReceiptSettings = useCallback((settings: Partial<ReceiptSettings>) => {
    setReceiptSettings((prev) => ({ ...prev, ...settings }));
  }, []);

  const updateInventoryPreferences = useCallback((prefs: Partial<InventoryPreferences>) => {
    setInventoryPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  const updatePosPreferences = useCallback((prefs: Partial<PosPreferences>) => {
    setPosPreferences((prev) => ({ ...prev, ...prefs }));
  }, []);

  const saveBusinessInfo = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await runWithLoader(async () => {
        const { showTaxId: _showTaxId, ...apiReceipt } = receiptSettings;
        const data = await updateAppSettings({
          business: {
            name: businessInfo.name,
            address: businessInfo.address,
            phone: businessInfo.phone,
            email: businessInfo.email,
            taxId: businessInfo.taxId,
          },
          receipt: apiReceipt,
        });
        applyAppSettings({ business: data.business, receipt: data.receipt });
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save business information');
      throw e;
    } finally {
      setSettingsSaving(false);
    }
  }, [businessInfo, receiptSettings, applyAppSettings, runWithLoader]);

  const saveReceiptSettings = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await runWithLoader(async () => {
        const { showTaxId: _showTaxId, ...apiReceipt } = receiptSettings;
        const data = await updateAppSettings({
          business: {
            name: businessInfo.name,
            address: businessInfo.address,
            phone: businessInfo.phone,
            email: businessInfo.email,
            taxId: businessInfo.taxId,
          },
          receipt: apiReceipt,
        });
        applyAppSettings({ business: data.business, receipt: data.receipt });
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save receipt settings');
      throw e;
    } finally {
      setSettingsSaving(false);
    }
  }, [businessInfo, receiptSettings, applyAppSettings, runWithLoader]);

  const uploadLogo = useCallback(
    async (file: File) => {
      setSettingsSaving(true);
      try {
        await runWithLoader(async () => {
          const data = await uploadBusinessLogo(file);
          applyAppSettings({ business: data.business, receipt: data.receipt });
        });
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to upload logo');
        throw e;
      } finally {
        setSettingsSaving(false);
      }
    },
    [applyAppSettings, runWithLoader]
  );

  const clearLogo = useCallback(async () => {
    setSettingsSaving(true);
    try {
      await runWithLoader(async () => {
        const data = await clearBusinessLogo();
        applyAppSettings({ business: data.business, receipt: data.receipt });
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to remove logo');
      throw e;
    } finally {
      setSettingsSaving(false);
    }
  }, [applyAppSettings, runWithLoader]);

  const addRole = useCallback(
    async (input: { name: string; description: string; permissions: Permission[] }): Promise<RoleDefinition> => {
      const name = input.name.trim();
      if (!name) throw new Error('Role name is required');

      return runWithLoader(async () => {
        try {
          const role = await createRole({
            name,
            description: input.description.trim(),
            entitlements: input.permissions,
          });
          setRoles((prev) => [...prev, role]);
          return role;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to create role';
          message.error(err);
          throw new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const updateRole = useCallback(
    async (id: string, updates: Partial<Pick<RoleDefinition, 'name' | 'description' | 'permissions'>>) => {
      const existing = roles.find((r) => r.id === id);
      if (!existing) {
        message.error('Role not found');
        return;
      }

      return runWithLoader(async () => {
        try {
          const role = await updateRoleApi(resolveRoleApiId(existing), {
            ...(updates.name !== undefined ? { name: updates.name.trim() || existing.name } : {}),
            ...(updates.description !== undefined ? { description: updates.description.trim() } : {}),
            ...(updates.permissions !== undefined ? { entitlements: updates.permissions } : {}),
          });
          setRoles((prev) => prev.map((r) => (r.id === id ? role : r)));
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Failed to update role');
          throw e;
        }
      });
    },
    [roles, runWithLoader]
  );

  const deleteRole = useCallback(
    async (id: string) => {
      const role = roles.find((r) => r.id === id);
      if (!role) return;
      if (role.isSystem) {
        message.error('System roles cannot be deleted');
        return;
      }

      return runWithLoader(async () => {
        try {
          await deleteRoleApi(resolveRoleApiId(role));
          setRoles((prev) => prev.filter((r) => r.id !== id));
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Failed to delete role');
          throw e;
        }
      });
    },
    [roles, runWithLoader]
  );

  const value = useMemo<SettingsContextValue>(
    () => ({
      businessInfo,
      receiptSettings,
      inventoryPreferences,
      posPreferences,
      categories,
      departments,
      roles,
      rolesLoading,
      settingsLoading,
      settingsSaving,
      entitlementGroups,
      refreshRoles,
      refreshAppSettings,
      updateBusinessInfo,
      updateReceiptSettings,
      updateInventoryPreferences,
      updatePosPreferences,
      addCategory,
      updateCategory,
      deleteCategory,
      addDepartment,
      saveDepartmentBranch,
      updateDepartment,
      updateDepartmentBranch,
      deleteDepartment,
      saveBusinessInfo,
      saveReceiptSettings,
      uploadLogo,
      clearLogo,
      addRole,
      updateRole,
      deleteRole,
    }),
    [
      businessInfo,
      receiptSettings,
      inventoryPreferences,
      posPreferences,
      categories,
      departments,
      roles,
      rolesLoading,
      settingsLoading,
      settingsSaving,
      entitlementGroups,
      refreshRoles,
      refreshAppSettings,
      updateBusinessInfo,
      updateReceiptSettings,
      updateInventoryPreferences,
      updatePosPreferences,
      addCategory,
      updateCategory,
      deleteCategory,
      addDepartment,
      saveDepartmentBranch,
      updateDepartment,
      updateDepartmentBranch,
      deleteDepartment,
      saveBusinessInfo,
      saveReceiptSettings,
      uploadLogo,
      clearLogo,
      addRole,
      updateRole,
      deleteRole,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}

/** Resolve category by name (case-insensitive). */
export function findCategoryByName(
  categories: ProductCategory[],
  name: string
): ProductCategory | undefined {
  return categories.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
}

export async function fetchApiCategories(): Promise<ProductCategory[]> {
  try {
    const res = await fetch(apiUrl('/api/categories'));
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return [];
    return (data as { _id?: string; id?: string; name: string }[]).map((c) => ({
      id: c._id ?? c.id ?? c.name,
      name: c.name,
    }));
  } catch {
    return [];
  }
}

export { readApiError };
