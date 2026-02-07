'use client';

import React, { useState } from 'react';
import {
  Card,
  Select,
  Button,
  Table,
  Typography,
  Space,
  DatePicker,
} from 'antd';
import type { TableProps } from 'antd';
import {
  BarChartOutlined,
  LineChartOutlined,
  DownloadOutlined,
  FilePdfOutlined,
  RiseOutlined,
  DollarOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import DashboardLayout from '../../components/DashboardLayout';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
type RangeValue = React.ComponentProps<typeof RangePicker>['value'];

const reportTypes = [
  { value: 'daily', label: 'Daily Sales' },
  { value: 'monthly', label: 'Monthly Sales' },
  { value: 'top', label: 'Top Selling Items' },
];

interface DailySalesData {
  date: string;
  sales: number;
  profit: number;
}

interface MonthlySalesData {
  month: string;
  sales: number;
  profit: number;
}

interface TopSellingItem {
  name: string;
  quantity: number;
  revenue: number;
}

const dailySalesData: DailySalesData[] = [
  { date: 'Jan 8', sales: 2400, profit: 1200 },
  { date: 'Jan 9', sales: 1398, profit: 699 },
  { date: 'Jan 10', sales: 9800, profit: 4900 },
  { date: 'Jan 11', sales: 3908, profit: 1954 },
  { date: 'Jan 12', sales: 4800, profit: 2400 },
  { date: 'Jan 13', sales: 3800, profit: 1900 },
  { date: 'Jan 14', sales: 4300, profit: 2150 },
];

const monthlySalesData: MonthlySalesData[] = [
  { month: 'Jan', sales: 45000, profit: 22500 },
  { month: 'Feb', sales: 52000, profit: 26000 },
  { month: 'Mar', sales: 48000, profit: 24000 },
  { month: 'Apr', sales: 55000, profit: 27500 },
  { month: 'May', sales: 60000, profit: 30000 },
  { month: 'Jun', sales: 58000, profit: 29000 },
];

const topSellingItems: TopSellingItem[] = [
  { name: 'Milk 1L', quantity: 450, revenue: 3150 },
  { name: 'Bread (Loaf)', quantity: 380, revenue: 1900 },
  { name: 'Rice 2kg', quantity: 320, revenue: 4800 },
  { name: 'Cooking Oil 1L', quantity: 280, revenue: 3920 },
  { name: 'Soft Drinks 500ml', quantity: 250, revenue: 1250 },
];

const totalSales = dailySalesData.reduce((s, d) => s + d.sales, 0);
const totalProfit = dailySalesData.reduce((s, d) => s + d.profit, 0);

const topSellingItemsColumns: TableProps<TopSellingItem>['columns'] = [
  {
    title: 'Product',
    dataIndex: 'name',
    key: 'name',
    render: (name: string) => <Text strong>{name}</Text>,
  },
  {
    title: 'Quantity sold',
    dataIndex: 'quantity',
    key: 'quantity',
    align: 'right',
    render: (q: number) => <Text>{q.toLocaleString()}</Text>,
  },
  {
    title: 'Revenue',
    dataIndex: 'revenue',
    key: 'revenue',
    align: 'right',
    render: (r: number) => (
      <Text strong className="text-teal-600">GHS {r.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
    ),
  },
];

const salesDataColumns: TableProps<DailySalesData | MonthlySalesData>['columns'] = [
  {
    title: 'Period',
    key: 'period',
    dataIndex: 'date',
    render: (_: unknown, r: DailySalesData | MonthlySalesData) =>
      'month' in r ? r.month : r.date,
  },
  {
    title: 'Sales',
    dataIndex: 'sales',
    key: 'sales',
    align: 'right',
    render: (s: number) => (
      <Text strong className="text-slate-800">GHS {s.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
    ),
  },
  {
    title: 'Profit',
    dataIndex: 'profit',
    key: 'profit',
    align: 'right',
    render: (p: number) => (
      <Text strong className="text-emerald-600">GHS {p.toLocaleString('en-US', { minimumFractionDigits: 2 })}</Text>
    ),
  },
];

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>('daily');
  const [dateRange, setDateRange] = useState<RangeValue>(null);

  const handleExport = (format: 'pdf' | 'excel') => {
    const label = reportTypes.find((r) => r.value === reportType)?.label ?? reportType;
    alert(`Exporting ${label} as ${format.toUpperCase()}...`);
  };

  const chartData = reportType === 'top' ? topSellingItems : reportType === 'monthly' ? monthlySalesData : dailySalesData;
  const xKey = reportType === 'top' ? 'name' : reportType === 'monthly' ? 'month' : 'date';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Reports
          </Title>
          <Text type="secondary">View and export sales, profit, and top products</Text>
        </div>

        {/* Toolbar: report type + date range + export */}
        <Card className="shadow-sm" styles={{ body: { padding: '1rem 1.25rem' } }}>
          <div className="reports-toolbar flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
              <Select
                value={reportType}
                onChange={setReportType}
                options={reportTypes}
                className="!w-full sm:!w-[180px] min-w-0"
                size="large"
                suffixIcon={reportType === 'top' ? <BarChartOutlined /> : <LineChartOutlined />}
              />
              <RangePicker
                value={dateRange}
                onChange={(v) => setDateRange(v)}
                size="large"
                className="!w-full sm:!w-[260px]"
                placeholder={['Start date', 'End date']}
              />
            </div>
            <Space size="middle" wrap className="w-full sm:w-auto">
              <Button
                icon={<FilePdfOutlined />}
                size="large"
                onClick={() => handleExport('pdf')}
                className="!border-slate-300 !text-slate-700 hover:!border-teal-400 hover:!text-teal-600"
              >
                PDF
              </Button>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                size="large"
                onClick={() => handleExport('excel')}
                className="!bg-teal-600 !border-teal-600 hover:!bg-teal-700 hover:!border-teal-700"
              >
                Excel
              </Button>
            </Space>
          </div>
        </Card>

        {/* Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="shadow-sm overflow-hidden" styles={{ body: { padding: '1.25rem' } }}>
            <div className="flex items-start justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase tracking-wide">Total sales (period)</Text>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  GHS {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
                <ShoppingOutlined className="text-lg" />
              </div>
            </div>
          </Card>
          <Card className="shadow-sm overflow-hidden" styles={{ body: { padding: '1.25rem' } }}>
            <div className="flex items-start justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase tracking-wide">Total profit (period)</Text>
                <p className="mt-1 text-xl font-bold text-emerald-600">
                  GHS {totalProfit.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                <RiseOutlined className="text-lg" />
              </div>
            </div>
          </Card>
          <Card className="shadow-sm overflow-hidden" styles={{ body: { padding: '1.25rem' } }}>
            <div className="flex items-start justify-between">
              <div>
                <Text type="secondary" className="text-xs uppercase tracking-wide">Margin</Text>
                <p className="mt-1 text-xl font-bold text-slate-800">
                  {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(1) : 0}%
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                <DollarOutlined className="text-lg" />
              </div>
            </div>
          </Card>
        </div>

        {/* Chart */}
        <Card className="shadow-sm" styles={{ body: { padding: '1.5rem' } }}>
          <h3 className="mb-4 text-sm font-bold text-slate-800">
            {reportTypes.find((r) => r.value === reportType)?.label} — Overview
          </h3>
          {reportType === 'top' ? (
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                <defs>
                  <linearGradient id="barTeal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14b8a6" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.7} />
                  </linearGradient>
                  <linearGradient id="barEmerald" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  height={70}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `${v / 1000}k` : String(v))}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number, name: string) => [
                    name === 'quantity' ? value : `GHS ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                    name === 'quantity' ? 'Quantity sold' : 'Revenue (GHS)',
                  ]}
                />
                <Bar dataKey="quantity" fill="url(#barTeal)" name="quantity" radius={[6, 6, 0, 0]} />
                <Bar dataKey="revenue" fill="url(#barEmerald)" name="revenue" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey={xKey}
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => (v >= 1000 ? `GHS ${(v / 1000).toFixed(0)}k` : `GHS ${v}`)}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                  formatter={(value: number) => [`GHS ${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, '']}
                  labelFormatter={(label) => `Period: ${label}`}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  fill="url(#areaSales)"
                  name="Sales"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  stroke="#10b981"
                  strokeWidth={2}
                  fill="url(#areaProfit)"
                  name="Profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Data table */}
        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="text-sm font-bold text-slate-800">
              {reportTypes.find((r) => r.value === reportType)?.label} — Data
            </h3>
          </div>
          <div className="p-3">
            {reportType === 'top' ? (
              <Table<TopSellingItem>
                columns={topSellingItemsColumns}
                dataSource={topSellingItems}
                rowKey="name"
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} items` }}
                size="middle"
                scroll={{ x: 400 }}
              />
            ) : (
              <Table<DailySalesData | MonthlySalesData>
                columns={salesDataColumns}
                dataSource={(reportType === 'monthly' ? monthlySalesData : dailySalesData) as (DailySalesData | MonthlySalesData)[]}
                rowKey={reportType === 'monthly' ? 'month' : 'date'}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Total ${t} rows` }}
                size="middle"
                scroll={{ x: 400 }}
              />
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}