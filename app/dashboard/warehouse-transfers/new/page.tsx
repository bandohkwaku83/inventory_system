'use client';

import DashboardLayout from '../../../components/DashboardLayout';
import { TransferForm } from '../../../components/transfers/TransferForm';

export default function NewWarehouseTransferPage() {
  return (
    <DashboardLayout>
      <TransferForm mode="create" />
    </DashboardLayout>
  );
}
