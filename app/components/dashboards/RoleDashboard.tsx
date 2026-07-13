'use client';

import React from 'react';
import { Spin } from 'antd';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { resolveDashboardVariant, userCanAccessPath } from '../../lib/permissions';
import AdminDashboard from './AdminDashboard';
import SalesDashboard from './SalesDashboard';
import InventoryDashboard from './InventoryDashboard';
import FinanceDashboard from './FinanceDashboard';
import HrDashboard from './HrDashboard';
import { useDashboardData } from './useDashboardData';

export default function RoleDashboard() {
  const { user } = useAuth();
  const { roles } = useSettings();
  const { dashboard, summary, staffSummary, loading, error } = useDashboardData();

  if (!user) return null;

  const canAccess = (path: string) =>
    userCanAccessPath(user.role, user.entitlements, path, roles);

  const variant = resolveDashboardVariant(user.role, user.entitlements, roles);

  const content = (() => {
    switch (variant) {
      case 'sales':
        return (
          <SalesDashboard dashboard={dashboard} error={error} canAccess={canAccess} />
        );
      case 'inventory':
        return (
          <InventoryDashboard
            dashboard={dashboard}
            summary={summary}
            error={error}
            canAccess={canAccess}
          />
        );
      case 'finance':
        return (
          <FinanceDashboard dashboard={dashboard} error={error} canAccess={canAccess} />
        );
      case 'hr':
        return (
          <HrDashboard staffSummary={staffSummary} error={error} canAccess={canAccess} />
        );
      case 'admin':
      default:
        return (
          <AdminDashboard dashboard={dashboard} error={error} canAccess={canAccess} />
        );
    }
  })();

  return (
    <Spin spinning={loading} tip="Loading dashboard…">
      {content}
    </Spin>
  );
}
