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
  EditOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useWarehouses } from '../../context/WarehousesContext';
import { BRAND } from '../../lib/brand';
import {
  fetchTransfers,
  fetchTransfersMeta,
  formatTransferDate,
  formatTransferPerson,
  transferLineCount,
  transferTotalQty,
  TRANSFER_STATUS_COLORS,
  TRANSFER_STATUS_LABELS,
  type TransferStatus,
  type TransfersMeta,
  type WarehouseTransfer,
} from '../../lib/transfersApi';

const { Title, Text } = Typography;

export default function WarehouseTransfersListPage() {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();

  const [items, setItems] = useState<WarehouseTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta] = useState<TransfersMeta | null>(null);
  const [statusFilter, setStatusFilter] = useState<TransferStatus | 'all'>('all');
  const [warehouseFilter, setWarehouseFilter] = useState<string>('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTransfers({
        page,
        limit,
        status: statusFilter === 'all' ? '' : statusFilter,
        warehouseId: warehouseFilter || undefined,
        q: search.trim() || undefined,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load transfers');
      setItems([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, warehouseFilter, search]);

  useEffect(() => {
    void fetchTransfersMeta()
      .then(setMeta)
      .catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const statuses: Array<TransferStatus | 'all'> = [
    'all',
    ...(meta?.statuses ?? [
      'draft',
      'pending_approval',
      'in_transit',
      'received',
      'cancelled',
    ]),
  ];

  const columns: TableProps<WarehouseTransfer>['columns'] = [
    {
      title: 'Number',
      dataIndex: 'transferNumber',
      width: 120,
      render: (v: string, r) => (
        <button
          type="button"
          className="font-mono text-xs font-semibold hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/warehouse-transfers/${r.id}`)}
        >
          {v || '—'}
        </button>
      ),
    },
    {
      title: 'From',
      key: 'from',
      render: (_, r) => (
        <span>
          <span className="font-mono text-xs text-slate-500">{r.fromWarehouse.code}</span>
          <span className="ml-1">{r.fromWarehouse.name || '—'}</span>
        </span>
      ),
    },
    {
      title: 'To',
      key: 'to',
      render: (_, r) => (
        <span>
          <span className="font-mono text-xs text-slate-500">{r.toWarehouse.code}</span>
          <span className="ml-1">{r.toWarehouse.name || '—'}</span>
        </span>
      ),
    },
    {
      title: 'Lines',
      key: 'lines',
      width: 90,
      render: (_, r) => (
        <Text type="secondary">
          {transferLineCount(r)} / {transferTotalQty(r)} qty
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 130,
      render: (s: TransferStatus) => (
        <Tag color={TRANSFER_STATUS_COLORS[s]}>{TRANSFER_STATUS_LABELS[s]}</Tag>
      ),
    },
    {
      title: 'Requested by',
      key: 'requestedBy',
      render: (_, r) => formatTransferPerson(r.requestedBy),
    },
    {
      title: 'Date',
      dataIndex: 'createdAt',
      width: 170,
      render: (v: string) => formatTransferDate(v),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, r) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => router.push(`/dashboard/warehouse-transfers/${r.id}`)}
          />
          {r.status === 'draft' && (
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => router.push(`/dashboard/warehouse-transfers/${r.id}/edit`)}
            />
          )}
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
              Stock Transfers
            </Title>
            <Text type="secondary">
              Move inventory between warehouses — approve to ship, receive to complete
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => router.push('/dashboard/warehouse-transfers/new')}
          >
            New transfer
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
                      : TRANSFER_STATUS_COLORS[s]
                    : undefined
                }
                className="cursor-pointer !m-0"
                onClick={() => {
                  setStatusFilter(s);
                  setPage(1);
                }}
              >
                {s === 'all' ? 'All' : TRANSFER_STATUS_LABELS[s]}
              </Tag>
            ))}
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              allowClear
              prefix={<SearchOutlined />}
              placeholder="Search transfer # (Enter)"
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
              placeholder="Warehouse (either side)"
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
              onDoubleClick: () =>
                router.push(`/dashboard/warehouse-transfers/${r.id}`),
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
