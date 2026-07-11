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
  apiUrl,
  dataUrlToFile,
  mapApiProduct,
  productResourceUrl,
  readApiError,
  type ApiProduct,
} from '../lib/productsApi';

export type StockStatus = 'Good' | 'Low' | 'Out';

export interface Product {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  costPrice: number | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  lastRestocked: string;
  sku?: string;
  description?: string;
  image?: string | null;
}

export type ProductInput = {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  costPrice: number | null;
  /** Omit on create when empty; use `null` on update to clear. */
  sku?: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  image?: string | null;
};

export interface CategoryOption {
  id: string;
  name: string;
}

export function getStockStatus(quantity: number, reorderLevel: number): StockStatus {
  if (quantity === 0) return 'Out';
  if (quantity <= reorderLevel) return 'Low';
  return 'Good';
}

const DEFAULT_UNITS = ['units', 'kg', 'g', 'liters', 'ml', 'box', 'pack', 'dozen'];

interface ProductsContextValue {
  products: Product[];
  productsLoading: boolean;
  refreshProducts: () => Promise<void>;
  addProduct: (input: ProductInput) => Promise<void>;
  updateProduct: (id: string, updates: Partial<ProductInput>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  deductQuantities: (items: { id: string; quantity: number }[]) => Promise<void>;
  units: string[];
  categories: string[];
  categoryOptions: CategoryOption[];
  /** Products visible to current user based on category permissions. */
  visibleProducts: Product[];
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

type ProductsProviderProps = {
  children: React.ReactNode;
  /** Extra categories from settings (local/API). */
  extraCategories?: CategoryOption[];
  /** Restrict POS/catalog to these category IDs (empty = all). */
  allowedCategoryIds?: string[];
};

export function ProductsProvider({
  children,
  extraCategories = [],
  allowedCategoryIds = [],
}: ProductsProviderProps) {
  const { runWithLoader } = useActionLoader();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [units, setUnits] = useState<string[]>(DEFAULT_UNITS);

  const refreshProducts = useCallback(async () => {
    const res = await fetch(apiUrl('/api/products'));
    if (!res.ok) {
      throw new Error(await readApiError(res));
    }
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) {
      throw new Error('Invalid products response');
    }
    setProducts((data as ApiProduct[]).map(mapApiProduct));
  }, []);

  const fetchUnitsMeta = useCallback(async () => {
    try {
      const res = await fetch(apiUrl('/api/products/meta/units'));
      if (!res.ok) return;
      const d = (await res.json()) as { units?: string[] };
      if (Array.isArray(d.units) && d.units.length > 0) {
        setUnits(d.units);
      }
    } catch {
      /* keep defaults */
    }
  }, []);

  useEffect(() => {
    void (async () => {
      setProductsLoading(true);
      try {
        await Promise.all([refreshProducts(), fetchUnitsMeta()]);
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load products');
      } finally {
        setProductsLoading(false);
      }
    })();
  }, [refreshProducts, fetchUnitsMeta]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, CategoryOption>();
    for (const c of extraCategories) {
      if (c.id) map.set(c.id, c);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [extraCategories]);

  const visibleProducts = useMemo(() => {
    if (allowedCategoryIds.length === 0) return products;
    const allowed = new Set(allowedCategoryIds);
    return products.filter((p) => allowed.has(p.categoryId));
  }, [products, allowedCategoryIds]);

  const categories = useMemo(() => {
    const names = categoryOptions.map((c) => c.name).filter(Boolean);
    return names.sort((a, b) => a.localeCompare(b));
  }, [categoryOptions]);

  const addProduct = useCallback(
    async (input: ProductInput) => {
      return runWithLoader(async () => {
        const formData = new FormData();
        formData.append('name', input.name);
        formData.append('categoryId', input.categoryId);
        formData.append('sellingPrice', String(input.price));
        formData.append('unit', input.unit);
        formData.append('stockQuantity', String(input.quantity));
        formData.append('reorderAt', String(input.reorderLevel));
        if (input.sku?.trim()) formData.append('sku', input.sku.trim());
        if (input.description?.trim()) formData.append('description', input.description.trim());
        if (input.costPrice != null) formData.append('costPrice', String(input.costPrice));
        if (input.image?.startsWith('data:')) {
          const file = await dataUrlToFile(input.image, 'product.jpg');
          formData.append('image', file);
        }
        const res = await fetch(apiUrl('/api/products'), { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshProducts();
      });
    },
    [refreshProducts, runWithLoader]
  );

  const updateProduct = useCallback(
    async (id: string, updates: Partial<ProductInput>) => {
      return runWithLoader(async () => {
        const patch: Record<string, unknown> = {};
        if (updates.name !== undefined) patch.name = updates.name;
        if (updates.price !== undefined) patch.sellingPrice = updates.price;
        if (updates.costPrice !== undefined) patch.costPrice = updates.costPrice;
        if (updates.quantity !== undefined) patch.stockQuantity = updates.quantity;
        if (updates.reorderLevel !== undefined) patch.reorderAt = updates.reorderLevel;
        if (updates.unit !== undefined) patch.unit = updates.unit;
        if (updates.sku !== undefined) {
          const s = updates.sku;
          patch.sku = s == null || String(s).trim() === '' ? null : String(s).trim();
        }
        if (updates.description !== undefined) patch.description = updates.description;
        if (updates.categoryId !== undefined) patch.categoryId = updates.categoryId;
        const res = await fetch(productResourceUrl(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshProducts();
      });
    },
    [refreshProducts, runWithLoader]
  );

  const deleteProduct = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        const res = await fetch(productResourceUrl(id), { method: 'DELETE' });
        if (!res.ok) {
          const err = await readApiError(res);
          message.error(err);
          throw new Error(err);
        }
        await refreshProducts();
      });
    },
    [refreshProducts, runWithLoader]
  );

  const deductQuantities = useCallback(
    async (items: { id: string; quantity: number }[]) => {
      return runWithLoader(async () => {
        try {
          await Promise.all(
            items.map(async ({ id, quantity: soldQty }) => {
              const p = products.find((x) => x.id === id);
              if (!p) return;
              const nextQty = Math.max(0, p.quantity - soldQty);
              const res = await fetch(productResourceUrl(id), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ stockQuantity: nextQty }),
              });
              if (!res.ok) {
                throw new Error(await readApiError(res));
              }
            })
          );
          await refreshProducts();
        } catch (e) {
          message.error(e instanceof Error ? e.message : 'Could not update stock');
          throw e;
        }
      });
    },
    [products, refreshProducts, runWithLoader]
  );

  const value: ProductsContextValue = {
    products,
    productsLoading,
    refreshProducts,
    addProduct,
    updateProduct,
    deleteProduct,
    deductQuantities,
    units,
    categories,
    categoryOptions,
    visibleProducts,
  };

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
}

export function useProducts() {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error('useProducts must be used within ProductsProvider');
  return ctx;
}
