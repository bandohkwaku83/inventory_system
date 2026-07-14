'use client';

import React, { Suspense } from 'react';
import { Spin } from 'antd';
import DashboardLayout from '../../../components/DashboardLayout';
import { StockMovementForm } from '../../../components/stock-movements/StockMovementForm';

export default function NewStockMovementPage() {
  return (
    <DashboardLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-16">
            <Spin size="large" />
          </div>
        }
      >
        <StockMovementForm />
      </Suspense>
    </DashboardLayout>
  );
}
