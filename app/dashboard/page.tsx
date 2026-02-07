'use client';

import React from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import {
  TrendingUp,
  Inventory2,
  Warning,
  ShoppingCart,
  ArrowUpward,
  ArrowDownward,
  Remove,
  Receipt as ReceiptIcon,
  LocalShipping as LocalShippingIcon,
  PointOfSale as PointOfSaleIcon,
  List as ListIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';

const adminMetrics = [
  {
    title: 'Total Stock Value',
    value: 'GHS 45,230',
    icon: Inventory2,
    color: '#14b8a6',
    bgGradient: 'bg-teal-600',
    change: '+12%',
    changeType: 'up' as const,
    subtitle: 'From last month',
  },
  {
    title: "Today's Sales",
    value: 'GHS 3,450',
    icon: TrendingUp,
    color: '#10b981',
    bgGradient: 'from-emerald-500 to-teal-400',
    change: '+8%',
    changeType: 'up' as const,
    subtitle: 'vs yesterday',
  },
  {
    title: 'Low-Stock Items',
    value: '5',
    icon: Warning,
    color: '#f59e0b',
    bgGradient: 'from-amber-500 to-yellow-400',
    change: '-2',
    changeType: 'down' as const,
    subtitle: 'Items need restocking',
  },
  {
    title: 'Pending Deliveries',
    value: '3',
    icon: ShoppingCart,
    color: '#ec4899',
    bgGradient: 'from-pink-500 to-rose-400',
    change: '0',
    changeType: 'neutral' as const,
    subtitle: 'Awaiting fulfillment',
  },
];

const salesMetrics = [
  {
    title: "Today's Sales",
    value: 'GHS 3,450',
    icon: TrendingUp,
    color: '#10b981',
    bgGradient: 'from-emerald-500 to-teal-400',
    change: '+8%',
    changeType: 'up' as const,
    subtitle: 'vs yesterday',
  },
  {
    title: 'Transactions Today',
    value: '24',
    icon: ReceiptIcon,
    color: '#14b8a6',
    bgGradient: 'bg-teal-600',
    change: '+5',
    changeType: 'up' as const,
    subtitle: 'Completed sales',
  },
  {
    title: "This Week",
    value: 'GHS 18,200',
    icon: PointOfSaleIcon,
    color: '#6366f1',
    bgGradient: 'from-indigo-500 to-violet-400',
    change: '+12%',
    changeType: 'up' as const,
    subtitle: 'Total sales',
  },
  {
    title: 'Receipts',
    value: 'All',
    icon: ListIcon,
    color: '#64748b',
    bgGradient: 'bg-slate-500',
    change: '',
    changeType: 'neutral' as const,
    subtitle: 'View receipt history',
  },
];

const dailySalesData = [
  { name: 'Mon', sales: 2400, target: 2000 },
  { name: 'Tue', sales: 1398, target: 2000 },
  { name: 'Wed', sales: 9800, target: 2000 },
  { name: 'Thu', sales: 3908, target: 2000 },
  { name: 'Fri', sales: 4800, target: 2000 },
  { name: 'Sat', sales: 3800, target: 2000 },
  { name: 'Sun', sales: 4300, target: 2000 },
];

const topSellingItems = [
  { name: 'Milk 1L', sales: 45, revenue: 315 },
  { name: 'Bread', sales: 38, revenue: 190 },
  { name: 'Rice 2kg', sales: 32, revenue: 480 },
  { name: 'Cooking Oil', sales: 28, revenue: 392 },
  { name: 'Soft Drinks', sales: 25, revenue: 125 },
];

interface RecentSale {
  id: string;
  items: string;
  total: string;
  time: string;
  status: string;
}

interface RecentRestock {
  item: string;
  quantity: string;
  supplier: string;
  date: string;
  status: string;
}

const recentSales: RecentSale[] = [
  { id: 'R001', items: 'Milk x2, Bread x1', total: 'GHS 24.00', time: '2:30 PM', status: 'completed' },
  { id: 'R002', items: 'Rice x1, Cooking Oil x1', total: 'GHS 31.00', time: '2:15 PM', status: 'completed' },
  { id: 'R003', items: 'Soft Drinks x3, Snacks x2', total: 'GHS 22.00', time: '1:45 PM', status: 'completed' },
  { id: 'R004', items: 'Bread x2, Milk x1', total: 'GHS 19.00', time: '1:20 PM', status: 'completed' },
];

const recentRestocks: RecentRestock[] = [
  { item: 'Rice', quantity: '50 bags', supplier: 'Wholesale Grocers', date: '2024-01-15', status: 'delivered' },
  { item: 'Milk', quantity: '100 units', supplier: 'Dairy Co', date: '2024-01-14', status: 'delivered' },
  { item: 'Bread', quantity: '80 loaves', supplier: 'Bakery Supplies', date: '2024-01-14', status: 'delivered' },
  { item: 'Cooking Oil', quantity: '24 bottles', supplier: 'Wholesale Grocers', date: '2024-01-13', status: 'delivered' },
];

const recentSalesColumns: TableProps<RecentSale>['columns'] = [
  {
    title: 'Receipt ID',
    dataIndex: 'id',
    key: 'id',
    render: (text: string) => <span className="font-mono font-semibold text-xs">{text}</span>,
  },
  {
    title: 'Items',
    dataIndex: 'items',
    key: 'items',
    render: (text: string) => <span className="text-xs">{text}</span>,
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    align: 'right',
    render: (text: string) => <span className="font-bold text-emerald-600 text-xs">{text}</span>,
  },
  {
    title: 'Time',
    dataIndex: 'time',
    key: 'time',
    render: (text: string) => <span className="text-xs text-slate-600">{text}</span>,
  },
];

const recentRestocksColumns: TableProps<RecentRestock>['columns'] = [
  {
    title: 'Item',
    dataIndex: 'item',
    key: 'item',
    render: (text: string) => <span className="text-xs font-medium">{text}</span>,
  },
  {
    title: 'Quantity',
    dataIndex: 'quantity',
    key: 'quantity',
    render: (text: string) => <span className="text-xs">{text}</span>,
  },
  {
    title: 'Supplier',
    dataIndex: 'supplier',
    key: 'supplier',
    render: (text: string) => <span className="text-xs text-slate-600">{text}</span>,
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    render: (text: string) => <span className="text-xs text-slate-600">{text}</span>,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const metricsData = isAdmin ? adminMetrics : salesMetrics;

  return (
    <DashboardLayout>
      <div>
        {/* Page title – kept visible below app bar via layout padding */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="mb-1 text-xl sm:text-2xl font-bold text-slate-800 leading-tight">
            {isAdmin ? 'Dashboard Overview' : 'Sales Overview'}
          </h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? "Welcome back! Here's what's happening with your shop today."
              : "Here's your sales summary and recent activity."}
          </p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5 mb-4 sm:mb-6">
          {metricsData.map((metric, index) => {
            const IconComponent = metric.icon;
            const isReceiptsLink = !isAdmin && metric.title === 'Receipts';
            const cardContent = (
              <div className={`bg-white border border-slate-200 rounded-xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:border-opacity-40 ${isReceiptsLink ? 'cursor-pointer hover:border-teal-300' : ''}`}>
                <div className="p-4 relative overflow-hidden">
                  {/* Background gradient accent */}
                  <div className={`absolute top-0 right-0 w-20 h-20 ${metric.bgGradient.includes('from-') ? `bg-gradient-to-br ${metric.bgGradient}` : metric.bgGradient} opacity-10 rounded-full translate-x-5 -translate-y-5`} />
                  
                  <div className="flex flex-col gap-3 relative z-10">
                    {/* Header with Icon and Title */}
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium mb-1 uppercase tracking-wide text-slate-500">
                          {metric.title}
                        </p>
                      </div>
                      <div
                        className={`w-9 h-9 ${metric.bgGradient.includes('from-') ? `bg-gradient-to-br ${metric.bgGradient}` : metric.bgGradient} shadow-lg rounded-lg flex items-center justify-center flex-shrink-0`}
                        style={{ boxShadow: `0 4px 12px ${metric.color}30` }}
                      >
                        <IconComponent className="text-white text-base" />
                      </div>
                    </div>

                    {/* Value */}
                    <div>
                      <p className="text-xl font-bold text-slate-800 leading-tight">
                        {metric.value}
                      </p>
                    </div>

                    {/* Change and Subtitle */}
                    <div className="flex flex-col gap-1.5">
                      {metric.change !== undefined && metric.change !== '' && (
                        <div className="flex items-center gap-2">
                          {metric.changeType === 'up' && (
                            <span className="inline-flex items-center gap-1 h-5 px-2 text-xs font-semibold bg-emerald-50 text-emerald-600 rounded-full">
                              <ArrowUpward className="text-xs" />
                              {metric.change}
                            </span>
                          )}
                          {metric.changeType === 'down' && (
                            <span className="inline-flex items-center gap-1 h-5 px-2 text-xs font-semibold bg-amber-50 text-amber-600 rounded-full">
                              <ArrowDownward className="text-xs" />
                              {metric.change}
                            </span>
                          )}
                          {metric.changeType === 'neutral' && (
                            <span className="inline-flex items-center gap-1 h-5 px-2 text-xs font-semibold bg-slate-100 text-slate-500 rounded-full">
                              <Remove className="text-xs" />
                              {metric.change}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {metric.subtitle}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
            return isReceiptsLink ? (
              <Link key={index} href="/dashboard/receipts" className="block">
                {cardContent}
              </Link>
            ) : (
              <div key={index}>{cardContent}</div>
            );
          })}
        </div>

        {/* Quick actions - sales only, brought up */}
        {!isAdmin && (
          <div className="mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-bold text-slate-800">Quick actions</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/dashboard/sales"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  <PointOfSaleIcon className="text-teal-600" />
                  Open Sales (POS)
                </Link>
                <Link
                  href="/dashboard/receipts"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  <ReceiptIcon className="text-teal-600" />
                  View all receipts
                </Link>
                <Link
                  href="/dashboard/products"
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50"
                >
                  <ListIcon className="text-teal-600" />
                  Browse products
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-5 mb-4 sm:mb-6">
          {/* Sales Chart */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-xl h-full shadow-sm">
              <div className="p-4">
                <div className="mb-4">
                  <h2 className="mb-1 text-base font-bold text-slate-800">
                    Sales Performance
                  </h2>
                  <p className="text-xs text-slate-500">
                    Daily sales overview for the past week
                  </p>
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <AreaChart data={dailySalesData}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'white',
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="sales" 
                        stroke="#6366f1" 
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#colorSales)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Items */}
          <div className="lg:col-span-1">
            <div className="bg-white border border-slate-200 rounded-xl h-full shadow-sm">
              <div className="p-4">
                <div className="mb-4">
                  <h2 className="mb-1 text-base font-bold text-slate-800">
                    Top Products
                  </h2>
                  <p className="text-xs text-slate-500">
                    Best selling items this week
                  </p>
                </div>
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={320}>
                    <BarChart data={topSellingItems} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                      <XAxis 
                        type="number"
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis 
                        dataKey="name" 
                        type="category"
                        width={80}
                        stroke="#64748b"
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: 12, 
                          border: '1px solid #e2e8f0',
                          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                          backgroundColor: 'white',
                        }}
                      />
                      <Bar 
                        dataKey="sales" 
                        fill="#10b981"
                        radius={[0, 8, 8, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tables Row */}
        <div className={`grid grid-cols-1 gap-5 ${isAdmin ? 'md:grid-cols-2' : ''}`}>
          {/* Recent Sales - full width for sales, half for admin */}
          <div className={isAdmin ? '' : 'min-w-0'}>
            <div className="bg-white border border-slate-200 rounded-xl h-full shadow-sm">
              <div className="p-0">
                <div className="p-4 pb-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center shadow-md">
                        <ReceiptIcon className="text-base text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">
                          Recent Sales
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {isAdmin ? 'Latest transactions' : 'Your latest transactions'}
                        </p>
                      </div>
                    </div>
                    {!isAdmin && (
                      <Link
                        href="/dashboard/receipts"
                        className="text-xs font-medium text-teal-600 hover:text-teal-700"
                      >
                        View all receipts →
                      </Link>
                    )}
                  </div>
                </div>
                <div className="p-2 sm:p-3 overflow-x-auto">
                  <Table<RecentSale>
                    columns={recentSalesColumns}
                    dataSource={recentSales}
                    pagination={false}
                    size="small"
                    rowKey="id"
                    scroll={{ x: 400 }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Recent Restocks - admin only */}
          {isAdmin && (
            <div>
              <div className="bg-white border border-slate-200 rounded-xl h-full shadow-sm">
                <div className="p-0">
                  <div className="p-4 pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center shadow-md">
                        <LocalShippingIcon className="text-base text-white" />
                      </div>
                      <div>
                        <h2 className="text-sm font-bold text-slate-800">
                          Recent Restocks
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Latest inventory updates
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table<RecentRestock>
                      columns={recentRestocksColumns}
                      dataSource={recentRestocks}
                      pagination={false}
                      size="small"
                      rowKey={(record, index) => `${record.item}-${index}`}
                      scroll={{ x: 400 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}
