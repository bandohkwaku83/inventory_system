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
  countVarianceTotal,
  fetchStockCounts,
  fetchStockCountsMeta,
  formatCountDate,
  formatCountPerson,
  COUNT_STATUS_COLORS,
  COUNT_STATUS_LABELS,
  type StockCount,
  type StockCountStatus,
  type StockCountsMeta,
} from '../../lib/stockCountsApi';

const { Title, Text } = Typography;

export default function StockCountsListPage() {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();

  const [items, setItems] = useState<StockCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<StockCountsMeta | null>(null);
  const [statusFilter, setStatusFilter] = useState<StockCountStatus | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchStockCounts({
        page,
        limit,
        status: statusFilter === 'all' ? '' : statusFilter,
        warehouseId: warehouseFilter || undefined,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load stock counts');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, warehouseFilter, search]);

  useEffect(() => {
    void fetchStockCountsMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statuses: Array<StockCountStatus | 'all'> = [
    'all',
    ...(meta?.statuses ?? [
      'draft',
      'counting',
      'pending_approval',
      'approved',
      'rejected',
      'cancelled',
    ]),
  ];

  const columns: TableProps<StockCount>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'countNumber',
      width: 130,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/stock-counts/${r.id}`)}
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
      title: 'Location',
      key: 'location',
      render: (_, r) =>
        r.location
          ? r.location.fullPath || `${r.location.code} — ${r.location.name}`
          : 'All',
    },
    {
      title: 'Lines',
      key: 'lines',
      width: 70,
      render: (_, r) => r.lines.length,
    },
    {
      title: 'Net variance',
      key: 'variance',
      width: 110,
      render: (_, r) => {
        const v = countVarianceTotal(r);
        const color = v > 0 ? '#16a34a' : v < 0 ? '#dc2626' : undefined;
        return <span style={{ color }}>{v}</span>;
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 120,
      render: (s: StockCountStatus) => (
        <Tag color={COUNT_STATUS_COLORS[s]}>{COUNT_STATUS_LABELS[s]}</Tag>
      ),
    },
    {
      title: 'Requested by',
      key: 'requestedBy',
      render: (_, r) => formatCountPerson(r.requestedBy),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => formatCountDate(v),
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
            onClick={() => router.push(`/dashboard/stock-counts/${r.id}`)}
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
              Stock Counts
            </Title>
            <Text type="secondary">
              Physical inventory counts — submit variances for approval
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/stock-counts/new')}
          >
            New count
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
                      : COUNT_STATUS_COLORS[s]
                    : undefined
                }
                className="cursor-pointer !m-0"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s === 'all' ? 'All' : COUNT_STATUS_LABELS[s]}
              </Tag>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search count # (Enter)"
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
              onDoubleClick: () => router.push(`/dashboard/stock-counts/${r.id}`),
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
