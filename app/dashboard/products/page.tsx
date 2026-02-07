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
  PictureOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ImageUpload from '../../components/ImageUpload';
import { useAuth } from '../../context/AuthContext';
import { useProducts, type Product } from '../../context/ProductsContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function ProductsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { products, updateProduct, deleteProduct, categories } = useProducts();
  const [open, setOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [form] = Form.useForm();

  const filteredProducts = useMemo(() => {
    let list = products;
    if (categoryFilter) {
      list = list.filter((p) => p.category === categoryFilter);
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
    if (!isAdmin) return;
    setEditingProduct(product);
    form.setFieldsValue({
      name: product.name,
      category: product.category,
      description: '',
      price: product.price,
      costPrice: product.costPrice,
      sku: product.sku || '',
      unit: product.unit,
      quantity: product.quantity,
      reorderLevel: product.reorderLevel,
      image: product.image ?? null,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingProduct(null);
    form.resetFields();
  };

  const handleSave = () => {
    if (!editingProduct) return;
    form.validateFields().then((values) => {
      const quantity = Number(values.quantity ?? 0);
      const reorderLevel = Number(values.reorderLevel ?? 0);
      updateProduct(editingProduct.id, {
        name: values.name,
        category: values.category,
        price: values.price,
        costPrice: values.costPrice,
        sku: values.sku,
        unit: values.unit,
        quantity,
        reorderLevel,
        image: values.image ?? null,
      });
      handleClose();
    });
  };

  const handleDelete = (id: number) => {
    if (!isAdmin) return;
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
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
            <PictureOutlined className="text-xl" />
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
        <Text strong style={{ color: '#059669' }}>
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
      render: (costPrice: number) => (
        <Text type="secondary">GHS {costPrice.toFixed(2)}</Text>
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
    ...(isAdmin
      ? [
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
                    className="text-teal-600 hover:!text-teal-700 hover:!bg-teal-50"
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
        ]
      : []),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div>
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Products
          </Title>
          <Text type="secondary">
            {isAdmin ? 'Edit products and prices; add new items from Inventory → Add stock item' : 'Browse products and prices'}
          </Text>
        </div>

        {/* Table card */}
        <Card
          className="shadow-sm"
          styles={{
            body: { padding: 0 },
          }}
        >
          {/* Search & filters toolbar */}
          <div className="products-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-80 sm:min-w-[280px]">
                <Input
                  placeholder="Search by name, category or SKU..."
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
                options={categories.map((c) => ({ label: c, value: c }))}
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
        title="Edit product"
        open={open}
        onCancel={handleClose}
        onOk={handleSave}
        okText="Update"
        cancelText="Cancel"
        width={520}
        style={{ maxWidth: '95vw' }}
        destroyOnClose
        okButtonProps={{
          className: '!bg-teal-600 !border-teal-600 hover:!bg-teal-700',
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
            name="category"
            label="Category"
            rules={[{ required: true, message: 'Please select a category' }]}
          >
            <Select
              placeholder="Select category"
              size="large"
              options={categories.map((c) => ({ label: c, value: c }))}
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
          </div>

          <Form.Item name="unit" label="Unit" rules={[{ required: true, message: 'Select unit' }]}>
            <Select
              placeholder="Select unit"
              size="large"
              options={[
                { label: 'units', value: 'units' },
                { label: 'kg', value: 'kg' },
                { label: 'L', value: 'L' },
                { label: 'pack', value: 'pack' },
                { label: 'boxes', value: 'boxes' },
                { label: 'pieces', value: 'pieces' },
              ]}
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

          <Form.Item name="sku" label="SKU / Barcode">
            <Input placeholder="e.g. MLK-001" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
