'use client';

import React, { useState, useMemo } from 'react';
import {
  Card,
  Typography,
  Table,
  Space,
  Tag,
  Button,
  Input,
  Modal,
  Form,
  Select,
  InputNumber,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { TableProps, UploadProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  InboxOutlined,
  UploadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useActionLoader } from '../../components/LoaderProvider';
import ImageUpload from '../../components/ImageUpload';
import { useProducts, getStockStatus, type Product } from '../../context/ProductsContext';
import { productImageSrc } from '../../lib/productsApi';
import { useSettings, findCategoryByName } from '../../context/SettingsContext';
import { parseProductSpreadsheet, downloadProductTemplate } from '../../lib/spreadsheetImport';
import { normalizeSkuInput, skuFieldRules, SKU_MAX_LENGTH } from '../../lib/sku';

const { Title, Text } = Typography;

export default function InventoryPage() {
  const { runWithLoader } = useActionLoader();
  const {
    products,
    productsLoading,
    addProduct,
    updateProduct,
    deleteProduct,
    refreshProducts,
    units,
    categories,
    categoryOptions,
  } = useProducts();
  const { addCategory } = useSettings();
  const [open, setOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form] = Form.useForm();

  const filteredItems = useMemo(() => {
    let list = products;
    if (statusFilter) {
      list = list.filter((i) => getStockStatus(i.quantity, i.reorderLevel) === statusFilter);
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          i.category.toLowerCase().includes(q) ||
          (i.sku && i.sku.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, searchText, statusFilter]);

  const importRows = async (file: File) => {
    setImporting(true);
    try {
      await runWithLoader(async () => {
        const rows = await parseProductSpreadsheet(file);
        if (rows.length === 0) {
          message.error('No product rows found in file');
          return;
        }

        // Cache category name → id for this import so we don't re-POST the same category.
        const categoryCache = new Map<string, string>(
          categoryOptions.map((c) => [c.name.trim().toLowerCase(), c.id])
        );

        const resolveCategoryId = async (categoryName: string): Promise<string | null> => {
          const key = categoryName.trim().toLowerCase();
          const cached = categoryCache.get(key);
          if (cached) return cached;

          const match =
            categoryOptions.find((c) => c.name.toLowerCase() === key) ??
            findCategoryByName(
              categoryOptions.map((c) => ({ id: c.id, name: c.name })),
              categoryName
            );
          if (match) {
            categoryCache.set(key, match.id);
            return match.id;
          }

          const created = await addCategory(categoryName);
          categoryCache.set(key, created.id);
          categoryCache.set(created.name.trim().toLowerCase(), created.id);
          return created.id;
        };

        let imported = 0;
        let failed = 0;
        const failureSamples: string[] = [];

        for (const row of rows) {
          const categoryName = row.category.trim() || 'General';
          let categoryId: string | null = null;
          try {
            categoryId = await resolveCategoryId(categoryName);
          } catch (e) {
            failed += 1;
            if (failureSamples.length < 5) {
              failureSamples.push(
                `${row.name}: ${e instanceof Error ? e.message : 'category failed'}`
              );
            }
            continue;
          }
          if (!categoryId) {
            failed += 1;
            if (failureSamples.length < 5) {
              failureSamples.push(`${row.name}: could not resolve category "${categoryName}"`);
            }
            continue;
          }

          try {
            await addProduct(
              {
                name: row.name,
                categoryId,
                unit: row.unit || 'units',
                quantity: row.quantity,
                reorderLevel: row.reorderLevel,
                price: row.price,
                costPrice: row.costPrice,
                sku: row.sku,
                description: row.description,
                image: null,
              },
              { quiet: true, skipRefresh: true }
            );
            imported += 1;
          } catch (e) {
            failed += 1;
            if (failureSamples.length < 5) {
              failureSamples.push(
                `${row.name}: ${e instanceof Error ? e.message : 'create failed'}`
              );
            }
          }
        }

        await refreshProducts();
        setImportOpen(false);

        if (imported > 0 && failed === 0) {
          message.success(`Imported ${imported} product${imported === 1 ? '' : 's'}`);
        } else if (imported > 0) {
          message.warning(
            `Imported ${imported}, failed ${failed}. ${failureSamples.join(' · ')}`
          );
        } else {
          message.error(
            `Import failed for all ${failed} rows. ${failureSamples.join(' · ')}`
          );
        }
      });
    } catch (e) {
      message.error(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  const handleImportFile: UploadProps['customRequest'] = (options) => {
    const file = options.file as File;
    void importRows(file).finally(() => options.onSuccess?.(undefined));
  };

  const handleOpen = (item?: Product) => {
    if (item) {
      setEditingItem(item);
      form.setFieldsValue({
        name: item.name,
        categoryId: item.categoryId,
        price: item.price,
        costPrice: item.costPrice ?? undefined,
        sku: item.sku || '',
        unit: item.unit,
        quantity: item.quantity,
        reorderLevel: item.reorderLevel,
        image: item.image ?? null,
      });
    } else {
      setEditingItem(null);
      form.resetFields();
      form.setFieldsValue({
        unit: units[0] ?? 'units',
        categoryId: categoryOptions[0]?.id,
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingItem(null);
    form.resetFields();
  };

  const handleSave = () => {
    void form.validateFields().then(async (values) => {
      const quantity = Number(values.quantity);
      const reorderLevel = Number(values.reorderLevel);
      const costRaw = values.costPrice;
      const costPrice =
        costRaw === null || costRaw === undefined || costRaw === ''
          ? null
          : Number(costRaw);
      const trimmedSku = normalizeSkuInput(values.sku) ?? '';
      const basePayload = {
        name: values.name as string,
        categoryId: values.categoryId as string,
        price: Number(values.price ?? 0),
        costPrice,
        unit: values.unit as string,
        quantity,
        reorderLevel,
        image: values.image ?? null,
      };
      try {
        if (editingItem) {
          const prevSku = editingItem.sku?.trim() ?? '';
          const skuChanged = trimmedSku !== prevSku;
          await updateProduct(editingItem.id, {
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
        /* message from context */
      }
    });
  };

  const handleDelete = (id: string) => {
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
          <div className="flex h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={productImageSrc(record.image)}
              alt=""
              className="h-full w-full object-contain p-0.5"
            />
          </div>
          <div>
            <Text strong>{record.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">
              {record.category}
            </Text>
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
        <Text strong>
          {quantity} {record.unit}
        </Text>
      ),
    },
    {
      title: 'Minimum stock',
      dataIndex: 'reorderLevel',
      key: 'reorderLevel',
      width: 110,
      align: 'right',
      render: (reorderLevel: number, record) => (
        <Text type="secondary">
          {reorderLevel} {record.unit}
        </Text>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_: unknown, record: Product) => {
        const status = getStockStatus(record.quantity, record.reorderLevel);
        const config = {
          Good: { color: 'green', text: 'In stock' },
          Low: { color: 'orange', text: 'Low stock' },
          Out: { color: 'red', text: 'Out of stock' },
        };
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
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleOpen(record)}
              className="text-[#25395c] hover:!text-[#1a2842] hover:!bg-[#25395c]/10"
            />
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
            <Title level={4} className="!mb-1 !font-bold !text-slate-800">
              Inventory
            </Title>
            <Text type="secondary">
              Add products with photos, bulk import from Excel/CSV, and track stock levels
            </Text>
          </div>
          <Space size="middle" wrap>
            <Button
              size="large"
              icon={<UploadOutlined />}
              onClick={() => setImportOpen(true)}
              className="!border-[#25395c] !text-[#25395c] hover:!border-[#1a2842] hover:!text-[#1a2842]"
            >
              Bulk import
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => handleOpen()}
              className="!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842] hover:!border-[#1a2842]"
            >
              Add product / stock item
            </Button>
          </Space>
        </div>

        <Card className="shadow-sm" loading={productsLoading} styles={{ body: { padding: 0 } }}>
          <div className="inventory-table-toolbar flex flex-col gap-4 border-b border-slate-100 bg-slate-50/60 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3">
              <div className="w-full min-w-0 sm:w-72 sm:min-w-[260px]">
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
            pagination={{
              showSizeChanger: true,
              showTotal: (t) => `Total ${t} items`,
              pageSizeOptions: ['10', '20', '50'],
              defaultPageSize: 10,
            }}
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
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        okButtonProps={{ className: '!bg-[#25395c] !border-[#25395c] hover:!bg-[#1a2842]' }}
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
            <Input placeholder="e.g. LED Bulb 9W" size="large" />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Form.Item
              name="price"
              label="Selling price (GHS)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={0} step={0.01} className="w-full" size="large" prefix="GHS" />
            </Form.Item>
            <Form.Item name="costPrice" label="Cost price (GHS)">
              <InputNumber min={0} step={0.01} className="w-full" size="large" prefix="GHS" />
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
            <Form.Item
              name="quantity"
              label="Stock quantity"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={0} className="w-full" size="large" />
            </Form.Item>
            <Form.Item
              name="reorderLevel"
              label="Minimum stock"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber min={0} className="w-full" size="large" />
            </Form.Item>
          </div>
          <Form.Item
            name="sku"
            label="SKU (optional)"
            rules={skuFieldRules()}
            extra="Letters, numbers, spaces, and symbols allowed. Max 64 characters. Duplicates allowed. Clear to remove."
          >
            <Input
              placeholder="Any code up to 64 characters"
              size="large"
              maxLength={SKU_MAX_LENGTH}
              showCount
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Bulk import products"
        open={importOpen}
        onCancel={() => setImportOpen(false)}
        footer={null}
        width={520}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
      >
        <div className="py-2">
          <Text type="secondary" className="block mb-4">
            Upload an Excel (.xlsx) or CSV file. Columns:{' '}
            <strong>
              SKU/Serial number, Name, Category, unit, quantity, reorder, cost price, selling price
            </strong>
            . SKUs are optional — any characters allowed, max {SKU_MAX_LENGTH}, duplicates allowed.
            The Excel template includes dropdowns for category and unit, plus SKU notes. New
            categories are created automatically if typed in.
          </Text>
          <Button
            icon={<DownloadOutlined />}
            className="mb-4"
            onClick={() => {
              void downloadProductTemplate({ categories, units });
            }}
          >
            Download Excel template
          </Button>
          <Upload.Dragger
            accept=".csv,.xlsx,.xls"
            maxCount={1}
            showUploadList={false}
            disabled={importing}
            customRequest={handleImportFile}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined className="text-4xl text-[#25395c]" />
            </p>
            <p className="ant-upload-text">
              {importing ? 'Importing…' : 'Click or drag Excel / CSV file here'}
            </p>
            <p className="ant-upload-hint">One product per row after the header row</p>
          </Upload.Dragger>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
