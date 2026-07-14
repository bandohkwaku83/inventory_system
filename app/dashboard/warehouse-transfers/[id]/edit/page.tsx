'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Spin, Result, Button, message } from 'antd';
import DashboardLayout from '../../../../components/DashboardLayout';
import { TransferForm } from '../../../../components/transfers/TransferForm';
import { fetchTransferById, type WarehouseTransfer } from '../../../../lib/transfersApi';

export default function EditWarehouseTransferPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [transfer, setTransfer] = useState<WarehouseTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const t = await fetchTransferById(id);
        if (cancelled) return;
        if (t.status !== 'draft') {
          message.warning('Only draft transfers can be edited');
          router.replace(`/dashboard/warehouse-transfers/${id}`);
          return;
        }
        setTransfer(t);
        setError(null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load transfer');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router]);

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error ? (
        <Result
          status="error"
          title="Could not open editor"
          subTitle={error}
          extra={
            <Button onClick={() => router.push('/dashboard/warehouse-transfers')}>
              Back to list
            </Button>
          }
        />
      ) : transfer ? (
        <TransferForm mode="edit" initial={transfer} />
      ) : null}
    </DashboardLayout>
  );
}
