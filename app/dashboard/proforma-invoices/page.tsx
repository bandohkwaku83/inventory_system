'use client';

import React, { useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Tag,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  message,
  Popconfirm,
} from 'antd';
import type { TableProps } from 'antd';
import {
  PlusOutlined,
  PrinterOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ReceiptDocument from '../../components/ReceiptDocument';
import { useProforma, type ProformaInvoice, type ProformaStatus } from '../../context/ProformaContext';
import { useProducts } from '../../context/ProductsContext';
import { printReceipt } from '../../lib/printReceipt';

const { Title, Text } = Typography;

const statusColors: Record<ProformaStatus, string> = {
  draft: 'default',
  sent: 'blue',
  approved: 'green',
  expired: 'red',
};

interface CartLine {
  productId: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export default function ProformaInvoicesPage() {
  const {
    proformas,
    proformasLoading,
    addProforma,
    updateProforma,
    deleteProforma,
    fetchProforma,
  } = useProforma();
  const { visibleProducts } = useProducts();
  const [createOpen, setCreateOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [selected, setSelected] = useState<ProformaInvoice | null>(null);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);

  const addToCart = (productId: string, qty = 1) => {
    const p = visibleProducts.find((x) => x.id === productId);
    if (!p) return;
    setCart((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, quantity: l.quantity + qty } : l
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          price: p.price,
          quantity: qty,
        },
      ];
    });
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      if (cart.length === 0) {
        message.error('Add at least one item');
        return;
      }
      setSaving(true);
      const invoice = await addProforma({
        customer: values.customer as string,
        customerPhone: values.customerPhone as string | undefined,
        discount: Number(values.discount ?? 0),
        notes: values.notes as string | undefined,
        items: cart.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      });
      setCreateOpen(false);
      setCart([]);
      form.resetFields();
      setSelected(invoice);
      setViewOpen(true);
    } catch {
      // errors surfaced by context
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    form.resetFields();
    form.setFieldsValue({ discount: 0 });
    setCart([]);
    setCreateOpen(true);
  };

  const openView = async (record: ProformaInvoice) => {
    setSelected(record);
    setViewOpen(true);
    const fresh = await fetchProforma(record.id);
    if (fresh) setSelected(fresh);
  };

  const columns: TableProps<ProformaInvoice>['columns'] = [
    {
      title: 'Proforma #',
      dataIndex: 'proformaNumber',
      key: 'proformaNumber',
      render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span>,
    },
    { title: 'Customer', dataIndex: 'customer', key: 'customer' },
    {
      title: 'Phone',
      dataIndex: 'customerPhone',
      key: 'customerPhone',
      render: (v?: string) => v?.trim() || '—',
    },
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Valid until', dataIndex: 'validUntil', key: 'validUntil' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: ProformaStatus) => (
        <Tag color={statusColors[v]} className="rounded-full capitalize">
          {v}
        </Tag>
      ),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (v: number) => <span className="font-semibold">GHS {v.toFixed(2)}</span>,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, r: ProformaInvoice) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => void openView(r)}>
            View
          </Button>
          <Popconfirm
            title="Delete this proforma?"
            description="This cannot be undone."
            onConfirm={() => void deleteProforma(r.id)}
            okText="Delete"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Proforma Invoices
            </Title>
            <Text type="secondary">
              Create and print quotations without recording a sale or deducting stock.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Create proforma
          </Button>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table<ProformaInvoice>
            rowKey="id"
            columns={columns}
            dataSource={proformas}
            loading={proformasLoading}
            pagination={{ pageSize: 10 }}
            size="small"
            scroll={{ x: 1020 }}
            locale={{ emptyText: 'No proforma invoices yet. Create one to get started.' }}
          />
        </Card>
      </div>

      <Modal
        title="Create proforma invoice"
        open={createOpen}
        onCancel={() => setCreateOpen(false)}
        onOk={() => void handleCreate()}
        okText="Save & print"
        confirmLoading={saving}
        width={640}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Form.Item
              name="customer"
              label="Customer name"
              rules={[{ required: true, message: 'Required' }]}
            >
              <Input placeholder="Customer or company" />
            </Form.Item>
            <Form.Item name="customerPhone" label="Phone">
              <Input placeholder="+233..." />
            </Form.Item>
          </div>
          <Form.Item name="discount" label="Discount (GHS)">
            <InputNumber min={0} max={subtotal} className="w-full sm:w-48" prefix="GHS" />
          </Form.Item>
          <Form.Item name="notes" label="Notes">
            <Input.TextArea rows={2} placeholder="Optional terms or notes" />
          </Form.Item>

          <Text strong className="block mb-2">
            Add items
          </Text>
          <Select
            showSearch
            placeholder="Search by name or SKU…"
            className="w-full mb-3"
            suffixIcon={<SearchOutlined />}
            filterOption={(input, option) => {
              if (!option?.value) return false;
              const q = input.toLowerCase();
              const p = visibleProducts.find((x) => x.id === option.value);
              if (!p) return false;
              return (
                p.name.toLowerCase().includes(q) ||
                (p.sku ?? '').toLowerCase().includes(q)
              );
            }}
            onSelect={(id: string) => addToCart(id, 1)}
            options={visibleProducts.map((p) => ({
              value: p.id,
              label: `${p.name}${p.sku ? ` · ${p.sku}` : ''} — GHS ${p.price.toFixed(2)}`,
            }))}
          />

          {cart.length > 0 && (
            <div className="rounded-lg border border-slate-200 divide-y">
              {cart.map((line) => (
                <div
                  key={line.productId}
                  className="flex items-center justify-between px-3 py-2 text-sm"
                >
                  <span>
                    {line.name} × {line.quantity}
                  </span>
                  <Space>
                    <InputNumber
                      min={1}
                      size="small"
                      value={line.quantity}
                      onChange={(v) =>
                        setCart((prev) =>
                          prev.map((l) =>
                            l.productId === line.productId
                              ? { ...l, quantity: typeof v === 'number' ? v : 1 }
                              : l
                          )
                        )
                      }
                    />
                    <Button
                      type="text"
                      danger
                      size="small"
                      onClick={() =>
                        setCart((prev) => prev.filter((l) => l.productId !== line.productId))
                      }
                    >
                      Remove
                    </Button>
                  </Space>
                </div>
              ))}
              <div className="px-3 py-2 text-right font-semibold text-[#25395c]">
                Estimated subtotal: GHS {subtotal.toFixed(2)}
              </div>
              <Text type="secondary" className="block px-3 pb-2 text-xs">
                Final totals and tax are calculated by the server when saved.
              </Text>
            </div>
          )}
        </Form>
      </Modal>

      <Modal
        title="Proforma invoice"
        open={viewOpen}
        onCancel={() => {
          setViewOpen(false);
          setSelected(null);
        }}
        footer={null}
        width={420}
        destroyOnHidden
      >
        {selected && (
          <>
            <ReceiptDocument
              type="proforma"
              id={selected.proformaNumber}
              date={selected.date}
              time=""
              customer={selected.customer}
              items={selected.items}
              subtotal={selected.subtotal}
              discount={selected.discount}
              total={selected.total}
              notes={selected.notes}
              validUntil={selected.validUntil}
            />
            <div className="no-print mt-4 flex gap-2">
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => printReceipt()}
                className="flex-1 !bg-[#25395c]"
              >
                Print proforma
              </Button>
              <Select
                value={selected.status}
                className="w-32"
                onChange={async (v: ProformaStatus) => {
                  try {
                    await updateProforma(selected.id, { status: v });
                    setSelected({ ...selected, status: v });
                  } catch {
                    // error shown by context
                  }
                }}
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'sent', label: 'Sent' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'expired', label: 'Expired' },
                ]}
              />
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
