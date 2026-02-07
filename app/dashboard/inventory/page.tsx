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
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ImageUpload from '../../components/ImageUpload';
import { useProducts, getStockStatus, type Product } from '../../context/ProductsContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function InventoryPage() {
  const { products, addProduct, updateProduct, deleteProduct, units, categories } = useProducts();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [form] = Form.useForm();

  const filteredItems = useMemo(() => {
    let list = products;
    if (statusFilter) {
      list = list.filter((i) => getStockStatus(i.quantity, i.reorderLevel) === statusFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter((i) => i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    }
    return list;
  }, [products, searchText, statusFilter]);

  const handleOpen = (item?: Product) => {
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({
        name: item.name,
        category: item.category,
        description: '',
        price: item.price,
        costPrice: item.costPrice,
        sku: item.sku || '',
        unit: item.unit,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        image: item.image ?? null,
      });
    } else {
      setEditingItem(null);
      form.resetFields();
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSave = () => {
    form.validateFields().then((values) => {
      const quantity = Number(values.quantity);
      const reorderLevel = Number(values.reorderLevel);
      if (editingItem) {
        updateProduct(editingItem.id, {
          name: values.name,
          category: values.category,
          unit: values.unit,
          quantity,
          reorderLevel,
          price: values.price,
          costPrice: values.costPrice,
          sku: values.sku,
          image: values.image ?? null,
        });
      } else {
        addProduct({
          name: values.name,
          category: values.category,
          unit: values.unit,
          quantity,
          reorderLevel,
          price: values.price ?? 0,
          costPrice: values.costPrice ?? 0,
          sku: values.sku,
          image: values.image ?? null,
        });
      }
      handleClose();
    });
  };

  const handleDelete = (id: number) => {
    Modal.confirm({
      title: 'Delete product',
      content: 'This will remove the item from both Products and Inventory. Continue?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => deleteProduct(id),
    });
  };

  const columns: TableProps<Product>['columns'] = [
    {
      title: 'Item',
      key: 'item',
      width: 220,
      render: (_, record) => (
        <Space align="center" size="middle">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <InboxOutlined className="text-lg" />
          </div>
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">{record.category}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Unit',
      dataIndex: 'unit',
      key: 'unit',
      width: 100,
      render: (unit: string) => <Tag color="cyan">{unit}</Tag>,
    },
    {
      title: 'In stock',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 110,
      align: 'right',
      sorter: (a, b) => a.quantity - b.quantity,
      render: (quantity: number, record) => (
        <Text strong>{quantity} {record.unit}</Text>
      ),
    },
    {
      title: 'Reorder at',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 110,
      align: 'right',
      render: (reorderLevel: number, record) => (
        <Text type="secondary">{reorderLevel} {record.unit}</Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, record: Product) => {
        const status = getStockStatus(record.quantity, record.reorderLevel);
        const config = { Good: { color: 'green', text: 'In stock' }, Low: { color: 'orange', text: 'Low stock' }, Out: { color: 'red', text: 'Out of stock' } };
        return <Tag color={config[status].color}>{config[status].text}</Tag>;
      },
    },
    {
      title: 'Last restocked',
      dataIndex: 'lastRestocked',
      key: 'lastRestocked',
      width: 120,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 110,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button type="text" icon={<EditOutlined />} onClick={() => handleOpen(record)} className="text-teal-600 hover:!text-teal-700 hover:!bg-teal-50" />
          </Tooltip>
          <Tooltip title="Delete">
            <Button type="text" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)} />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">Inventory</Title>
            <Text type="secondary">Add new products and track stock; they appear in Products and POS</Text>
          </div>
          <Button
            type="primary"
            size="large"
            icon={<PlusOutlined />}
            onClick={() => handleOpen()}
            className="!bg-teal-600 !border-teal-600 hover:!bg-teal-700 hover:!border-teal-700"
          >
            Add product / stock item
          </Button>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <div className="inventory-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-72 sm:min-w-[260px]">
                <Input
                  placeholder="Search by name or category..."
                  prefix={<SearchOutlined className="text-slate-400" />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  size="large"
                  className="w-full"
                />
              </div>
              <Select
                placeholder="All statuses"
                allowClear
                value={statusFilter ?? undefined}
                onChange={(v) => setStatusFilter(v ?? null)}
                options={[
                  { label: 'In stock', value: 'Good' },
                  { label: 'Low stock', value: 'Low' },
                  { label: 'Out of stock', value: 'Out' },
                ]}
                className="!w-full sm:!w-[160px]"
                size="large"
              />
            </div>
            <Text type="secondary" className="shrink-0 text-sm">
              {filteredItems.length === products.length
                ? `${products.length} item${products.length !== 1 ? 's' : ''}`
                : `${filteredItems.length} of ${products.length} item${products.length !== 1 ? 's' : ''}`}
            </Text>
          </div>
          <Table<Product>
            columns={columns}
            dataSource={filteredItems}
            rowKey="id"
            pagination={{ showSizeChanger: true, showTotal: (t) => `Total ${t} items`, pageSizeOptions: ['10', '20', '50'], defaultPageSize: 10 }}
            size="middle"
            scroll={{ x: 900 }}
          />
        </Card>
      </div>

      <Modal
        title={editingItem ? 'Edit product / stock' : 'Add product / stock item'}
        open={open}
        onCancel={handleClose}
        onOk={handleSave}
        okText={editingItem ? 'Update' : 'Add product'}
        cancelText="Cancel"
        width={520}
        destroyOnClose
        okButtonProps={{ className: '!bg-teal-600 !border-teal-600 hover:!bg-teal-700' }}
      >
        <Form form={form} layout="vertical" className="mt-4" requiredMark={false}>
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

          <div className="grid grid-cols-2 gap-4">
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
              options={units.map((u) => ({ label: u, value: u }))}
            />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
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
