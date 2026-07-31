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
import {
  createSale as createSaleApi,
  fetchSales,
  updateSale as updateSaleApi,
  type CreateSalePayload,
  type MappedSale,
  type SaleStatus,
  type UpdateSalePayload,
} from '../lib/salesApi';

export type SalePaymentMethod = 'Cash' | 'Mobile Money';
export type { SaleStatus };

export interface SaleItem {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  /** Backend document id when available (for PATCH). */
  apiId?: string;
  timestamp: string;
  date: string;
  time: string;
  customer: string;
  customerId?: string;
  servedBy?: string;
  servedByName?: string;
  paymentMethod: SalePaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  items: SaleItem[];
  status: SaleStatus;
}

export interface SalesContextValue {
  sales: Sale[];
  pendingSales: Sale[];
  completedSales: Sale[];
  salesLoading: boolean;
  refreshSales: () => Promise<void>;
  /** Persist a POS sale (default status: completed). */
  addSale: (payload: CreateSalePayload) => Promise<Sale>;
  /** Update an existing sale (parked cart edits, complete pending). */
  updateSale: (id: string, payload: UpdateSalePayload) => Promise<Sale>;
  deleteSale: (id: string) => void;
  clearSales: () => void;
}

const SalesContext = createContext<SalesContextValue | undefined>(undefined);

function fromMapped(sale: MappedSale): Sale {
  return {
    id: sale.id,
    apiId: sale.apiId,
    timestamp: sale.timestamp,
    date: sale.date,
    time: sale.time,
    customer: sale.customer,
    customerId: sale.customerId,
    servedBy: sale.servedBy,
    servedByName: sale.servedByName,
    paymentMethod: sale.paymentMethod,
    subtotal: sale.subtotal,
    discount: sale.discount,
    total: sale.total,
    cashTendered: sale.cashTendered,
    change: sale.change,
    items: sale.items,
    status: sale.status,
  };
}

function resolveUpdateId(sale: Sale): string {
  return sale.apiId || sale.id;
}

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const { runWithLoader } = useActionLoader();
  const [sales, setSales] = useState<Sale[]>([]);
  const [salesLoading, setSalesLoading] = useState(true);

  const refreshSales = useCallback(async () => {
    const list = await fetchSales();
    setSales(list.map(fromMapped));
  }, []);

  useEffect(() => {
    void (async () => {
      setSalesLoading(true);
      try {
        await refreshSales();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load sales');
      } finally {
        setSalesLoading(false);
      }
    })();
  }, [refreshSales]);

  const addSale = useCallback(
    async (payload: CreateSalePayload) => {
      return runWithLoader(async () => {
        const idempotencyKey =
          typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `sale-${Date.now()}`;
        const sale = fromMapped(
          await createSaleApi(
            { ...payload, status: payload.status ?? 'completed' },
            idempotencyKey
          )
        );
        // If API ignored status, keep the requested status for pending parks.
        if (payload.status && sale.status !== payload.status) {
          sale.status = payload.status;
        }
        setSales((prev) => [sale, ...prev.filter((s) => s.id !== sale.id)]);
        return sale;
      });
    },
    [runWithLoader]
  );

  const updateSale = useCallback(
    async (id: string, payload: UpdateSalePayload) => {
      return runWithLoader(async () => {
        const existing = sales.find((s) => s.id === id || s.apiId === id);
        try {
          const updated = fromMapped(
            await updateSaleApi(existing ? resolveUpdateId(existing) : id, payload)
          );
          if (payload.status && updated.status !== payload.status) {
            updated.status = payload.status;
          }
          setSales((prev) => {
            const without = prev.filter(
              (s) => s.id !== updated.id && s.apiId !== updated.apiId && s.id !== id
            );
            return [updated, ...without];
          });
          return updated;
        } catch (e) {
          const msg = e instanceof Error ? e.message : '';
          // Ownership / missing sale — never invent a local copy.
          if (/not found|404/i.test(msg) || !existing) throw e;
          // Frontend fallback when PATCH is unavailable: merge locally.
          const items =
            payload.items?.map((item) => {
              const prev = existing.items.find((i) => i.id === item.productId);
              return {
                id: item.productId,
                name: prev?.name ?? 'Item',
                sku: prev?.sku,
                price: item.price ?? prev?.price ?? 0,
                quantity: item.quantity,
              };
            }) ?? existing.items;
          const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
          const discount = payload.discount ?? existing.discount;
          const total = Math.max(0, subtotal - discount);
          const updated: Sale = {
            ...existing,
            customer: payload.customer ?? existing.customer,
            customerId:
              payload.customerId !== undefined
                ? payload.customerId || undefined
                : existing.customerId,
            paymentMethod: payload.paymentMethod ?? existing.paymentMethod,
            discount,
            cashTendered: payload.cashTendered ?? existing.cashTendered,
            change:
              payload.cashTendered !== undefined
                ? Math.max(0, payload.cashTendered - total)
                : existing.change,
            items,
            subtotal,
            total,
            status: payload.status ?? existing.status,
          };
          setSales((prev) => [updated, ...prev.filter((s) => s.id !== existing.id)]);
          return updated;
        }
      });
    },
    [runWithLoader, sales]
  );

  const deleteSale = useCallback((id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id && s.apiId !== id));
  }, []);

  const clearSales = useCallback(() => {
    setSales([]);
  }, []);

  const pendingSales = useMemo(
    () => sales.filter((s) => s.status === 'pending'),
    [sales]
  );
  const completedSales = useMemo(
    () => sales.filter((s) => s.status === 'completed'),
    [sales]
  );

  const value = useMemo<SalesContextValue>(
    () => ({
      sales,
      pendingSales,
      completedSales,
      salesLoading,
      refreshSales,
      addSale,
      updateSale,
      deleteSale,
      clearSales,
    }),
    [
      sales,
      pendingSales,
      completedSales,
      salesLoading,
      refreshSales,
      addSale,
      updateSale,
      deleteSale,
      clearSales,
    ]
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within a SalesProvider');
  return ctx;
}
