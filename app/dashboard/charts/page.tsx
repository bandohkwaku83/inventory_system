'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Card, Typography, Space, Spin } from 'antd';
import DashboardLayout from '../../components/DashboardLayout';
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
import {
  MonetizationOn as MonetizationOnIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { fetchCashflow, type Cashflow } from '../../lib/dashboardApi';

const { Title, Text } = Typography;

export default function ChartsPage() {
  const [cashflow, setCashflow] = useState<Cashflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchCashflow(7);
        if (!cancelled) setCashflow(data);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load charts');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const incomeData = useMemo(
    () =>
      (cashflow?.income.series ?? []).map((p) => ({
        name: p.day,
        income: p.amount,
      })),
    [cashflow]
  );

  const expenseData = useMemo(
    () =>
      (cashflow?.expenses.series ?? []).map((p) => ({
        name: p.day,
        expenses: p.amount,
      })),
    [cashflow]
  );

  const incomeTitle = cashflow?.income.title ?? 'Income (last 7 days)';
  const expenseTitle = cashflow?.expenses.title ?? 'Expenses (last 7 days)';
  const expenseNote = cashflow?.expenses.note;

  return (
    <DashboardLayout>
      <Spin spinning={loading} tip="Loading charts…">
        <div className="space-y-6">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Charts
            </Title>
            <Text type="secondary">
              Income and expense trends for the last {cashflow?.periodDays ?? 7} days
              {cashflow?.currency ? ` (${cashflow.currency})` : ''}.
            </Text>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                <Space align="center" size={2}>
                  <span className="w-9 h-9 rounded-lg bg-[#25395c]/10 text-[#25395c] flex items-center justify-center">
                    <MonetizationOnIcon />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{incomeTitle}</div>
                    <div className="text-xs text-slate-500">Daily income</div>
                  </div>
                </Space>
              </div>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart
                    data={incomeData.length ? incomeData : [{ name: '—', income: 0 }]}
                  >
                    <defs>
                      <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#25395c" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#25395c" stopOpacity={0} />
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="income"
                      stroke="#25395c"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#incomeGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
              <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between gap-3">
                <Space align="center" size={2}>
                  <span className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <TrendingUpIcon />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-800">{expenseTitle}</div>
                    <div className="text-xs text-slate-500">
                      {expenseNote ?? 'Daily expenses'}
                    </div>
                  </div>
                </Space>
              </div>
              <div className="p-3">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={expenseData.length ? expenseData : [{ name: '—', expenses: 0 }]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                    <XAxis
                      type="category"
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
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar dataKey="expenses" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>
        </div>
      </Spin>
    </DashboardLayout>
  );
}
