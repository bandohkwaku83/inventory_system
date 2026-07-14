'use client';

import DashboardLayout from '../../../components/DashboardLayout';
import { GoodsReceiptForm } from '../../../components/goods-receipts/GoodsReceiptForm';

export default function NewGoodsReceiptPage() {
  return (
    <DashboardLayout>
      <GoodsReceiptForm mode="create" />
    </DashboardLayout>
  );
}
