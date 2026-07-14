'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Space, Table, Tag, Typography, message } from 'antd';
import type { TableProps } from 'antd';
import { EyeOutlined, PlusOutlined } from '@ant-design/icons';
import { BRAND } from '../../lib/brand';
import {
  formatMovementType,
  fetchWarehouseHistory,
  type WarehouseHistoryItem,
} from '../../lib/warehousesApi';
import {
  MOVEMENT_TYPE_COLORS,
  formatMovementDate,
  movementTypeLabel,
} from '../../lib/stockMovementsApi';

const { Text } = Typography;

type Props = {
  warehouseId: string;
};

export function HistoryPanel({ warehouseId }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<WarehouseHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchWarehouseHistory(warehouseId, { page, limit });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load history');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [warehouseId, page]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: TableProps<WarehouseHistoryItem>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'movementNumber',
      width: 110,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/stock-movements/${r.id}`)}
        >
          {v || '—'}
        </button>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      width: 120,
      render: (t: string) => (
        <Tag color={MOVEMENT_TYPE_COLORS[t] ?? 'default'}>
          {movementTypeLabel(t) || formatMovementType(t)}
        </Tag>
      ),
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, r) => (
        <div>
          <div className="font-medium">{r.productName}</div>
          {r.sku && (
            <Text type="secondary" className="font-mono text-xs">
              {r.sku}
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      width: 70,
      align: 'right',
    },
    {
      title: 'Delta',
      dataIndex: 'quantityDelta',
      width: 80,
      align: 'right',
      render: (d: number) => (
        <span
          className={
            d > 0
              ? 'font-semibold text-emerald-600'
              : d < 0
                ? 'font-semibold text-red-600'
                : ''
          }
        >
          {d > 0 ? `+${d}` : d}
        </span>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balanceAfter',
      width: 80,
      align: 'right',
      render: (v: number | null) => (v != null ? v : '—'),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, r) =>
        r.locationCode ? (
          <span className="font-mono text-xs">
            {r.locationCode}
            {r.locationName ? ` · ${r.locationName}` : ''}
          </span>
        ) : (
          '—'
        ),
    },
    {
      title: 'By',
      dataIndex: 'createdByName',
      width: 120,
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 150,
      render: (v: string) => (
        <span className="text-xs text-slate-600">{formatMovementDate(v)}</span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 48,
      render: (_, r) => (
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => router.push(`/dashboard/stock-movements/${r.id}`)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text type="secondary">
          Stock movements for this warehouse (source or destination).
        </Text>
        <Space>
          <Button
            onClick={() =>
              router.push(
                `/dashboard/stock-movements?warehouseId=${encodeURIComponent(warehouseId)}`
              )
            }
          >
            Open full ledger
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() =>
              router.push(
                `/dashboard/stock-movements/new?warehouseId=${encodeURIComponent(warehouseId)}`
              )
            }
          >
            Record movement
          </Button>
        </Space>
      </div>

      <Table<WarehouseHistoryItem>
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={items}
        size="middle"
        pagination={{
          current: page,
          pageSize: limit,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} movements`,
          onChange: (p) => setPage(p),
        }}
        onRow={(r) => ({
          onDoubleClick: () => router.push(`/dashboard/stock-movements/${r.id}`),
        })}
        locale={{ emptyText: 'No movements yet for this warehouse' }}
      />
    </div>
  );
}
