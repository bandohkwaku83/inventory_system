'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from 'react';

export type SalePaymentMethod = 'Cash' | 'Mobile Money';

export interface SaleItem {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface Sale {
  id: string;
  timestamp: string;
  date: string;
  time: string;
  customer: string;
  servedBy?: string;
  servedByName?: string;
  paymentMethod: SalePaymentMethod;
  subtotal: number;
  discount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  items: SaleItem[];
}

const STORAGE_KEY = 'inventory_system_sales';

function seedSales(): Sale[] {
  const now = new Date();
  const mk = (
    daysAgo: number,
    hour: number,
    minute: number,
    method: SalePaymentMethod,
    customer: string,
    items: SaleItem[]
  ): Sale => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
    return {
      id: `R-${d.getTime().toString(36).toUpperCase()}`,
      timestamp: d.toISOString(),
      date: d.toISOString().slice(0, 10),
      time: d.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      customer,
      paymentMethod: method,
      subtotal,
      discount: 0,
      total: subtotal,
      cashTendered: method === 'Cash' ? Math.ceil(subtotal / 10) * 10 : undefined,
      change:
        method === 'Cash'
          ? Math.ceil(subtotal / 10) * 10 - subtotal
          : undefined,
      items,
    };
  };

  return [
    mk(0, 9, 14, 'Cash', 'Walk-in', [
      { id: '1', name: 'Milk 1L', sku: 'MLK-001', price: 7, quantity: 2 },
      { id: '2', name: 'Bread (Loaf)', sku: 'BRD-002', price: 5, quantity: 1 },
    ]),
    mk(0, 11, 42, 'Mobile Money', 'Ama K.', [
      { id: '3', name: 'Rice 2kg', sku: 'RCE-003', price: 15, quantity: 1 },
      { id: '4', name: 'Cooking Oil 1L', sku: 'OIL-004', price: 14, quantity: 1 },
    ]),
    mk(1, 8, 30, 'Cash', 'Walk-in', [
      { id: '7', name: 'Eggs (Tray)', price: 18, quantity: 1 },
    ]),
    mk(1, 16, 5, 'Mobile Money', 'Kojo B.', [
      { id: '1', name: 'Milk 1L', sku: 'MLK-001', price: 7, quantity: 3 },
      { id: '6', name: 'Snacks (Pack)', price: 3.5, quantity: 4 },
    ]),
    mk(2, 10, 12, 'Cash', 'Walk-in', [
      { id: '8', name: 'Tomatoes 1kg', price: 8, quantity: 2 },
    ]),
    mk(3, 13, 48, 'Cash', 'Walk-in', [
      { id: '2', name: 'Bread (Loaf)', sku: 'BRD-002', price: 5, quantity: 2 },
    ]),
    mk(4, 9, 22, 'Mobile Money', 'Yaa S.', [
      { id: '3', name: 'Rice 2kg', sku: 'RCE-003', price: 15, quantity: 2 },
    ]),
    mk(5, 15, 30, 'Cash', 'Walk-in', [
      { id: '4', name: 'Cooking Oil 1L', sku: 'OIL-004', price: 14, quantity: 1 },
      { id: '1', name: 'Milk 1L', sku: 'MLK-001', price: 7, quantity: 1 },
    ]),
    mk(8, 11, 0, 'Cash', 'Walk-in', [
      { id: '7', name: 'Eggs (Tray)', price: 18, quantity: 2 },
    ]),
    mk(12, 17, 0, 'Mobile Money', 'Kwesi O.', [
      { id: '3', name: 'Rice 2kg', sku: 'RCE-003', price: 15, quantity: 3 },
    ]),
  ];
}

function loadSales(): Sale[] {
  if (typeof window === 'undefined') return seedSales();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedSales();
    const parsed = JSON.parse(raw) as Sale[];
    return Array.isArray(parsed) ? parsed : seedSales();
  } catch {
    return seedSales();
  }
}

function saveSales(sales: Sale[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
  } catch (_) {}
}

export interface SalesContextValue {
  sales: Sale[];
  addSale: (sale: Omit<Sale, 'timestamp'> & { timestamp?: string }) => void;
  deleteSale: (id: string) => void;
  clearSales: () => void;
}

const SalesContext = createContext<SalesContextValue | undefined>(undefined);

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [sales, setSales] = useState<Sale[]>(() => {
    if (typeof window === 'undefined') return [];
    return loadSales();
  });

  useEffect(() => {
    saveSales(sales);
  }, [sales]);

  const addSale = useCallback<SalesContextValue['addSale']>((sale) => {
    const timestamp = sale.timestamp ?? new Date().toISOString();
    setSales((prev) => [{ ...sale, timestamp }, ...prev]);
  }, []);

  const deleteSale = useCallback((id: string) => {
    setSales((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const clearSales = useCallback(() => {
    setSales([]);
  }, []);

  const value = useMemo<SalesContextValue>(
    () => ({ sales, addSale, deleteSale, clearSales }),
    [sales, addSale, deleteSale, clearSales]
  );

  return <SalesContext.Provider value={value}>{children}</SalesContext.Provider>;
}

export function useSales(): SalesContextValue {
  const ctx = useContext(SalesContext);
  if (!ctx) throw new Error('useSales must be used within a SalesProvider');
  return ctx;
}
