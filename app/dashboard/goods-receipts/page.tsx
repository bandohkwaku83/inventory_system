'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useWarehouses } from '../../context/WarehousesContext';
import { BRAND } from '../../lib/brand';
import {
  fetchGoodsReceipts,
  fetchGoodsReceiptsMeta,
  formatReceiptDate,
  formatReceiptPerson,
  receiptLineCount,
  receiptTotalQty,
  RECEIPT_STATUS_COLORS,
  RECEIPT_STATUS_LABELS,
  type GoodsReceipt,
  type GoodsReceiptStatus,
  type GoodsReceiptsMeta,
} from '../../lib/goodsReceiptsApi';

const { Title, Text } = Typography;

export default function GoodsReceiptsListPage() {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();

  const [items, setItems] = useState<GoodsReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<GoodsReceiptsMeta | null>(null);
  const [statusFilter, setStatusFilter] = useState<GoodsReceiptStatus | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchGoodsReceipts({
        page,
        limit,
        status: statusFilter === 'all' ? '' : statusFilter,
        warehouseId: warehouseFilter || undefined,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load receipts');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, warehouseFilter, search]);

  useEffect(() => {
    void fetchGoodsReceiptsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statuses: Array<GoodsReceiptStatus | 'all'> = [
    'all',
    ...(meta?.statuses ?? [
      'draft',
      'pending_approval',
      'approved',
      'rejected',
      'cancelled',
    ]),
  ];

  const columns: TableProps<GoodsReceipt>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'receiptNumber',
      width: 130,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/goods-receipts/${r.id}`)}
        >
          {v || '—'}
        </button>
      ),
    },
    {
      title: 'Warehouse',
      key: 'warehouse',
      render: (_, r) => (
        <span>
          <span className="font-mono text-xs text-slate-500">{r.warehouse.code}</span>
          <span className="ml-1">{r.warehouse.name || '—'}</span>
        </span>
      ),
    },
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, r) => r.supplier?.name || r.supplierName || '—',
    },
    {
      title: 'Lines',
      key: 'lines',
      width: 90,
      render: (_, r) => (
        <Text type="secondary">
          {receiptLineCount(r)} / {receiptTotalQty(r)} qty
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: GoodsReceiptStatus) => (
        <Tag color={RECEIPT_STATUS_COLORS[s]}>{RECEIPT_STATUS_LABELS[s]}</Tag>
      ),
    },
    {
      title: 'Requested by',
      key: 'requestedBy',
      render: (_, r) => formatReceiptPerson(r.requestedBy),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => formatReceiptDate(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 60,
      render: (_, r) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/goods-receipts/${r.id}`)}
          />
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Title level={3} className="!mb-1">
              Goods Receipts
            </Title>
            <Text type="secondary">
              Receive purchase stock into warehouses — approve to post inventory
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/goods-receipts/new')}
          >
            New receipt
          </Button>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {statuses.map((s) => (
              <Tag
                key={s}
                color={
                  statusFilter === s
                    ? s === 'all'
                      ? 'processing'
                      : RECEIPT_STATUS_COLORS[s]
                    : undefined
                }
                className="cursor-pointer !m-0"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s === 'all' ? 'All' : RECEIPT_STATUS_LABELS[s]}
              </Tag>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search receipt # (Enter)"
              style={{ maxWidth: 240 }}
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) {
                  setSearch('');
                  setPage(1);
                }
              }}
              onPressEnter={() => {
                setSearch(searchInput.trim());
                setPage(1);
              }}
            />
            <Select
              allowClear
              showSearch
              optionFilterProp="label"
              loading={warehousesLoading}
              placeholder="Warehouse"
              style={{ minWidth: 220 }}
              value={warehouseFilter || undefined}
              options={warehouses.map((w) => ({
                value: w.id,
                label: `${w.code} — ${w.name}`,
              }))}
              onChange={(v) => {
                setWarehouseFilter(v ?? '');
                setPage(1);
              }}
            />
          </div>

          <Table
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={items}
            onRow={(r) => ({
              onDoubleClick: () => router.push(`/dashboard/goods-receipts/${r.id}`),
            })}
            pagination={{
              current: page,
              pageSize: limit,
              total,
              showSizeChanger: false,
              onChange: setPage,
            }}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
