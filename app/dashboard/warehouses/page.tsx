'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
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
  Tabs,
  Progress,
  Space,
  Steps,
  Timeline,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  DashboardOutlined,
  EditOutlined,
  SwapOutlined,
  HistoryOutlined,
  AppstoreOutlined,
  CheckOutlined,
  SendOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  WAREHOUSES,
  STORAGE_LOCATIONS,
  PRODUCT_LOCATION_ASSIGNMENTS,
  WAREHOUSE_TRANSFERS,
  WAREHOUSE_HISTORY,
  STORAGE_TYPE_LABELS,
  TRANSFER_STATUS_LABELS,
  TRANSFER_STATUS_COLORS,
  HISTORY_TYPE_LABELS,
  HISTORY_TYPE_COLORS,
  warehouseName,
  storageLocationLabel,
  formatStockCurrency,
  formatHistoryDate,
  nextWarehouseCode,
  nextTransferReference,
  type Warehouse,
  type StorageLocation,
  type WarehouseTransfer,
  type TransferWorkflowStatus,
  type WarehouseHistoryEntry,
  type ProductLocationAssignment,
} from '../../lib/stockManagementData';
import { BRAND } from '../../lib/brand';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const GHANA_REGIONS = [
  'Greater Accra', 'Ashanti', 'Western', 'Eastern', 'Central',
  'Northern', 'Volta', 'Upper East', 'Upper West', 'Bono', 'Bono East', 'Ahafo',
  'Western North', 'Savannah', 'North East', 'Oti',
];

const TRANSFER_WORKFLOW_STEPS = [
  'Create request',
  'Source approves',
  'Stock deducted',
  'Destination confirms',
  'Stock added',
];

function transferStepIndex(status: TransferWorkflowStatus): number {
  switch (status) {
    case 'draft': return 0;
    case 'pending_approval': return 1;
    case 'approved': return 2;
    case 'in_transit': return 3;
    case 'received': return 4;
    case 'cancelled': return -1;
    default: return 0;
  }
}

