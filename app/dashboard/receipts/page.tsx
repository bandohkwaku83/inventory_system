'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  InputNumber,
  Modal,
  Typography,
  Tooltip,
  Select,
  Empty,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  PrinterOutlined,
  FileTextOutlined,
  EditOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import ReceiptDocument from '../../components/ReceiptDocument';
import {
  useSales,
  type Sale,
  type SalePaymentMethod,
  type SaleStatus,
} from '../../context/SalesContext';
import { useCustomers } from '../../context/CustomersContext';
import { useAuth } from '../../context/AuthContext';
import { isAdminRole } from '../../lib/permissions';
import { printReceipt } from '../../lib/printReceipt';

const { Title, Text } = Typography;

type StatusFilter = SaleStatus | 'all';

const currency = (v: number) => `GHS ${v.toFixed(2)}`;

export default function ReceiptsPage() {
  const router = useRouter();
  const { sales, updateSale } = useSales();
  const { refreshCustomers } = useCustomers();
  const { user } = useAuth();
  const isAdmin = Boolean(user && isAdminRole(user.role));
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [salespersonFilter, setSalespersonFilter] = useState<string | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const [completeOpen, setCompleteOpen] = useState(false);
  const [completingSale, setCompletingSale] = useState<Sale | null>(null);
  const [completePayment, setCompletePayment] = useState<SalePaymentMethod>('Cash');
  const [cashTendered, setCashTendered] = useState(0);
  const [completing, setCompleting] = useState(false);

  const [messageApi, messageCtx] = message.useMessage();

  const salespersonOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const sale of sales) {
      const key = sale.servedBy || sale.servedByName;
      if (!key) continue;
      map.set(key, sale.servedByName || sale.servedBy || key);
    }
    return Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [sales]);

  const filteredReceipts = useMemo(() => {
    let list = sales;
    // Admin-only UI filter — API already scopes non-admins to their own sales.
    if (isAdmin && salespersonFilter) {
      list = list.filter(
        (r) => r.servedBy === salespersonFilter || r.servedByName === salespersonFilter
      );
    }
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    if (!searchText.trim()) return list;
    const q = searchText.toLowerCase();
    return list.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        r.paymentMethod.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q) ||
        (r.servedByName ?? '').toLowerCase().includes(q)
    );
  }, [sales, searchText, statusFilter, isAdmin, salespersonFilter]);

  const completeChange = (cashTendered || 0) - (completingSale?.total ?? 0);

  useEffect(() => {
    if (!completingSale) return;
    setCompletePayment(completingSale.paymentMethod);
    setCashTendered(
      completingSale.paymentMethod === 'Cash' ? Math.ceil(completingSale.total) : 0
    );
  }, [completingSale]);

  /** Resume the parked cart on the POS register. */
  const openEdit = (sale: Sale) => {
    setViewOpen(false);
    router.push(`/dashboard/sales?edit=${encodeURIComponent(sale.id)}`);
  };

  const openComplete = (sale: Sale) => {
    setCompletingSale(sale);
    setCompleteOpen(true);
  };

  const confirmComplete = async () => {
    if (!completingSale) return;
    if (completePayment === 'Cash' && completeChange < 0) {
      messageApi.warning('Cash received is short');
      return;
    }
    setCompleting(true);
    try {
      const updated = await updateSale(completingSale.id, {
        paymentMethod: completePayment,
        cashTendered: completePayment === 'Cash' ? cashTendered : undefined,
        status: 'completed',
        items: completingSale.items.map((i) => ({
          productId: i.id,
          quantity: i.quantity,
          price: i.price,
        })),
        customer: completingSale.customer,
        customerId: completingSale.customerId ?? null,
        discount: completingSale.discount,
      });
      messageApi.success('Sale completed');
      setCompleteOpen(false);
      setCompletingSale(null);
      setSelectedReceipt(updated);
      setViewOpen(true);
      try {
        await refreshCustomers();
      } catch {
        /* totals update is best-effort */
      }
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Could not complete sale');
    } finally {
      setCompleting(false);
    }
  };

  const columns: TableProps<Sale>['columns'] = [
    {
      title: 'Receipt ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      render: (id: string) => (
        <span className="font-mono text-sm font-semibold text-slate-800">{id}</span>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer',
      key: 'customer',
      width: 140,
      render: (customer: string) => <Text>{customer || 'Walk-in'}</Text>,
    },
    ...(isAdmin
      ? [
          {
            title: 'Served by',
            dataIndex: 'servedByName',
            key: 'servedByName',
            width: 140,
            render: (name: string | undefined) => (
              <Text type="secondary">{name || '—'}</Text>
            ),
          } satisfies NonNullable<TableProps<Sale>['columns']>[number],
        ]
      : []),
    { title: 'Date', dataIndex: 'date', key: 'date', width: 110 },
    { title: 'Time', dataIndex: 'time', key: 'time', width: 90 },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total - b.total,
      render: (total: number) => (
        <Text strong style={{ color: '#25395c' }}>
          {currency(total)}
        </Text>
      ),
    },
    {
      title: 'Payment',
      dataIndex: 'paymentMethod',
      key: 'paymentMethod',
      width: 120,
      render: (method: string) => (
        <Tag color="cyan" className="rounded-full">
          {method}
        </Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 110,
      render: (status: SaleStatus) =>
        status === 'pending' ? (
          <Tag color="gold" className="!m-0 !rounded-md">
            Pending
          </Tag>
        ) : (
          <Tag color="success" className="!m-0 !rounded-md">
            Completed
          </Tag>
        ),
    },
    {
      title: 'Actions',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                setSelectedReceipt(record);
                setViewOpen(true);
              }}
              className="text-[#25395c] hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
            />
          </Tooltip>
          {record.status === 'pending' ? (
            <>
              <Tooltip title="Edit on POS">
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => openEdit(record)}
                  className="text-slate-600 hover:!bg-slate-100"
                />
              </Tooltip>
              <Tooltip title="Complete">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => openComplete(record)}
                  className="text-emerald-700 hover:!bg-emerald-50"
                />
              </Tooltip>
            </>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {messageCtx}
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            {isAdmin ? 'All sales' : 'My sales'}
          </Title>
          <Text type="secondary">
            {isAdmin
              ? 'Completed receipts and pending sales across the team — resume pending ones on Sales (POS) or complete them here'
              : 'Your completed receipts and pending sales — resume pending ones on Sales (POS) or complete them here'}
          </Text>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="receipts-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap">
              <Input
                placeholder="Search by receipt ID, customer or payment..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                className="w-full sm:w-80"
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                size="large"
                className="w-full sm:w-40"
                options={[
                  { value: 'all', label: 'All statuses' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
              {isAdmin ? (
                <Select
                  allowClear
                  placeholder="Filter by salesperson"
                  value={salespersonFilter ?? undefined}
                  onChange={(v) => setSalespersonFilter(v ?? null)}
                  size="large"
                  className="w-full sm:w-52"
                  options={salespersonOptions}
                  optionFilterProp="label"
                  showSearch
                />
              ) : null}
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filteredReceipts.length} sale{filteredReceipts.length !== 1 ? 's' : ''}
            </Text>
          </div>

          <Table<Sale>
            columns={columns}
            dataSource={filteredReceipts}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} sales`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
            size="middle"
            scroll={{ x: isAdmin ? 1020 : 880 }}
            locale={{
              emptyText: (
                <Empty
                  description={isAdmin ? 'No sales found' : 'No sales yet'}
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              ),
            }}
          />
        </Card>
      </div>

      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>
              {selectedReceipt?.status === 'pending' ? 'Pending sale' : 'Receipt'}{' '}
              {selectedReceipt?.id}
            </span>
            {selectedReceipt?.status === 'pending' ? (
              <Tag color="gold">Pending</Tag>
            ) : (
              <Tag color="success">Completed</Tag>
            )}
          </Space>
        }
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={420}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
      >
        {selectedReceipt && (
          <>
            <ReceiptDocument
              type="sale"
              id={selectedReceipt.id}
              date={selectedReceipt.date}
              time={selectedReceipt.time}
              customer={selectedReceipt.customer}
              servedByName={selectedReceipt.servedByName}
              paymentMethod={selectedReceipt.paymentMethod}
              items={selectedReceipt.items}
              subtotal={selectedReceipt.subtotal}
              discount={selectedReceipt.discount}
              total={selectedReceipt.total}
              cashTendered={selectedReceipt.cashTendered}
              change={selectedReceipt.change}
            />
            {selectedReceipt.status === 'completed' ? (
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => printReceipt()}
                block
                size="large"
                className="no-print mt-4 !bg-[#25395c] hover:!bg-[#1a2842]"
              >
                Print receipt
              </Button>
            ) : (
              <div className="no-print mt-4 grid grid-cols-2 gap-2">
                <Button icon={<EditOutlined />} onClick={() => openEdit(selectedReceipt)}>
                  Edit on POS
                </Button>
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  className="!bg-[#25395c]"
                  onClick={() => openComplete(selectedReceipt)}
                >
                  Complete
                </Button>
              </div>
            )}
          </>
        )}
      </Modal>

      <Modal
        title={`Complete sale · ${completingSale?.id ?? ''}`}
        open={completeOpen}
        onCancel={() => {
          setCompleteOpen(false);
          setCompletingSale(null);
        }}
        onOk={() => void confirmComplete()}
        okText="Mark completed"
        confirmLoading={completing}
        okButtonProps={{
          disabled: completePayment === 'Cash' && completeChange < 0,
        }}
        destroyOnHidden
      >
        {completingSale ? (
          <div className="space-y-4 pt-1">
            <div className="rounded-xl bg-slate-50 px-4 py-3">
              <p className="text-xs text-slate-500">Amount due</p>
              <p className="font-mono text-2xl font-bold text-[#25395c]">
                {currency(completingSale.total)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {completingSale.customer} · {completingSale.items.length} item
                {completingSale.items.length === 1 ? '' : 's'}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment method
              </p>
              <div className="grid grid-cols-2 gap-2">
                {(['Cash', 'Mobile Money'] as SalePaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setCompletePayment(method);
                      if (method === 'Cash') {
                        setCashTendered(Math.ceil(completingSale.total));
                      } else {
                        setCashTendered(0);
                      }
                    }}
                    className={`rounded-lg border-2 py-2.5 text-sm font-semibold ${
                      completePayment === method
                        ? 'border-[#25395c] bg-[#25395c] text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>
            {completePayment === 'Cash' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1 text-[11px] font-medium text-slate-400">Received</p>
                  <InputNumber
                    min={0}
                    value={cashTendered}
                    onChange={(v) => setCashTendered(typeof v === 'number' ? v : 0)}
                    className="w-full"
                    addonBefore="GHS"
                  />
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-medium text-slate-400">Change</p>
                  <div
                    className={`flex h-8 items-center justify-end rounded border px-3 font-mono text-sm font-bold ${
                      completeChange < 0
                        ? 'border-red-200 bg-red-50 text-red-600'
                        : 'border-slate-200 bg-slate-50 text-slate-800'
                    }`}
                  >
                    {completeChange < 0 ? 'Short' : currency(completeChange)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </DashboardLayout>
  );
}
