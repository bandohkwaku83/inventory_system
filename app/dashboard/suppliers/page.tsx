'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
  Space,
  Button,
  Input,
  Select,
  Modal,
  Form,
  Tooltip,
  Drawer,
  Descriptions,
  Empty,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  DownloadOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  UserOutlined,
  ShopOutlined,
  CheckCircleFilled,
  PauseCircleFilled,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  useSuppliers,
  type Supplier,
  type SupplierStatus,
} from '../../context/SuppliersContext';
import { usePurchases, type SupplierStats } from '../../context/PurchasesContext';
import { useSettings } from '../../context/SettingsContext';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

type SupplierRow = Supplier & SupplierStats;

const currency = (v: number) => `GHS ${v.toFixed(2)}`;

/** API uses slug-style categories (e.g. groceries); use title case in UI. */
function formatCategoryLabel(slug: string) {
  return slug
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

type SupplierFormValues = Omit<Supplier, 'id'>;

export default function SuppliersPage() {
  const { suppliers, suppliersLoading, addSupplier, updateSupplier, deleteSupplier, categories, statuses } =
    useSuppliers();
  const { statsBySupplier } = usePurchases();
  const { categories: productCategories } = useSettings();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<SupplierStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form] = Form.useForm<SupplierFormValues>();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const rows: SupplierRow[] = useMemo(
    () =>
      suppliers.map((s) => {
        const stats = statsBySupplier[s.id] ?? {
          totalOrders: 0,
          outstandingBalance: 0,
          totalSpend: 0,
          lastOrderDate: undefined,
        };
        return { ...s, ...stats };
      }),
    [suppliers, statsBySupplier]
  );

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== 'all') list = list.filter((s) => s.status === statusFilter);
    if (categoryFilter) list = list.filter((s) => s.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.id.toLowerCase().includes(q) ||
          (s.contactPerson && s.contactPerson.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q)) ||
          (s.phone && s.phone.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rows, search, statusFilter, categoryFilter]);

  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter((s) => s.status === 'active').length;
    const outstanding = rows.reduce((s, r) => s + r.outstandingBalance, 0);
    const cats = new Set(suppliers.map((s) => s.category)).size;
    return { total, active, inactive: total - active, outstanding, categories: cats };
  }, [suppliers, rows]);

  const viewing = viewingId ? rows.find((r) => r.id === viewingId) ?? null : null;

  const openAdd = () => {
    setMode('add');
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      status: 'active',
      category: productCategories[0]?.name ?? categories[0] ?? 'general',
    });
    setFormOpen(true);
  };

  const openEdit = (row: Supplier) => {
    setMode('edit');
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      contactPerson: row.contactPerson,
      phone: row.phone,
      email: row.email,
      category: row.category,
      location: row.location,
      address: row.address,
      status: row.status,
      notes: row.notes,
    });
    setFormOpen(true);
  };

  const openView = (row: Supplier) => {
    setViewingId(row.id);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    void form.validateFields().then(async (values) => {
      try {
        if (mode === 'edit' && editing) {
          await updateSupplier(editing.id, values);
        } else {
          await addSupplier(values);
        }
        setFormOpen(false);
        setEditing(null);
        form.resetFields();
      } catch {
        /* message from context */
      }
    });
  };

  const handleDelete = (row: Supplier) => {
    Modal.confirm({
      title: 'Delete supplier',
      content: (
        <div>
          Are you sure you want to delete <strong>{row.name}</strong>? This
          action cannot be undone.
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteSupplier(row.id),
    });
  };

  const toggleStatus = (row: Supplier) => {
    void updateSupplier(row.id, {
      status: row.status === 'active' ? 'inactive' : 'active',
    });
  };

  const handleExportCsv = () => {
    const header = [
      'ID',
      'Name',
      'Contact Person',
      'Phone',
      'Email',
      'Category',
      'Location',
      'Total Orders',
      'Outstanding (GHS)',
      'Last Order',
      'Status',
    ];
    const lines = filtered.map((s) =>
      [
        s.id,
        s.name,
        s.contactPerson ?? '',
        s.phone ?? '',
        s.email ?? '',
        s.category,
        s.location ?? '',
        s.totalOrders,
        s.outstandingBalance.toFixed(2),
        s.lastOrderDate ?? '',
        s.status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `suppliers-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: TableProps<SupplierRow>['columns'] = [
    {
      title: 'Supplier',
      key: 'supplier',
      width: 260,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, r) => (
        <Space align="center" size="middle">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25395c]/10 text-[#25395c]"
            aria-hidden
          >
            <ShopOutlined className="text-xl" />
          </div>
          <div className="min-w-0 truncate text-sm font-semibold text-slate-800">
            {r.name}
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 240,
      render: (_, r) => (
        <div className="space-y-0.5 text-xs">
          {r.contactPerson && (
            <div className="flex items-center gap-1.5 text-slate-700">
              <UserOutlined className="text-slate-400" />
              <span>{r.contactPerson}</span>
            </div>
          )}
          {r.phone && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <PhoneOutlined className="text-slate-400" />
              <span>{r.phone}</span>
            </div>
          )}
          {r.email && (
            <div className="flex items-center gap-1.5 text-slate-600">
              <MailOutlined className="text-slate-400" />
              <span className="truncate">{r.email}</span>
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
      filters: categories.map((c) => ({ text: formatCategoryLabel(c), value: c })),
      onFilter: (value, record) => record.category === value,
      render: (c: string) => (
        <Tag color="cyan" className="rounded-full">
          {formatCategoryLabel(c)}
        </Tag>
      ),
    },
    {
      title: 'Location',
      dataIndex: 'location',
      key: 'location',
      width: 130,
      render: (v?: string) =>
        v ? (
          <span className="inline-flex items-center gap-1 text-xs text-slate-600">
            <EnvironmentOutlined className="text-slate-400" />
            {v}
          </span>
        ) : (
          <Text type="secondary" className="text-xs">
            —
          </Text>
        ),
    },
    {
      title: 'Orders',
      dataIndex: 'totalOrders',
      key: 'totalOrders',
      width: 90,
      align: 'right',
      sorter: (a, b) => a.totalOrders - b.totalOrders,
      render: (v: number) => (
        <Text strong style={{ color: v === 0 ? '#94a3b8' : undefined }}>
          {v}
        </Text>
      ),
    },
    {
      title: 'Outstanding',
      dataIndex: 'outstandingBalance',
      key: 'outstandingBalance',
      width: 140,
      align: 'right',
      sorter: (a, b) => a.outstandingBalance - b.outstandingBalance,
      render: (v: number) => (
        <Text strong style={{ color: v > 0 ? '#dc2626' : '#25395c' }}>
          {currency(v)}
        </Text>
      ),
    },
    {
      title: 'Last Order',
      dataIndex: 'lastOrderDate',
      key: 'lastOrderDate',
      width: 130,
      sorter: (a, b) => (a.lastOrderDate ?? '').localeCompare(b.lastOrderDate ?? ''),
      render: (v?: string) => (
        <Text type="secondary" className="text-xs">
          {formatDate(v)}
        </Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      filters: [
        { text: 'Active', value: 'active' },
        { text: 'Inactive', value: 'inactive' },
      ],
      onFilter: (value, record) => record.status === value,
      render: (v: SupplierStatus) => (
        <Tag
          color={v === 'active' ? 'green' : 'default'}
          icon={v === 'active' ? <CheckCircleFilled /> : <PauseCircleFilled />}
          className="rounded-full"
        >
          {v === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_, r) => (
        <Space size="small">
          <Tooltip title="View details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openView(r)}
              className="text-slate-600 hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              className="text-[#25395c] hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Suppliers
            </Title>
            <Text type="secondary">
              Manage vendor relationships, contacts, and outstanding balances.
            </Text>
          </div>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
              className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]"
            >
              Add Supplier
            </Button>
          </Space>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Total suppliers"
            value={stats.total.toString()}
            icon={<ShopOutlined />}
            accent="#1a2842"
          />
          <StatCard
            label="Active"
            value={stats.active.toString()}
            hint={`${stats.inactive} inactive`}
            icon={<CheckCircleFilled />}
            accent="#16a34a"
          />
          <StatCard
            label="Outstanding"
            value={currency(stats.outstanding)}
            icon={<span className="font-semibold">GHS</span>}
            accent="#dc2626"
          />
          <StatCard
            label="Categories"
            value={stats.categories.toString()}
            icon={<span className="font-semibold">#</span>}
            accent="#6366f1"
          />
        </div>

        {/* Table card */}
        <Card className="shadow-sm" loading={suppliersLoading} styles={{ body: { padding: 0 } }}>
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search name, ID, contact, email or phone..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
              <Select
                placeholder="All categories"
                allowClear
                value={categoryFilter ?? undefined}
                onChange={(v) => setCategoryFilter(v ?? null)}
                options={categories.map((c) => ({
                  label: formatCategoryLabel(c),
                  value: c,
                }))}
                className="!w-full sm:!w-[180px]"
                size="large"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                options={[
                  { label: 'All statuses', value: 'all' },
                  { label: 'Active', value: 'active' },
                  { label: 'Inactive', value: 'inactive' },
                ]}
                className="!w-full sm:!w-[160px]"
                size="large"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filtered.length === suppliers.length
                ? `${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${suppliers.length} supplier${suppliers.length !== 1 ? 's' : ''}`}
            </Text>
          </div>

          <Table<SupplierRow>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            size="middle"
            className="[&_.ant-table]:!text-[14px]"
            locale={{
              emptyText: (
                <Empty
                  description="No suppliers match your filters"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
              showTotal: (total) => `Total ${total} suppliers`,
            }}
            scroll={{ x: 1200 }}
          />
        </Card>
      </div>

      {/* Add / edit modal */}
      <Modal
        title={mode === 'edit' ? 'Edit supplier' : 'Add supplier'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSave}
        okText={mode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={560}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        okButtonProps={{
          className: '!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]',
        }}
      >
        <Form<SupplierFormValues>
          form={form}
          layout="vertical"
          className="mt-4"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Supplier name"
            rules={[{ required: true, message: 'Please enter supplier name' }]}
          >
            <Input placeholder="e.g. Wholesale Grocers" size="large" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item name="contactPerson" label="Contact person">
              <Input placeholder="e.g. Ama Mensah" size="large" />
            </Form.Item>
            <Form.Item
              name="category"
              label="Category"
              rules={[{ required: true, message: 'Select a category' }]}
            >
              <Select
                placeholder="Select category"
                size="large"
                options={productCategories.map((c) => ({
                  label: c.name,
                  value: c.name,
                }))}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item name="phone" label="Phone">
              <Input placeholder="+233 ..." size="large" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Enter a valid email' }]}
            >
              <Input placeholder="name@example.com" size="large" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item name="location" label="City / Region">
              <Input placeholder="e.g. Accra" size="large" />
            </Form.Item>
            <Form.Item name="status" label="Status" initialValue="active">
              <Select
                size="large"
                options={statuses.map((st) => ({
                  label: st === 'active' ? 'Active' : 'Inactive',
                  value: st,
                }))}
              />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Address">
            <Input placeholder="Street address" size="large" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Payment terms, delivery schedule, etc." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Details drawer */}
      <Drawer
        title={viewing?.name ?? 'Supplier details'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setViewingId(null);
        }}
        size={440}
        extra={
          viewing ? (
            <Space>
              <Button size="small" onClick={() => toggleStatus(viewing)}>
                {viewing.status === 'active' ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<EditOutlined />}
                className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]"
                onClick={() => {
                  setDrawerOpen(false);
                  openEdit(viewing);
                }}
              >
                Edit
              </Button>
            </Space>
          ) : null
        }
      >
        {viewing ? (
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#25395c]/10 text-[#25395c]"
                aria-hidden
              >
                <ShopOutlined className="text-2xl" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-800">
                  {viewing.name}
                </div>
                <div className="font-mono text-xs text-slate-500">{viewing.id}</div>
                <div className="mt-1">
                  <Tag
                    color={viewing.status === 'active' ? 'green' : 'default'}
                    className="rounded-full"
                  >
                    {viewing.status === 'active' ? 'Active' : 'Inactive'}
                  </Tag>
                  <Tag color="cyan" className="rounded-full">
                    {formatCategoryLabel(viewing.category)}
                  </Tag>
                </div>
              </div>
            </div>

            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="Contact person">
                {viewing.contactPerson ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {viewing.phone ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {viewing.email ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {viewing.location ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Address">
                {viewing.address ?? '—'}
              </Descriptions.Item>
            </Descriptions>

            <div className="grid grid-cols-3 gap-2">
              <MiniStat label="Orders" value={viewing.totalOrders.toString()} />
              <MiniStat
                label="Outstanding"
                value={currency(viewing.outstandingBalance)}
                tone={viewing.outstandingBalance > 0 ? 'danger' : 'success'}
              />
              <MiniStat label="Last order" value={formatDate(viewing.lastOrderDate)} />
            </div>

            {viewing.notes && (
              <div>
                <Text type="secondary" className="text-xs uppercase tracking-wider">
                  Notes
                </Text>
                <Paragraph className="!mt-1 !mb-0 text-sm text-slate-700">
                  {viewing.notes}
                </Paragraph>
              </div>
            )}
          </div>
        ) : null}
      </Drawer>
    </DashboardLayout>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  accent?: string;
}

function StatCard({ label, value, hint, icon, accent = '#1a2842' }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <div className="flex items-center gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${accent}14`, color: accent }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-slate-500">
            {label}
          </div>
          <div className="mt-0.5 truncate text-xl font-semibold text-slate-800">
            {value}
          </div>
          {hint && (
            <div className="text-[11px] text-slate-400">{hint}</div>
          )}
        </div>
      </div>
    </Card>
  );
}

function MiniStat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'success' | 'danger';
}) {
  const color =
    tone === 'danger' ? '#dc2626' : tone === 'success' ? '#25395c' : '#0f172a';
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-semibold" style={{ color }}>
        {value}
      </div>
    </div>
  );
}
