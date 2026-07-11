'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button, Spin, Table } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import {
  Inventory2 as InventoryIcon,
  Receipt as ReceiptIcon,
  LocalShipping as LocalShippingIcon,
  PointOfSale as PointOfSaleIcon,
  AttachMoney as AttachMoneyIcon,
  PeopleAlt as PeopleAltIcon,
  Assessment as AssessmentIcon,
  Add as AddIcon,
  Description as DescriptionIcon,
  AccountBalanceWallet as WalletIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ArrowForward as ArrowForwardIcon,
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
import {
  fetchDashboard,
  formatChangePercent,
  formatDashboardCurrency,
  type DashboardData,
} from '../lib/dashboardApi';

const BRAND = '#25395c';

interface RecentSale {
  id: string;
  items: string;
  total: string;
  time: string;
}

interface RecentRestock {
  id: string;
  item: string;
  quantity: string;
  supplier: string;
  date: string;
}

const recentSalesColumns: TableProps<RecentSale>['columns'] = [
  {
    title: 'Receipt',
    dataIndex: 'id',
    key: 'id',
    render: (text: string) => (
      <span className="font-mono text-[12px] font-semibold text-slate-700">{text}</span>
    ),
  },
  {
    title: 'Items',
    dataIndex: 'items',
    key: 'items',
    render: (text: string) => <span className="text-[12px] text-slate-700">{text}</span>,
  },
  {
    title: 'Total',
    dataIndex: 'total',
    key: 'total',
    align: 'right',
    render: (text: string) => (
      <span className="text-[12px] font-bold" style={{ color: BRAND }}>
        {text}
      </span>
    ),
  },
  {
    title: 'Time',
    dataIndex: 'time',
    key: 'time',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
];

const recentRestocksColumns: TableProps<RecentRestock>['columns'] = [
  {
    title: 'Item',
    dataIndex: 'item',
    key: 'item',
    render: (text: string) => (
      <span className="text-[12px] font-semibold text-slate-700">{text}</span>
    ),
  },
  {
    title: 'Quantity',
    dataIndex: 'quantity',
    key: 'quantity',
    render: (text: string) => <span className="text-[12px] text-slate-700">{text}</span>,
  },
  {
    title: 'Supplier',
    dataIndex: 'supplier',
    key: 'supplier',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    render: (text: string) => <span className="text-[12px] text-slate-500">{text}</span>,
  },
];

type StatCard = {
  key: string;
  label: string;
  value: string;
  delta?: { value: string; trend: 'up' | 'down' };
  icon: React.ElementType;
  href: string;
  accent: string;
  spark: number[];
};

function Sparkline({
  id,
  data,
  color,
  height = 36,
}: {
  id: string;
  data: number[];
  color: string;
  height?: number;
}) {
  const width = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const padY = 3;
  const usableH = height - padY * 2;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = padY + (1 - (v - min) / range) * usableH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lineD = `M ${points.join(' L ')}`;
  const areaD = `${lineD} L ${width.toFixed(2)},${height} L 0,${height} Z`;
  const gradientId = `spark-grad-${id}`;
  const lastIdx = data.length - 1;
  const last = points[lastIdx]?.split(',').map(Number) ?? [width, height / 2];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={lineD}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={4.6} fill={color} fillOpacity={0.18} />
    </svg>
  );
}

