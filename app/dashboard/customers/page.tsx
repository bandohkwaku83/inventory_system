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
  Row,
  Col,
  Statistic,
  Drawer,
  Descriptions,
  Progress,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  UserOutlined,
  PhoneOutlined,
  MailOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  CUSTOMERS,
  CUSTOMER_TYPE_LABELS,
  locationName,
  formatEnterpriseCurrency,
  type Customer,
  type CustomerType,
  type CustomerStatus,
} from '../../lib/enterpriseDummyData';

const { Title, Text } = Typography;

const STATUS_COLORS: Record<CustomerStatus, string> = {
  active: 'success',
  inactive: 'default',
  on_hold: 'warning',
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<CustomerType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [viewing, setViewing] = useState<Customer | null>(null);
  const [form] = Form.useForm();

  const filtered = useMemo(() => {
    let list = customers;
    if (typeFilter !== 'all') list = list.filter((c) => c.type === typeFilter);
    if (statusFilter !== 'all') list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.city.toLowerCase().includes(q)
      );
    }
    return list;
  }, [customers, search, typeFilter, statusFilter]);

  const totals = useMemo(
    () => ({
      active: customers.filter((c) => c.status === 'active').length,
      receivables: customers.reduce((s, c) => s + c.balance, 0),
      creditUsed: customers.reduce(
        (s, c) => s + (c.creditLimit > 0 ? c.balance / c.creditLimit : 0),
        0
      ),
      onHold: customers.filter((c) => c.status === 'on_hold').length,
    }),
    [customers]
  );

  const columns: TableProps<Customer>['columns'] = [
    {
      title: 'Customer',
      key: 'name',
      render: (_, r) => (
        <div>
          <p className="text-sm font-semibold text-slate-800">{r.name}</p>
          <p className="text-xs text-slate-500">{r.city}</p>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (t: CustomerType) => <Tag>{CUSTOMER_TYPE_LABELS[t]}</Tag>,
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, r) => (
        <div className="text-xs text-slate-600">
          {r.phone && <div>{r.phone}</div>}
          {r.email && <div className="text-slate-400">{r.email}</div>}
        </div>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      render: (v: number, r) => (
        <span className={v > 0 ? 'font-semibold text-amber-700' : 'text-slate-500'}>
          {formatEnterpriseCurrency(v)}
          {r.creditLimit > 0 && (
            <div className="text-[10px] font-normal text-slate-400">
              of {formatEnterpriseCurrency(r.creditLimit)}
            </div>
          )}
        </span>
      ),
      sorter: (a, b) => a.balance - b.balance,
    },
    {
      title: 'Total purchases',
      dataIndex: 'totalPurchases',
      key: 'totalPurchases',
      align: 'right',
      render: (v: number) => formatEnterpriseCurrency(v),
      sorter: (a, b) => a.totalPurchases - b.totalPurchases,
    },
    {
      title: 'Rep',
      dataIndex: 'assignedRep',
      key: 'assignedRep',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (s: CustomerStatus) => (
        <Tag color={STATUS_COLORS[s]}>
          {s === 'on_hold' ? 'On hold' : s.charAt(0).toUpperCase() + s.slice(1)}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 72,
      render: (_, r) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setViewing(r);
            setDrawerOpen(true);
          }}
        >
          View
        </Button>
      ),
    },
  ];

  const exportCsv = () => {
    const header = 'Name,Type,City,Phone,Email,Balance,Credit Limit,Total Purchases,Status\n';
    const rows = filtered
      .map(
        (c) =>
          `"${c.name}",${c.type},${c.city},${c.phone},${c.email},${c.balance},${c.creditLimit},${c.totalPurchases},${c.status}`
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'customers.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">
              Customers
            </Title>
            <Text type="secondary">
              CRM — manage accounts, credit limits, and receivables
            </Text>
          </div>
          <Space>
            <Button icon={<DownloadOutlined />} onClick={exportCsv}>
              Export
            </Button>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                form.resetFields();
                setFormOpen(true);
              }}
            >
              Add customer
            </Button>
          </Space>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Active accounts" value={totals.active} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!rounded-xl">
              <Statistic
                title="Total receivables"
                value={totals.receivables}
                prefix="GHS"
                precision={0}
                valueStyle={{ color: '#d97706' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="On credit hold" value={totals.onHold} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!rounded-xl">
              <Statistic title="Customers" value={customers.length} />
            </Card>
          </Col>
        </Row>

        <Card className="!rounded-xl">
          <div className="table-toolbar mb-4 flex flex-wrap items-center gap-3">
            <Input
              placeholder="Search customers…"
              prefix={<SearchOutlined />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
              allowClear
            />
            <Select
              value={typeFilter}
              onChange={setTypeFilter}
              className="min-w-[140px]"
              options={[
                { value: 'all', label: 'All types' },
                ...Object.entries(CUSTOMER_TYPE_LABELS).map(([v, l]) => ({
                  value: v,
                  label: l,
                })),
              ]}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              className="min-w-[120px]"
              options={[
                { value: 'all', label: 'All status' },
                { value: 'active', label: 'Active' },
                { value: 'on_hold', label: 'On hold' },
                { value: 'inactive', label: 'Inactive' },
              ]}
            />
          </div>
          <Table<Customer>
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (t) => `${t} customers` }}
            scroll={{ x: 900 }}
          />
        </Card>
      </div>

      <Modal
        title="Add customer"
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={() => {
          form.validateFields().then((vals) => {
            const newCust: Customer = {
              id: `cust-${Date.now()}`,
              name: vals.name,
              type: vals.type,
              status: 'active',
              email: vals.email ?? '',
              phone: vals.phone ?? '',
              city: vals.city,
              creditLimit: vals.creditLimit ?? 0,
              balance: 0,
              totalPurchases: 0,
              lastPurchaseDate: new Date().toISOString().slice(0, 10),
              assignedRep: '—',
              locationId: 'loc-hq',
              tags: [],
            };
            setCustomers((prev) => [...prev, newCust]);
            setFormOpen(false);
          });
        }}
        okText="Create customer"
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="name" label="Company / name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(CUSTOMER_TYPE_LABELS).map(([v, l]) => ({
                    value: v,
                    label: l,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="city" label="City" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Phone">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email">
                <Input type="email" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="creditLimit" label="Credit limit (GHS)">
            <Input type="number" min={0} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={viewing?.name}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={440}
      >
        {viewing && (
          <>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {viewing.tags.map((t) => (
                <Tag key={t} color="blue">
                  {t}
                </Tag>
              ))}
            </div>
            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Type">
                {CUSTOMER_TYPE_LABELS[viewing.type]}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={STATUS_COLORS[viewing.status]}>{viewing.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Location">
                {locationName(viewing.locationId)}
              </Descriptions.Item>
              <Descriptions.Item label="Phone">
                <PhoneOutlined className="mr-1" />
                {viewing.phone || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                <MailOutlined className="mr-1" />
                {viewing.email || '—'}
              </Descriptions.Item>
              <Descriptions.Item label="TIN">{viewing.tin || '—'}</Descriptions.Item>
              <Descriptions.Item label="Assigned rep">
                <UserOutlined className="mr-1" />
                {viewing.assignedRep}
              </Descriptions.Item>
              <Descriptions.Item label="Balance">
                {formatEnterpriseCurrency(viewing.balance)}
              </Descriptions.Item>
              <Descriptions.Item label="Credit limit">
                {formatEnterpriseCurrency(viewing.creditLimit)}
              </Descriptions.Item>
              <Descriptions.Item label="Total purchases">
                {formatEnterpriseCurrency(viewing.totalPurchases)}
              </Descriptions.Item>
              <Descriptions.Item label="Last purchase">
                {viewing.lastPurchaseDate}
              </Descriptions.Item>
            </Descriptions>
            {viewing.creditLimit > 0 && (
              <div className="mt-4">
                <Text type="secondary" className="text-xs">
                  Credit utilization
                </Text>
                <Progress
                  percent={Math.round((viewing.balance / viewing.creditLimit) * 100)}
                  status={
                    viewing.balance / viewing.creditLimit > 0.9 ? 'exception' : 'active'
                  }
                  size="small"
                  className="mt-1"
                />
              </div>
            )}
          </>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
