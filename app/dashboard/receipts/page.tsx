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
import ReceiptDocument from '../../components/ReceiptDocument';
import { useSales, type Sale } from '../../context/SalesContext';

const { Title, Text } = Typography;

export default function ReceiptsPage() {
  const { sales } = useSales();
  const [searchText, setSearchText] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Sale | null>(null);

  const filteredReceipts = useMemo(() => {
    if (!searchText.trim()) return sales;
    const q = searchText.toLowerCase();
    return sales.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.customer.toLowerCase().includes(q) ||
        r.date.includes(q) ||
        r.paymentMethod.toLowerCase().includes(q)
    );
  }, [sales, searchText]);

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
              onClick={() => {
                setSelectedReceipt(record);
                setViewOpen(true);
              }}
              className="text-[#25395c] hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
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
          <Text type="secondary">View and reprint POS receipts with VAT/NHIL breakdown</Text>
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
              {filteredReceipts.length} receipt{filteredReceipts.length !== 1 ? 's' : ''}
            </Text>
          </div>

          <Table<Sale>
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
            <Button
              type="primary"
              icon={<PrinterOutlined />}
              onClick={() => window.print()}
              block
              size="large"
              className="no-print mt-4 !bg-[#25395c] hover:!bg-[#1a2842]"
            >
              Print receipt
            </Button>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
