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
  mapApiSupplierRow,
  supplierResourceUrl,
  type ApiSupplier,
} from '../lib/suppliersApi';

export type SupplierStatus = 'active' | 'inactive';

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  category: string;
  location?: string;
  address?: string;
  status: SupplierStatus;
  notes?: string;
}

const FALLBACK_CATEGORIES = [
  'groceries',
  'beverages',
  'frozen',
  'produce',
  'general',
  'other',
];

const FALLBACK_STATUSES: SupplierStatus[] = ['active', 'inactive'];

function toApiBody(s: Omit<Supplier, 'id'>): Record<string, unknown> {
  return {
    name: s.name,
    contactPerson: s.contactPerson,
    category: s.category,
    phone: s.phone,
    email: s.email,
    cityRegion: s.location,
    status: s.status,
    address: s.address,
    notes: s.notes,
  };
}

function toApiPatch(updates: Partial<Supplier>): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (updates.name !== undefined) patch.name = updates.name;
  if (updates.contactPerson !== undefined) patch.contactPerson = updates.contactPerson;
  if (updates.phone !== undefined) patch.phone = updates.phone;
  if (updates.email !== undefined) patch.email = updates.email;
  if (updates.category !== undefined) patch.category = updates.category;
  if (updates.location !== undefined) patch.cityRegion = updates.location;
  if (updates.address !== undefined) patch.address = updates.address;
  if (updates.status !== undefined) patch.status = updates.status;
  if (updates.notes !== undefined) patch.notes = updates.notes;
  return patch;
}

interface SuppliersContextValue {
  suppliers: Supplier[];
  suppliersLoading: boolean;
  refreshSuppliers: () => Promise<void>;
  addSupplier: (s: Omit<Supplier, 'id'>) => Promise<void>;
  updateSupplier: (id: string, updates: Partial<Supplier>) => Promise<void>;
  deleteSupplier: (id: string) => Promise<void>;
  getSupplier: (id: string) => Supplier | undefined;
  categories: string[];
  statuses: SupplierStatus[];
}

const SuppliersContext = createContext<SuppliersContextValue | null>(null);

export function SuppliersProvider({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const { runWithLoader } = useActionLoader();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(true);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [statuses, setStatuses] = useState<SupplierStatus[]>(FALLBACK_STATUSES);

  const refreshSuppliers = useCallback(async () => {
    const res = await fetch(apiUrl('/api/suppliers'));
    if (!res.ok) throw new Error(await readApiError(res));
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) throw new Error('Invalid suppliers response');
    setSuppliers((data as ApiSupplier[]).map(mapApiSupplierRow));
  }, []);

  const fetchMeta = useCallback(async () => {
    try {
      const [catRes, stRes] = await Promise.all([
        fetch(apiUrl('/api/suppliers/meta/categories')),
        fetch(apiUrl('/api/suppliers/meta/statuses')),
      ]);
      if (catRes.ok) {
        const d = (await catRes.json()) as { categories?: string[] };
        if (Array.isArray(d.categories) && d.categories.length > 0) {
          setCategories(d.categories);
        }
      }
      if (stRes.ok) {
        const d = (await stRes.json()) as { statuses?: string[] };
        if (Array.isArray(d.statuses) && d.statuses.length > 0) {
          const next = d.statuses.filter(
            (x): x is SupplierStatus => x === 'active' || x === 'inactive'
          );
          if (next.length > 0) setStatuses(next);
        }
      }
    } catch {
      /* keep fallbacks */
    }
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      setSuppliers([]);
      setSuppliersLoading(false);
      return;
    }

    void (async () => {
      setSuppliersLoading(true);
      try {
        await Promise.all([refreshSuppliers(), fetchMeta()]);
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load suppliers');
      } finally {
        setSuppliersLoading(false);
      }
    })();
  }, [isBootstrapping, user, refreshSuppliers, fetchMeta]);

  const addSupplier = useCallback(
    async (s: Omit<Supplier, 'id'>) => {
      return runWithLoader(async () => {
        const res = await fetch(apiUrl('/api/suppliers'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(toApiBody(s)),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshSuppliers();
      });
    },
    [refreshSuppliers, runWithLoader]
  );

  const updateSupplier = useCallback(
    async (id: string, updates: Partial<Supplier>) => {
      const patch = toApiPatch(updates);
      if (Object.keys(patch).length === 0) return;
      return runWithLoader(async () => {
        const res = await fetch(supplierResourceUrl(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshSuppliers();
      });
    },
    [refreshSuppliers, runWithLoader]
  );

  const deleteSupplier = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const res = await fetch(supplierResourceUrl(id), { method: 'DELETE' });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshSuppliers();
      });
    },
    [refreshSuppliers, runWithLoader]
  );

  const getSupplier = useCallback(
    (id: string) => suppliers.find((s) => s.id === id),
    [suppliers]
  );

  const value = useMemo<SuppliersContextValue>(
    () => ({
      suppliers,
      suppliersLoading,
      refreshSuppliers,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      getSupplier,
      categories,
      statuses,
    }),
    [
      suppliers,
      suppliersLoading,
      refreshSuppliers,
      addSupplier,
      updateSupplier,
      deleteSupplier,
      getSupplier,
      categories,
      statuses,
    ]
  );

  return <SuppliersContext.Provider value={value}>{children}</SuppliersContext.Provider>;
}

export function useSuppliers() {
  const ctx = useContext(SuppliersContext);
  if (!ctx) throw new Error('useSuppliers must be used within SuppliersProvider');
  return ctx;
}
