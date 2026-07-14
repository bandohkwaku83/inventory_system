'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Select,
  Drawer,
  Descriptions,
  Row,
  Col,
  Statistic,
  Tabs,
  Alert,
  Divider,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  TeamOutlined,
  EyeOutlined,
  FileDoneOutlined,
  DownloadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useActionLoader } from '../../components/LoaderProvider';
import {
  PAYROLL_ENTRIES,
  PAYROLL_EMPLOYEES,
  PAYROLL_PERIODS,
  PAYROLL_RECORD_STATUS_LABELS,
  EMPLOYMENT_TYPE_LABELS,
  employeeExpectedNet,
  employeeMonthlyAllowances,
  employeeMonthlyDeductions,
  formatGhs,
  payrollEmployeeById,
  type PayrollEntry,
  type PayrollEmployee,
  type PayrollRecordStatus,
} from '../../lib/financeDummyData';

const { Title, Text, Paragraph } = Typography;

const CURRENT_PERIOD = 'Jul 2026';

const formatDate = (iso?: string) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function PayrollPage() {
  const { runWithLoader } = useActionLoader();
  const [entries, setEntries] = useState<PayrollEntry[]>(PAYROLL_ENTRIES);
  const [search, setSearch] = useState('');
  const [periodFilter, setPeriodFilter] = useState<string>(CURRENT_PERIOD);
  const [statusFilter, setStatusFilter] = useState<PayrollRecordStatus | 'all'>('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PayrollEntry | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const activeEmployees = useMemo(
    () => PAYROLL_EMPLOYEES.filter((e) => e.status === 'active'),
    []
  );

  const periodEntries = useMemo(
    () => entries.filter((e) => e.period === periodFilter),
    [entries, periodFilter]
  );

  const summary = useMemo(() => {
    const draft = periodEntries.filter((e) => e.status === 'draft');
    const recorded = periodEntries.filter((e) => e.status === 'recorded');
    const totalNet = periodEntries.reduce((s, e) => s + e.netPay, 0);
    const monthlyPayrollBudget = activeEmployees.reduce((s, e) => s + employeeExpectedNet(e), 0);
    return {
      headcount: activeEmployees.length,
      totalNet,
      monthlyPayrollBudget,
      draftCount: draft.length,
      recordedCount: recorded.length,
      avgNet: periodEntries.length ? totalNet / periodEntries.length : 0,
    };
  }, [periodEntries, activeEmployees]);

  const filtered = useMemo(() => {
    let list = [...periodEntries];
    if (statusFilter !== 'all') list = list.filter((e) => e.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const emp = payrollEmployeeById(e.employeeId);
        return (
          e.id.toLowerCase().includes(q) ||
          (emp?.name.toLowerCase().includes(q) ?? false) ||
          (emp?.role.toLowerCase().includes(q) ?? false)
        );
      });
    }
    return list.sort((a, b) => {
      const nameA = payrollEmployeeById(a.employeeId)?.name ?? '';
      const nameB = payrollEmployeeById(b.employeeId)?.name ?? '';
      return nameA.localeCompare(nameB);
    });
  }, [periodEntries, search, statusFilter]);

  const openPayslip = (entry: PayrollEntry) => {
    setSelectedEntry(entry);
    setDrawerOpen(true);
  };

  const finalizeEntry = (id: string) => {
    void runWithLoader(async () => {
      const today = new Date().toISOString().slice(0, 10);
      setEntries((prev) =>
        prev.map((e) =>
          e.id === id && e.status === 'draft'
            ? { ...e, status: 'recorded' as const, recordedDate: today }
            : e
        )
      );
    });
  };

  const finalizeAllDrafts = () => {
    const draftIds = periodEntries.filter((e) => e.status === 'draft').map((e) => e.id);
    if (draftIds.length === 0) {
      messageApi.error('No draft records for this period');
      return;
    }
    void runWithLoader(async () => {
      const today = new Date().toISOString().slice(0, 10);
      setEntries((prev) =>
        prev.map((e) =>
          draftIds.includes(e.id) ? { ...e, status: 'recorded' as const, recordedDate: today } : e
        )
      );
    });
  };

  const registerColumns: TableProps<PayrollEntry>['columns'] = [
    {
      title: 'Ref',
      dataIndex: 'id',
      key: 'id',
      width: 90,
      render: (v: string) => <span className="font-mono text-xs font-semibold">{v}</span>,
    },
    {
      title: 'Employee',
      key: 'employee',
      width: 160,
      render: (_: unknown, r: PayrollEntry) => {
        const emp = payrollEmployeeById(r.employeeId);
        return (
          <div>
            <div className="text-xs font-semibold text-slate-800">{emp?.name ?? '—'}</div>
            <div className="text-[11px] text-slate-400">{emp?.role ?? ''}</div>
          </div>
        );
      },
    },
    {
      title: 'Attendance',
      key: 'attendance',
      width: 110,
      render: (_: unknown, r: PayrollEntry) => (
        <span className="text-xs text-slate-600">
          {r.daysPresent}/{r.workingDays} days
        </span>
      ),
    },
    {
      title: 'Base',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      align: 'right',
      width: 90,
      render: (v: number) => <span className="text-xs text-slate-600">{formatGhs(v)}</span>,
    },
    {
      title: 'Allowances',
      dataIndex: 'allowances',
      key: 'allowances',
      align: 'right',
      width: 100,
      render: (v: number) => (
        <span className="text-xs text-[#25395c]">
          {v > 0 ? `+${formatGhs(v).replace('GHS ', '')}` : '—'}
        </span>
      ),
    },
    {
      title: 'Deductions',
      dataIndex: 'deductions',
      key: 'deductions',
      align: 'right',
      width: 100,
      render: (v: number) => (
        <span className="text-xs text-rose-600">
          {v > 0 ? `-${formatGhs(v).replace('GHS ', '')}` : '—'}
        </span>
      ),
    },
    {
      title: 'Net Salary',
      dataIndex: 'netPay',
      key: 'netPay',
      align: 'right',
      width: 110,
      render: (v: number) => (
        <span className="text-xs font-semibold text-slate-800">{formatGhs(v)}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: PayrollRecordStatus) => (
        <Tag color={v === 'recorded' ? 'green' : 'default'} className="rounded-full">
          {PAYROLL_RECORD_STATUS_LABELS[v]}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 160,
      render: (_: unknown, r: PayrollEntry) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => openPayslip(r)}
            className="!px-0"
          >
            View
          </Button>
          {r.status === 'draft' && (
            <Button
              type="link"
              size="small"
              icon={<FileDoneOutlined />}
              onClick={() => finalizeEntry(r.id)}
              className="!px-0"
            >
              Finalize
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const staffColumns: TableProps<PayrollEmployee>['columns'] = [
    {
      title: 'Employee',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span className="text-xs font-semibold text-slate-800">{v}</span>,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (v: string) => <span className="text-xs text-slate-600">{v}</span>,
    },
    {
      title: 'Type',
      dataIndex: 'employmentType',
      key: 'employmentType',
      render: (v: PayrollEmployee['employmentType']) => (
        <Tag className="rounded-full">{EMPLOYMENT_TYPE_LABELS[v]}</Tag>
      ),
    },
    {
      title: 'Base Salary',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      align: 'right',
      render: (v: number) => <span className="text-xs">{formatGhs(v)}</span>,
    },
    {
      title: 'Allowances',
      key: 'allowances',
      align: 'right',
      render: (_: unknown, r: PayrollEmployee) => (
        <span className="text-xs text-[#25395c]">
          +{formatGhs(employeeMonthlyAllowances(r)).replace('GHS ', '')}
        </span>
      ),
    },
    {
      title: 'Deductions',
      key: 'deductions',
      align: 'right',
      render: (_: unknown, r: PayrollEmployee) => (
        <span className="text-xs text-rose-600">
          {employeeMonthlyDeductions(r) > 0
            ? `-${formatGhs(employeeMonthlyDeductions(r)).replace('GHS ', '')}`
            : '—'}
        </span>
      ),
    },
    {
      title: 'Expected Net',
      key: 'expectedNet',
      align: 'right',
      render: (_: unknown, r: PayrollEmployee) => (
        <span className="text-xs font-semibold text-[#25395c]">{formatGhs(employeeExpectedNet(r))}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (v: PayrollEmployee['status']) => (
        <Tag color={v === 'active' ? 'green' : 'default'} className="rounded-full">
          {v === 'active' ? 'Active' : 'Inactive'}
        </Tag>
      ),
    },
  ];

  const selectedEmployee = selectedEntry ? payrollEmployeeById(selectedEntry.employeeId) : undefined;

  return (
    <DashboardLayout>
      {contextHolder}
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Payroll
            </Title>
            <Text type="secondary">
              Staff salary records and monthly registers — for planning and reference, not payment.
            </Text>
          </div>
          <Space wrap>
            <Button icon={<DownloadOutlined />} disabled>
              Export Register
            </Button>
            <Button
              type="primary"
              icon={<FileDoneOutlined />}
              onClick={finalizeAllDrafts}
              disabled={summary.draftCount === 0}
            >
              Finalize {periodFilter} ({summary.draftCount})
            </Button>
          </Space>
        </div>

        <Alert
          type="info"
          showIcon
          message="Salary records only"
          description="This module tracks staff salaries and monthly payroll registers. Actual salary payments are made outside the system — record them under Expenses when paid."
          className="!rounded-lg"
        />

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={4}>
            <Card className="shadow-sm">
              <Statistic title="Active Staff" value={summary.headcount} prefix={<TeamOutlined />} />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title={`Register Total (${periodFilter})`}
                value={summary.totalNet}
                precision={2}
                prefix="GHS"
                styles={{ content: { color: '#25395c' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Monthly Budget"
                value={summary.monthlyPayrollBudget}
                precision={2}
                prefix="GHS"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Avg Net Salary"
                value={summary.avgNet}
                precision={2}
                prefix="GHS"
              />
            </Card>
          </Col>
          <Col xs={12} sm={8} md={5}>
            <Card className="shadow-sm">
              <Statistic
                title="Draft Records"
                value={summary.draftCount}
                suffix={`/ ${periodEntries.length}`}
                styles={{ content: { color: summary.draftCount > 0 ? '#d97706' : '#25395c' } }}
              />
            </Card>
          </Col>
        </Row>

        <Tabs
          defaultActiveKey="register"
          items={[
            {
              key: 'register',
              label: 'Monthly Register',
              children: (
                <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
                    <Text type="secondary" className="text-sm">
                      Salary breakdown per staff member for {periodFilter}.
                    </Text>
                    <Space wrap>
                      <Select
                        size="small"
                        value={periodFilter}
                        onChange={setPeriodFilter}
                        className="w-32"
                        options={PAYROLL_PERIODS.map((p) => ({ value: p, label: p }))}
                      />
                      <Input
                        allowClear
                        prefix={<SearchOutlined className="text-slate-400" />}
                        placeholder="Search employee..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-44"
                        size="small"
                      />
                      <Select
                        size="small"
                        value={statusFilter}
                        onChange={setStatusFilter}
                        className="w-28"
                        options={[
                          { value: 'all', label: 'All status' },
                          { value: 'draft', label: 'Draft' },
                          { value: 'recorded', label: 'Recorded' },
                        ]}
                      />
                    </Space>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table<PayrollEntry>
                      rowKey="id"
                      columns={registerColumns}
                      dataSource={filtered}
                      pagination={{ pageSize: 8, size: 'small', showSizeChanger: false }}
                      size="small"
                      scroll={{ x: 1100 }}
                    />
                  </div>
                </Card>
              ),
            },
            {
              key: 'staff',
              label: 'Staff & Salary Structure',
              children: (
                <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
                  <div className="p-4 border-b border-slate-100 bg-slate-50/60">
                    <Text type="secondary" className="text-sm">
                      Reference salary structure for each employee — base pay, allowances, and standard deductions.
                    </Text>
                  </div>
                  <div className="p-2 sm:p-3 overflow-x-auto">
                    <Table<PayrollEmployee>
                      rowKey="id"
                      columns={staffColumns}
                      dataSource={PAYROLL_EMPLOYEES}
                      pagination={false}
                      size="small"
                      scroll={{ x: 960 }}
                    />
                  </div>
                </Card>
              ),
            },
          ]}
        />
      </div>

      <Drawer
        title="Salary Breakdown"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        size={420}
      >
        {selectedEntry && selectedEmployee && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#25395c]/10 flex items-center justify-center text-[#25395c]">
                <UserOutlined />
              </div>
              <div>
                <div className="font-semibold text-slate-800">{selectedEmployee.name}</div>
                <div className="text-sm text-slate-500">{selectedEmployee.role}</div>
              </div>
            </div>

            <Descriptions column={1} size="small" bordered>
              <Descriptions.Item label="Period">{selectedEntry.period}</Descriptions.Item>
              <Descriptions.Item label="Reference">{selectedEntry.id}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={selectedEntry.status === 'recorded' ? 'green' : 'default'}>
                  {PAYROLL_RECORD_STATUS_LABELS[selectedEntry.status]}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Attendance">
                {selectedEntry.daysPresent} of {selectedEntry.workingDays} working days
              </Descriptions.Item>
              {selectedEntry.recordedDate && (
                <Descriptions.Item label="Recorded on">
                  {formatDate(selectedEntry.recordedDate)}
                </Descriptions.Item>
              )}
            </Descriptions>

            <Divider className="!my-2" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <Text type="secondary">Base salary</Text>
                <span>{formatGhs(selectedEntry.baseSalary)}</span>
              </div>
              <div className="flex justify-between">
                <Text type="secondary">Allowances</Text>
                <span className="text-[#25395c]">+{formatGhs(selectedEntry.allowances)}</span>
              </div>
              <div className="flex justify-between">
                <Text type="secondary">Deductions</Text>
                <span className="text-rose-600">-{formatGhs(selectedEntry.deductions)}</span>
              </div>
              <Divider className="!my-2" />
              <div className="flex justify-between font-semibold text-base">
                <span>Net salary</span>
                <span className="text-[#25395c]">{formatGhs(selectedEntry.netPay)}</span>
              </div>
            </div>

            {selectedEmployee.ssnitDeduction > 0 || selectedEmployee.payeDeduction > 0 ? (
              <>
                <Divider className="!my-2" />
                <Text type="secondary" className="text-xs uppercase tracking-wide">
                  Standard deductions (reference)
                </Text>
                <div className="space-y-1 text-sm mt-2">
                  {selectedEmployee.ssnitDeduction > 0 && (
                    <div className="flex justify-between">
                      <span>SSNIT</span>
                      <span>{formatGhs(selectedEmployee.ssnitDeduction)}</span>
                    </div>
                  )}
                  {selectedEmployee.payeDeduction > 0 && (
                    <div className="flex justify-between">
                      <span>PAYE</span>
                      <span>{formatGhs(selectedEmployee.payeDeduction)}</span>
                    </div>
                  )}
                </div>
              </>
            ) : null}

            {selectedEntry.notes && (
              <>
                <Divider className="!my-2" />
                <Text type="secondary" className="text-xs uppercase tracking-wide">
                  Notes
                </Text>
                <Paragraph className="!mb-0 !mt-2 text-sm text-slate-600">{selectedEntry.notes}</Paragraph>
              </>
            )}

            <Alert
              type="warning"
              showIcon
              className="!mt-4"
              message="Payment handled separately"
              description="Salaries are paid outside this system. Use Expenses to log the payment when it is made."
            />
          </div>
        )}
      </Drawer>
    </DashboardLayout>
  );
}
