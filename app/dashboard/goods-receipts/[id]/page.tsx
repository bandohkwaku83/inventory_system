'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  Modal,
  Result,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import {
  ArrowLeftOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { GoodsReceiptForm } from '../../../components/goods-receipts/GoodsReceiptForm';
import { BRAND } from '../../../lib/brand';
import {
  approveGoodsReceipt,
  cancelGoodsReceipt,
  fetchGoodsReceiptById,
  formatReceiptDate,
  formatReceiptPerson,
  rejectGoodsReceipt,
  submitGoodsReceipt,
  RECEIPT_STATUS_COLORS,
  RECEIPT_STATUS_LABELS,
  RECEIPT_WORKFLOW_STEPS,
  type GoodsReceipt,
  type GoodsReceiptLine,
  type GoodsReceiptStatus,
} from '../../../lib/goodsReceiptsApi';

const { Title, Text } = Typography;

function workflowStepIndex(status: GoodsReceiptStatus): number {
  if (status === 'cancelled' || status === 'rejected') return -1;
  return RECEIPT_WORKFLOW_STEPS.indexOf(status);
}

export default function GoodsReceiptDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [receipt, setReceipt] = useState<GoodsReceipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetchGoodsReceiptById(id);
      setReceipt(r);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load receipt');
      setReceipt(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    action: () => Promise<GoodsReceipt>,
    successMsg: string
  ) => {
    setActing(true);
    try {
      const updated = await action();
      setReceipt(updated);
      message.success(successMsg);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const stepIndex = receipt ? workflowStepIndex(receipt.status) : 0;

  const lineColumns: TableProps<GoodsReceiptLine>['columns'] = useMemo(
    () => [
      {
        title: 'Product',
        key: 'product',
        render: (_, r) => (
          <div>
            <div className="font-medium">{r.product.name}</div>
            {r.product.sku && (
              <Text type="secondary" className="font-mono text-xs">
                {r.product.sku}
              </Text>
            )}
          </div>
        ),
      },
      {
        title: 'Qty',
        dataIndex: 'quantity',
        width: 80,
      },
      {
        title: 'Location',
        key: 'location',
        render: (_, r) =>
          r.location
            ? r.location.fullPath || `${r.location.code} — ${r.location.name}`
            : '—',
      },
    ],
    []
  );

  if (editing && receipt) {
    return (
      <DashboardLayout>
        <GoodsReceiptForm
          mode="edit"
          initial={receipt}
          onCancel={() => setEditing(false)}
          onSaved={(updated) => {
            setReceipt(updated);
            setEditing(false);
          }}
        />
      </DashboardLayout>
    );
  }

  const actionBar = receipt ? (
    <Space wrap>
      {receipt.status === 'draft' && (
        <>
          <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
            Edit
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={acting}
            onClick={() =>
              void runAction(
                () => submitGoodsReceipt(receipt.id),
                'Submitted for approval'
              )
            }
          >
            Submit
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Cancel this draft?',
                content: 'The receipt will be marked cancelled and become read-only.',
                okText: 'Cancel receipt',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(() => cancelGoodsReceipt(receipt.id), 'Receipt cancelled'),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}

      {receipt.status === 'pending_approval' && (
        <>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            loading={acting}
            onClick={() => {
              setReviewNotes('');
              setApproveOpen(true);
            }}
          >
            Approve
          </Button>
          <Button
            danger
            icon={<CloseOutlined />}
            loading={acting}
            onClick={() => {
              setRejectReason('');
              setRejectOpen(true);
            }}
          >
            Reject
          </Button>
        </>
      )}
    </Space>
  ) : null;

  return (
    <DashboardLayout>
      {loading ? (
        <div className="flex justify-center py-24">
          <Spin size="large" />
        </div>
      ) : error || !receipt ? (
        <Result
          status="error"
          title="Receipt not found"
          subTitle={error ?? 'Unknown error'}
          extra={
            <Button onClick={() => router.push('/dashboard/goods-receipts')}>
              Back to list
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                className="!px-0 mb-1"
                onClick={() => router.push('/dashboard/goods-receipts')}
              >
                Goods Receipts
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <Title level={3} className="!mb-0 font-mono">
                  {receipt.receiptNumber || 'Receipt'}
                </Title>
                <Tag color={RECEIPT_STATUS_COLORS[receipt.status]}>
                  {RECEIPT_STATUS_LABELS[receipt.status]}
                </Tag>
              </div>
              <Text type="secondary">
                {receipt.warehouse.code} {receipt.warehouse.name}
                {receipt.supplierName || receipt.supplier?.name
                  ? ` · ${receipt.supplier?.name || receipt.supplierName}`
                  : ''}
              </Text>
            </div>
            {actionBar}
          </div>

          {receipt.status === 'cancelled' || receipt.status === 'rejected' ? (
            <Alert
              type="error"
              showIcon
              message={receipt.status === 'rejected' ? 'Rejected' : 'Cancelled'}
              description={
                receipt.rejectionReason
                  ? `Reason: ${receipt.rejectionReason}`
                  : undefined
              }
            />
          ) : (
            <Card size="small">
              <Steps
                size="small"
                current={Math.max(0, stepIndex)}
                items={RECEIPT_WORKFLOW_STEPS.map((s) => ({
                  title: RECEIPT_STATUS_LABELS[s],
                }))}
              />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Summary" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Warehouse">
                  <span className="font-mono text-xs" style={{ color: BRAND }}>
                    {receipt.warehouse.code}
                  </span>{' '}
                  {receipt.warehouse.name}
                </Descriptions.Item>
                <Descriptions.Item label="Supplier">
                  {receipt.supplier?.name || receipt.supplierName || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Reference">
                  {receipt.reference || '—'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {receipt.notes || '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="People & timestamps" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Requested">
                  {formatReceiptPerson(receipt.requestedBy)}
                  {' · '}
                  {formatReceiptDate(receipt.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Approved">
                  {formatReceiptPerson(receipt.approvedBy)}
                  {' · '}
                  {formatReceiptDate(receipt.approvedAt)}
                </Descriptions.Item>
                {(receipt.cancelledAt || receipt.rejectedAt) && (
                  <Descriptions.Item label="Cancelled / rejected">
                    {formatReceiptPerson(receipt.rejectedBy)}
                    {' · '}
                    {formatReceiptDate(receipt.cancelledAt ?? receipt.rejectedAt)}
                    {receipt.rejectionReason
                      ? ` — ${receipt.rejectionReason}`
                      : ''}
                  </Descriptions.Item>
                )}
              </Descriptions>
              {receipt.approval && (
                <div className="mt-3">
                  <Button
                    type="link"
                    className="!px-0"
                    onClick={() =>
                      router.push(
                        receipt.approval?.id
                          ? `/dashboard/approvals/${receipt.approval.id}`
                          : '/dashboard/approvals'
                      )
                    }
                  >
                    View in Approvals ({receipt.approval.approvalNumber || 'open'})
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <Card title="Lines" size="small">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={lineColumns}
              dataSource={receipt.lines}
            />
          </Card>
        </div>
      )}

      <Modal
        title="Approve receipt"
        open={approveOpen}
        okText="Approve"
        confirmLoading={acting}
        onCancel={() => setApproveOpen(false)}
        onOk={() => {
          if (!receipt) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await approveGoodsReceipt(
                receipt.id,
                reviewNotes.trim() || undefined
              );
              setReceipt(updated);
              setApproveOpen(false);
              message.success('Receipt approved — stock posted');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Approve failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        <Alert
          type="warning"
          showIcon
          className="mb-3"
          message="Approving credits stock to the warehouse."
        />
        <Text type="secondary" className="mb-2 block">
          Optional review notes
        </Text>
        <Input.TextArea
          rows={3}
          value={reviewNotes}
          placeholder="e.g. Matches PO"
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject receipt"
        open={rejectOpen}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={acting}
        onCancel={() => setRejectOpen(false)}
        onOk={() => {
          if (!receipt || !rejectReason.trim()) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await rejectGoodsReceipt(
                receipt.id,
                rejectReason.trim()
              );
              setReceipt(updated);
              setRejectOpen(false);
              message.success('Receipt rejected');
            } catch (e) {
              message.error(e instanceof Error ? e.message : 'Reject failed');
            } finally {
              setActing(false);
            }
          })();
        }}
      >
        <Text type="secondary" className="mb-2 block">
          Reason is required
        </Text>
        <Input.TextArea
          rows={3}
          value={rejectReason}
          placeholder="Why is this receipt rejected?"
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </DashboardLayout>
  );
}
