'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type StockStatus = 'Good' | 'Low' | 'Out';

export interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  costPrice: number;
  unit: string;
  quantity: number;
  reorderLevel: number;
  lastRestocked: string;
  sku?: string;
  image?: string | null;
}

export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity === 0) return 'Out';
  if (quantity <= reorderLevel) return 'Low';
  return 'Good';
}

const UNITS = ['units', 'kg', 'L', 'pack', 'boxes', 'pieces'];
const CATEGORIES = ['Groceries', 'Beverages', 'Dairy', 'Snacks', 'Household', 'Personal Care'];

const STORAGE_KEY = 'inventory_system_products';

const seedProducts: Product[] = [
  { id: 1, name: 'Milk 1L', category: 'Dairy', price: 7, costPrice: 5, unit: 'units', quantity: 30, reorderLevel: 20, lastRestocked: '2024-01-14', sku: 'MLK-001', image: null },
  { id: 2, name: 'Bread (Loaf)', category: 'Groceries', price: 5, costPrice: 3, unit: 'units', quantity: 15, reorderLevel: 20, lastRestocked: '2024-01-14', sku: 'BRD-002', image: null },
  { id: 3, name: 'Rice 2kg', category: 'Groceries', price: 15, costPrice: 10, unit: 'units', quantity: 150, reorderLevel: 50, lastRestocked: '2024-01-15', sku: 'RCE-003', image: null },
  { id: 4, name: 'Cooking Oil 1L', category: 'Groceries', price: 14, costPrice: 9, unit: 'units', quantity: 25, reorderLevel: 10, lastRestocked: '2024-01-14', sku: 'OIL-004', image: null },
  { id: 5, name: 'Soft Drinks 500ml', category: 'Beverages', price: 5, costPrice: 2.5, unit: 'units', quantity: 0, reorderLevel: 50, lastRestocked: '2024-01-10', sku: 'DRK-005', image: null },
  { id: 6, name: 'Snacks (Pack)', category: 'Snacks', price: 3.5, costPrice: 2, unit: 'units', quantity: 8, reorderLevel: 10, lastRestocked: '2024-01-13', image: null },
  { id: 7, name: 'Eggs (Tray)', category: 'Groceries', price: 18, costPrice: 12, unit: 'units', quantity: 20, reorderLevel: 5, lastRestocked: '2024-01-14', image: null },
  { id: 8, name: 'Tomatoes 1kg', category: 'Groceries', price: 8, costPrice: 4, unit: 'kg', quantity: 12, reorderLevel: 5, lastRestocked: '2024-01-13', image: null },
];

function loadProducts(): Product[] {
  if (typeof window === 'undefined') return seedProducts;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedProducts;
    const parsed = JSON.parse(raw) as Product[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : seedProducts;
  } catch {
    return seedProducts;
  }
}

function saveProducts(products: Product[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
  } catch (_) {}
}

interface ProductsContextValue {
  products: Product[];
  addProduct: (p: Omit<Product, 'id' | 'lastRestocked'>) => void;
  updateProduct: (id: number, updates: Partial<Product>) => void;
  deleteProduct: (id: number) => void;
  deductQuantities: (items: { id: number; quantity: number }[]) => void;
  getNextId: () => number;
  units: string[];
  categories: string[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setProducts(loadProducts());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || products.length === 0) return;
    saveProducts(products);
  }, [mounted, products]);

  const getNextId = useCallback(() => {
    const max = products.length === 0 ? 0 : Math.max(...products.map((p) => p.id));
    return max + 1;
  }, [products]);

  const addProduct = useCallback((p: Omit<Product, 'id' | 'lastRestocked'>) => {
    const today = new Date().toISOString().split('T')[0];
    setProducts((prev) => {
      const nextId = prev.length === 0 ? 1 : Math.max(...prev.map((x) => x.id)) + 1;
      return [...prev, { ...p, id: nextId, lastRestocked: today }];
    });
  }, []);

  const updateProduct = useCallback((id: number, updates: Partial<Product>) => {
    setProducts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const next = { ...item, ...updates };
        if (updates.quantity !== undefined || updates.reorderLevel !== undefined) {
          next.lastRestocked = new Date().toISOString().split('T')[0];
        }
        return next;
      })
    );
  }, []);

  const deleteProduct = useCallback((id: number) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const deductQuantities = useCallback((items: { id: number; quantity: number }[]) => {
    setProducts((prev) =>
      prev.map((p) => {
        const sold = items.find((i) => i.id === p.id);
        if (!sold) return p;
        const newQty = Math.max(0, p.quantity - sold.quantity);
        return { ...p, quantity: newQty };
      })
    );
  }, []);

  const value: ProductsContextValue = {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    deductQuantities,
    getNextId,
    units: UNITS,
    categories: CATEGORIES,
  };

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
