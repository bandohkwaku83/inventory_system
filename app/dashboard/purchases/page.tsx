'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Modal,
  Select,
  InputNumber,
  Typography,
  Tooltip,
  Divider,
  Empty,
  DatePicker,
} from 'antd';
import type { TableProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  DeleteOutlined,
  FileTextOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  EyeOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import { useSuppliers } from '../../context/SuppliersContext';
import { useProducts } from '../../context/ProductsContext';
import {
  usePurchases,
  getPaymentStatus,
  type Purchase,
  type PurchaseItem,
  type PaymentStatus,
} from '../../context/PurchasesContext';

const { Title, Text } = Typography;

const currency = (v: number) => `GHS ${v.toFixed(2)}`;

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatDateTime = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const paymentTone = (status: PaymentStatus) =>
  status === 'paid' ? 'green' : status === 'partial' ? 'gold' : 'red';

const paymentLabel = (status: PaymentStatus) =>
  status === 'paid' ? 'Paid' : status === 'partial' ? 'Partial' : 'Unpaid';

interface DraftItem {
  key: string;
  productId?: string;
  name: string;
  unit: string;
  quantity: number;
  unitPrice: number;
}

export default function PurchasesPage() {
  const { suppliers } = useSuppliers();
  const { products, refreshProducts } = useProducts();
  const { purchases, purchasesLoading, purchasesSummary, addPurchase, deletePurchase, recordPayment, fetchPurchase } =
    usePurchases();

  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState<string | null>(null);
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<{
    date: Dayjs;
    supplierId: string | null;
    invoiceNumber: string;
    amountPaid: number;
    items: DraftItem[];
  }>({
    date: dayjs(),
    supplierId: null,
    invoiceNumber: '',
    amountPaid: 0,
    items: [],
  });
  const [currentItem, setCurrentItem] = useState<{
    productId: string | null;
    quantity: number | null;
    unitPrice: number | null;
  }>({ productId: null, quantity: null, unitPrice: null });

  const [paymentTarget, setPaymentTarget] = useState<Purchase | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number | null>(null);

  const [viewing, setViewing] = useState<Purchase | null>(null);

  const supplierMap = useMemo(
    () => Object.fromEntries(suppliers.map((s) => [s.id, s])),
    [suppliers]
  );

  const filtered = useMemo(() => {
    let list = purchases;
    if (supplierFilter) list = list.filter((p) => p.supplierId === supplierFilter);
    if (paymentFilter !== 'all')
      list = list.filter((p) => getPaymentStatus(p) === paymentFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.supplierName.toLowerCase().includes(q) ||
          (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(q)) ||
          p.items.some((i) => i.name.toLowerCase().includes(q))
      );
    }
    return list;
  }, [purchases, search, supplierFilter, paymentFilter]);

  const stats = useMemo(() => {
    if (purchasesSummary) {
      return {
        count: purchasesSummary.purchaseCount,
        totalSpend: purchasesSummary.totalSpend,
        outstanding: purchasesSummary.outstanding,
        unpaidCount: purchasesSummary.unpaidInvoicesCount,
      };
    }
    const totalSpend = purchases.reduce((s, p) => s + p.totalCost, 0);
    const outstanding = purchases.reduce(
      (s, p) => s + Math.max(0, p.totalCost - p.amountPaid),
      0
    );
    const unpaidCount = purchases.filter((p) => getPaymentStatus(p) !== 'paid').length;
    return { count: purchases.length, totalSpend, outstanding, unpaidCount };
  }, [purchasesSummary, purchases]);

  const openView = async (row: Purchase) => {
    setViewing(row);
    const fresh = await fetchPurchase(row.id);
    if (fresh) setViewing(fresh);
  };

  const draftTotal = draft.items.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0
  );
  const draftBalance = Math.max(0, draftTotal - draft.amountPaid);

  const openAdd = () => {
    const defaultSupplier =
      suppliers.find((s) => s.status === 'active') ?? suppliers[0];
    setDraft({
      date: dayjs(),
      supplierId: defaultSupplier?.id ?? null,
      invoiceNumber: '',
      amountPaid: 0,
      items: [],
    });
    setCurrentItem({ productId: null, quantity: null, unitPrice: null });
    setOpen(true);
  };

  const handleAddItem = () => {
    const { productId, quantity, unitPrice } = currentItem;
    if (productId == null || quantity == null || unitPrice == null) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    setDraft((d) => ({
      ...d,
      items: [
        ...d.items,
        {
          key: `${product.id}-${Date.now()}-${d.items.length}`,
          productId: product.id,
          name: product.name,
          unit: product.unit,
          quantity,
          unitPrice,
        },
      ],
    }));
    setCurrentItem({ productId: null, quantity: null, unitPrice: null });
  };

  const handleRemoveItem = (key: string) => {
    setDraft((d) => ({ ...d, items: d.items.filter((item) => item.key !== key) }));
  };

  const handleSave = async () => {
    if (!draft.supplierId || draft.items.length === 0) return;
    const supplier = supplierMap[draft.supplierId];
    if (!supplier) return;
    const items: PurchaseItem[] = draft.items.map((i) => ({
      productId: i.productId,
      name: i.name,
      unit: i.unit,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      total: +(i.quantity * i.unitPrice).toFixed(2),
    }));
    const totalCost = items.reduce((s, i) => s + i.total, 0);
    try {
      await addPurchase({
        date: draft.date.format('YYYY-MM-DD'),
        supplierId: supplier.id,
        supplierName: supplier.name,
        invoiceNumber: draft.invoiceNumber || undefined,
        items,
        totalCost: +totalCost.toFixed(2),
        amountPaid: Math.min(draft.amountPaid, totalCost),
        status: 'completed',
      });
      void refreshProducts();
      setOpen(false);
    } catch {
      /* message from context */
    }
  };

  const handleDelete = (row: Purchase) => {
    Modal.confirm({
      title: 'Delete purchase',
      content: (
        <div>
          Delete purchase from <strong>{row.supplierName}</strong> on{' '}
          <strong>{formatDate(row.date)}</strong>? This action cannot be undone.
        </div>
      ),
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deletePurchase(row.id),
    });
  };

  const openPayment = (row: Purchase) => {
    setPaymentTarget(row);
    setPaymentAmount(Math.max(0, row.totalCost - row.amountPaid));
  };

  const handleRecordPayment = async () => {
    if (!paymentTarget || paymentAmount == null || paymentAmount <= 0) return;
    try {
      await recordPayment(paymentTarget.id, paymentAmount);
      setPaymentTarget(null);
      setPaymentAmount(null);
    } catch {
      /* message from context */
    }
  };

  const handleExportCsv = () => {
    const header = [
      'ID',
      'Date',
      'Supplier',
      'Invoice',
      'Items',
      'Total (GHS)',
      'Paid (GHS)',
      'Balance (GHS)',
      'Payment',
    ];
    const lines = filtered.map((p) =>
      [
        p.id,
        p.date,
        p.supplierName,
        p.invoiceNumber ?? '',
        p.items.map((i) => `${i.name} x${i.quantity}`).join('; '),
        p.totalCost.toFixed(2),
        p.amountPaid.toFixed(2),
        Math.max(0, p.totalCost - p.amountPaid).toFixed(2),
        paymentLabel(getPaymentStatus(p)),
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
    a.download = `purchases-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const purchaseColumns: TableProps<Purchase>['columns'] = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      sorter: (a, b) => a.date.localeCompare(b.date),
      defaultSortOrder: 'descend',
      render: (d: string) => (
        <Text className="text-xs">{formatDate(d)}</Text>
      ),
    },
    {
      title: 'Supplier',
      key: 'supplier',
      width: 200,
      render: (_, r) => (
        <span className="text-sm font-semibold text-slate-800">{r.supplierName}</span>
      ),
    },
    {
      title: 'Invoice',
      dataIndex: 'invoiceNumber',
      key: 'invoiceNumber',
      width: 120,
      render: (inv?: string) =>
        inv ? <Text code>{inv}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, r) => (
        <div className="flex flex-col gap-0.5">
          {r.items.slice(0, 2).map((it, idx) => (
            <Text key={idx} type="secondary" className="text-xs">
              {it.name} · {it.quantity} {it.unit} @ {currency(it.unitPrice)}
            </Text>
          ))}
          {r.items.length > 2 && (
            <Text type="secondary" className="text-[11px]">
              +{r.items.length - 2} more…
            </Text>
          )}
        </div>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'totalCost',
      key: 'totalCost',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.totalCost - b.totalCost,
      render: (v: number) => (
        <Text strong style={{ color: '#25395c' }}>
          {currency(v)}
        </Text>
      ),
    },
    {
      title: 'Balance',
      key: 'balance',
      width: 120,
      align: 'right',
      sorter: (a, b) =>
        Math.max(0, a.totalCost - a.amountPaid) -
        Math.max(0, b.totalCost - b.amountPaid),
      render: (_, r) => {
        const bal = Math.max(0, r.totalCost - r.amountPaid);
        return (
          <Text strong style={{ color: bal > 0 ? '#dc2626' : '#94a3b8' }}>
            {currency(bal)}
          </Text>
        );
      },
    },
    {
      title: 'Payment',
      key: 'payment',
      width: 110,
      filters: [
        { text: 'Paid', value: 'paid' },
        { text: 'Partial', value: 'partial' },
        { text: 'Unpaid', value: 'unpaid' },
      ],
      onFilter: (value, record) => getPaymentStatus(record) === value,
      render: (_, r) => {
        const ps = getPaymentStatus(r);
        return (
          <Tag color={paymentTone(ps)} className="rounded-full">
            {paymentLabel(ps)}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      fixed: 'right' as const,
      render: (_, r) => {
        const ps = getPaymentStatus(r);
        return (
          <Space size="small">
            <Tooltip title="View">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => void openView(r)}
                className="text-slate-600 hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
              />
            </Tooltip>
            <Tooltip title={ps === 'paid' ? 'Fully paid' : 'Record payment'}>
              <Button
                type="text"
                icon={<DollarOutlined />}
                onClick={() => openPayment(r)}
                disabled={ps === 'paid'}
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
        );
      },
    },
  ];

  const lineItemColumns: TableProps<DraftItem>['columns'] = [
    { title: 'Item', dataIndex: 'name', key: 'name', width: 180 },
    {
      title: 'Quantity',
      key: 'quantity',
      width: 110,
      render: (_, r) => `${r.quantity} ${r.unit}`,
    },
    {
      title: 'Unit price',
      dataIndex: 'unitPrice',
      key: 'unitPrice',
      width: 120,
      align: 'right',
      render: (p: number) => currency(p),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, r) => (
        <Text strong>{currency(r.quantity * r.unitPrice)}</Text>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 60,
      render: (_: unknown, r: DraftItem) => (
        <Tooltip title="Remove">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveItem(r.key)}
          />
        </Tooltip>
      ),
    },
  ];

  const supplierFormOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        label: s.status === 'active' ? s.name : `${s.name} (inactive)`,
        value: s.id,
      })),
    [suppliers]
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Purchases
            </Title>
            <Text type="secondary">
              Record purchases from suppliers and track outstanding balances.
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
              disabled={suppliers.length === 0}
              className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]"
            >
              Add purchase
            </Button>
          </Space>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Purchases" value={stats.count.toString()} accent="#1a2842" />
          <StatCard
            label="Total spend"
            value={currency(stats.totalSpend)}
            accent="#16a34a"
          />
          <StatCard
            label="Outstanding"
            value={currency(stats.outstanding)}
            accent="#dc2626"
          />
          <StatCard
            label="Unpaid invoices"
            value={stats.unpaidCount.toString()}
            accent="#f59e0b"
          />
        </div>

        {/* Table card */}
        <Card className="shadow-sm" loading={purchasesLoading} styles={{ body: { padding: 0 } }}>
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search supplier, invoice or item..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
              <Select
                placeholder="All suppliers"
                allowClear
                value={supplierFilter ?? undefined}
                onChange={(v) => setSupplierFilter(v ?? null)}
                options={suppliers.map((s) => ({ label: s.name, value: s.id }))}
                showSearch
                optionFilterProp="label"
                className="!w-full sm:!w-[200px]"
                size="large"
              />
              <Select
                value={paymentFilter}
                onChange={setPaymentFilter}
                options={[
                  { label: 'All payments', value: 'all' },
                  { label: 'Paid', value: 'paid' },
                  { label: 'Partial', value: 'partial' },
                  { label: 'Unpaid', value: 'unpaid' },
                ]}
                className="!w-full sm:!w-[160px]"
                size="large"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filtered.length === purchases.length
                ? `${purchases.length} purchase${purchases.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${purchases.length} purchase${purchases.length !== 1 ? 's' : ''}`}
            </Text>
          </div>

          <Table<Purchase>
            columns={purchaseColumns}
            dataSource={filtered}
            rowKey="id"
            size="middle"
            className="[&_.ant-table]:!text-[14px]"
            locale={{
              emptyText: (
                <Empty
                  description="No purchases match your filters"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
            pagination={{
              showSizeChanger: true,
              showTotal: (t) => `Total ${t}`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
            scroll={{ x: 1100 }}
          />
        </Card>
      </div>

      {/* New purchase modal */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined />
            <span>New purchase</span>
          </Space>
        }
        open={open}
        onCancel={() => setOpen(false)}
        onOk={handleSave}
        okText="Save purchase"
        cancelText="Cancel"
        width={680}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        okButtonProps={{
          disabled: draft.items.length === 0 || !draft.supplierId,
          className: '!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]',
        }}
      >
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs text-slate-500">Date</label>
              <DatePicker
                value={draft.date}
                onChange={(d) => setDraft({ ...draft, date: d ?? dayjs() })}
                size="large"
                className="w-full"
                allowClear={false}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs text-slate-500">Supplier</label>
              <Select
                value={draft.supplierId ?? undefined}
                onChange={(v) => setDraft({ ...draft, supplierId: v ?? null })}
                options={supplierFormOptions}
                placeholder="Select supplier"
                size="large"
                showSearch
                optionFilterProp="label"
                className="w-full"
                notFoundContent={
                  suppliers.length === 0
                    ? 'No suppliers yet — add one from the Suppliers page'
                    : 'No matches'
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Invoice number (optional)
              </label>
              <Input
                placeholder="e.g. INV-001"
                value={draft.invoiceNumber}
                onChange={(e) =>
                  setDraft({ ...draft, invoiceNumber: e.target.value })
                }
                size="large"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Amount paid (GHS)
              </label>
              <InputNumber
                min={0}
                step={0.01}
                value={draft.amountPaid}
                onChange={(v) =>
                  setDraft({ ...draft, amountPaid: typeof v === 'number' ? v : 0 })
                }
                className="w-full"
                size="large"
                addonBefore="GHS"
              />
            </div>
          </div>

          <Divider className="!my-4">
            <FileTextOutlined className="mr-1 text-slate-400" />
            Line items
          </Divider>

          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_100px_140px_auto] sm:items-end">
              <div>
                <label className="mb-1 block text-xs text-slate-500">Product</label>
                <Select
                  placeholder="Select product"
                  value={currentItem.productId ?? undefined}
                  onChange={(v) => {
                    const product = products.find((p) => p.id === v);
                    setCurrentItem({
                      productId: v ?? null,
                      quantity: currentItem.quantity,
                      unitPrice: product?.costPrice ?? currentItem.unitPrice,
                    });
                  }}
                  options={products.map((p) => ({
                    label: `${p.name} (${p.unit})`,
                    value: p.id,
                  }))}
                  className="w-full"
                  size="large"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Qty</label>
                <InputNumber
                  min={0.01}
                  step={1}
                  value={currentItem.quantity ?? undefined}
                  onChange={(v) =>
                    setCurrentItem({
                      ...currentItem,
                      quantity: typeof v === 'number' ? v : null,
                    })
                  }
                  className="w-full"
                  size="large"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-slate-500">Unit price</label>
                <InputNumber
                  min={0}
                  step={0.01}
                  value={currentItem.unitPrice ?? undefined}
                  onChange={(v) =>
                    setCurrentItem({
                      ...currentItem,
                      unitPrice: typeof v === 'number' ? v : null,
                    })
                  }
                  className="w-full"
                  size="large"
                  addonBefore="GHS"
                />
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddItem}
                size="large"
                className="!bg-[#25395c] hover:!bg-[#1a2842]"
                disabled={
                  currentItem.productId == null ||
                  currentItem.quantity == null ||
                  currentItem.unitPrice == null
                }
              >
                Add
              </Button>
            </div>

            {draft.items.length > 0 ? (
              <>
                <div className="overflow-x-auto -mx-1">
                  <Table<DraftItem>
                    columns={lineItemColumns}
                    dataSource={draft.items}
                    rowKey="key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 540 }}
                  />
                </div>
                <div className="mt-4 flex flex-col gap-1 border-t border-slate-200 pt-4 text-right sm:items-end">
                  <Text className="text-sm">
                    Subtotal:{' '}
                    <span className="font-semibold text-slate-800">
                      {currency(draftTotal)}
                    </span>
                  </Text>
                  <Text className="text-sm">
                    Paid:{' '}
                    <span className="font-semibold text-[#25395c]">
                      {currency(Math.min(draft.amountPaid, draftTotal))}
                    </span>
                  </Text>
                  <Text strong className="text-base">
                    Balance:{' '}
                    <span className={draftBalance > 0 ? 'text-red-600' : 'text-slate-400'}>
                      {currency(draftBalance)}
                    </span>
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

      {/* Record payment modal */}
      <Modal
        title="Record payment"
        open={!!paymentTarget}
        onCancel={() => {
          setPaymentTarget(null);
          setPaymentAmount(null);
        }}
        onOk={handleRecordPayment}
        okText="Record"
        cancelText="Cancel"
        okButtonProps={{
          className: '!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]',
          disabled: !paymentAmount || paymentAmount <= 0,
        }}
      >
        {paymentTarget && (
          <div className="space-y-3 py-2">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="text-slate-500">Supplier</div>
              <div className="font-semibold text-slate-800">
                {paymentTarget.supplierName}
              </div>
              <div className="mt-1 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-slate-500">Total</div>
                  <div className="font-semibold">{currency(paymentTarget.totalCost)}</div>
                </div>
                <div>
                  <div className="text-slate-500">Paid</div>
                  <div className="font-semibold text-[#25395c]">
                    {currency(paymentTarget.amountPaid)}
                  </div>
                </div>
                <div>
                  <div className="text-slate-500">Balance</div>
                  <div className="font-semibold text-red-600">
                    {currency(Math.max(0, paymentTarget.totalCost - paymentTarget.amountPaid))}
                  </div>
                </div>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">
                Payment amount (GHS)
              </label>
              <InputNumber
                min={0.01}
                max={Math.max(0, paymentTarget.totalCost - paymentTarget.amountPaid)}
                step={0.01}
                value={paymentAmount ?? undefined}
                onChange={(v) =>
                  setPaymentAmount(typeof v === 'number' ? v : null)
                }
                className="w-full"
                size="large"
                addonBefore="GHS"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Purchase details modal */}
      <Modal
        title="Purchase details"
        open={!!viewing}
        onCancel={() => setViewing(null)}
        footer={
          <Button onClick={() => setViewing(null)}>Close</Button>
        }
        width={620}
      >
        {viewing && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-slate-500">Date</div>
                <div className="font-semibold">{formatDate(viewing.date)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Supplier</div>
                <div className="font-semibold">{viewing.supplierName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500">Invoice</div>
                <div className="font-semibold">{viewing.invoiceNumber || '—'}</div>
              </div>
            </div>

            <Table<PurchaseItem>
              dataSource={viewing.items}
              rowKey={(r) =>
                r.productId
                  ? `${r.productId}-${r.quantity}-${r.unitPrice}-${r.name}`
                  : `${r.name}-${r.quantity}-${r.unitPrice}`
              }
              pagination={false}
              size="small"
              columns={[
                { title: 'Item', dataIndex: 'name', key: 'name' },
                {
                  title: 'Qty',
                  key: 'qty',
                  align: 'right',
                  render: (_, r) => `${r.quantity} ${r.unit}`,
                },
                {
                  title: 'Unit',
                  dataIndex: 'unitPrice',
                  key: 'unitPrice',
                  align: 'right',
                  render: (v: number) => currency(v),
                },
                {
                  title: 'Total',
                  dataIndex: 'total',
                  key: 'total',
                  align: 'right',
                  render: (v: number) => <Text strong>{currency(v)}</Text>,
                },
              ]}
            />

            <div className="flex flex-col items-end gap-1 border-t border-slate-200 pt-3 text-sm">
              <div>
                Subtotal:{' '}
                <span className="font-semibold">{currency(viewing.totalCost)}</span>
              </div>
              <div>
                Paid:{' '}
                <span className="font-semibold text-[#25395c]">
                  {currency(viewing.amountPaid)}
                </span>
              </div>
              <div className="text-base">
                Balance:{' '}
                <span
                  className={`font-semibold ${
                    (viewing.balance !== undefined && viewing.balance !== null
                      ? viewing.balance
                      : Math.max(0, viewing.totalCost - viewing.amountPaid)) > 0
                      ? 'text-red-600'
                      : 'text-slate-400'
                  }`}
                >
                  {currency(
                    viewing.balance !== undefined && viewing.balance !== null
                      ? viewing.balance
                      : Math.max(0, viewing.totalCost - viewing.amountPaid)
                  )}
                </span>
              </div>
              <Tag
                color={paymentTone(getPaymentStatus(viewing))}
                className="rounded-full"
              >
                {paymentLabel(getPaymentStatus(viewing))}
              </Tag>
            </div>

            {viewing.payments && viewing.payments.length > 0 && (
              <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-3">
                <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Payment history
                </div>
                <ul className="space-y-2">
                  {[...viewing.payments]
                    .sort(
                      (a, b) =>
                        new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()
                    )
                    .map((pay) => (
                      <li
                        key={pay.id}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-slate-600">{formatDateTime(pay.recordedAt)}</span>
                        <span className="font-semibold text-[#25395c]">{currency(pay.amount)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}

interface StatCardProps {
  label: string;
  value: string;
  accent?: string;
}

function StatCard({ label, value, accent = '#1a2842' }: StatCardProps) {
  return (
    <Card className="shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className="mt-0.5 truncate text-xl font-semibold"
        style={{ color: accent }}
      >
        {value}
      </div>
    </Card>
  );
}
