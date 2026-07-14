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
  createCustomer as createCustomerApi,
  deleteCustomer as deleteCustomerApi,
  fetchCustomers,
  updateCustomer as updateCustomerApi,
  type CreateCustomerPayload,
  type MappedCustomer,
  type UpdateCustomerPayload,
} from '../lib/customersApi';

export type Customer = MappedCustomer;

export type NewCustomerInput = {
  name: string;
  phone: string;
  location?: string;
  city?: string;
};

interface CustomersContextValue {
  customers: Customer[];
  customersLoading: boolean;
  refreshCustomers: () => Promise<void>;
  addCustomer: (input: NewCustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, updates: UpdateCustomerPayload) => Promise<Customer>;
  deleteCustomer: (id: string) => Promise<void>;
  getCustomer: (id: string) => Customer | undefined;
}

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const { runWithLoader } = useActionLoader();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customersLoading, setCustomersLoading] = useState(true);

  const refreshCustomers = useCallback(async () => {
    const list = await fetchCustomers();
    setCustomers(list);
  }, []);

  useEffect(() => {
    void (async () => {
      setCustomersLoading(true);
      try {
        await refreshCustomers();
      } catch (e) {
        message.error(e instanceof Error ? e.message : 'Failed to load customers');
      } finally {
        setCustomersLoading(false);
      }
    })();
  }, [refreshCustomers]);

  const addCustomer = useCallback(
    async (input: NewCustomerInput) => {
      return runWithLoader(async () => {
        try {
          const payload: CreateCustomerPayload = {
            name: input.name,
            phone: input.phone,
            city: input.city ?? input.location,
          };
          const created = await createCustomerApi(payload);
          setCustomers((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
          return created;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to create customer';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const updateCustomer = useCallback(
    async (id: string, updates: UpdateCustomerPayload) => {
      return runWithLoader(async () => {
        try {
          const updated = await updateCustomerApi(id, updates);
          setCustomers((prev) =>
            prev.map((c) => (c.id === id || c.id === updated.id ? updated : c))
          );
          return updated;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to update customer';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const deleteCustomer = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        try {
          await deleteCustomerApi(id);
          setCustomers((prev) => prev.filter((c) => c.id !== id));
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to delete customer';
          message.error(err);
          throw e instanceof Error ? e : new Error(err);
        }
      });
    },
    [runWithLoader]
  );

  const getCustomer = useCallback(
    (id: string) => customers.find((c) => c.id === id),
    [customers]
  );

  const value = useMemo(
    () => ({
      customers,
      customersLoading,
      refreshCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomer,
    }),
    [
      customers,
      customersLoading,
      refreshCustomers,
      addCustomer,
      updateCustomer,
      deleteCustomer,
      getCustomer,
    ]
  );

  return (
    <CustomersContext.Provider value={value}>{children}</CustomersContext.Provider>
  );
}

export function useCustomers() {
  const ctx = useContext(CustomersContext);
  if (!ctx) throw new Error('useCustomers must be used within CustomersProvider');
  return ctx;
}