type QuickAction = {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
};

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchDashboard({ days: 7, topLimit: 5, recentLimit: 10 });
        if (!cancelled) setDashboard(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const today = new Date();
  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();

  const currency = dashboard?.currency ?? 'GHS';
  const revenueSpark =
    dashboard?.salesPerformance.series.map((p) => p.revenue) ?? [0, 0, 0, 0, 0, 0, 0];

  const stats: StatCard[] = useMemo(() => {
    const m = dashboard?.metrics;
    const todaysDelta = formatChangePercent(m?.todaysSales.changePercent ?? 0);
    const revenueDelta = formatChangePercent(m?.revenue7d.changePercent ?? 0);
    const inventoryDelta = formatChangePercent(m?.inventoryItems.changePercent ?? 0);
    const customersDelta = formatChangePercent(m?.activeCustomers.changePercent ?? 0);

    return [
      {
        key: 'sales-today',
        label: "Today's Sales",
        value: formatDashboardCurrency(m?.todaysSales.value ?? 0, currency),
        delta: todaysDelta,
        icon: PointOfSaleIcon,
        href: '/dashboard/sales',
        accent: BRAND,
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'revenue-week',
        label: 'Revenue (7d)',
        value: formatDashboardCurrency(m?.revenue7d.value ?? 0, currency),
        delta: revenueDelta,
        icon: WalletIcon,
        href: '/dashboard/reports',
        accent: '#7c3aed',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'inventory',
        label: 'Inventory Items',
        value: (m?.inventoryItems.value ?? 0).toLocaleString('en-US'),
        delta: inventoryDelta,
        icon: InventoryIcon,
        href: '/dashboard/inventory',
        accent: '#ea580c',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
      {
        key: 'customers',
        label: 'Active Customers',
        value: (m?.activeCustomers.value ?? 0).toLocaleString('en-US'),
        delta: customersDelta,
        icon: PeopleAltIcon,
        href: '/dashboard/reports',
        accent: '#0284c7',
        spark: revenueSpark.length ? revenueSpark : [0],
      },
    ];
  }, [dashboard, currency, revenueSpark]);

  const dailySalesData = useMemo(
    () =>
      (dashboard?.salesPerformance.series ?? []).map((p) => ({
        name: p.day,
        sales: p.revenue,
      })),
    [dashboard]
  );

  const topSellingItems = useMemo(
    () =>
      (dashboard?.topProducts.items ?? []).map((p) => ({
        name: p.name,
        sales: p.quantity,
      })),
    [dashboard]
  );

  const recentSales: RecentSale[] = useMemo(
    () =>
      (dashboard?.recentSales ?? []).slice(0, 5).map((s) => ({
        id: s.receiptId,
        items: s.itemsSummary,
        total: formatDashboardCurrency(s.total, s.currency || currency),
        time: s.time,
      })),
    [dashboard, currency]
  );

  const recentRestocks: RecentRestock[] = useMemo(
    () =>
      (dashboard?.recentRestocks ?? []).slice(0, 5).map((r) => ({
        id: r._id || `${r.purchaseId}-${r.productId}-${r.date}`,
        item: r.item,
        quantity: r.quantityLabel,
        supplier: r.supplier,
        date: r.date,
      })),
    [dashboard]
  );

  const quickActions: QuickAction[] = [
    { key: 'pos', label: 'Open POS', icon: PointOfSaleIcon, href: '/dashboard/sales' },
    { key: 'add-product', label: 'Add Product', icon: AddIcon, href: '/dashboard/products' },
    { key: 'invoice', label: 'New Invoice', icon: DescriptionIcon, href: '/dashboard/proforma-invoices' },
    { key: 'expense', label: 'Record Expense', icon: AttachMoneyIcon, href: '/dashboard/expenses' },
    { key: 'restock', label: 'Restock', icon: LocalShippingIcon, href: '/dashboard/purchases' },
    { key: 'report', label: 'Sales Report', icon: AssessmentIcon, href: '/dashboard/reports' },
  ];

  return (
    <DashboardLayout>
      <Spin spinning={loading} tip="Loading dashboard…">
      <div className="space-y-5 sm:space-y-6">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* ── Page header ── */}
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {today.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <h1 className="mt-1 text-[1.5rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.75rem]">
              {greeting}, welcome back
            </h1>
          </div>
          <Button
            type="primary"
            href="/dashboard/sales"
            icon={<PointOfSaleIcon className="!text-[1rem]" />}
          >
            Open POS
          </Button>
        </header>

        {/* ── KPI cards ── */}
        <section
          className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
          aria-label="Key metrics"
        >
          {stats.map((s) => {
            const Icon = s.icon;
            const trendUp = s.delta?.trend === 'up';
            const accent = s.accent;
            return (
              <Link
                key={s.key}
                href={s.href}
                className="group relative isolate flex flex-col overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)]"
                style={{
                  backgroundImage: `linear-gradient(180deg, ${accent}07 0%, transparent 55%)`,
                }}
              >
                {/* Accent corner glow */}
                <span
                  className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  style={{
                    background: `radial-gradient(circle at center, ${accent}26, transparent 70%)`,
                  }}
                  aria-hidden
                />

                {/* Top row: label + icon */}
                <div className="relative flex items-start justify-between gap-3">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {s.label}
                  </p>
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset transition-transform duration-300 group-hover:scale-110"
                    style={{
                      background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                      color: '#ffffff',
                      boxShadow: `0 6px 16px -8px ${accent}99`,
                      // @ts-expect-error css variable
                      '--tw-ring-color': `${accent}33`,
                    }}
                  >
                    <Icon className="!text-[1.05rem]" />
                  </span>
                </div>

                {/* Value + trend */}
                <div className="relative mt-4 flex items-end gap-2">
                  <p className="text-[2rem] font-extrabold leading-none tracking-tight text-slate-900">
                    {s.value}
                  </p>
                  {s.delta && (
                    <span
                      className={`mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
                        trendUp
                          ? 'bg-[#25395c]/10 text-[#25395c]'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {trendUp ? (
                        <TrendingUpIcon className="!text-[0.85rem]" />
                      ) : (
                        <TrendingDownIcon className="!text-[0.85rem]" />
                      )}
                      {s.delta.value}
                    </span>
                  )}
                </div>

                {/* Full-bleed sparkline */}
                <div className="relative -mx-5 -mb-5 mt-5">
                  <Sparkline id={s.key} data={s.spark} color={accent} height={44} />
                </div>
              </Link>
            );
          })}
        </section>

        {/* ── Quick actions ── */}
        <section
          className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
          aria-label="Quick actions"
        >
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Quick actions</h2>
              <p className="text-xs text-slate-500">Jump to your most common tasks</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {quickActions.map((a) => {
              const Icon = a.icon;
              return (
                <Link
                  key={a.key}
                  href={a.href}
                  className="group flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:border-transparent hover:bg-white hover:shadow-md"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                    style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                  >
                    <Icon className="!text-[1.1rem]" />
                  </span>
                  <span className="text-[12.5px] font-semibold text-slate-700 group-hover:text-slate-900">
                    {a.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* ── Charts row ── */}
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3 lg:gap-5">
          {/* Sales performance */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm lg:col-span-2 sm:p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Sales performance</h2>
                <p className="text-xs text-slate-500">Daily sales for the past 7 days</p>
              </div>
              <Link
                href="/dashboard/reports"
                className="inline-flex items-center gap-1 text-xs font-semibold transition hover:underline"
                style={{ color: BRAND }}
              >
                View report <ArrowForwardIcon className="!text-[0.95rem]" />
              </Link>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart
                data={dailySalesData.length ? dailySalesData : [{ name: '—', sales: 0 }]}
                margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={BRAND} stopOpacity={0.32} />
                    <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                    backgroundColor: 'white',
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  stroke={BRAND}
                  strokeWidth={2.25}
                  fillOpacity={1}
                  fill="url(#colorSales)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Top products */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-800">Top products</h2>
              <p className="text-xs text-slate-500">Best sellers this week</p>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topSellingItems.length ? topSellingItems : [{ name: 'No sales yet', sales: 0 }]}
                layout="vertical"
                margin={{ top: 5, right: 8, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={86}
                  stroke="#475569"
                  tick={{ fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 10px 25px rgba(0, 0, 0, 0.08)',
                    backgroundColor: 'white',
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="sales" fill={BRAND} radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Activity tables ── */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-5">
          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                >
                  <ReceiptIcon className="!text-[1.05rem]" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Recent sales</h2>
                  <p className="text-[11.5px] text-slate-500">Latest transactions</p>
                </div>
              </div>
              <Link
                href="/dashboard/receipts"
                className="text-xs font-semibold transition hover:underline"
                style={{ color: BRAND }}
              >
                View all
              </Link>
            </header>
            <div className="px-2 py-1.5 sm:px-3 sm:py-2 overflow-x-auto">
              <Table<RecentSale>
                columns={recentSalesColumns}
                dataSource={recentSales}
                pagination={false}
                size="small"
                rowKey="id"
                scroll={{ x: 420 }}
              />
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
              <div className="flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
                >
                  <LocalShippingIcon className="!text-[1.05rem]" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-800">Recent restocks</h2>
                  <p className="text-[11.5px] text-slate-500">Latest inventory updates</p>
                </div>
              </div>
              <Link
                href="/dashboard/purchases"
                className="text-xs font-semibold transition hover:underline"
                style={{ color: BRAND }}
              >
                View all
              </Link>
            </header>
            <div className="px-2 py-1.5 sm:px-3 sm:py-2 overflow-x-auto">
              <Table<RecentRestock>
                columns={recentRestocksColumns}
                dataSource={recentRestocks}
                pagination={false}
                size="small"
                rowKey="id"
                scroll={{ x: 420 }}
              />
            </div>
          </div>
        </section>
      </div>
      </Spin>
    </DashboardLayout>
  );
}
