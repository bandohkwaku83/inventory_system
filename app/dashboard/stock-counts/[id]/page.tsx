'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Input,
  InputNumber,
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
  SaveOutlined,
  SendOutlined,
  StopOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { BRAND } from '../../../lib/brand';
import {
  approveStockCount,
  cancelStockCount,
  fetchStockCountById,
  formatCountDate,
  formatCountPerson,
  rejectStockCount,
  submitStockCount,
  updateStockCount,
  COUNT_STATUS_COLORS,
  COUNT_STATUS_LABELS,
  COUNT_WORKFLOW_STEPS,
  type StockCount,
  type StockCountLine,
  type StockCountStatus,
} from '../../../lib/stockCountsApi';

const { Title, Text } = Typography;

function workflowStepIndex(status: StockCountStatus): number {
  if (status === 'cancelled' || status === 'rejected') return -1;
  return COUNT_WORKFLOW_STEPS.indexOf(status);
}

export default function StockCountDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [count, setCount] = useState<StockCount | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countedMap, setCountedMap] = useState<Record<string, number | null>>({});

  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [approveOpen, setApproveOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');

  const canEditCounts =
    count?.status === 'draft' || count?.status === 'counting';

  const syncCountedFromCount = useCallback((c: StockCount) => {
    const map: Record<string, number | null> = {};
    for (const line of c.lines) {
      map[line.id] = line.countedQuantity;
    }
    setCountedMap(map);
  }, []);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const c = await fetchStockCountById(id);
      setCount(c);
      syncCountedFromCount(c);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load stock count');
      setCount(null);
    } finally {
      setLoading(false);
    }
  }, [id, syncCountedFromCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (
    action: () => Promise<StockCount>,
    successMsg: string
  ) => {
    setActing(true);
    try {
      const updated = await action();
      setCount(updated);
      syncCountedFromCount(updated);
      message.success(successMsg);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const handleSaveCounts = async () => {
    if (!count) return;
    const lines = count.lines
      .map((line) => {
        const qty = countedMap[line.id];
        if (qty === null || qty === undefined) return null;
        return { lineId: line.id, countedQuantity: qty };
      })
      .filter((l): l is { lineId: string; countedQuantity: number } => l !== null);

    if (!lines.length) {
      message.error('Enter at least one counted quantity');
      return;
    }

    setActing(true);
    try {
      const updated = await updateStockCount(count.id, { lines });
      setCount(updated);
      syncCountedFromCount(updated);
      message.success('Counts saved');
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to save counts');
    } finally {
      setActing(false);
    }
  };

  const stepIndex = count ? workflowStepIndex(count.status) : 0;

  const lineColumns: TableProps<StockCountLine>['columns'] = useMemo(
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
        title: 'Location',
        key: 'location',
        render: (_, r) =>
          r.location
            ? r.location.fullPath || `${r.location.code} — ${r.location.name}`
            : '—',
      },
      {
        title: 'System qty',
        dataIndex: 'systemQuantity',
        width: 100,
      },
      {
        title: 'Counted',
        key: 'counted',
        width: 120,
        render: (_, r) =>
          canEditCounts ? (
            <InputNumber
              min={0}
              style={{ width: '100%' }}
              value={countedMap[r.id] ?? undefined}
              placeholder="—"
              onChange={(v) =>
                setCountedMap((prev) => ({
                  ...prev,
                  [r.id]: typeof v === 'number' ? v : null,
                }))
              }
            />
          ) : (
            r.countedQuantity ?? '—'
          ),
      },
      {
        title: 'Variance',
        key: 'variance',
        width: 100,
        render: (_, r) => {
          const counted = canEditCounts
            ? countedMap[r.id]
            : r.countedQuantity;
          const variance =
            counted === null || counted === undefined
              ? null
              : counted - r.systemQuantity;
          if (variance === null) return '—';
          const color =
            variance > 0 ? '#16a34a' : variance < 0 ? '#dc2626' : undefined;
          return <span style={{ color }}>{variance > 0 ? `+${variance}` : variance}</span>;
        },
      },
    ],
    [canEditCounts, countedMap]
  );

  const actionBar = count ? (
    <Space wrap>
      {canEditCounts && (
        <>
          <Button
            icon={<SaveOutlined />}
            loading={acting}
            onClick={() => void handleSaveCounts()}
          >
            Save counts
          </Button>
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Submit count for approval?',
                content:
                  'Unsaved counted values will not be included. Save counts first if needed.',
                okText: 'Submit',
                onOk: () =>
                  runAction(
                    () => submitStockCount(count.id),
                    'Submitted for approval'
                  ),
              });
            }}
          >
            Submit
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            loading={acting}
            onClick={() => {
              Modal.confirm({
                title: 'Cancel this count?',
                content: 'The count will be marked cancelled and become read-only.',
                okText: 'Cancel count',
                okButtonProps: { danger: true },
                onOk: () =>
                  runAction(() => cancelStockCount(count.id), 'Count cancelled'),
              });
            }}
          >
            Cancel
          </Button>
        </>
      )}

      {count.status === 'pending_approval' && (
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
            Approve variances
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
      ) : error || !count ? (
        <Result
          status="error"
          title="Stock count not found"
          subTitle={error ?? 'Unknown error'}
          extra={
            <Button onClick={() => router.push('/dashboard/stock-counts')}>
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
                onClick={() => router.push('/dashboard/stock-counts')}
              >
                Stock Counts
              </Button>
              <div className="flex flex-wrap items-center gap-3">
                <Title level={3} className="!mb-0 font-mono">
                  {count.countNumber || 'Count'}
                </Title>
                <Tag color={COUNT_STATUS_COLORS[count.status]}>
                  {COUNT_STATUS_LABELS[count.status]}
                </Tag>
              </div>
              <Text type="secondary">
                {count.warehouse.code} {count.warehouse.name}
                {count.location
                  ? ` · ${count.location.fullPath || count.location.code}`
                  : ''}
              </Text>
            </div>
            {actionBar}
          </div>

          {count.status === 'cancelled' || count.status === 'rejected' ? (
            <Alert
              type="error"
              showIcon
              message={count.status === 'rejected' ? 'Rejected' : 'Cancelled'}
              description={
                count.rejectionReason
                  ? `Reason: ${count.rejectionReason}`
                  : undefined
              }
            />
          ) : (
            <Card size="small">
              <Steps
                size="small"
                current={Math.max(0, stepIndex)}
                items={COUNT_WORKFLOW_STEPS.map((s) => ({
                  title: COUNT_STATUS_LABELS[s],
                }))}
              />
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="Summary" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Warehouse">
                  <span className="font-mono text-xs" style={{ color: BRAND }}>
                    {count.warehouse.code}
                  </span>{' '}
                  {count.warehouse.name}
                </Descriptions.Item>
                <Descriptions.Item label="Location scope">
                  {count.location
                    ? count.location.fullPath ||
                      `${count.location.code} — ${count.location.name}`
                    : 'Entire warehouse'}
                </Descriptions.Item>
                <Descriptions.Item label="Notes">
                  {count.notes || '—'}
                </Descriptions.Item>
              </Descriptions>
            </Card>

            <Card title="People & timestamps" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Requested">
                  {formatCountPerson(count.requestedBy)}
                  {' · '}
                  {formatCountDate(count.createdAt)}
                </Descriptions.Item>
                <Descriptions.Item label="Approved">
                  {formatCountPerson(count.approvedBy)}
                  {' · '}
                  {formatCountDate(count.approvedAt)}
                </Descriptions.Item>
                {(count.cancelledAt || count.rejectedAt) && (
                  <Descriptions.Item label="Cancelled / rejected">
                    {formatCountPerson(count.rejectedBy)}
                    {' · '}
                    {formatCountDate(count.cancelledAt ?? count.rejectedAt)}
                    {count.rejectionReason
                      ? ` — ${count.rejectionReason}`
                      : ''}
                  </Descriptions.Item>
                )}
              </Descriptions>
              {count.approval && (
                <div className="mt-3">
                  <Button
                    type="link"
                    className="!px-0"
                    onClick={() =>
                      router.push(
                        count.approval?.id
                          ? `/dashboard/approvals/${count.approval.id}`
                          : '/dashboard/approvals'
                      )
                    }
                  >
                    View in Approvals ({count.approval.approvalNumber || 'open'})
                  </Button>
                </div>
              )}
            </Card>
          </div>

          <Card title="Count lines" size="small">
            <Table
              size="small"
              rowKey="id"
              pagination={false}
              columns={lineColumns}
              dataSource={count.lines}
              scroll={{ x: true }}
            />
          </Card>
        </div>
      )}

      <Modal
        title="Approve variances"
        open={approveOpen}
        okText="Approve"
        confirmLoading={acting}
        onCancel={() => setApproveOpen(false)}
        onOk={() => {
          if (!count) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await approveStockCount(
                count.id,
                reviewNotes.trim() || undefined
              );
              setCount(updated);
              syncCountedFromCount(updated);
              setApproveOpen(false);
              message.success('Variances approved — stock adjusted');
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
          message="Approving applies inventory adjustments for all variances."
        />
        <Text type="secondary" className="mb-2 block">
          Optional review notes
        </Text>
        <Input.TextArea
          rows={3}
          value={reviewNotes}
          placeholder="e.g. Spot-checked OK"
          onChange={(e) => setReviewNotes(e.target.value)}
        />
      </Modal>

      <Modal
        title="Reject count"
        open={rejectOpen}
        okText="Reject"
        okButtonProps={{ danger: true, disabled: !rejectReason.trim() }}
        confirmLoading={acting}
        onCancel={() => setRejectOpen(false)}
        onOk={() => {
          if (!count || !rejectReason.trim()) return;
          void (async () => {
            setActing(true);
            try {
              const updated = await rejectStockCount(
                count.id,
                rejectReason.trim()
              );
              setCount(updated);
              syncCountedFromCount(updated);
              setRejectOpen(false);
              message.success('Count rejected');
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
          placeholder="Why are these variances rejected?"
          onChange={(e) => setRejectReason(e.target.value)}
        />
      </Modal>
    </DashboardLayout>
  );
}
