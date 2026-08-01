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
  getDivisions,
  type Department,
} from '../lib/departments';
import {
  createDepartment,
  deleteDepartmentApi,
  fetchDepartments,
  removeDivision,
  renameDivision,
  updateDepartmentApi,
} from '../lib/departmentsApi';

export type { Department };
export {
  buildDepartmentTree,
  collectDescendantIds,
  collectDescendantNames,
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
  refreshDepartments: () => Promise<void>;
  updateBusinessInfo: (info: Partial<BusinessInfo>) => void;
  updateReceiptSettings: (settings: Partial<ReceiptSettings>) => void;
  updateInventoryPreferences: (prefs: Partial<InventoryPreferences>) => void;
  updatePosPreferences: (prefs: Partial<PosPreferences>) => void;
  addCategory: (name: string) => Promise<ProductCategory>;
  updateCategory: (id: string, name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  saveDepartmentBranch: (input: {
    name: string;
    divisions?: string[];
  }) => Promise<Department>;
  updateDepartment: (
    id: string,
    updates: Partial<Pick<Department, 'name'>>
  ) => Promise<void>;
  updateDepartmentBranch: (
    id: string,
    input: { name: string; divisions: { id?: string; name: string }[] }
  ) => Promise<void>;
  deleteDepartment: (id: string) => Promise<void>;
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
  const { user, isBootstrapping } = useAuth();
  const { runWithLoader } = useActionLoader();
  const stored = useMemo(() => loadSettings(), []);
  const storedCategories = stored.categories;
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
  const [departments, setDepartments] = useState<Department[]>(DEFAULT_DEPARTMENTS);
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
      inventoryPreferences,
      posPreferences,
    });
  }, [businessInfo, receiptSettings, categories, inventoryPreferences, posPreferences]);

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

  const refreshDepartments = useCallback(async () => {
    const next = await fetchDepartments();
    setDepartments(next);
  }, []);

  const refreshRoles = useCallback(async () => {
    const [nextRoles, nextGroups] = await Promise.all([fetchRoles(), fetchEntitlementGroups()]);
    setRoles(normalizeSystemRoles(nextRoles));
    setEntitlementGroups(nextGroups);
  }, []);

  useEffect(() => {
    if (isBootstrapping || !user) return;

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
  }, [isBootstrapping, user, refreshAppSettings]);

  useEffect(() => {
    if (isBootstrapping) return;
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
  }, [isBootstrapping, user, refreshRoles]);

  useEffect(() => {
    if (isBootstrapping || !user) return;

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
  }, [isBootstrapping, user, refreshCategories, storedCategories]);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      setDepartments(DEFAULT_DEPARTMENTS);
      return;
    }
    void (async () => {
      try {
        await refreshDepartments();
      } catch {
        /* keep empty until server is available */
      }
    })();
  }, [isBootstrapping, user, refreshDepartments]);

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
        // 200 = already existed (import-safe); 201 = newly created
        if (res.status === 201) {
          await refreshCategories();
        } else {
          setCategories((prev) =>
            prev.some((c) => c.id === created.id) ? prev : [...prev, created]
          );
        }
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

  const saveDepartmentBranch = useCallback(
    async (input: { name: string; divisions?: string[] }): Promise<Department> => {
      return runWithLoader(async () => {
        const name = input.name.trim();
        if (!name) throw new Error('Department name is required');
        const divisions = (input.divisions ?? []).map((d) => d.trim()).filter(Boolean);
        const created = await createDepartment({ name, divisions });
        await refreshDepartments();
        const parent = created.find((d) => !d.parentId) ?? created[0];
        if (!parent) throw new Error('Could not create department');
        return parent;
      });
    },
    [refreshDepartments, runWithLoader]
  );

  const updateDepartmentBranch = useCallback(
    async (
      id: string,
      input: { name: string; divisions: { id?: string; name: string }[] }
    ) => {
      return runWithLoader(async () => {
        const name = input.name.trim();
        if (!name) throw new Error('Department name is required');
        const divisions = input.divisions
          .map((row) => ({
            id: row.id,
            name: row.name.trim(),
          }))
          .filter((row) => row.name);
        await updateDepartmentApi(id, {
          name,
          divisions: divisions.map((row) =>
            row.id ? { _id: row.id, name: row.name } : { name: row.name }
          ),
        });
        await refreshDepartments();
      });
    },
    [refreshDepartments, runWithLoader]
  );

  const updateDepartment = useCallback(
    async (id: string, updates: Partial<Pick<Department, 'name'>>) => {
      return runWithLoader(async () => {
        const dept = departments.find((d) => d.id === id);
        if (!dept) throw new Error('Department not found');
        const name = updates.name?.trim();
        if (!name) throw new Error('Name is required');

        if (dept.parentId) {
          const siblings = getDivisions(departments, dept.parentId);
          await renameDivision(
            dept.parentId,
            dept.id,
            name,
            siblings.map((d) => ({ id: d.id, name: d.name }))
          );
        } else {
          await updateDepartmentApi(id, { name });
        }
        await refreshDepartments();
      });
    },
    [departments, refreshDepartments, runWithLoader]
  );

  const deleteDepartment = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const dept = departments.find((d) => d.id === id);
        if (!dept) throw new Error('Department not found');

        if (dept.parentId) {
          const siblings = getDivisions(departments, dept.parentId);
          await removeDivision(
            dept.parentId,
            dept.id,
            siblings.map((d) => ({ id: d.id, name: d.name }))
          );
        } else {
          await deleteDepartmentApi(id);
        }
        await refreshDepartments();
      });
    },
    [departments, refreshDepartments, runWithLoader]
  );

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
      refreshDepartments,
      updateBusinessInfo,
      updateReceiptSettings,
      updateInventoryPreferences,
      updatePosPreferences,
      addCategory,
      updateCategory,
      deleteCategory,
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
      refreshDepartments,
      updateBusinessInfo,
      updateReceiptSettings,
      updateInventoryPreferences,
      updatePosPreferences,
      addCategory,
      updateCategory,
      deleteCategory,
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
