'use client';

import DashboardLayout from '../../../components/DashboardLayout';
import { GoodsIssueForm } from '../../../components/goods-issues/GoodsIssueForm';

export default function NewGoodsIssuePage() {
  return (
    <DashboardLayout>
      <GoodsIssueForm />
    </DashboardLayout>
  );
}
