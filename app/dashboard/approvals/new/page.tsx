'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import {
  APPROVAL_TYPE_LABELS,
  MANUAL_APPROVAL_TYPES,
  createApproval,
  type ManualApprovalType,
} from '../../../lib/approvalsApi';

const { Title, Text } = Typography;

interface FormValues {
  type: ManualApprovalType;
  title: string;
  description?: string;
  amount?: number | null;
}

export default function NewApprovalPage() {
  const router = useRouter();
  const [form] = Form.useForm<FormValues>();
  const [saving, setSaving] = useState(false);

  const onFinish = async (values: FormValues) => {
    setSaving(true);
    try {
      const created = await createApproval({
        type: values.type,
        title: values.title.trim(),
        description: values.description?.trim() || undefined,
        amount:
          values.amount === undefined || values.amount === null
            ? undefined
            : values.amount,
      });
      message.success('Request created');
      router.push(`/dashboard/approvals/${created.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to create request');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-xl space-y-4">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="!px-0 mb-1"
            onClick={() => router.push('/dashboard/approvals')}
          >
            Inbox
          </Button>
          <Title level={3} className="!mb-1">
            New approval request
          </Title>
          <Text type="secondary">
            Create a manual purchase, expense, discount, or credit request for review
          </Text>
        </div>

        <Card className="!rounded-xl">
          <Form
            form={form}
            layout="vertical"
            initialValues={{ type: 'expense' }}
            onFinish={(v) => void onFinish(v)}
          >
            <Form.Item
              name="type"
              label="Type"
              rules={[{ required: true, message: 'Select a type' }]}
            >
              <Select
                options={MANUAL_APPROVAL_TYPES.map((t) => ({
                  value: t,
                  label: APPROVAL_TYPE_LABELS[t],
                }))}
              />
            </Form.Item>

            <Form.Item
              name="title"
              label="Title"
              rules={[
                { required: true, message: 'Title is required' },
                { whitespace: true, message: 'Title is required' },
              ]}
            >
              <Input placeholder="e.g. Office chairs" maxLength={200} />
            </Form.Item>

            <Form.Item name="description" label="Description">
              <Input.TextArea
                rows={3}
                placeholder="Optional details for the reviewer"
                maxLength={1000}
              />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Amount (optional)"
              rules={[
                {
                  type: 'number',
                  min: 0,
                  message: 'Amount must be 0 or greater',
                },
              ]}
            >
              <InputNumber
                className="!w-full"
                min={0}
                precision={2}
                prefix="GHS"
                placeholder="0.00"
              />
            </Form.Item>

            <Form.Item className="!mb-0">
              <Space>
                <Button onClick={() => router.push('/dashboard/approvals')}>
                  Cancel
                </Button>
                <Button type="primary" htmlType="submit" loading={saving}>
                  Submit request
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </DashboardLayout>
  );
}
