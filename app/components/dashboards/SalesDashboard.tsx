'use client';

import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import {
  Receipt as ReceiptIcon,
  PointOfSale as PointOfSaleIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  Sell as SellIcon,
  AccountBalanceWallet as WalletIcon,
  ArrowForward as ArrowForwardIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import {
  formatChangePercent,
  formatDashboardCurrency,
  type DashboardData,
} from '../../lib/dashboardApi';
import {
  BRAND,
  DashboardError,
  DashboardHeader,
  QuickActionsSection,
  SectionCard,
  StatCardsGrid,
  filterQuickActions,
  type QuickAction,
  type StatCard,
} from './shared';
import { useGreeting } from './useDashboardData';

interface RecentSale {
  id: string;
  items: string;
  total: string;
  time: string;
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

const SALES_QUICK_ACTIONS: QuickAction[] = [
  { key: 'pos', label: 'Open POS', icon: PointOfSaleIcon, href: '/dashboard/sales' },
  { key: 'customers', label: 'Customers', icon: PeopleIcon, href: '/dashboard/customers' },
  { key: 'receipts', label: 'Receipts', icon: ReceiptIcon, href: '/dashboard/receipts' },
  { key: 'invoice', label: 'Proforma Invoice', icon: DescriptionIcon, href: '/dashboard/proforma-invoices' },
  { key: 'price-list', label: 'Price List', icon: SellIcon, href: '/dashboard/price-list' },
  { key: 'report', label: 'Sales Report', icon: AssessmentIcon, href: '/dashboard/reports' },
];

export default function SalesDashboard({
  dashboard,
  error,
  canAccess,
}: {
  dashboard: DashboardData | null;
  error: string | null;
  canAccess: (path: string) => boolean;
}) {
  const { greeting, dateLabel } = useGreeting();
  const currency = dashboard?.currency ?? 'GHS';
  const revenueSpark =
    dashboard?.salesPerformance.series.map((p) => p.revenue) ?? [0, 0, 0, 0, 0, 0, 0];

  const stats: StatCard[] = useMemo(() => {
    const m = dashboard?.metrics;
    const cards: StatCard[] = [];

    if (canAccess('/dashboard/sales')) {
      cards.push({
        key: 'sales-today',
        label: "Today's Sales",
        value: formatDashboardCurrency(m?.todaysSales.value ?? 0, currency),
        delta: formatChangePercent(m?.todaysSales.changePercent ?? 0),
        icon: PointOfSaleIcon,
        href: '/dashboard/sales',
        accent: BRAND,
        spark: revenueSpark,
      });
    }
    if (canAccess('/dashboard/reports')) {
      cards.push({
        key: 'revenue-week',
        label: 'Revenue (7d)',
        value: formatDashboardCurrency(m?.revenue7d.value ?? 0, currency),
        delta: formatChangePercent(m?.revenue7d.changePercent ?? 0),
        icon: WalletIcon,
        href: '/dashboard/reports',
        accent: '#7c3aed',
        spark: revenueSpark,
      });
      cards.push({
        key: 'transactions',
        label: 'Transactions (7d)',
        value: String(
          dashboard?.salesPerformance.series.reduce((n, p) => n + (p.count ?? 0), 0) ?? 0
        ),
        icon: ReceiptIcon,
        href: '/dashboard/receipts',
        accent: '#0284c7',
      });
    }

    return cards;
  }, [dashboard, currency, revenueSpark, canAccess]);

  const dailySalesData = useMemo(
    () =>
      (dashboard?.salesPerformance.series ?? []).map((p) => ({
        name: p.day,
        sales: p.revenue,
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

  const quickActions = filterQuickActions(SALES_QUICK_ACTIONS, canAccess);

  return (
    <div className="space-y-5 sm:space-y-6">
      {error ? <DashboardError message={error} /> : null}
      <DashboardHeader
        dateLabel={dateLabel}
        greeting={greeting}
        subtitle="Your sales workspace — process transactions and track performance"
        primaryAction={
          canAccess('/dashboard/sales')
            ? { label: 'Open POS', href: '/dashboard/sales', icon: PointOfSaleIcon }
            : undefined
        }
      />
      {stats.length > 0 ? <StatCardsGrid stats={stats} /> : null}
      <QuickActionsSection
        actions={quickActions}
        title="Sales shortcuts"
        description="Everything you need at the counter"
      />
      {canAccess('/dashboard/reports') ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Your sales this week</h2>
              <p className="text-xs text-slate-500">Daily revenue for the past 7 days</p>
            </div>
            <Link
              href="/dashboard/reports"
              className="inline-flex items-center gap-1 text-xs font-semibold transition hover:underline"
              style={{ color: BRAND }}
            >
              Full report <ArrowForwardIcon className="!text-[0.95rem]" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart
              data={dailySalesData.length ? dailySalesData : [{ name: '—', sales: 0 }]}
              margin={{ top: 5, right: 8, left: -10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="salesColor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={BRAND} stopOpacity={0.32} />
                  <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
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
                fill="url(#salesColor)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {canAccess('/dashboard/receipts') ? (
        <SectionCard
          title="My recent sales"
          subtitle="Your latest transactions"
          href="/dashboard/receipts"
          icon={ReceiptIcon}
        >
          <Table<RecentSale>
            columns={recentSalesColumns}
            dataSource={recentSales}
            pagination={false}
            size="small"
            rowKey="id"
            scroll={{ x: 420 }}
          />
        </SectionCard>
      ) : null}
    </div>
  );
}
