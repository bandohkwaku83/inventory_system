'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  Row,
  Segmented,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  MessageOutlined,
  SendOutlined,
  TeamOutlined,
  UserOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useCustomers } from '../../context/CustomersContext';
import { useStaff } from '../../context/StaffContext';
import { useSuppliers } from '../../context/SuppliersContext';
import { BRAND } from '../../lib/brand';
import { fetchSmsMeta, sendSms, type SmsMeta } from '../../lib/smsApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

type AudienceType = 'customers' | 'staff' | 'suppliers';
type SmsStatus = 'queued' | 'sent' | 'delivered' | 'failed';

interface RecipientOption {
  id: string;
  name: string;
  phone: string;
}

interface SmsRecord {
  id: string;
  audience: AudienceType;
  recipientName: string;
  phone: string;
  body: string;
  status: SmsStatus;
  createdAt: string;
}

const AUDIENCE_META: Record<
  AudienceType,
  { label: string; singular: string; icon: React.ReactNode; color: string }
> = {
  customers: {
    label: 'Customers',
    singular: 'Customer',
    icon: <UserOutlined />,
    color: 'blue',
  },
  staff: {
    label: 'Staff',
    singular: 'Staff',
    icon: <TeamOutlined />,
    color: 'purple',
  },
  suppliers: {
    label: 'Suppliers',
    singular: 'Supplier',
    icon: <ShopOutlined />,
    color: 'orange',
  },
};

const STATUS_META: Record<
  SmsStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  queued: { label: 'Queued', color: 'blue', icon: <ClockCircleOutlined /> },
  sent: { label: 'Sent', color: 'cyan', icon: <SendOutlined /> },
  delivered: { label: 'Delivered', color: 'green', icon: <CheckCircleOutlined /> },
  failed: { label: 'Failed', color: 'red', icon: <CloseCircleOutlined /> },
};

