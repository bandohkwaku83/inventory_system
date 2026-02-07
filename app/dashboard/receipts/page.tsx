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
  Typography,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  PrinterOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';

const { Title, Text } = Typography;

interface ReceiptItem {
  name: string;
  quantity: number;
  price: number;
}

interface Receipt {
  id: string;
  customer: string;
  date: string;
  time: string;
  total: number;
  paymentMethod: string;
  items: ReceiptItem[];
}

const receiptsData: Receipt[] = [
  {
    id: 'R001',
    customer: 'John Doe',
    date: '2024-01-15',
    time: '2:30 PM',
    total: 24.0,
    paymentMethod: 'Cash',
    items: [
      { name: 'Milk 1L', quantity: 2, price: 7.0 },
      { name: 'Bread (Loaf)', quantity: 1, price: 5.0 },
    ],
  },
  {
    id: 'R002',
    customer: '',
    date: '2024-01-15',
    time: '2:15 PM',
    total: 31.0,
    paymentMethod: 'Mobile Money',
    items: [
      { name: 'Rice 2kg', quantity: 1, price: 15.0 },
      { name: 'Cooking Oil 1L', quantity: 1, price: 14.0 },
    ],
  },
  {
    id: 'R003',
    customer: 'Jane Smith',
    date: '2024-01-15',
    time: '1:45 PM',
    total: 22.0,
    paymentMethod: 'Cash',
    items: [
      { name: 'Soft Drinks 500ml', quantity: 3, price: 5.0 },
      { name: 'Snacks', quantity: 2, price: 3.5 },
    ],
  },
  {
    id: 'R004',
    customer: '',
    date: '2024-01-15',
    time: '1:20 PM',
    total: 19.0,
    paymentMethod: 'Cash',
    items: [
      { name: 'Bread (Loaf)', quantity: 2, price: 5.0 },
      { name: 'Milk 1L', quantity: 1, price: 7.0 },
    ],
  },
];

export default function ReceiptsPage() {
  const [receipts] = useState<Receipt[]>(receiptsData);
  const [searchText, setSearchText] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const filteredReceipts = useMemo(() => {
    if (!searchText.trim()) return receipts;
    const q = searchText.toLowerCase();
    return receipts.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        (r.customer && r.customer.toLowerCase().includes(q)) ||
        r.date.includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
    );
  }, [receipts, searchText]);

  const handleView = (receipt: Receipt) => {
    setSelectedReceipt(receipt);
    setViewOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const columns: TableProps<Receipt>['columns'] = [
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
      render: (customer: string) => (
        <Text>{customer || 'Walk-in'}</Text>
      ),
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 110,
    },
    {
      title: 'Time',
      dataIndex: 'time',
      key: 'time',
      width: 90,
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      width: 120,
      align: 'right',
      sorter: (a, b) => a.total - b.total,
      render: (total: number) => (
        <Text strong style={{ color: '#059669' }}>
          GHS {total.toFixed(2)}
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
      title: 'Actions',
      key: 'action',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View receipt">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
              className="text-teal-600 hover:!text-teal-700 hover:!bg-teal-50"
            />
          </Tooltip>
          <Tooltip title="Print">
            <Button
              type="text"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              className="text-slate-500 hover:!text-teal-600 hover:!bg-teal-50"
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Receipts
          </Title>
          <Text type="secondary">View and print transaction receipts</Text>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="receipts-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
              <Input
                placeholder="Search by receipt ID, customer or payment..."
                prefix={<SearchOutlined className="text-slate-400" />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                size="large"
                className="w-full"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filteredReceipts.length === receipts.length
                ? `${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`
                : `${filteredReceipts.length} of ${receipts.length} receipt${receipts.length !== 1 ? 's' : ''}`}
            </Text>
          </div>

          <Table<Receipt>
            columns={columns}
            dataSource={filteredReceipts}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} receipts`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
            size="middle"
            scroll={{ x: 700 }}
          />
        </Card>
      </div>

      {/* View / Print receipt modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Receipt {selectedReceipt?.id}</span>
          </Space>
        }
        open={viewOpen}
        onCancel={() => setViewOpen(false)}
        footer={null}
        width={400}
        destroyOnClose
        className="receipt-print-modal"
      >
        {selectedReceipt && (
          <div className="py-2">
            {/* Store header */}
            <div className="mb-6 text-center">
              <Title level={5} className="!mb-1 !font-bold">
                Inventory System
              </Title>
              <Text type="secondary" className="text-xs">
                Accra - Ghana
              </Text>
              <br />
              <Text type="secondary" className="text-xs">
                Tel: +233 XX XXX XXXX
              </Text>
            </div>

            <div className="border-t border-b border-slate-200 py-3">
              <div className="flex justify-between text-sm">
                <Text type="secondary">Receipt</Text>
                <Text strong>{selectedReceipt.id}</Text>
              </div>
              <div className="flex justify-between text-sm">
                <Text type="secondary">Date</Text>
                <Text>{selectedReceipt.date} · {selectedReceipt.time}</Text>
              </div>
              {selectedReceipt.customer && (
                <div className="flex justify-between text-sm">
                  <Text type="secondary">Customer</Text>
                  <Text>{selectedReceipt.customer}</Text>
                </div>
              )}
            </div>

            {/* Items */}
            <div className="my-4">
              <Text strong className="mb-2 block text-xs uppercase text-slate-500">
                Items
              </Text>
              <div className="space-y-2">
                {selectedReceipt.items.map((item, index) => (
                  <div
                    key={index}
                    className="flex justify-between text-sm"
                  >
                    <span className="text-slate-700">
                      {item.name} × {item.quantity} @ GHS {item.price.toFixed(2)}
                    </span>
                    <span className="font-medium text-slate-800">
                      GHS {(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-slate-200 pt-3">
              <div className="flex justify-between">
                <Text strong>Total</Text>
                <Text strong className="text-base" style={{ color: '#059669' }}>
                  GHS {selectedReceipt.total.toFixed(2)}
                </Text>
              </div>
              <Text type="secondary" className="mt-1 block text-xs">
                Payment: {selectedReceipt.paymentMethod}
              </Text>
            </div>

            <p className="mt-6 text-center text-xs text-slate-500">
              Thank you for your business!
            </p>

            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={handlePrint}
              block
              size="large"
              className="mt-6 !bg-teal-600 hover:!bg-teal-700"
            >
              Print receipt
            </Button>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
