'use client';

import React, { useMemo, useState } from 'react';
import { Card, Typography, Table, Tag, Input, Select, Row, Col, Statistic } from 'antd';
import type { TableProps } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  CHART_ACCOUNTS,
  ACCOUNT_TYPE_LABELS,
  formatGhs,
  type AccountType,
  type ChartAccount,
} from '../../lib/financeDummyData';

const { Title, Text } = Typography;

const typeColor: Record<AccountType, string> = {
  asset: 'cyan',
  liability: 'orange',
  income: 'green',
  expense: 'red',
};

export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<AccountType | 'all'>('all');

  const summary = useMemo(() => {
    const active = CHART_ACCOUNTS.filter((a) => a.status === 'active');
    return {
      total: CHART_ACCOUNTS.length,
      active: active.length,
      assets: active.filter((a) => a.type === 'asset').length,
      expenses: active.filter((a) => a.type === 'expense').length,
    };
  }, []);

  const filtered = useMemo(() => {
    let list = [...CHART_ACCOUNTS];
    if (typeFilter !== 'all') list = list.filter((a) => a.type === typeFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.code.includes(q) ||
          a.name.toLowerCase().includes(q) ||
          (a.description && a.description.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => a.code.localeCompare(b.code));
  }, [search, typeFilter]);

  const columns: TableProps<ChartAccount>['columns'] = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      width: 90,
      render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span>,
    },
    {
      title: 'Account Name',
      dataIndex: 'name',
      key: 'name',
      render: (v: string, r: ChartAccount) => (
        <div>
          <span className="text-xs font-semibold text-slate-800">{v}</span>
          {r.description && (
            <div className="text-[11px] text-slate-400 mt-0.5">{r.description}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      width: 110,
      render: (v: AccountType) => (
        <Tag color={typeColor[v]} className="rounded-full">
          {ACCOUNT_TYPE_LABELS[v]}
        </Tag>
      ),
    },
    {
      title: 'Balance',
      dataIndex: 'balance',
      key: 'balance',
      align: 'right',
      width: 130,
      render: (v: number | undefined, r: ChartAccount) =>
        v != null ? (
          <span
            className={`text-xs font-semibold ${
              r.type === 'expense' || r.type === 'liability'
                ? 'text-rose-600'
                : r.type === 'income'
                  ? 'text-[#25395c]'
                  : 'text-slate-700'
            }`}
          >
            {formatGhs(v)}
          </span>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 90,
      render: (v: ChartAccount['status']) => (
        <span className={`text-xs font-semibold ${v === 'active' ? 'text-[#25395c]' : 'text-slate-500'}`}>
          {v === 'active' ? 'Active' : 'Inactive'}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Chart of Accounts
          </Title>
          <Text type="secondary">
            Accounting structure for classifying sales, purchases, expenses, and cash movements.
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic title="Total Accounts" value={summary.total} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic title="Active" value={summary.active} styles={{ content: { color: '#25395c' } }} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic title="Asset Accounts" value={summary.assets} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic title="Expense Accounts" value={summary.expenses} />
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <Text type="secondary" className="text-sm">
              Default chart for a Ghana retail shop. Sample balances shown for demo.
            </Text>
            <div className="flex flex-wrap gap-2">
              <Input
                allowClear
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Search accounts..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
                size="small"
              />
              <Select
                size="small"
                value={typeFilter}
                onChange={setTypeFilter}
                className="w-36"
                options={[
                  { value: 'all', label: 'All types' },
                  { value: 'asset', label: 'Assets' },
                  { value: 'liability', label: 'Liabilities' },
                  { value: 'income', label: 'Income' },
                  { value: 'expense', label: 'Expenses' },
                ]}
              />
            </div>
          </div>
          <div className="p-2 sm:p-3 overflow-x-auto">
            <Table<ChartAccount>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 10, size: 'small', showSizeChanger: false }}
              size="small"
              scroll={{ x: 720 }}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
