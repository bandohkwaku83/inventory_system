'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Button,
  Input,
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
  EnvironmentOutlined,
  UserOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useCustomers, type Customer } from '../../context/CustomersContext';
import { formatEnterpriseCurrency } from '../../lib/enterpriseDummyData';

const { Title, Text } = Typography;

type CustomerFormValues = {
  name: string;
  phone: string;
  city?: string;
};

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

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {label}
          </p>
          <p className="mt-1 text-xl font-bold text-slate-800">{value}</p>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg text-sm"
          style={{ backgroundColor: `${accent}14`, color: accent }}
          aria-hidden
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function CustomersPage() {
  const {
    customers,
    customersLoading,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  } = useCustomers();

  const [search, setSearch] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<CustomerFormValues>();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.city.toLowerCase().includes(q)
    );
  }, [customers, search]);

  const totals = useMemo(
    () => ({
      count: customers.length,
      purchases: customers.reduce((s, c) => s + c.totalPurchases, 0),
      receivables: customers.reduce((s, c) => s + c.balance, 0),
    }),
    [customers]
  );

  const viewing = viewingId
    ? customers.find((c) => c.id === viewingId) ?? null
    : null;

  const openAdd = () => {
    setMode('add');
    setEditing(null);
    form.resetFields();
    setFormOpen(true);
  };

  const openEdit = (row: Customer) => {
    setMode('edit');
    setEditing(row);
    form.setFieldsValue({
      name: row.name,
      phone: row.phone,
      city: row.city,
    });
    setFormOpen(true);
  };

  const openView = (row: Customer) => {
    setViewingId(row.id);
    setDrawerOpen(true);
  };

  const handleSave = () => {
    void form.validateFields().then(async (values) => {
      setSaving(true);
      try {
        const payload = {
          name: values.name,
          phone: values.phone,
          city: values.city,
        };
        if (mode === 'edit' && editing) {
          await updateCustomer(editing.id, payload);
        } else {
          await addCustomer(payload);
        }
        setFormOpen(false);
        setEditing(null);
        form.resetFields();
      } catch {
        /* message from context */
      } finally {
        setSaving(false);
      }
    });
  };

  const handleDelete = (row: Customer) => {
    Modal.confirm({
      title: 'Delete customer',
      content: (
        <div>
          Are you sure you want to delete <strong>{row.name}</strong>? This
          action cannot be undone.
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteCustomer(row.id),
    });
  };

  const exportCsv = () => {
    const header = [
      'Name',
      'City',
      'Phone',
      'Balance',
      'Total Purchases',
      'Last Purchase',
    ];
    const lines = filtered.map((c) =>
      [
        c.name,
        c.city,
        c.phone,
        c.balance.toFixed(2),
        c.totalPurchases.toFixed(2),
        c.lastPurchaseDate,
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
    a.download = `customers-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: TableProps<Customer>['columns'] = [
    {
      title: 'Customer',
      key: 'name',
      width: 240,
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (_, r) => (
        <Space align="center" size="middle">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25395c]/10 text-[#25395c]"
            aria-hidden
          >
            <UserOutlined className="text-xl" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-slate-800">
              {r.name}
            </div>
            {r.city ? (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <EnvironmentOutlined />
                {r.city}
              </div>
            ) : (
              <Text type="secondary" className="text-xs">
                No city
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      width: 160,
      render: (_, r) =>
        r.phone ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <PhoneOutlined className="text-slate-400" />
            <span>{r.phone}</span>
          </div>
        ) : (
          <Text type="secondary" className="text-xs">
            —
          </Text>
        ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.balance - b.balance,
      render: (v: number) => (
        <span className={v > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}>
          {formatEnterpriseCurrency(v)}
        </span>
      ),
    },
    {
      title: 'Purchases',
      dataIndex: 'totalPurchases',
      key: 'totalPurchases',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.totalPurchases - b.totalPurchases,
      render: (v: number) => formatEnterpriseCurrency(v),
    },
    {
      title: 'Last purchased',
      dataIndex: 'lastPurchaseDate',
      key: 'lastPurchaseDate',
      width: 140,
      sorter: (a, b) => (a.lastPurchaseDate ?? '').localeCompare(b.lastPurchaseDate ?? ''),
      render: (v?: string) => (
        <Text type="secondary" className="text-xs">
          {v ? formatDate(v) : '—'}
        </Text>
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
              className="text-slate-600 hover:!bg-[#25395c]/10 hover:!text-[#1a2842]"
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => openEdit(r)}
              className="text-[#25395c] hover:!bg-[#25395c]/10 hover:!text-[#1a2842]"
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Customers
            </Title>
            <Text type="secondary">
              Directory for POS, receipts, and customer balances.
            </Text>
          </div>
          <Space wrap>
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              Export CSV
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={openAdd}
              className="!border-[#25395c] !bg-[#25395c] hover:!bg-[#1a2842]"
            >
              Add customer
            </Button>
          </Space>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard
            label="Customers"
            value={totals.count.toString()}
            icon={<UserOutlined />}
            accent="#1a2842"
          />
          <StatCard
            label="Total purchases"
            value={formatEnterpriseCurrency(totals.purchases)}
            icon={<span className="font-semibold">GHS</span>}
            accent="#25395c"
          />
          <StatCard
            label="Receivables"
            value={formatEnterpriseCurrency(totals.receivables)}
            icon={<span className="font-semibold">GHS</span>}
            accent="#d97706"
          />
        </div>

        <Card
          className="shadow-sm"
          loading={customersLoading}
          styles={{ body: { padding: 0 } }}
        >
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
              <Input
                placeholder="Search name, city or phone…"
                prefix={<SearchOutlined className="text-slate-400" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                size="large"
                className="w-full"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filtered.length === customers.length
                ? `${customers.length} customer${customers.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${customers.length} customer${customers.length !== 1 ? 's' : ''}`}
            </Text>
          </div>

          <Table<Customer>
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            size="middle"
            className="[&_.ant-table]:!text-[14px]"
            locale={{
              emptyText: (
                <Empty
                  description="No customers match your search"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
              showTotal: (total) => `Total ${total} customers`,
            }}
            scroll={{ x: 900 }}
          />
        </Card>
      </div>

      <Modal
        title={mode === 'edit' ? 'Edit customer' : 'Add customer'}
        open={formOpen}
        onCancel={() => {
          setFormOpen(false);
          setEditing(null);
          form.resetFields();
        }}
        onOk={handleSave}
        confirmLoading={saving}
        okText={mode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={520}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        okButtonProps={{
          className: '!border-[#25395c] !bg-[#25395c] hover:!bg-[#1a2842]',
        }}
      >
        <Form<CustomerFormValues>
          form={form}
          layout="vertical"
          className="mt-4"
          requiredMark={false}
        >
          <Form.Item
            name="name"
            label="Company / name"
            rules={[{ required: true, message: 'Enter company or name' }]}
          >
            <Input placeholder="e.g. Acme Ltd or Kojo Mensah" size="large" />
          </Form.Item>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Form.Item
              name="phone"
              label="Phone"
              rules={[{ required: true, message: 'Enter phone number' }]}
            >
              <Input placeholder="e.g. 024 000 0000" size="large" />
            </Form.Item>
            <Form.Item name="city" label="City">
              <Input placeholder="e.g. Accra, Kumasi, Tema" size="large" />
            </Form.Item>
          </div>
        </Form>
      </Modal>

      <Drawer
        title={viewing?.name ?? 'Customer details'}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setViewingId(null);
        }}
        size={440}
        extra={
          viewing ? (
            <Button
              size="small"
              type="primary"
              icon={<EditOutlined />}
              className="!border-[#25395c] !bg-[#25395c] hover:!bg-[#1a2842]"
              onClick={() => {
                setDrawerOpen(false);
                openEdit(viewing);
              }}
            >
              Edit
            </Button>
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
                <UserOutlined className="text-2xl" />
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-slate-800">
                  {viewing.name}
                </div>
                <div className="font-mono text-xs text-slate-500">{viewing.id}</div>
              </div>
            </div>

            <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
              <Descriptions.Item label="City">
                {viewing.city || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                {viewing.phone ? (
                  <span>
                    <PhoneOutlined className="mr-1" />
                    {viewing.phone}
                  </span>
                ) : (
                  '—'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Balance">
                {formatEnterpriseCurrency(viewing.balance)}
              </Descriptions.Item>
              <Descriptions.Item label="Total purchases">
                {formatEnterpriseCurrency(viewing.totalPurchases)}
              </Descriptions.Item>
              <Descriptions.Item label="Last purchased">
                {viewing.lastPurchaseDate
                  ? formatDate(viewing.lastPurchaseDate)
                  : '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Created">
                {formatDate(viewing.createdAt)}
              </Descriptions.Item>
            </Descriptions>

            <Button
              danger
              block
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(viewing)}
            >
              Delete customer
            </Button>
          </div>
        ) : null}
      </Drawer>
    </DashboardLayout>
  );
}
