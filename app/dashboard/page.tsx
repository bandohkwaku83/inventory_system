'use client';

import DashboardLayout from '../components/DashboardLayout';
import RoleDashboard from '../components/dashboards/RoleDashboard';

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <RoleDashboard />
    </DashboardLayout>
  );
}
