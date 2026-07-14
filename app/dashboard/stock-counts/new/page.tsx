'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button,
  Card,
  Form,
  Input,
  Select,
  Typography,
  message,
} from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import DashboardLayout from '../../../components/DashboardLayout';
import { useWarehouses } from '../../../context/WarehousesContext';
import {
  fetchWarehouseStructure,
  storableLocationsFromStructure,
  type LocationNode,
} from '../../../lib/warehousesApi';
import { createStockCount } from '../../../lib/stockCountsApi';

const { Title, Text } = Typography;

export default function NewStockCountPage() {
  const router = useRouter();
  const { warehouses, warehousesLoading } = useWarehouses();
  const [form] = Form.useForm();

  const [warehouseId, setWarehouseId] = useState('');
  const [locationId, setLocationId] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState<LocationNode[]>([]);
  const [saving, setSaving] = useState(false);

  const activeWarehouses = useMemo(
    () => warehouses.filter((w) => w.status === 'active'),
    [warehouses]
  );

  const loadLocations = useCallback(async (whId: string) => {
    if (!whId) {
      setLocations([]);
      return;
    }
    try {
      const data = await fetchWarehouseStructure(whId);
      setLocations(storableLocationsFromStructure(data.structure));
    } catch {
      setLocations([]);
    }
  }, []);

  useEffect(() => {
    void loadLocations(warehouseId);
  }, [warehouseId, loadLocations]);

  const handleCreate = async () => {
    if (!warehouseId) {
      message.error('Select a warehouse');
      return;
    }
    setSaving(true);
    try {
      const created = await createStockCount({
        warehouseId,
        locationId: locationId || null,
        notes: notes.trim(),
      });
      message.success('Stock count created');
      router.push(`/dashboard/stock-counts/${created.id}`);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Failed to create stock count');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="!px-0 mb-1"
            onClick={() => router.push('/dashboard/stock-counts')}
          >
            Back
          </Button>
          <Title level={3} className="!mb-1">
            New stock count
          </Title>
          <Text type="secondary">
            Snapshot system quantities, then enter counted amounts on the detail page
          </Text>
        </div>

        <Card>
          <Form form={form} layout="vertical">
            <Form.Item label="Warehouse" required>
              <Select
                showSearch
                optionFilterProp="label"
                loading={warehousesLoading}
                placeholder="Select warehouse"
                value={warehouseId || undefined}
                options={activeWarehouses.map((w) => ({
                  value: w.id,
                  label: `${w.code} — ${w.name}`,
                }))}
                onChange={(id) => {
                  setWarehouseId(id);
                  setLocationId(undefined);
                }}
              />
            </Form.Item>

            <Form.Item
              label="Location (optional)"
              help="Leave blank to count the whole warehouse"
            >
              <Select
                allowClear
                showSearch
                optionFilterProp="label"
                placeholder={
                  warehouseId ? 'All locations' : 'Pick warehouse first'
                }
                disabled={!warehouseId}
                value={locationId}
                options={locations.map((l) => ({
                  value: l.id,
                  label: `${l.code} — ${l.name}`,
                }))}
                onChange={(v) => setLocationId(v)}
              />
            </Form.Item>

            <Form.Item label="Notes">
              <Input.TextArea
                rows={3}
                value={notes}
                placeholder="Optional notes"
                onChange={(e) => setNotes(e.target.value)}
              />
            </Form.Item>
          </Form>

          <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
            <Button onClick={() => router.push('/dashboard/stock-counts')}>
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={() => void handleCreate()}
            >
              Create count
            </Button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