function formatWhen(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Split free-text extras: commas, newlines, or whitespace. */
function parseExtraPhones(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default function SmsPage() {
  const { customers, customersLoading } = useCustomers();
  const { staff, staffLoading } = useStaff();
  const { suppliers, suppliersLoading } = useSuppliers();

  const [form] = Form.useForm<{
    recipientIds: string[];
    extras: string;
    body: string;
  }>();
  const [audience, setAudience] = useState<AudienceType>('customers');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<SmsRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<SmsStatus | 'all'>('all');
  const [audienceFilter, setAudienceFilter] = useState<AudienceType | 'all'>('all');
  const [search, setSearch] = useState('');
  const [smsMeta, setSmsMeta] = useState<SmsMeta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metaError, setMetaError] = useState<string | null>(null);

  const bodyWatch = Form.useWatch('body', form) ?? '';
  const recipientIdsWatch = Form.useWatch('recipientIds', form) ?? [];
  const extrasWatch = Form.useWatch('extras', form) ?? '';
  const charCount = bodyWatch.length;
  const segmentCount = charCount === 0 ? 0 : Math.ceil(charCount / 160);
  const extraPhones = useMemo(() => parseExtraPhones(extrasWatch), [extrasWatch]);

  const smsConfigured = smsMeta?.configured === true;
  const senderId = smsMeta?.senderId || 'Onyx';

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      setMetaError(null);
      try {
        const meta = await fetchSmsMeta();
        if (!cancelled) setSmsMeta(meta);
      } catch (e) {
        if (!cancelled) {
          setSmsMeta(null);
          setMetaError(e instanceof Error ? e.message : 'Failed to load SMS settings');
        }
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const recipientOptions = useMemo((): RecipientOption[] => {
    if (audience === 'customers') {
      return customers
        .filter((c) => c.phone?.trim())
        .map((c) => ({ id: c.id, name: c.name, phone: c.phone.trim() }));
    }
    if (audience === 'staff') {
      return staff
        .filter((s) => s.phone?.trim())
        .map((s) => ({ id: s.id, name: s.name, phone: s.phone.trim() }));
    }
    return suppliers
      .filter((s) => s.phone?.trim())
      .map((s) => ({ id: s.id, name: s.name, phone: s.phone!.trim() }));
  }, [audience, customers, staff, suppliers]);

  const optionsLoading =
    audience === 'customers'
      ? customersLoading
      : audience === 'staff'
        ? staffLoading
        : suppliersLoading;

  const selectedRecipients = useMemo(
    () => recipientOptions.filter((r) => recipientIdsWatch.includes(r.id)),
    [recipientOptions, recipientIdsWatch]
  );

  const totalRecipientCount = selectedRecipients.length + extraPhones.length;

  const filteredHistory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return history.filter((row) => {
      if (statusFilter !== 'all' && row.status !== statusFilter) return false;
      if (audienceFilter !== 'all' && row.audience !== audienceFilter) return false;
      if (!q) return true;
      return (
        row.recipientName.toLowerCase().includes(q) ||
        row.phone.toLowerCase().includes(q) ||
        row.body.toLowerCase().includes(q)
      );
    });
  }, [history, search, statusFilter, audienceFilter]);

  const stats = useMemo(
    () => ({
      total: history.length,
      delivered: history.filter((r) => r.status === 'delivered' || r.status === 'sent').length,
      queued: history.filter((r) => r.status === 'queued').length,
      failed: history.filter((r) => r.status === 'failed').length,
    }),
    [history]
  );

  const onAudienceChange = (next: AudienceType) => {
    setAudience(next);
    form.setFieldsValue({ recipientIds: [] });
  };

  const selectAllWithPhone = () => {
    form.setFieldsValue({ recipientIds: recipientOptions.map((r) => r.id) });
  };

  const clearRecipients = () => {
    form.setFieldsValue({ recipientIds: [] });
  };

  const onSend = async () => {
    if (!smsConfigured) {
      message.error('SMS not configured');
      return;
    }

    try {
      const values = await form.validateFields();
      const chosen = recipientOptions.filter((r) => values.recipientIds.includes(r.id));
      const extras = parseExtraPhones(values.extras);
      const phones = [...chosen.map((r) => r.phone), ...extras];

      if (phones.length === 0) {
        message.warning('Select at least one recipient or enter a phone number');
        return;
      }

      const body = values.body.trim();
      setSending(true);

      const result = await sendSms({ message: body, recipients: phones });
      const now = new Date().toISOString();

      const phoneToName = new Map<string, string>();
      for (const r of chosen) {
        phoneToName.set(r.phone, r.name);
        const digits = r.phone.replace(/\D/g, '');
        if (digits.startsWith('0') && digits.length === 10) {
          phoneToName.set(`233${digits.slice(1)}`, r.name);
        }
        if (digits.startsWith('233')) {
          phoneToName.set(`0${digits.slice(3)}`, r.name);
        }
      }

      const rows: SmsRecord[] = [];
      for (const phone of result.recipients) {
        rows.push({
          id: `sms-${Date.now()}-${phone}-ok`,
          audience,
          recipientName: phoneToName.get(phone) || phone,
          phone,
          body,
          status: 'sent',
          createdAt: now,
        });
      }
      for (const phone of result.invalid) {
        rows.push({
          id: `sms-${Date.now()}-${phone}-bad`,
          audience,
          recipientName: phoneToName.get(phone) || phone,
          phone,
          body,
          status: 'failed',
          createdAt: now,
        });
      }

      if (rows.length === 0 && phones.length > 0) {
        for (let i = 0; i < phones.length; i++) {
          const phone = phones[i];
          rows.push({
            id: `sms-${Date.now()}-${i}`,
            audience,
            recipientName: phoneToName.get(phone) || phone,
            phone,
            body,
            status: 'sent',
            createdAt: now,
          });
        }
      }

      setHistory((prev) => [...rows, ...prev]);

      const sentCount = result.recipients.length || phones.length - result.invalid.length;
      if (result.invalid.length > 0) {
        message.warning(
          `Sent to ${sentCount} · ${result.invalid.length} invalid number${result.invalid.length === 1 ? '' : 's'}`
        );
      } else {
        message.success(
          `SMS sent to ${sentCount} recipient${sentCount === 1 ? '' : 's'}`
        );
      }
      form.setFieldsValue({ recipientIds: [], extras: '', body: '' });
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      message.error(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSending(false);
    }
  };

  const columns: TableProps<SmsRecord>['columns'] = [
    {
      title: 'To',
      key: 'to',
      width: 200,
      render: (_, row) => (
        <div className="min-w-0">
          <div className="truncate font-medium text-slate-800">{row.recipientName}</div>
          <div className="truncate text-xs text-slate-500">{row.phone}</div>
        </div>
      ),
    },
    {
      title: 'Audience',
      dataIndex: 'audience',
      key: 'audience',
      width: 120,
      render: (a: AudienceType) => (
        <Tag color={AUDIENCE_META[a].color} icon={AUDIENCE_META[a].icon}>
          {AUDIENCE_META[a].singular}
        </Tag>
      ),
    },
    {
      title: 'Message',
      dataIndex: 'body',
      key: 'body',
      ellipsis: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (status: SmsStatus) => (
        <Tag color={STATUS_META[status].color} icon={STATUS_META[status].icon}>
          {STATUS_META[status].label}
        </Tag>
      ),
    },
    {
      title: 'Sent',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 170,
      render: (iso: string) => (
        <span className="text-slate-600">{formatWhen(iso)}</span>
      ),
    },
  ];

  const sendDisabled =
    !smsConfigured || metaLoading || totalRecipientCount === 0 || !bodyWatch.trim();

  return (
    <DashboardLayout>
      <div className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Title level={3} className="!mb-1">
              SMS
            </Title>
            <Text type="secondary">
              Message customers, staff, or suppliers directly from their phone numbers on file.
            </Text>
          </div>
        </div>

        {metaError && (
          <Alert
            type="warning"
            showIcon
            message="Could not verify SMS configuration"
            description={metaError}
          />
        )}
        {!metaLoading && smsMeta && !smsConfigured && (
          <Alert type="error" showIcon message="SMS not configured" />
        )}

        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            <Card size="small" className="!border-slate-200/80">
              <Statistic
                title="Total messages"
                value={stats.total}
                prefix={<MessageOutlined style={{ color: BRAND }} />}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!border-slate-200/80">
              <Statistic title="Sent / delivered" value={stats.delivered} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!border-slate-200/80">
              <Statistic title="Queued" value={stats.queued} />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" className="!border-slate-200/80">
              <Statistic title="Failed" value={stats.failed} />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} align="stretch">
          <Col xs={24} xl={9}>
            <Card
              className="h-full !border-slate-200/80"
              title={
                <span className="font-semibold text-slate-800">Compose message</span>
              }
            >
              <div className="mb-4">
                <Text className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Send to
                </Text>
                <Segmented
                  block
                  value={audience}
                  onChange={(v) => onAudienceChange(v as AudienceType)}
                  options={(Object.keys(AUDIENCE_META) as AudienceType[]).map((key) => ({
                    value: key,
                    label: (
                      <span className="inline-flex items-center gap-1.5 py-0.5">
                        {AUDIENCE_META[key].icon}
                        {AUDIENCE_META[key].label}
                      </span>
                    ),
                  }))}
                />
              </div>

              <Form
                form={form}
                layout="vertical"
                initialValues={{ recipientIds: [], extras: '', body: '' }}
                onFinish={onSend}
                requiredMark={false}
              >
                <div className="-mb-1 flex items-center justify-between">
                  <Text className="text-sm text-slate-700">Recipients</Text>
                  <Space size={4}>
                    <Button
                      type="link"
                      size="small"
                      className="!h-auto !px-0"
                      disabled={recipientOptions.length === 0}
                      onClick={selectAllWithPhone}
                    >
                      Select all
                    </Button>
                    <Text type="secondary">·</Text>
                    <Button
                      type="link"
                      size="small"
                      className="!h-auto !px-0"
                      disabled={recipientIdsWatch.length === 0}
                      onClick={clearRecipients}
                    >
                      Clear
                    </Button>
                  </Space>
                </div>
                <Form.Item
                  name="recipientIds"
                  extra={
                    optionsLoading
                      ? `Loading ${AUDIENCE_META[audience].label.toLowerCase()}…`
                      : `${recipientOptions.length} with phone · ${selectedRecipients.length} selected`
                  }
                >
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    loading={optionsLoading}
                    placeholder={`Choose ${AUDIENCE_META[audience].label.toLowerCase()}…`}
                    optionFilterProp="label"
                    maxTagCount="responsive"
                    disabled={!smsConfigured}
                    options={recipientOptions.map((r) => ({
                      value: r.id,
                      label: `${r.name} · ${r.phone}`,
                    }))}
                    notFoundContent={
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={`No ${AUDIENCE_META[audience].label.toLowerCase()} with phone numbers`}
                      />
                    }
                  />
                </Form.Item>

                {selectedRecipients.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {selectedRecipients.slice(0, 8).map((r) => (
                      <Tag key={r.id} className="!m-0">
                        {r.name}
                      </Tag>
                    ))}
                    {selectedRecipients.length > 8 && (
                      <Tag className="!m-0">+{selectedRecipients.length - 8} more</Tag>
                    )}
                  </div>
                )}

                <Form.Item
                  label="Extra numbers"
                  name="extras"
                  extra="Optional · 0XXXXXXXXX or 233XXXXXXXXX · comma or space separated"
                >
                  <Input
                    placeholder="e.g. 0244123456, 233501234567"
                    disabled={!smsConfigured}
                  />
                </Form.Item>

                <Form.Item label="Sender">
                  <Input value={metaLoading ? '…' : senderId} disabled readOnly />
                </Form.Item>

                <Form.Item
                  label="Message"
                  name="body"
                  rules={[
                    { required: true, message: 'Enter a message' },
                    { max: 1000, message: 'Keep messages under 1000 characters' },
                  ]}
                  extra={
                    <span className="text-slate-500">
                      {charCount} character{charCount === 1 ? '' : 's'}
                      {charCount > 0
                        ? ` · ~${segmentCount} SMS segment${segmentCount === 1 ? '' : 's'}`
                        : ''}
                    </span>
                  }
                >
                  <TextArea
                    rows={6}
                    placeholder={`Write your message to ${AUDIENCE_META[audience].label.toLowerCase()}…`}
                    maxLength={1000}
                    showCount
                    disabled={!smsConfigured}
                  />
                </Form.Item>

                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SendOutlined />}
                  loading={sending}
                  size="large"
                  block
                  style={{ background: BRAND }}
                  disabled={sendDisabled}
                >
                  {!smsConfigured && !metaLoading
                    ? 'SMS not configured'
                    : `Send to ${totalRecipientCount || '…'} recipient${totalRecipientCount === 1 ? '' : 's'}`}
                </Button>
              </Form>
            </Card>
          </Col>

          <Col xs={24} xl={15}>
            <Card
              className="h-full !border-slate-200/80"
              title={
                <span className="font-semibold text-slate-800">Message history</span>
              }
              extra={
                <Space wrap size="small">
                  <Input.Search
                    allowClear
                    placeholder="Search name, phone, message"
                    style={{ width: 220 }}
                    onSearch={setSearch}
                    onChange={(e) => {
                      if (!e.target.value) setSearch('');
                    }}
                  />
                  <Select
                    value={audienceFilter}
                    style={{ width: 130 }}
                    onChange={setAudienceFilter}
                    options={[
                      { value: 'all', label: 'All audiences' },
                      { value: 'customers', label: 'Customers' },
                      { value: 'staff', label: 'Staff' },
                      { value: 'suppliers', label: 'Suppliers' },
                    ]}
                  />
                  <Select
                    value={statusFilter}
                    style={{ width: 130 }}
                    onChange={setStatusFilter}
                    options={[
                      { value: 'all', label: 'All statuses' },
                      { value: 'queued', label: 'Queued' },
                      { value: 'sent', label: 'Sent' },
                      { value: 'delivered', label: 'Delivered' },
                      { value: 'failed', label: 'Failed' },
                    ]}
                  />
                </Space>
              }
            >
              <Table<SmsRecord>
                rowKey="id"
                columns={columns}
                dataSource={filteredHistory}
                pagination={{ pageSize: 8, hideOnSinglePage: true, showSizeChanger: false }}
                locale={{
                  emptyText: (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="No messages yet. Compose a message to get started."
                    />
                  ),
                }}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </DashboardLayout>
  );
}
