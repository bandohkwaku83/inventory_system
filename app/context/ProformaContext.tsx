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
  extractProformasArray,
  mapApiProforma,
  proformaResourceUrl,
  safeMapApiProforma,
  type ApiProforma,
  type ApiTaxBreakdown,
} from '../lib/proformasApi';

export type ProformaStatus = 'draft' | 'sent' | 'approved' | 'expired';

export interface ProformaItem {
  id: string;
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface ProformaInvoice {
  id: string;
  proformaNumber: string;
  customer: string;
  customerPhone?: string;
  date: string;
  validUntil: string;
  status: ProformaStatus;
  notes?: string;
  subtotal: number;
  discount: number;
  total: number;
  items: ProformaItem[];
  taxBreakdown?: ApiTaxBreakdown;
  createdAt: string;
  updatedAt?: string;
}

export interface ProformaCreateInput {
  customer: string;
  customerPhone?: string;
  discount?: number;
  notes?: string;
  items: { productId: string; quantity: number }[];
}

interface ProformaContextValue {
  proformas: ProformaInvoice[];
  proformasLoading: boolean;
  refreshProformas: () => Promise<void>;
  fetchProforma: (id: string) => Promise<ProformaInvoice | null>;
  addProforma: (input: ProformaCreateInput) => Promise<ProformaInvoice>;
  updateProforma: (id: string, updates: { status?: ProformaStatus; notes?: string }) => Promise<void>;
  deleteProforma: (id: string) => Promise<void>;
}

const ProformaContext = createContext<ProformaContextValue | null>(null);

export function ProformaProvider({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const { runWithLoader } = useActionLoader();
  const [proformas, setProformas] = useState<ProformaInvoice[]>([]);
  const [proformasLoading, setProformasLoading] = useState(true);

  const refreshProformas = useCallback(async () => {
    const res = await fetch(apiUrl('/api/proformas'));
    if (!res.ok) throw new Error(await readApiError(res));
    const raw = (await res.json()) as unknown;
    const list = extractProformasArray(raw);
    if (!list) throw new Error('Invalid proformas response');
    const mapped = list
      .map(safeMapApiProforma)
      .filter((x): x is NonNullable<typeof x> => x != null);
    setProformas(mapped);
  }, []);

  const fetchProforma = useCallback(async (id: string): Promise<ProformaInvoice | null> => {
    try {
      const res = await fetch(proformaResourceUrl(id));
      if (!res.ok) return null;
      const data = (await res.json()) as ApiProforma;
      return mapApiProforma(data);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      setProformas([]);
      setProformasLoading(false);
      return;
    }

    void (async () => {
      setProformasLoading(true);
      try {
        await refreshProformas();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load proforma invoices');
      } finally {
        setProformasLoading(false);
      }
    })();
  }, [isBootstrapping, user, refreshProformas]);

  const addProforma = useCallback(
    async (input: ProformaCreateInput): Promise<ProformaInvoice> => {
      return runWithLoader(async () => {
        if (input.items.length === 0) {
          message.error('Add at least one item');
          throw new Error('No items');
        }
        const body: Record<string, unknown> = {
          customer: input.customer,
          discount: input.discount ?? 0,
          items: input.items,
        };
        if (input.customerPhone?.trim()) body.customerPhone = input.customerPhone.trim();
        if (input.notes?.trim()) body.notes = input.notes.trim();

        const res = await fetch(apiUrl('/api/proformas'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        const data = (await res.json()) as ApiProforma;
        const invoice = mapApiProforma(data);
        await refreshProformas();
        return invoice;
      });
    },
    [refreshProformas, runWithLoader]
  );

  const updateProforma = useCallback(
    async (id: string, updates: { status?: ProformaStatus; notes?: string }) => {
      const body: Record<string, unknown> = {};
      if (updates.status != null) body.status = updates.status;
      if (updates.notes != null) body.notes = updates.notes;
      if (Object.keys(body).length === 0) return;

      return runWithLoader(async () => {
        const res = await fetch(proformaResourceUrl(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        const data = (await res.json()) as ApiProforma;
        const mapped = mapApiProforma(data);
        setProformas((prev) => prev.map((p) => (p.id === id ? mapped : p)));
      });
    },
    [runWithLoader]
  );

  const deleteProforma = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const res = await fetch(proformaResourceUrl(id), { method: 'DELETE' });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshProformas();
      });
    },
    [refreshProformas, runWithLoader]
  );

  const value = useMemo<ProformaContextValue>(
    () => ({
      proformas,
      proformasLoading,
      refreshProformas,
      fetchProforma,
      addProforma,
      updateProforma,
      deleteProforma,
    }),
    [
      proformas,
      proformasLoading,
      refreshProformas,
      fetchProforma,
      addProforma,
      updateProforma,
      deleteProforma,
    ]
  );

  return <ProformaContext.Provider value={value}>{children}</ProformaContext.Provider>;
}

export function useProforma() {
  const ctx = useContext(ProformaContext);
  if (!ctx) throw new Error('useProforma must be used within ProformaProvider');
  return ctx;
}
