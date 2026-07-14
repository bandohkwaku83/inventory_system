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
import { apiUrl, readApiError } from '../lib/productsApi';
import {
  mapApiPurchase,
  purchasePaymentsUrl,
  purchaseResourceUrl,
  extractPurchasesArray,
  safeMapApiPurchase,
  type ApiPurchase,
  type PurchasesSummaryDto,
} from '../lib/purchasesApi';

export interface PurchaseItem {
  productId?: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export type PurchaseStatus = 'completed' | 'pending' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface PurchasePayment {
  id: string;
  amount: number;
  recordedAt: string;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  supplierName: string;
  invoiceNumber?: string;
  items: PurchaseItem[];
  totalCost: number;
  amountPaid: number;
  status: PurchaseStatus;
  notes?: string;
  currency?: string;
  /** Present when API returns payment aggregates */
  paymentStatus?: PaymentStatus;
  balance?: number;
  payments?: PurchasePayment[];
}

export function getPaymentStatus(p: Purchase): PaymentStatus {
  if (p.paymentStatus === 'paid' || p.paymentStatus === 'partial' || p.paymentStatus === 'unpaid') {
    return p.paymentStatus;
  }
  if (p.amountPaid >= p.totalCost) return 'paid';
  if (p.amountPaid <= 0) return 'unpaid';
  return 'partial';
}

export interface SupplierStats {
  totalOrders: number;
  outstandingBalance: number;
  totalSpend: number;
  lastOrderDate?: string;
}

export type PurchasesSummary = PurchasesSummaryDto;

interface PurchasesContextValue {
  purchases: Purchase[];
  purchasesLoading: boolean;
  purchasesSummary: PurchasesSummary | null;
  refreshPurchases: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  fetchPurchase: (id: string) => Promise<Purchase | null>;
  addPurchase: (p: Omit<Purchase, 'id' | 'currency' | 'paymentStatus' | 'balance' | 'payments'>) => Promise<void>;
  deletePurchase: (id: string) => Promise<void>;
  recordPayment: (id: string, amount: number) => Promise<void>;
  statsBySupplier: Record<string, SupplierStats>;
  getStatsForSupplier: (supplierId: string) => SupplierStats;
}

const PurchasesContext = createContext<PurchasesContextValue | null>(null);

export function PurchasesProvider({ children }: { children: React.ReactNode }) {
  const { runWithLoader } = useActionLoader();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [purchasesSummary, setPurchasesSummary] = useState<PurchasesSummary | null>(null);

  const refreshSummary = useCallback(async () => {
    const res = await fetch(apiUrl('/api/purchases/summary'));
    if (!res.ok) throw new Error(await readApiError(res));
    const data = (await res.json()) as PurchasesSummaryDto;
    setPurchasesSummary(data);
  }, []);

  const refreshPurchases = useCallback(async () => {
    const all: ReturnType<typeof mapApiPurchase>[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const res = await fetch(apiUrl(`/api/purchases?page=${page}&limit=100`));
      if (!res.ok) throw new Error(await readApiError(res));
      const raw = (await res.json()) as unknown;
      const list = extractPurchasesArray(raw);
      if (!list) throw new Error('Invalid purchases response');
      const mapped = list
        .map(safeMapApiPurchase)
        .filter((x): x is NonNullable<typeof x> => x != null);
      all.push(...mapped);

      if (raw && typeof raw === 'object') {
        const meta = raw as { totalPages?: number };
        totalPages =
          typeof meta.totalPages === 'number' && meta.totalPages > 0 ? meta.totalPages : 1;
      }
      page += 1;
    } while (page <= totalPages);

    setPurchases(all);
  }, []);

  const fetchPurchase = useCallback(async (id: string): Promise<Purchase | null> => {
    try {
      const res = await fetch(purchaseResourceUrl(id));
      if (!res.ok) return null;
      const data = (await res.json()) as ApiPurchase;
      return mapApiPurchase(data);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setPurchasesLoading(true);
      try {
        await refreshPurchases();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load purchases');
      } finally {
        setPurchasesLoading(false);
      }
      try {
        await refreshSummary();
      } catch {
        setPurchasesSummary(null);
      }
    })();
  }, [refreshPurchases, refreshSummary]);

