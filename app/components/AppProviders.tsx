'use client';

import React from 'react';
import { ProductsProvider } from '../context/ProductsContext';
import { SuppliersProvider } from '../context/SuppliersContext';
import { PurchasesProvider } from '../context/PurchasesContext';
import { SalesProvider } from '../context/SalesContext';
import { ProformaProvider } from '../context/ProformaContext';
import { StaffProvider } from '../context/StaffContext';
import { CustomersProvider } from '../context/CustomersContext';
import { WarehousesProvider } from '../context/WarehousesContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { hasFullCatalogAccess } from '../context/UsersContext';

export function AppProviders({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { categories, roles } = useSettings();

  const extraCategories = categories.map((c) => ({ id: c.id, name: c.name }));
  const allowedCategoryIds =
    user && !hasFullCatalogAccess(user.role, user.categoryIds, roles, user.entitlements)
      ? user.categoryIds
      : [];

  return (
    <ProductsProvider extraCategories={extraCategories} allowedCategoryIds={allowedCategoryIds}>
      <SuppliersProvider>
        <PurchasesProvider>
          <SalesProvider>
            <ProformaProvider>
              <CustomersProvider>
                <WarehousesProvider>
                  <StaffProvider>{children}</StaffProvider>
                </WarehousesProvider>
              </CustomersProvider>
            </ProformaProvider>
          </SalesProvider>
        </PurchasesProvider>
      </SuppliersProvider>
    </ProductsProvider>
  );
}
