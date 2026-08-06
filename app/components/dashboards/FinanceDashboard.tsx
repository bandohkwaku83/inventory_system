'use client';

import React, { useMemo } from 'react';
import { Table } from 'antd';
import type { TableProps } from 'antd';
import Link from 'next/link';
import {
  Receipt as ReceiptIcon,
  AttachMoney as AttachMoneyIcon,
  // Gavel as GavelIcon, // Tax paused — re-enable with GRA Reports
  BarChart as BarChartIcon,
  Assessment as AssessmentIcon,
  Description as DescriptionIcon,
  AccountBalanceWallet as WalletIcon,
  ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  Legend,
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

const FINANCE_QUICK_ACTIONS: QuickAction[] = [
  // Tax paused — re-enable when backend tax is ready
  // { key: 'gra', label: 'GRA Reports', icon: GavelIcon, href: '/dashboard/gra-reports' },
  { key: 'expenses', label: 'Expenses', icon: AttachMoneyIcon, href: '/dashboard/expenses' },
  { key: 'charts', label: 'Cashflow Charts', icon: BarChartIcon, href: '/dashboard/charts' },
  { key: 'reports', label: 'Sales Reports', icon: AssessmentIcon, href: '/dashboard/reports' },
  { key: 'receipts', label: 'Receipts', icon: ReceiptIcon, href: '/dashboard/receipts' },
  { key: 'invoice', label: 'Proforma Invoices', icon: DescriptionIcon, href: '/dashboard/proforma-invoices' },
];

export default function FinanceDashboard({
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

    if (canAccess('/dashboard/reports')) {
      cards.push({
        key: 'revenue-week',
        label: 'Revenue (7d)',
        value: formatDashboardCurrency(m?.revenue7d.value ?? 0, currency),
        delta: formatChangePercent(m?.revenue7d.changePercent ?? 0),
        icon: WalletIcon,
        href: '/dashboard/reports',
        accent: BRAND,
        spark: revenueSpark,
      });
      cards.push({
        key: 'sales-today',
        label: "Today's Sales",
        value: formatDashboardCurrency(m?.todaysSales.value ?? 0, currency),
        delta: formatChangePercent(m?.todaysSales.changePercent ?? 0),
        icon: ReceiptIcon,
        href: '/dashboard/receipts',
        accent: '#7c3aed',
        spark: revenueSpark,
      });
    }

    const expenseTotal = dashboard?.cashflow.expenses.series.reduce((n, p) => n + p.amount, 0) ?? 0;
    if (canAccess('/dashboard/expenses')) {
      cards.push({
        key: 'expenses-week',
        label: 'Expenses (7d)',
        value: formatDashboardCurrency(expenseTotal, currency),
        icon: AttachMoneyIcon,
        href: '/dashboard/expenses',
        accent: '#ea580c',
      });
    }
    // Tax paused — re-enable when backend tax is ready
    // if (canAccess('/dashboard/gra-reports')) {
    //   cards.push({
    //     key: 'gra',
    //     label: 'Tax Reporting',
    //     value: 'GRA',
    //     icon: GavelIcon,
    //     href: '/dashboard/gra-reports',
    //     accent: '#0284c7',
    //   });
    // }

    return cards;
  }, [dashboard, currency, revenueSpark, canAccess]);

  const cashflowData = useMemo(() => {
    const income = dashboard?.cashflow.income.series ?? [];
    const expenses = dashboard?.cashflow.expenses.series ?? [];
    return income.map((point, i) => ({
      name: point.day,
      income: point.amount,
      expenses: expenses[i]?.amount ?? 0,
    }));
  }, [dashboard]);

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

  const quickActions = filterQuickActions(FINANCE_QUICK_ACTIONS, canAccess);

  return (
    <div className="space-y-5 sm:space-y-6">
      {error ? <DashboardError message={error} /> : null}
      <DashboardHeader
        dateLabel={dateLabel}
        greeting={greeting}
        subtitle="Financial overview — revenue and expenses"
        primaryAction={
          // Tax paused — re-enable when backend tax is ready
          // canAccess('/dashboard/gra-reports')
          //   ? { label: 'GRA Reports', href: '/dashboard/gra-reports', icon: GavelIcon }
          //   :
          canAccess('/dashboard/charts')
              ? { label: 'View Charts', href: '/dashboard/charts', icon: BarChartIcon }
              : undefined
        }
      />
      {stats.length > 0 ? <StatCardsGrid stats={stats} /> : null}
      <QuickActionsSection
        actions={quickActions}
        title="Finance shortcuts"
        description="Reporting, expenses, and compliance"
      />
      {canAccess('/dashboard/charts') && cashflowData.length > 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-slate-800">Cashflow (7 days)</h2>
              <p className="text-xs text-slate-500">Income vs expenses</p>
            </div>
            <Link
              href="/dashboard/charts"
              className="inline-flex items-center gap-1 text-xs font-semibold transition hover:underline"
              style={{ color: BRAND }}
            >
              Full charts <ArrowForwardIcon className="!text-[0.95rem]" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={cashflowData} margin={{ top: 5, right: 8, left: -10, bottom: 0 }}>
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
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                name="Income"
                stroke={BRAND}
                fill={BRAND}
                fillOpacity={0.15}
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name="Expenses"
                stroke="#ea580c"
                fill="#ea580c"
                fillOpacity={0.12}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {canAccess('/dashboard/receipts') ? (
        <SectionCard
          title="Recent transactions"
          subtitle="Audit trail for receipts"
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
