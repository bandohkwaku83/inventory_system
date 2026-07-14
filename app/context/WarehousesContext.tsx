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
  createWarehouse as createWarehouseApi,
  deleteWarehouse as deleteWarehouseApi,
  fetchAllWarehouses,
  fetchWarehousesMeta,
  updateWarehouse as updateWarehouseApi,
  type CreateWarehousePayload,
  type UpdateWarehousePayload,
  type Warehouse,
  type WarehousesMeta,
  DEFAULT_WAREHOUSES_META,
} from '../lib/warehousesApi';

interface WarehousesContextValue {
  warehouses: Warehouse[];
  warehousesLoading: boolean;
  meta: WarehousesMeta;
  refreshWarehouses: () => Promise<void>;
  addWarehouse: (input: CreateWarehousePayload) => Promise<Warehouse>;
  updateWarehouse: (id: string, updates: UpdateWarehousePayload) => Promise<Warehouse>;
  deleteWarehouse: (id: string) => Promise<void>;
  getWarehouse: (id: string) => Warehouse | undefined;
}

const WarehousesContext = createContext<WarehousesContextValue | null>(null);

export function WarehousesProvider({ children }: { children: React.ReactNode }) {
  const { runWithLoader } = useActionLoader();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesLoading, setWarehousesLoading] = useState(true);
  const [meta, setMeta] = useState<WarehousesMeta>(DEFAULT_WAREHOUSES_META);

  const refreshWarehouses = useCallback(async () => {
    const [list, nextMeta] = await Promise.all([
      fetchAllWarehouses(),
      fetchWarehousesMeta().catch(() => DEFAULT_WAREHOUSES_META),
    ]);
    setWarehouses(list);
    setMeta(nextMeta);
  }, []);

  useEffect(() => {
    void (async () => {
      setWarehousesLoading(true);
      try {
        await refreshWarehouses();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load warehouses');
      } finally {
        setWarehousesLoading(false);
      }
    })();
  }, [refreshWarehouses]);

  const addWarehouse = useCallback(
    async (input: CreateWarehousePayload) => {
      return runWithLoader(async () => {
        try {
          const created = await createWarehouseApi(input);
          setWarehouses((prev) => [created, ...prev.filter((w) => w.id !== created.id)]);
          return created;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to create warehouse';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const updateWarehouse = useCallback(
    async (id: string, updates: UpdateWarehousePayload) => {
      return runWithLoader(async () => {
        try {
          const updated = await updateWarehouseApi(id, updates);
          setWarehouses((prev) => {
            let next = prev.map((w) =>
              w.id === id || w.id === updated.id ? updated : w
            );
            if (updated.isDefault) {
              next = next.map((w) =>
                w.id === updated.id ? w : { ...w, isDefault: false }
              );
            }
            return next;
          });
          return updated;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to update warehouse';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const deleteWarehouse = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        try {
          await deleteWarehouseApi(id);
          setWarehouses((prev) => prev.filter((w) => w.id !== id));
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to delete warehouse';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const getWarehouse = useCallback(
    (id: string) => warehouses.find((w) => w.id === id),
    [warehouses]
  );

  const value = useMemo(
    () => ({
      warehouses,
      warehousesLoading,
      meta,
      refreshWarehouses,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      getWarehouse,
    }),
    [
      warehouses,
      warehousesLoading,
      meta,
      refreshWarehouses,
      addWarehouse,
      updateWarehouse,
      deleteWarehouse,
      getWarehouse,
    ]
  );

  return (
    <WarehousesContext.Provider value={value}>{children}</WarehousesContext.Provider>
  );
}

export function useWarehouses() {
  const ctx = useContext(WarehousesContext);
  if (!ctx) throw new Error('useWarehouses must be used within WarehousesProvider');
  return ctx;
}