export default function WarehousesPage() {
  const [tab, setTab] = useState('warehouses');
  const [warehouses, setWarehouses] = useState(WAREHOUSES);
  const [storageLocs, setStorageLocs] = useState(STORAGE_LOCATIONS);
  const [assignments, setAssignments] = useState(PRODUCT_LOCATION_ASSIGNMENTS);
  const [transfers, setTransfers] = useState(WAREHOUSE_TRANSFERS);
  const [history, setHistory] = useState(WAREHOUSE_HISTORY);
  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState<string | 'all'>('all');

  const [formOpen, setFormOpen] = useState(false);
  const [editingWh, setEditingWh] = useState<Warehouse | null>(null);
  const [dashboardWh, setDashboardWh] = useState<Warehouse | null>(null);
  const [transferFormOpen, setTransferFormOpen] = useState(false);
  const [slFormOpen, setSlFormOpen] = useState(false);
  const [assignFormOpen, setAssignFormOpen] = useState(false);

  const [form] = Form.useForm();
  const [transferForm] = Form.useForm();
  const [slForm] = Form.useForm();
  const [assignForm] = Form.useForm();

  const warehouseOptions = warehouses.map((w) => ({
    value: w.id,
    label: `${w.code} — ${w.name}`,
  }));

  const filteredWarehouses = useMemo(() => {
    if (!search.trim()) return warehouses;
    const q = search.toLowerCase();
    return warehouses.filter(
      (w) =>
        w.name.toLowerCase().includes(q) ||
        w.code.toLowerCase().includes(q) ||
        w.city.toLowerCase().includes(q) ||
        w.managerName.toLowerCase().includes(q)
    );
  }, [warehouses, search]);

  const openCreateForm = () => {
    setEditingWh(null);
    form.resetFields();
    form.setFieldsValue({ code: nextWarehouseCode(warehouses), status: 'active' });
    setFormOpen(true);
  };

  const openEditForm = (wh: Warehouse) => {
    setEditingWh(wh);
    form.setFieldsValue(wh);
    setFormOpen(true);
  };

  const saveWarehouse = () => {
    form.validateFields().then((v) => {
      if (editingWh) {
        setWarehouses((prev) =>
          prev.map((w) => (w.id === editingWh.id ? { ...w, ...v } : w))
        );
        message.success('Warehouse updated');
      } else {
        const newWh: Warehouse = {
          id: `wh-${Date.now()}`,
          code: v.code,
          name: v.name,
          address: v.address,
          city: v.city,
          region: v.region,
          phone: v.phone,
          email: v.email,
          managerName: v.managerName,
          description: v.description,
          status: v.status,
          totalProducts: 0,
          totalStockQty: 0,
          inventoryValue: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
        };
        setWarehouses((prev) => [...prev, newWh]);
        message.success(`Warehouse ${newWh.code} created`);
      }
      setFormOpen(false);
    });
  };

  const warehouseColumns: TableProps<Warehouse>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      width: 90,
      render: (v) => <span className="font-mono text-xs font-bold text-slate-700">{v}</span>,
    },
    { title: 'Warehouse Name', dataIndex: 'name' },
    {
      title: 'Location',
      key: 'location',
      render: (_, r) => <span className="text-sm">{r.city}, {r.region}</span>,
    },
    { title: 'Manager', dataIndex: 'managerName' },
    {
      title: 'Products',
      dataIndex: 'totalProducts',
      align: 'right',
      render: (v: number) => v.toLocaleString(),
    },
    {
      title: 'Inventory Value',
      dataIndex: 'inventoryValue',
      align: 'right',
      render: (v: number) => formatStockCurrency(v),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      width: 100,
      render: (s: string) => (
        <Tag color={s === 'active' ? 'success' : 'default'}>
          {s === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 180,
      render: (_, r) => (
        <Space size="small">
          <Button type="link" size="small" icon={<DashboardOutlined />} onClick={() => setDashboardWh(r)}>
            Dashboard
          </Button>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEditForm(r)}>
            Edit
          </Button>
        </Space>
      ),
    },
  ];

  const advanceTransfer = (id: string, action: 'submit' | 'approve' | 'dispatch' | 'receive' | 'cancel') => {
    setTransfers((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const now = new Date().toISOString();
        switch (action) {
          case 'submit':
            return { ...t, status: 'pending_approval' as const };
          case 'approve':
            return { ...t, status: 'in_transit' as const, approvedBy: 'You', approvedAt: now };
          case 'dispatch':
            return { ...t, status: 'in_transit' as const };
          case 'receive':
            setHistory((h) => [
              {
                id: `wh-h-${Date.now()}`,
                warehouseId: t.toWarehouseId,
                type: 'transfer_in',
                description: `Received ${t.quantity} ${t.productName} from ${warehouseName(t.fromWarehouseId)}`,
                productName: t.productName,
                quantity: t.quantity,
                unit: t.unit,
                reference: t.reference,
                createdBy: 'You',
                createdAt: now,
              },
              ...h,
            ]);
            return { ...t, status: 'received' as const, receivedBy: 'You', receivedAt: now };
          case 'cancel':
            return { ...t, status: 'cancelled' as const };
          default:
            return t;
        }
      })
    );
    message.success('Transfer updated');
  };

  const createTransfer = () => {
    transferForm.validateFields().then((v) => {
      const ref = nextTransferReference(transfers.length);
      const t: WarehouseTransfer = {
        id: `wt-${Date.now()}`,
        reference: ref,
        fromWarehouseId: v.fromWarehouseId,
        toWarehouseId: v.toWarehouseId,
        productName: v.productName,
        sku: v.sku,
        quantity: v.quantity,
        unit: v.unit || 'pcs',
        reason: v.reason,
        status: 'draft',
        createdBy: 'You',
        createdAt: new Date().toISOString(),
      };
      setTransfers((prev) => [t, ...prev]);
      setTransferFormOpen(false);
      transferForm.resetFields();
      message.success('Transfer request created');
    });
  };

  const dashboardHistory = dashboardWh
    ? history.filter((h) => h.warehouseId === dashboardWh.id).slice(0, 5)
    : [];

  const storageByWarehouse = (whId: string) => {
    const locs = storageLocs.filter((s) => s.warehouseId === whId);
    const groups = Array.from(new Set(locs.map((l) => l.group)));
    return groups.map((group) => ({
      group,
      items: locs.filter((l) => l.group === group),
    }));
  };

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1">Warehouse Management</Title>
            <Text type="secondary">
              Manage physical storage locations, storage bins, inter-warehouse transfers, and activity history
            </Text>
          </div>
        </div>

        <Card className="!rounded-xl">
          <div className="table-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
            <Space wrap>
              <Input
                placeholder="Search…"
                prefix={<SearchOutlined />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="max-w-xs"
                allowClear
              />
              {(tab === 'storage' || tab === 'history') && (
                <Select
                  value={warehouseFilter}
                  onChange={setWarehouseFilter}
                  className="min-w-[200px]"
                  options={[{ value: 'all', label: 'All warehouses' }, ...warehouseOptions]}
                />
              )}
            </Space>
            {tab === 'warehouses' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={openCreateForm}>
                Create Warehouse
              </Button>
            )}
            {tab === 'transfers' && (
              <Button type="primary" icon={<PlusOutlined />} onClick={() => { transferForm.resetFields(); setTransferFormOpen(true); }}>
                New Transfer
              </Button>
            )}
            {tab === 'storage' && (
              <Space>
                <Button icon={<PlusOutlined />} onClick={() => { slForm.resetFields(); setSlFormOpen(true); }}>
                  Add Location
                </Button>
                <Button type="primary" icon={<PlusOutlined />} onClick={() => { assignForm.resetFields(); setAssignFormOpen(true); }}>
                  Assign Product
                </Button>
              </Space>
            )}
          </div>

          <Tabs
            activeKey={tab}
            onChange={(k) => { setTab(k); setSearch(''); }}
            items={[
              {
                key: 'warehouses',
                label: 'Warehouses',
                children: (
                  <Table<Warehouse>
                    columns={warehouseColumns}
                    dataSource={filteredWarehouses}
                    rowKey="id"
                    pagination={{ pageSize: 10, showTotal: (t) => `${t} warehouses` }}
                    scroll={{ x: 960 }}
                  />
                ),
              },
              {
                key: 'storage',
                label: 'Storage Locations',
                children: (
                  <div className="space-y-6">
                    {(warehouseFilter === 'all' ? warehouses : warehouses.filter((w) => w.id === warehouseFilter)).map((wh) => {
                      const groups = storageByWarehouse(wh.id);
                      if (groups.length === 0) return null;
                      return (
                        <div key={wh.id} className="rounded-xl border border-slate-200 p-4">
                          <div className="mb-3 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-bold text-slate-800">{wh.name}</p>
                              <p className="text-xs text-slate-500">{wh.code} · {wh.city}</p>
                            </div>
                            <Button size="small" type="link" onClick={() => setDashboardWh(wh)}>View dashboard</Button>
                          </div>
                          {groups.map(({ group, items }) => (
                            <div key={group} className="mb-4 last:mb-0">
                              <Text type="secondary" className="mb-2 block text-xs font-semibold uppercase tracking-wide">{group}</Text>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                                {items.map((sl) => (
                                  <div key={sl.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                                    <div className="flex items-center justify-between">
                                      <span className="font-mono text-xs font-bold" style={{ color: BRAND }}>{sl.code}</span>
                                      <Tag className="!text-[10px]" color={sl.status === 'full' ? 'warning' : 'success'}>{sl.status}</Tag>
                                    </div>
                                    <p className="mt-0.5 text-xs font-medium text-slate-700">{sl.name}</p>
                                    <Progress
                                      percent={Math.round((sl.occupied / sl.capacity) * 100)}
                                      size="small"
                                      showInfo={false}
                                      className="mt-1.5"
                                    />
                                    <p className="mt-0.5 text-[10px] text-slate-400">{sl.occupied}/{sl.capacity} units</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                    <Text type="secondary" className="mb-3 block text-xs font-semibold uppercase">Product assignments</Text>
                    <Table<ProductLocationAssignment>
                      size="small"
                      rowKey="id"
                      dataSource={assignments.filter((a) => warehouseFilter === 'all' || a.warehouseId === warehouseFilter)}
                      columns={[
                        { title: 'Product', dataIndex: 'productName' },
                        { title: 'SKU', dataIndex: 'sku', render: (v) => <span className="font-mono text-xs">{v}</span> },
                        { title: 'Warehouse', dataIndex: 'warehouseId', render: (id) => warehouseName(id) },
                        { title: 'Shelf / Location', dataIndex: 'storageLocationId', render: (id) => storageLocationLabel(id) },
                        { title: 'Qty', dataIndex: 'quantity', align: 'right' },
                      ]}
                      pagination={false}
                    />
                  </div>
                ),
              },
              {
                key: 'transfers',
                label: 'Transfers',
                children: (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                      <Text type="secondary" className="mb-3 block text-xs font-semibold uppercase">Transfer workflow</Text>
                      <Steps
                        size="small"
                        current={2}
                        items={TRANSFER_WORKFLOW_STEPS.map((title) => ({ title }))}
                      />
                    </div>
                    <Table<WarehouseTransfer>
                      rowKey="id"
                      dataSource={transfers}
                      scroll={{ x: 1000 }}
                      columns={[
                        { title: 'Reference', dataIndex: 'reference', render: (v) => <span className="font-mono text-xs font-semibold">{v}</span> },
                        {
                          title: 'Route',
                          key: 'route',
                          render: (_, r) => (
                            <span className="text-xs">
                              {warehouseName(r.fromWarehouseId)} → {warehouseName(r.toWarehouseId)}
                            </span>
                          ),
                        },
                        {
                          title: 'Product',
                          key: 'product',
                          render: (_, r) => (
                            <div>
                              <p className="text-sm font-medium">{r.productName}</p>
                              <p className="text-xs text-slate-500">{r.sku}</p>
                            </div>
                          ),
                        },
                        { title: 'Qty', key: 'qty', align: 'right', render: (_, r) => `${r.quantity} ${r.unit}` },
                        { title: 'Reason', dataIndex: 'reason', ellipsis: true },
                        {
                          title: 'Status',
                          dataIndex: 'status',
                          render: (s: TransferWorkflowStatus) => (
                            <Tag color={TRANSFER_STATUS_COLORS[s]}>{TRANSFER_STATUS_LABELS[s]}</Tag>
                          ),
                        },
                        {
                          title: 'Progress',
                          key: 'progress',
                          width: 120,
                          render: (_, r) => {
                            const step = transferStepIndex(r.status);
                            return r.status === 'cancelled' ? (
                              <Tag color="error">Cancelled</Tag>
                            ) : (
                              <Progress percent={((step + 1) / 5) * 100} size="small" showInfo={false} />
                            );
                          },
                        },
                        {
                          title: 'Actions',
                          key: 'actions',
                          width: 200,
                          render: (_, r) => (
                            <Space size="small" wrap>
                              {r.status === 'draft' && (
                                <Button size="small" icon={<SendOutlined />} onClick={() => advanceTransfer(r.id, 'submit')}>
                                  Submit
                                </Button>
                              )}
                              {r.status === 'pending_approval' && (
                                <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => advanceTransfer(r.id, 'approve')}>
                                  Approve
                                </Button>
                              )}
                              {r.status === 'in_transit' && (
                                <Button size="small" type="primary" icon={<InboxOutlined />} onClick={() => advanceTransfer(r.id, 'receive')}>
                                  Confirm receipt
                                </Button>
                              )}
                              {(r.status === 'draft' || r.status === 'pending_approval') && (
                                <Button size="small" danger onClick={() => advanceTransfer(r.id, 'cancel')}>
                                  Cancel
                                </Button>
                              )}
                            </Space>
                          ),
                        },
                      ]}
                      pagination={{ pageSize: 8 }}
                    />
                  </div>
                ),
              },
              {
                key: 'history',
                label: 'History',
                children: (
                  <Timeline
                    items={history
                      .filter((h) => warehouseFilter === 'all' || h.warehouseId === warehouseFilter)
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((h) => ({
                        color: HISTORY_TYPE_COLORS[h.type],
                        children: (
                          <div className="pb-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Tag color={HISTORY_TYPE_COLORS[h.type]}>{HISTORY_TYPE_LABELS[h.type]}</Tag>
                              <span className="text-[11px] text-slate-400">{formatHistoryDate(h.createdAt)}</span>
                              <span className="text-[11px] text-slate-400">· {warehouseName(h.warehouseId)}</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-slate-800">{h.description}</p>
                            {h.reference && (
                              <p className="text-xs text-slate-500">Ref: {h.reference} · {h.createdBy}</p>
                            )}
                          </div>
                        ),
                      }))}
                  />
                ),
              },
            ]}
          />
        </Card>
      </div>

      {/* Create / Edit Warehouse */}
      <Modal
        title={editingWh ? 'Edit Warehouse' : 'Create Warehouse'}
        open={formOpen}
        onCancel={() => setFormOpen(false)}
        onOk={saveWarehouse}
        okText={editingWh ? 'Save changes' : 'Create warehouse'}
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="code" label="Warehouse Code" rules={[{ required: true }]}>
                <Input readOnly className="bg-slate-50 font-mono" />
              </Form.Item>
            </Col>
            <Col span={16}>
              <Form.Item name="name" label="Warehouse Name" rules={[{ required: true }]}>
                <Input placeholder="Main Warehouse" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="Address" rules={[{ required: true }]}>
            <Input placeholder="Street address" />
          </Form.Item>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="city" label="City" rules={[{ required: true }]}>
                <Input placeholder="Accra" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="region" label="Region" rules={[{ required: true }]}>
                <Select options={GHANA_REGIONS.map((r) => ({ value: r, label: r }))} placeholder="Select region" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="phone" label="Contact Number" rules={[{ required: true }]}>
                <Input placeholder="+233 …" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
                <Input placeholder="warehouse@company.gh" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="managerName" label="Warehouse Manager" rules={[{ required: true }]}>
                <Input placeholder="John Doe" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                <Select options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="description" label="Description">
            <TextArea rows={2} placeholder="Optional notes about this warehouse" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Warehouse Dashboard Drawer */}
      <Drawer
        title={dashboardWh ? `${dashboardWh.name} — Dashboard` : 'Warehouse Dashboard'}
        open={Boolean(dashboardWh)}
        onClose={() => setDashboardWh(null)}
        width={560}
      >
        {dashboardWh && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 p-4" style={{ background: `linear-gradient(180deg, ${BRAND}08 0%, transparent 100%)` }}>
              <div className="flex items-start justify-between">
                <div>
                  <Tag color="blue" className="font-mono">{dashboardWh.code}</Tag>
                  <Title level={5} className="!mb-0 !mt-2">{dashboardWh.name}</Title>
                  <Text type="secondary" className="text-xs">{dashboardWh.city}, {dashboardWh.region}</Text>
                </div>
                <Tag color={dashboardWh.status === 'active' ? 'success' : 'default'}>
                  {dashboardWh.status === 'active' ? 'Active' : 'Inactive'}
                </Tag>
              </div>
              <Paragraph type="secondary" className="!mb-0 !mt-2 text-xs">
                Manager: <strong>{dashboardWh.managerName}</strong> · {dashboardWh.phone}
              </Paragraph>
            </div>

            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small" className="!rounded-xl">
                  <Statistic title="Total Products" value={dashboardWh.totalProducts} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" className="!rounded-xl">
                  <Statistic title="Stock Quantity" value={dashboardWh.totalStockQty} />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" className="!rounded-xl">
                  <Statistic title="Inventory Value" value={dashboardWh.inventoryValue} prefix="GH₵" />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="!rounded-xl border-amber-200 bg-amber-50/50">
                  <Statistic title="Low Stock" value={dashboardWh.lowStockCount} valueStyle={{ color: '#d97706', fontSize: '1.25rem' }} />
                </Card>
              </Col>
              <Col span={6}>
                <Card size="small" className="!rounded-xl border-red-200 bg-red-50/50">
                  <Statistic title="Out of Stock" value={dashboardWh.outOfStockCount} valueStyle={{ color: '#dc2626', fontSize: '1.25rem' }} />
                </Card>
              </Col>
            </Row>

            <div>
              <Text type="secondary" className="mb-2 block text-xs font-semibold uppercase">Recent transactions</Text>
              {dashboardHistory.length === 0 ? (
                <Text type="secondary" className="text-xs">No recent activity</Text>
              ) : (
                <div className="space-y-2">
                  {dashboardHistory.map((h) => (
                    <div key={h.id} className="flex items-start gap-2 rounded-lg border border-slate-100 px-3 py-2">
                      <Tag color={HISTORY_TYPE_COLORS[h.type]} className="!text-[10px] shrink-0">
                        {HISTORY_TYPE_LABELS[h.type]}
                      </Tag>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-800">{h.description}</p>
                        <p className="text-[10px] text-slate-400">{formatHistoryDate(h.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Descriptions column={1} size="small" bordered title="Details">
              <Descriptions.Item label="Address">{dashboardWh.address}</Descriptions.Item>
              <Descriptions.Item label="Email">{dashboardWh.email}</Descriptions.Item>
              <Descriptions.Item label="Description">{dashboardWh.description || '—'}</Descriptions.Item>
            </Descriptions>

            <Space>
              <Button icon={<AppstoreOutlined />} onClick={() => { setTab('storage'); setWarehouseFilter(dashboardWh.id); setDashboardWh(null); }}>
                Storage locations
              </Button>
              <Button icon={<HistoryOutlined />} onClick={() => { setTab('history'); setWarehouseFilter(dashboardWh.id); setDashboardWh(null); }}>
                Full history
              </Button>
            </Space>
          </div>
        )}
      </Drawer>

      {/* New Transfer */}
      <Modal title="Create Transfer Request" open={transferFormOpen} onCancel={() => setTransferFormOpen(false)} onOk={createTransfer} okText="Create request" width={520}>
        <Form form={transferForm} layout="vertical" className="mt-4">
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="fromWarehouseId" label="From" rules={[{ required: true }]}>
                <Select options={warehouseOptions} placeholder="Source warehouse" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="toWarehouseId" label="To" rules={[{ required: true }]}>
                <Select options={warehouseOptions} placeholder="Destination" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="productName" label="Product" rules={[{ required: true }]}>
                <Input placeholder="Dell Mouse" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input placeholder="SKU" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={12}>
            <Col span={12}>
              <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                <Input type="number" min={1} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="unit" label="Unit" initialValue="pcs">
                <Select options={['pcs', 'bags', 'boxes', 'rolls', 'sheets'].map((u) => ({ value: u, label: u }))} />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="reason" label="Reason" rules={[{ required: true }]}>
            <Input placeholder="Restocking branch" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Add Storage Location */}
      <Modal title="Add Storage Location" open={slFormOpen} onCancel={() => setSlFormOpen(false)}
        onOk={() => slForm.validateFields().then((v) => {
          setStorageLocs((prev) => [...prev, {
            id: `sl-${Date.now()}`, warehouseId: v.warehouseId, code: v.code, name: v.name,
            type: v.type, group: v.group, capacity: v.capacity, occupied: 0, status: 'available',
          }]);
          setSlFormOpen(false);
          message.success('Storage location added');
        })} okText="Add">
        <Form form={slForm} layout="vertical" className="mt-4">
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Row gutter={12}>
            <Col span={8}>
              <Form.Item name="type" label="Type" rules={[{ required: true }]}>
                <Select options={Object.entries(STORAGE_TYPE_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="group" label="Group" rules={[{ required: true }]}>
                <Select options={['Shelves', 'Rooms', 'Racks', 'Zones', 'Main Floor', 'Bulk Storage'].map((g) => ({ value: g, label: g }))} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="code" label="Code" rules={[{ required: true }]}>
                <Input placeholder="RK-A04" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="Rack A04" />
          </Form.Item>
          <Form.Item name="capacity" label="Capacity" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Assign Product to Location */}
      <Modal title="Assign Product to Location" open={assignFormOpen} onCancel={() => setAssignFormOpen(false)}
        onOk={() => assignForm.validateFields().then((v) => {
          setAssignments((prev) => [...prev, {
            id: `pla-${Date.now()}`, warehouseId: v.warehouseId, storageLocationId: v.storageLocationId,
            productName: v.productName, sku: v.sku, quantity: v.quantity,
          }]);
          setAssignFormOpen(false);
          message.success('Product assigned to location');
        })} okText="Assign">
        <Form form={assignForm} layout="vertical" className="mt-4">
          <Form.Item name="warehouseId" label="Warehouse" rules={[{ required: true }]}>
            <Select options={warehouseOptions} />
          </Form.Item>
          <Form.Item noStyle shouldUpdate={(p, c) => p.warehouseId !== c.warehouseId}>
            {({ getFieldValue }) => (
              <Form.Item name="storageLocationId" label="Shelf / Location" rules={[{ required: true }]}>
                <Select
                  options={storageLocs
                    .filter((s) => s.warehouseId === getFieldValue('warehouseId'))
                    .map((s) => ({ value: s.id, label: `${s.code} — ${s.name}` }))}
                  placeholder="Rack A03"
                />
              </Form.Item>
            )}
          </Form.Item>
          <Row gutter={12}>
            <Col span={16}>
              <Form.Item name="productName" label="Product" rules={[{ required: true }]}>
                <Input placeholder="Dell Mouse" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                <Input />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
            <Input type="number" min={1} />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