  const addPurchase = useCallback(
    async (p: Omit<Purchase, 'id' | 'currency' | 'paymentStatus' | 'balance' | 'payments'>) => {
      return runWithLoader(async () => {
        const lineItems = p.items
          .filter((i) => i.productId)
          .map((i) => ({
            productId: i.productId!,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
          }));
        if (lineItems.length === 0) {
          message.error('Each line item must have a product');
          throw new Error('Invalid line items');
        }
        const body: Record<string, unknown> = {
          date: p.date,
          supplierId: p.supplierId,
          amountPaid: p.amountPaid,
          lineItems,
        };
        if (p.invoiceNumber != null && String(p.invoiceNumber).trim() !== '') {
          body.invoiceNumber = p.invoiceNumber;
        }
        const res = await fetch(apiUrl('/api/purchases'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshPurchases();
        try {
          await refreshSummary();
        } catch {
          setPurchasesSummary(null);
        }
      });
    },
    [refreshPurchases, refreshSummary, runWithLoader]
  );

  const deletePurchase = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const res = await fetch(purchaseResourceUrl(id), { method: 'DELETE' });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshPurchases();
        try {
          await refreshSummary();
        } catch {
          setPurchasesSummary(null);
        }
      });
    },
    [refreshPurchases, refreshSummary, runWithLoader]
  );

  const recordPayment = useCallback(
    async (id: string, amount: number) => {
      if (amount <= 0) return;
      return runWithLoader(async () => {
        const res = await fetch(purchasePaymentsUrl(id), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount }),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshPurchases();
        try {
          await refreshSummary();
        } catch {
          setPurchasesSummary(null);
        }
      });
    },
    [refreshPurchases, refreshSummary, runWithLoader]
  );

  const statsBySupplier = useMemo<Record<string, SupplierStats>>(() => {
    const acc: Record<string, SupplierStats> = {};
    for (const p of purchases) {
      if (p.status === 'cancelled') continue;
      const cur = acc[p.supplierId] ?? {
        totalOrders: 0,
        outstandingBalance: 0,
        totalSpend: 0,
        lastOrderDate: undefined,
      };
      cur.totalOrders += 1;
      cur.totalSpend += p.totalCost;
      cur.outstandingBalance += Math.max(0, p.totalCost - p.amountPaid);
      if (!cur.lastOrderDate || p.date > cur.lastOrderDate) cur.lastOrderDate = p.date;
      acc[p.supplierId] = cur;
    }
    return acc;
  }, [purchases]);

  const getStatsForSupplier = useCallback(
    (supplierId: string): SupplierStats =>
      statsBySupplier[supplierId] ?? {
        totalOrders: 0,
        outstandingBalance: 0,
        totalSpend: 0,
        lastOrderDate: undefined,
      },
    [statsBySupplier]
  );

  const value = useMemo<PurchasesContextValue>(
    () => ({
      purchases,
      purchasesLoading,
      purchasesSummary,
      refreshPurchases,
      refreshSummary,
      fetchPurchase,
      addPurchase,
      deletePurchase,
      recordPayment,
      statsBySupplier,
      getStatsForSupplier,
    }),
    [
      purchases,
      purchasesLoading,
      purchasesSummary,
      refreshPurchases,
      refreshSummary,
      fetchPurchase,
      addPurchase,
      deletePurchase,
      recordPayment,
      statsBySupplier,
      getStatsForSupplier,
    ]
  );

  return <PurchasesContext.Provider value={value}>{children}</PurchasesContext.Provider>;
}

export function usePurchases() {
  const ctx = useContext(PurchasesContext);
  if (!ctx) throw new Error('usePurchases must be used within PurchasesProvider');
  return ctx;
}
