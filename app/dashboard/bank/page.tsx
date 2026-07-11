'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Tag,
  Input,
  Select,
  Row,
  Col,
  Statistic,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  WalletOutlined,
  MobileOutlined,
  BankOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import {
  BANK_TRANSACTIONS,
  CASH_ACCOUNTS,
  BANK_SOURCE_LABELS,
  CASH_ACCOUNT_TYPE_LABELS,
  cashAccountById,
  chartAccountById,
  formatGhs,
  type BankTransaction,
  type BankTxnSource,
} from '../../lib/financeDummyData';

const { Title, Text } = Typography;

const sourceColor: Record<BankTxnSource, string> = {
  sale: 'green',
  purchase: 'volcano',
  expense: 'red',
  payroll: 'purple',
  transfer: 'blue',
  manual: 'default',
};

export default function BankPage() {
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState<string | 'all'>('all');
  const [sourceFilter, setSourceFilter] = useState<BankTxnSource | 'all'>('all');

  const totalBalance = useMemo(
    () => CASH_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0),
    []
  );

  const filtered = useMemo(() => {
    let list = [...BANK_TRANSACTIONS];
    if (accountFilter !== 'all') list = list.filter((t) => t.cashAccountId === accountFilter);
    if (sourceFilter !== 'all') list = list.filter((t) => t.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.reference && t.reference.toLowerCase().includes(q))
      );
    }
    return list.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }, [search, accountFilter, sourceFilter]);

  const periodSummary = useMemo(() => {
    const inflow = filtered.filter((t) => t.direction === 'in').reduce((s, t) => s + t.amount, 0);
    const outflow = filtered.filter((t) => t.direction === 'out').reduce((s, t) => s + t.amount, 0);
    return { inflow, outflow, net: inflow - outflow };
  }, [filtered]);

  const columns: TableProps<BankTransaction>['columns'] = [
    {
      title: 'Txn ID',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span>,
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      width: 100,
      render: (v: string) => <span className="text-xs text-slate-600">{v}</span>,
    },
    {
      title: 'Account',
      dataIndex: 'cashAccountId',
      key: 'cashAccountId',
      width: 140,
      render: (v: string) => {
        const acct = cashAccountById(v);
        return <span className="text-xs">{acct?.name ?? v}</span>;
      },
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v: string, r: BankTransaction) => (
        <div>
          <span className="text-xs">{v}</span>
          {r.reference && (
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{r.reference}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      width: 100,
      render: (v: BankTxnSource) => (
        <Tag color={sourceColor[v]} className="rounded-full text-[11px]">
          {BANK_SOURCE_LABELS[v]}
        </Tag>
      ),
    },
    {
      title: 'Chart Account',
      dataIndex: 'chartAccountId',
      key: 'chartAccountId',
      width: 130,
      render: (v: string | undefined) => {
        if (!v) return <span className="text-xs text-slate-400">—</span>;
        const acct = chartAccountById(v);
        return <span className="text-xs text-slate-600">{acct?.name ?? v}</span>;
      },
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 120,
      render: (_: number, r: BankTransaction) => (
        <span
          className={`text-xs font-semibold ${r.direction === 'in' ? 'text-[#25395c]' : 'text-rose-600'}`}
        >
          {r.direction === 'in' ? '+' : '-'}
          {formatGhs(r.amount).replace('GHS ', '')}
        </span>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Bank & Cash
          </Title>
          <Text type="secondary">
            Cash drawer, mobile money, and bank balances with a transaction ledger.
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          {CASH_ACCOUNTS.map((acct) => (
              <Col xs={24} sm={8} key={acct.id}>
                <Card className="shadow-sm h-full">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Text type="secondary" className="text-xs uppercase tracking-wide">
                        {CASH_ACCOUNT_TYPE_LABELS[acct.type]}
                      </Text>
                      <div className="font-semibold text-slate-800 mt-1">{acct.name}</div>
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-[#25395c]/10 flex items-center justify-center text-[#25395c]">
                      {acct.type === 'mobile_money' ? (
                        <MobileOutlined />
                      ) : acct.type === 'bank' ? (
                        <BankOutlined />
                      ) : (
                        <WalletOutlined />
                      )}
                    </div>
                  </div>
                  <Statistic
                    className="!mt-3"
                    value={acct.balance}
                    precision={2}
                    prefix="GHS"
                    valueStyle={{ fontSize: 22, fontWeight: 700, color: '#25395c' }}
                  />
                </Card>
              </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={8} sm={8}>
            <Card className="shadow-sm">
              <Statistic title="Total Cash Position" value={totalBalance} precision={2} prefix="GHS" />
            </Card>
          </Col>
          <Col xs={8} sm={8}>
            <Card className="shadow-sm">
              <Statistic
                title="Inflow (filtered)"
                value={periodSummary.inflow}
                precision={2}
                prefix="GHS"
                valueStyle={{ color: '#25395c' }}
              />
            </Card>
          </Col>
          <Col xs={8} sm={8}>
            <Card className="shadow-sm">
              <Statistic
                title="Outflow (filtered)"
                value={periodSummary.outflow}
                precision={2}
                prefix="GHS"
                valueStyle={{ color: '#e11d48' }}
              />
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <Text type="secondary" className="text-sm">
              Sample ledger — sales, purchases, expenses, payroll, and transfers.
            </Text>
            <div className="flex flex-wrap gap-2">
              <Input
                allowClear
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Search transactions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-48"
                size="small"
              />
              <Select
                size="small"
                value={accountFilter}
                onChange={setAccountFilter}
                className="w-40"
                options={[
                  { value: 'all', label: 'All accounts' },
                  ...CASH_ACCOUNTS.map((a) => ({ value: a.id, label: a.name })),
                ]}
              />
              <Select
                size="small"
                value={sourceFilter}
                onChange={setSourceFilter}
                className="w-32"
                options={[
                  { value: 'all', label: 'All sources' },
                  ...Object.entries(BANK_SOURCE_LABELS).map(([value, label]) => ({ value, label })),
                ]}
              />
            </div>
          </div>
          <div className="p-2 sm:p-3 overflow-x-auto">
            <Table<BankTransaction>
              rowKey="id"
              columns={columns}
              dataSource={filtered}
              pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
              size="small"
              scroll={{ x: 960 }}
            />
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
