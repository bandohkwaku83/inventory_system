'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Typography,
  Tooltip,
  Divider,
} from 'antd';
import type { TableProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';

const { Title, Text } = Typography;

interface PurchaseItem {
  name: string;
  quantity: string;
  unitPrice: number;
  total: number;
}

interface Purchase {
  id: number;
  date: string;
  supplier: string;
  invoiceNumber: string;
  items: PurchaseItem[];
  totalCost: number;
  status: string;
}

const initialPurchases: Purchase[] = [
  { id: 1, date: '2024-01-15', supplier: 'Wholesale Grocers', invoiceNumber: 'INV-001', items: [{ name: 'Rice 2kg', quantity: '50 units', unitPrice: 12, total: 600 }], totalCost: 600, status: 'Completed' },
  { id: 2, date: '2024-01-14', supplier: 'Dairy Co', invoiceNumber: 'INV-002', items: [{ name: 'Milk 1L', quantity: '100 units', unitPrice: 5, total: 500 }], totalCost: 500, status: 'Completed' },
  { id: 3, date: '2024-01-14', supplier: 'Bakery Supplies', invoiceNumber: 'INV-003', items: [{ name: 'Bread', quantity: '80 units', unitPrice: 2.5, total: 200 }], totalCost: 200, status: 'Completed' },
];

const stockItems = [
  { id: 1, name: 'Rice 2kg', unit: 'units' },
  { id: 2, name: 'Cooking Oil 1L', unit: 'units' },
  { id: 3, name: 'Milk 1L', unit: 'units' },
  { id: 4, name: 'Bread', unit: 'units' },
  { id: 5, name: 'Soft Drinks 500ml', unit: 'units' },
];

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [formData, setFormData] = useState<{
    date: string;
    supplier: string;
    invoiceNumber: string;
    items: PurchaseItem[];
  }>({
    date: new Date().toISOString().split('T')[0],
    supplier: '',
    invoiceNumber: '',
    items: [],
  });
  const [currentItem, setCurrentItem] = useState({ itemId: '', quantity: '', unitPrice: '' });

  const filteredPurchases = useMemo(() => {
    if (!searchText.trim()) return purchases;
    const q = searchText.toLowerCase();
    return purchases.filter(
      (p) =>
        p.supplier.toLowerCase().includes(q) ||
        p.invoiceNumber.toLowerCase().includes(q)
    );
  }, [purchases, searchText]);

  const handleOpen = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      supplier: '',
      invoiceNumber: '',
      items: [],
    });
    setCurrentItem({ itemId: '', quantity: '', unitPrice: '' });
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleAddItem = () => {
    const { itemId, quantity, unitPrice } = currentItem;
    if (!itemId || !quantity || !unitPrice) return;
    const stock = stockItems.find((s) => s.id === parseInt(itemId, 10));
    const qty = parseFloat(quantity);
    const price = parseFloat(unitPrice);
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          name: stock?.name ?? 'Unknown',
          quantity: `${qty} ${stock?.unit ?? 'units'}`,
          unitPrice: price,
          total: qty * price,
        },
      ],
    });
    setCurrentItem({ itemId: '', quantity: '', unitPrice: '' });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({ ...formData, items: formData.items.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    const totalCost = formData.items.reduce((sum, i) => sum + i.total, 0);
    const newPurchase: Purchase = {
      id: purchases.length + 1,
      ...formData,
      totalCost,
      status: 'Completed',
    };
    setPurchases([newPurchase, ...purchases]);
    handleClose();
  };

  const totalModal = formData.items.reduce((sum, i) => sum + i.total, 0);

  const purchaseColumns: TableProps<Purchase>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (d: string) => <Text>{d}</Text>,
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier',
      key: 'supplier',
      width: 160,
      render: (s: string) => <Text strong>{s || '—'}</Text>,
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
      render: (inv: string) => <Text code>{inv || '—'}</Text>,
    },
    {
      title: 'Items',
      dataIndex: 'items',
      key: 'items',
      render: (items: PurchaseItem[]) => (
        <div className="flex flex-col gap-0.5">
          {items.map((it, idx) => (
            <Text key={idx} type="secondary" className="text-xs">
              {it.name} · {it.quantity} @ GHS {it.unitPrice.toFixed(2)}
            </Text>
          ))}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right',
      render: (cost: number) => (
        <Text strong style={{ color: '#059669' }}>GHS {cost.toFixed(2)}</Text>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: string) => <Tag color="green">{status}</Tag>,
    },
  ];

  const lineItemColumns: TableProps<PurchaseItem>['columns'] = [
    { title: 'Item', dataIndex: 'name', key: 'name', width: 180 },
    { title: 'Quantity', dataIndex: 'quantity', key: 'quantity', width: 100 },
    {
      title: 'Unit price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 110,
      align: 'right',
      render: (p: number) => `GHS ${p.toFixed(2)}`,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 110,
      align: 'right',
      render: (t: number) => <Text strong>GHS {t.toFixed(2)}</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_, __, index) => (
        <Tooltip title="Remove">
          <Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => handleRemoveItem(index)} />
        </Tooltip>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">Purchases</Title>
            <Text type="secondary">Record stock purchases and supplier orders</Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={handleOpen}
            className="!bg-teal-600 !border-teal-600 hover:!bg-teal-700 hover:!border-teal-700"
          >
            Add purchase
          </Button>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="purchases-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search by supplier name or invoice number..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filteredPurchases.length === purchases.length
                ? `${purchases.length} purchase${purchases.length !== 1 ? 's' : ''}`
                : `${filteredPurchases.length} of ${purchases.length} purchase${purchases.length !== 1 ? 's' : ''}`}
            </Text>
          </div>
          <Table<Purchase>
            columns={purchaseColumns}
            dataSource={filteredPurchases}
            rowKey="id"
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t}`, pageSizeOptions: ['10', '20', '50'], defaultPageSize: 10 }}
            size="middle"
            scroll={{ x: 800 }}
          />
        </Card>
      </div>

      <Modal
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>New purchase</span>
          </Space>
        }
        open={open}
        onCancel={handleClose}
        onOk={handleSave}
        okText="Save purchase"
        cancelText="Cancel"
        width={640}
        destroyOnClose
        okButtonProps={{
          disabled: formData.items.length === 0,
          className: '!bg-teal-600 !border-teal-600 hover:!bg-teal-700',
        }}
      >
        <div className="space-y-4 py-2">
          <Space wrap size="middle" className="w-full">
            <div className="w-40">
              <label className="mb-1 block text-xs text-slate-500">Date</label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                size="large"
                className="rounded-lg"
              />
            </div>
            <div className="min-w-0 flex-1 sm:min-w-[180px]">
              <label className="mb-1 block text-xs text-slate-500">Supplier (optional)</label>
              <Input
                placeholder="Supplier name"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                size="large"
                className="rounded-lg"
              />
            </div>
            <div className="min-w-0 flex-1 sm:min-w-[140px]">
              <label className="mb-1 block text-xs text-slate-500">Invoice (optional)</label>
              <Input
                placeholder="e.g. INV-001"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                size="large"
                className="rounded-lg"
              />
            </div>
          </Space>

          <Divider className="!my-4">
            <FileTextOutlined className="mr-1 text-slate-400" />
            Line items
          </Divider>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Select
                placeholder="Select item"
                value={currentItem.itemId || undefined}
                onChange={(v) => setCurrentItem({ ...currentItem, itemId: v ?? '' })}
                options={stockItems.map((s) => ({ label: `${s.name} (${s.unit})`, value: s.id.toString() }))}
                className="min-w-0 flex-1 sm:min-w-[180px]"
                size="large"
                allowClear
              />
              <InputNumber
                placeholder="Qty"
                min={0.01}
                step={1}
                value={currentItem.quantity ? parseFloat(currentItem.quantity) : undefined}
                onChange={(v) => setCurrentItem({ ...currentItem, quantity: v != null ? String(v) : '' })}
                className="!w-24"
                size="large"
              />
              <InputNumber
                placeholder="Unit price"
                min={0}
                step={0.01}
                value={currentItem.unitPrice ? parseFloat(currentItem.unitPrice) : undefined}
                onChange={(v) => setCurrentItem({ ...currentItem, unitPrice: v != null ? String(v) : '' })}
                className="!w-32"
                size="large"
                addonBefore="GHS"
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={handleAddItem} size="large" className="!bg-teal-600 hover:!bg-teal-700">
                Add
              </Button>
            </div>

            {formData.items.length > 0 ? (
              <>
                <Table<PurchaseItem>
                  columns={lineItemColumns}
                  dataSource={formData.items}
                  rowKey={(_, i) => String(i)}
                  pagination={false}
                  size="small"
                />
                <div className="mt-4 flex justify-end border-t border-slate-200 pt-4">
                  <Text strong className="text-base">
                    Total: <span className="text-teal-600">GHS {totalModal.toFixed(2)}</span>
                  </Text>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                <FileTextOutlined className="mb-2 text-3xl" />
                <Text type="secondary">Add line items above</Text>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
