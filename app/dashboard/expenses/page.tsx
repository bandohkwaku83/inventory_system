'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Space,
  Tag,
  Input,
  Select,
  Modal,
  Form,
  InputNumber,
  DatePicker,
  Row,
  Col,
  Statistic,
  message,
  Popconfirm,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  CheckOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import DashboardLayout from '../../components/DashboardLayout';
import { useActionLoader } from '../../components/LoaderProvider';
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  fetchExpensesMeta,
  fetchExpensesSummary,
  formatExpenseAmount,
  markExpensePaid,
  updateExpense,
  DEFAULT_EXPENSES_META,
  EMPTY_EXPENSES_SUMMARY,
  type Expense,
  type ExpenseStatus,
  type ExpensesMeta,
  type ExpensesSummary,
} from '../../lib/expensesApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface ExpenseFormValues {
  date: Dayjs;
  category: string;
  description: string;
  amount: number;
  reference?: string;
  markPaid?: boolean;
}

export default function ExpensesPage() {
  const { runWithLoader } = useActionLoader();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [meta, setMeta] = useState<ExpensesMeta>(DEFAULT_EXPENSES_META);
  const [summary, setSummary] = useState<ExpensesSummary>(EMPTY_EXPENSES_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState('');
  const [searchApplied, setSearchApplied] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExpenseStatus | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | 'all'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<'add' | 'edit'>('add');
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form] = Form.useForm<ExpenseFormValues>();
  const [messageApi, contextHolder] = message.useMessage();

  const currency = summary.currency || 'GHS';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [list, sum, m] = await Promise.all([
        fetchExpenses({
          page,
          limit: pageSize,
          status: statusFilter === 'all' ? '' : statusFilter,
          category: categoryFilter === 'all' ? undefined : categoryFilter,
          q: searchApplied || undefined,
        }),
        fetchExpensesSummary(),
        fetchExpensesMeta(),
      ]);
      setExpenses(list.items);
      setTotal(list.total);
      setSummary(sum);
      setMeta(m);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, categoryFilter, searchApplied]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openAddModal = () => {
    setMode('add');
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      date: dayjs(),
      markPaid: true,
      category: meta.categories[0],
    });
    setModalOpen(true);
  };

  const openEditModal = (row: Expense) => {
    setMode('edit');
    setEditing(row);
    form.setFieldsValue({
      date: dayjs(row.date),
      category: row.category,
      description: row.description,
      amount: row.amount,
      reference: row.reference,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await runWithLoader(async () => {
        if (mode === 'edit' && editing) {
          await updateExpense(editing.id, {
            date: values.date.format('YYYY-MM-DD'),
            category: values.category,
            description: values.description,
            amount: values.amount,
            reference: values.reference ?? '',
          });
        } else {
          await createExpense({
            date: values.date.format('YYYY-MM-DD'),
            category: values.category,
            description: values.description,
            amount: values.amount,
            reference: values.reference ?? '',
            markPaid: values.markPaid ?? false,
          });
        }
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
        await loadData();
      });
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      messageApi.error(e instanceof Error ? e.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const handleMarkPaid = async (row: Expense) => {
    try {
      await runWithLoader(async () => {
        await markExpensePaid(row.id);
        await loadData();
      });
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to mark expense paid');
    }
  };

  const handleDelete = async (row: Expense) => {
    try {
      await runWithLoader(async () => {
        await deleteExpense(row.id);
        await loadData();
      });
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Failed to delete expense');
    }
  };

  const applySearch = () => {
    setPage(1);
    setSearchApplied(search.trim());
  };

  const columns: TableProps<Expense>['columns'] = [
    {
      title: 'Expense ID',
      dataIndex: 'expenseId',
      key: 'expenseId',
      width: 100,
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
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (v: string) => (
        <Tag color="cyan" className="rounded-full">
          {v}
        </Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (v: string, r: Expense) => (
        <div>
          <span className="text-xs">{v}</span>
          {r.reference && (
            <div className="text-[11px] text-slate-400 font-mono mt-0.5">{r.reference}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Chart Account',
      dataIndex: 'chartAccount',
      key: 'chartAccount',
      width: 160,
      render: (v: string) => <span className="text-xs text-slate-600">{v || '—'}</span>,
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      width: 110,
      render: (v: number, r: Expense) => (
        <span className="text-xs font-semibold text-rose-600">
          {formatExpenseAmount(v, r.currency || currency)}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (v: ExpenseStatus) => (
        <Tag color={v === 'Paid' ? 'green' : 'orange'} className="rounded-full">
          {v}
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_: unknown, r: Expense) => (
        <Space size="small">
          {r.status === 'Pending' && (
            <Tooltip title="Mark paid">
              <Button
                type="link"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => void handleMarkPaid(r)}
                aria-label="Mark paid"
                className="!px-1"
              />
            </Tooltip>
          )}
          <Tooltip title="Edit">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => openEditModal(r)}
              aria-label="Edit"
              className="!px-1"
            />
          </Tooltip>
          <Popconfirm
            title="Delete expense?"
            description={`${r.expenseId} will be permanently removed.`}
            okText="Delete"
            okType="danger"
            onConfirm={() => void handleDelete(r)}
          >
            <Tooltip title="Delete">
              <Button
                type="link"
                size="small"
                danger
                icon={<DeleteOutlined />}
                aria-label="Delete"
                className="!px-1"
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      {contextHolder}
      <div className="space-y-6">
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Expenses
          </Title>
          <Text type="secondary">
            Operating costs outside inventory purchases — rent, utilities, transport, and more.
          </Text>
        </div>

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Total Expenses"
                value={summary.totalAmount}
                precision={2}
                prefix={currency}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Paid"
                value={summary.paidAmount}
                precision={2}
                prefix={currency}
                styles={{ content: { color: '#25395c' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic
                title="Pending"
                value={summary.pendingAmount}
                precision={2}
                prefix={currency}
                styles={{ content: { color: '#d97706' } }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card className="shadow-sm">
              <Statistic title="Pending Items" value={summary.pendingCount} />
            </Card>
          </Col>
        </Row>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
            <Text type="secondary" className="text-sm">
              {summary.expenseCount} expense{summary.expenseCount === 1 ? '' : 's'} recorded
            </Text>
            <Space wrap>
              <Input
                allowClear
                prefix={<SearchOutlined className="text-slate-400" />}
                placeholder="Search expenses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  if (!e.target.value.trim() && searchApplied) {
                    setPage(1);
                    setSearchApplied('');
                  }
                }}
                onPressEnter={applySearch}
                className="w-44"
                size="small"
              />
              <Select
                size="small"
                value={statusFilter}
                onChange={(v) => {
                  setPage(1);
                  setStatusFilter(v);
                }}
                className="w-28"
                options={[
                  { value: 'all', label: 'All status' },
                  ...meta.statuses.map((s) => ({ value: s, label: s })),
                ]}
              />
              <Select
                size="small"
                value={categoryFilter}
                onChange={(v) => {
                  setPage(1);
                  setCategoryFilter(v);
                }}
                className="w-36"
                options={[
                  { value: 'all', label: 'All categories' },
                  ...meta.categories.map((c) => ({ value: c, label: c })),
                ]}
              />
              <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
                Add Expense
              </Button>
            </Space>
          </div>
          <div className="p-2 sm:p-3 overflow-x-auto">
            <Table<Expense>
              rowKey="id"
              columns={columns}
              dataSource={expenses}
              loading={loading}
              pagination={{
                current: page,
                pageSize,
                total,
                size: 'small',
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50],
                onChange: (p, ps) => {
                  setPage(p);
                  setPageSize(ps);
                },
              }}
              size="small"
              scroll={{ x: 1100 }}
            />
          </div>
        </Card>
      </div>

      <Modal
        title={mode === 'edit' ? 'Edit Expense' : 'Add Expense'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onOk={() => void handleSave()}
        okText={mode === 'edit' ? 'Save Changes' : 'Save Expense'}
        confirmLoading={saving}
        destroyOnClose
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item name="date" label="Date" rules={[{ required: true, message: 'Select a date' }]}>
            <DatePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>
          <Form.Item
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Select a category' }]}
          >
            <Select
              placeholder="Select category"
              options={meta.categories.map((c) => ({
                value: c,
                label: meta.chartAccountByCategory[c]
                  ? `${c} → ${meta.chartAccountByCategory[c]}`
                  : c,
              }))}
            />
          </Form.Item>
          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Enter a description' }]}
          >
            <TextArea rows={2} placeholder="What was this expense for?" />
          </Form.Item>
          <Form.Item
            name="amount"
            label={`Amount (${currency})`}
            rules={[{ required: true, message: 'Enter an amount' }]}
          >
            <InputNumber min={0.01} step={0.01} className="w-full" prefix={currency} />
          </Form.Item>
          <Form.Item name="reference" label="Reference (optional)">
            <Input placeholder="Invoice or receipt number" />
          </Form.Item>
          {mode === 'add' && (
            <Form.Item name="markPaid" label="Payment">
              <Select
                options={[
                  { value: true, label: 'Mark as paid now' },
                  { value: false, label: 'Save as pending' },
                ]}
              />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
