'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Typography,
  Tooltip,
} from 'antd';
import type { TableProps } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ImageUpload from '../../components/ImageUpload';
import { useProducts, type Product } from '../../context/ProductsContext';
import { productImageSrc } from '../../lib/productsApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProductsPage() {
  const { products, productsLoading, addProduct, updateProduct, deleteProduct, units, categoryOptions } =
    useProducts();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [mode, setMode] = useState<'add' | 'edit'>('edit');
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [form] = Form.useForm();

  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter) {
      list = list.filter((p) => p.categoryId === categoryFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, searchText, categoryFilter]);

  const handleOpenEdit = (product: Product) => {
    setMode('edit');
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      categoryId: product.categoryId,
      description: product.description ?? '',
      price: product.price,
      costPrice: product.costPrice ?? undefined,
      sku: product.sku || '',
      unit: product.unit,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      image: product.image ?? null,
    });
    setOpen(true);
  };

  const handleOpenAdd = () => {
    setMode('add');
    setEditingProduct(null);
    form.resetFields();
    form.setFieldsValue({
      unit: units[0] ?? 'units',
      categoryId: categoryOptions[0]?.id,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    setMode('edit');
    form.resetFields();
  };

  const handleSave = () => {
    if (mode === 'edit') {
      if (!editingProduct) return;
    }
    void form.validateFields().then(async (values) => {
      const quantity = Number(values.quantity ?? 0);
      const reorderLevel = Number(values.reorderLevel ?? 0);
      const costRaw = values.costPrice;
      const costPrice =
        costRaw === null || costRaw === undefined || costRaw === ''
          ? null
          : Number(costRaw);
      const trimmedSku =
        values.sku == null || values.sku === '' ? '' : String(values.sku).trim();

      const basePayload = {
        name: values.name as string,
        categoryId: values.categoryId as string,
        description: (values.description as string) ?? '',
        price: Number(values.price ?? 0),
        costPrice,
        unit: values.unit as string,
        quantity,
        reorderLevel,
        image: values.image ?? null,
      };

      try {
        if (mode === 'edit') {
          const prevSku = editingProduct!.sku?.trim() ?? '';
          const skuChanged = trimmedSku !== prevSku;
          await updateProduct(editingProduct!.id, {
            ...basePayload,
            ...(skuChanged ? { sku: trimmedSku === '' ? null : trimmedSku } : {}),
          });
        } else {
          await addProduct({
            ...basePayload,
            sku: trimmedSku === '' ? undefined : trimmedSku,
          });
        }
        handleClose();
      } catch {
        /* message shown in context */
      }
    });
  };

  const handleDelete = (id: string) => {
    Modal.confirm({
      title: 'Delete product',
      content: 'Are you sure you want to delete this product? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteProduct(id),
    });
  };

  const columns: TableProps<Product>['columns'] = [
    {
      title: 'Product',
      key: 'product',
      width: 280,
      render: (_, record) => (
        <Space align="center" size="middle">
          <div className="flex h-12 w-12 flex-shrink-0 overflow-hidden rounded-xl bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageSrc(record.image)}
              alt=""
              className="h-full w-full object-contain p-1"
            />
          </div>
          <div className="min-w-0">
            <Text strong className="block truncate">
              {record.name}
            </Text>
            {record.sku && (
              <Text type="secondary" className="text-xs">
                {record.sku}
              </Text>
            )}
          </div>
        </Space>
      ),
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 140,
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
      width: 120,
      align: 'right',
      sorter: (a, b) => a.price - b.price,
      render: (price: number) => (
        <Text strong style={{ color: '#25395c' }}>
          GHS {price.toFixed(2)}
        </Text>
      ),
    },
    {
      title: 'Cost Price',
      dataIndex: 'costPrice',
      key: 'costPrice',
      width: 120,
      align: 'right',
      render: (costPrice: number | null) => (
        <Text type="secondary">
          {costPrice == null ? '—' : `GHS ${costPrice.toFixed(2)}`}
        </Text>
      ),
    },
    {
      title: 'Stock',
      key: 'stock',
      width: 100,
      render: (_: unknown, record: Product) => (
        <Text type="secondary">{record.quantity} {record.unit}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 120,
      render: (_: unknown, record: Product) => {
        const available = record.quantity > 0;
        return (
          <Tag color={available ? 'green' : 'red'}>
            {available ? 'In stock' : 'Out of stock'}
          </Tag>
        );
      },
    },
    {
      title: 'Actions',
      key: 'action',
      width: 120,
      fixed: 'right' as const,
      render: (_: unknown, record: Product) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpenEdit(record)}
              className="text-[#25395c] hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between gap-4">
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Products
          </Title>
          <div className="flex flex-col items-end gap-1">
            <Text type="secondary" className="text-right">
              Add, edit and manage your product catalog
            </Text>
            <Button
              type="primary"
              onClick={handleOpenAdd}
              className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]"
            >
              Add Product
            </Button>
          </div>
        </div>

        {/* Table card */}
        <Card
          className="shadow-sm"
          loading={productsLoading}
          styles={{
            body: { padding: 0 },
          }}
        >
          {/* Search & filters toolbar */}
          <div className="products-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search by name, category, or SKU..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
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
                options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))}
                className="!w-full sm:!w-[200px]"
                size="large"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filteredProducts.length === products.length
                ? `${products.length} product${products.length !== 1 ? 's' : ''}`
                : `${filteredProducts.length} of ${products.length} product${products.length !== 1 ? 's' : ''}`}
            </Text>
          </div>
          <Table<Product>
            columns={columns}
            dataSource={filteredProducts}
            rowKey="id"
            pagination={{
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} products`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
            size="middle"
            className="[&_.ant-table]:!text-[15px]"
            scroll={{ x: 900 }}
          />
        </Card>
      </div>

      {/* Edit modal only - add new products via Inventory → Add stock item */}
      <Modal
        title={mode === 'edit' ? 'Edit product' : 'Add product'}
        open={open}
        onCancel={handleClose}
        onOk={handleSave}
        okText={mode === 'edit' ? 'Update' : 'Create'}
        cancelText="Cancel"
        width={520}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        okButtonProps={{
          className: '!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]',
        }}
      >
        <Form
          form={form}
          layout="vertical"
          className="mt-4"
          requiredMark={false}
        >
          <Form.Item label="Product image" name="image">
            <ImageUpload />
          </Form.Item>

          <Form.Item
            name="name"
            label="Product name"
            rules={[{ required: true, message: 'Please enter product name' }]}
          >
            <Input placeholder="e.g. Milk 1L" size="large" />
          </Form.Item>

          <Form.Item
            name="categoryId"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="Select category"
              size="large"
              options={categoryOptions.map((c) => ({ label: c.name, value: c.id }))}
            />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Optional product description" />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              name="price"
              label="Selling price (GHS)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber
                min={0}
                step={0.01}
                className="w-full"
                size="large"
                addonBefore="GHS"
              />
            </Form.Item>
            <Form.Item
              name="costPrice"
              label="Cost price (GHS)"
            >
              <InputNumber
                min={0}
                step={0.01}
                className="w-full"
                size="large"
                addonBefore="GHS"
              />
            </Form.Item>
          </div>

          <Form.Item name="unit" label="Unit" rules={[{ required: true, message: 'Select unit' }]}>
            <Select
              placeholder="Select unit"
              size="large"
              options={units.map((u) => ({ label: u, value: u }))}
            />
          </Form.Item>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item name="quantity" label="Stock quantity" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} className="w-full" size="large" />
            </Form.Item>
            <Form.Item name="reorderLevel" label="Reorder at (alert when below)" rules={[{ required: true, message: 'Required' }]}>
              <InputNumber min={0} className="w-full" size="large" />
            </Form.Item>
          </div>

          <Form.Item name="sku" label="SKU / Barcode (optional)">
            <Input placeholder="e.g. MLK-001" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
