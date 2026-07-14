'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Typography,
  Table,
  Tag,
  Button,
  Input,
  Select,
  Space,
  Radio,
  Popconfirm,
  message,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { WarehouseFormModal } from '../../components/warehouses/WarehouseFormModal';
import { useWarehouses } from '../../context/WarehousesContext';
import { BRAND } from '../../lib/brand';
import type { Warehouse } from '../../lib/warehousesApi';

const { Title, Text } = Typography;

export default function WarehousesListPage() {
  const router = useRouter();
  const {
    warehouses,
    warehousesLoading,
    meta,
    updateWarehouse,
    deleteWarehouse,
  } = useWarehouses();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Warehouse | null>(null);

  const filtered = useMemo(() => {
    let list = warehouses;
    if (statusFilter !== 'all') {
      list = list.filter((w) => w.status === statusFilter);
    }
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        (w.address || '').toLowerCase().includes(q) ||
        (w.phone || '').toLowerCase().includes(q) ||
        (w.manager?.name || '').toLowerCase().includes(q) ||
        (w.manager?.email || '').toLowerCase().includes(q)
    );
  }, [warehouses, search, statusFilter]);

  const defaultId = warehouses.find((w) => w.isDefault)?.id ?? '';

  const setDefault = async (id: string) => {
    try {
      await updateWarehouse(id, { isDefault: true });
      message.success('Default warehouse updated');
    } catch {
      /* context toast */
    }
  };

  const handleDelete = async (wh: Warehouse) => {
    try {
      await deleteWarehouse(wh.id);
      message.success('Warehouse deleted');
    } catch {
      /* 409 when stock > 0 */
    }
  };

  const columns: TableProps<Warehouse>['columns'] = [
    {
      title: 'Name',
      dataIndex: 'name',
      render: (v: string, r) => (
        <button
          type="button"
          className="text-left font-medium text-slate-800 hover:underline"
          style={{ color: BRAND }}
          onClick={() => router.push(`/dashboard/warehouses/${r.id}`)}
        >
          {v}
        </button>
      ),
    },
    {
      title: 'Code',
      dataIndex: 'code',
      width: 120,
      render: (v: string) => (
        <span className="font-mono text-xs font-semibold">{v}</span>
      ),
    },
    {
      title: 'Address',
      dataIndex: 'address',
      ellipsis: true,
      render: (v: string) => v || '—',
    },
    {
      title: 'Manager',
      key: 'manager',
      width: 160,
      ellipsis: true,
      render: (_, r) =>
        r.manager?.name || r.manager?.email || '—',
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      width: 140,
      render: (v: string) => v || '—',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 110,
      render: (s: string) => (
        <Tag color={s === 'active' ? 'success' : 'default'}>{s}</Tag>
      ),
    },
    {
      title: 'Default',
      key: 'default',
      width: 100,
      align: 'center',
      render: (_, r) => (
        <Radio
          checked={r.id === defaultId}
          onChange={() => void setDefault(r.id)}
          disabled={r.status !== 'active'}
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="Open">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => router.push(`/dashboard/warehouses/${r.id}`)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => {
                setEditing(r);
                setFormOpen(true);
              }}
            />
          </Tooltip>
          <Popconfirm
            title="Delete warehouse?"
            description="The API rejects delete when stock quantity is greater than zero."
            onConfirm={() => void handleDelete(r)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
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
              Warehouses
            </Title>
            <Text type="secondary">
              Warehouses, zone → bin locations, and where products live
            </Text>
          </div>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Add warehouse
          </Button>
        </div>

        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <Input
              allowClear
              prefix={<SearchOutlined className="text-slate-400" />}
              placeholder="Search name, code, address, phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="w-40"
              options={[
                { value: 'all', label: 'All' },
                ...(meta.statuses ?? ['active', 'inactive']).map((s) => ({
                  value: s,
                  label: s.charAt(0).toUpperCase() + s.slice(1),
                })),
              ]}
            />
          </div>

          <Table<Warehouse>
            rowKey="id"
            loading={warehousesLoading}
            columns={columns}
            dataSource={filtered}
            pagination={{ pageSize: 12, showTotal: (t) => `${t} warehouses` }}
            onRow={(r) => ({
              onDoubleClick: () => router.push(`/dashboard/warehouses/${r.id}`),
            })}
          />
        </Card>
      </div>

      <WarehouseFormModal
        open={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
      />
    </DashboardLayout>
  );
}
