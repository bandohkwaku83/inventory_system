'use client';

import React, { useState } from 'react';
import {
  Card,
  Typography,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Popconfirm,
  message,
} from 'antd';
import type { TableProps } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useSettings, type ProductCategory } from '../../context/SettingsContext';
import { useProducts } from '../../context/ProductsContext';

const { Title, Text } = Typography;

export default function CategoriesPage() {
  const { categories, addCategory, updateCategory, deleteCategory } = useSettings();
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProductCategory | null>(null);
  const [form] = Form.useForm();

  const productCountByCategory = (cat: ProductCategory) =>
    products.filter(
      (p) =>
        p.categoryId === cat.id ||
        p.category.toLowerCase() === cat.name.toLowerCase()
    ).length;

  const handleOpen = (cat?: ProductCategory) => {
    if (cat) {
      setEditing(cat);
      form.setFieldsValue({ name: cat.name });
    } else {
      setEditing(null);
      form.resetFields();
    }
    setOpen(true);
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    const name = (values.name as string).trim();
    try {
      if (editing) {
        await updateCategory(editing.id, name);
      } else {
        await addCategory(name);
      }
      setOpen(false);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not save category');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteCategory(id);
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Could not delete category');
    }
  };

  const columns: TableProps<ProductCategory>['columns'] = [
    {
      title: 'Category',
      dataIndex: 'name',
      key: 'name',
      render: (v: string) => <span className="font-semibold text-slate-800">{v}</span>,
    },
    {
      title: 'Products',
      key: 'count',
      width: 120,
      align: 'center',
      render: (_: unknown, r: ProductCategory) => (
        <span className="text-slate-600">{productCountByCategory(r)}</span>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 140,
      render: (_: unknown, r: ProductCategory) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => handleOpen(r)} />
          <Popconfirm
            title="Delete this category?"
            description="Products in this category are not deleted."
            onConfirm={() => void handleDelete(r.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Product Categories
            </Title>
            <Text type="secondary">
              Organize inventory by section — e.g. Lighting, Sanitary Ware. Assign cashiers to categories in Users.
            </Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>
            Add category
          </Button>
        </div>

        <Card className="shadow-sm" styles={{ body: { padding: 0 } }}>
          <Table<ProductCategory>
            rowKey="id"
            columns={columns}
            dataSource={categories}
            pagination={{
              showSizeChanger: true,
              showTotal: (total, range) => {
                const page = Math.ceil(range[1] / (range[1] - range[0] + 1));
                const pages = Math.max(1, Math.ceil(total / (range[1] - range[0] + 1)));
                return `Page ${page} of ${pages} · Total ${total} categories`;
              },
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
            size="middle"
          />
        </Card>
      </div>

      <Modal
        title={editing ? 'Edit category' : 'Add category'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void handleSave()}
        okText={editing ? 'Update' : 'Add'}
        destroyOnHidden
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Category name"
            rules={[{ required: true, message: 'Enter a category name' }]}
          >
            <Input placeholder="e.g. Lighting" size="large" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}
