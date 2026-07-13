'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Space,
  Input,
  Select,
  Button,
  Typography,
} from 'antd';
import type { TableProps } from 'antd';
import {
  SearchOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useProducts, type Product } from '../../context/ProductsContext';
import { productImageSrc } from '../../lib/productsApi';

const { Title, Text } = Typography;

const currency = (v: number) => `GHS ${v.toFixed(2)}`;

export default function PriceListPage() {
  const { products, productsLoading, categories } = useProducts();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (categoryFilter) list = list.filter((p) => p.category === categoryFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, search, categoryFilter]);

  const handleExportCsv = () => {
    const header = ['SKU', 'Name', 'Category', 'Selling Price (GHS)'];
    const lines = filtered.map((p) =>
      [p.sku ?? '', p.name, p.category, (p.price ?? 0).toFixed(2)]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    );
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `price-list-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const columns: TableProps<Product>['columns'] = [
    {
      title: 'Product',
      key: 'product',
      width: 360,
      render: (_, r) => (
        <Space align="center" size="middle">
          <div className="flex h-11 w-11 flex-shrink-0 overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageSrc(r.image)}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          </div>
          <Space direction="vertical" size={0} className="min-w-0">
            <Text strong className="block truncate">
              {r.name}
            </Text>
            {r.sku ? (
              <Text type="secondary" className="text-xs font-mono">
                {r.sku}
              </Text>
            ) : (
              <Text type="secondary" className="text-xs">
                —
              </Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 180,
      render: (category: string) => (
        <Tag color="cyan" className="rounded-full">
          {category}
        </Tag>
      ),
    },
    {
      title: 'Selling Price',
      dataIndex: 'price',
      key: 'price',
      width: 140,
      align: 'right',
      sorter: (a, b) => (a.price ?? 0) - (b.price ?? 0),
      render: (_: number | null, r) => (
        <Text strong style={{ color: '#0f766e' }}>
          {currency(r.price ?? 0)}
        </Text>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Price List
            </Title>
            <Text type="secondary">Product catalog with selling prices.</Text>
          </div>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExportCsv}
            className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]"
          >
            Export CSV
          </Button>
        </div>

        {/* Table card */}
        <Card className="shadow-sm" loading={productsLoading} styles={{ body: { padding: 0 } }}>
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search by name, category or SKU..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
              <Select
                placeholder="All categories"
                allowClear
                value={categoryFilter ?? undefined}
                onChange={(v) => setCategoryFilter(v ?? null)}
                options={categories.map((c) => ({ label: c, value: c }))}
                className="!w-full sm:!w-[200px]"
                size="large"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filtered.length === products.length
                ? `${products.length} item${products.length !== 1 ? 's' : ''}`
                : `${filtered.length} of ${products.length} item${products.length !== 1 ? 's' : ''}`}
            </Text>
          </div>

          <Table<Product>
            columns={columns}
            dataSource={filtered}
            rowKey="id"
            size="middle"
            className="[&_.ant-table]:!text-[14px]"
            pagination={{
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
              showTotal: (total) => `Total ${total} items`,
            }}
            scroll={{ x: 720 }}
          />
        </Card>
      </div>
    </DashboardLayout>
  );
}
