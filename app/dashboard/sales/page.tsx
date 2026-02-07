'use client';

import React, { useMemo, useState } from 'react';
import {
  Card,
  Input,
  Button,
  InputNumber,
  Select,
  Modal,
  Typography,
  Space,
  Divider,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  ShoppingCartOutlined,
  PrinterOutlined,
  UserOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import { useProducts } from '../../context/ProductsContext';

const { Title, Text } = Typography;

interface CartLine {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export default function SalesPage() {
  const { products, deductQuantities } = useProducts();
  const availableProducts = useMemo(() => products.filter((p) => p.quantity > 0), [products]);
  const [cart, setCart] = useState<CartLine[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState({
    customerName: '',
    paymentMethod: 'Cash',
    discount: 0,
  });
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    date: string;
    time: string;
    customer: string;
    paymentMethod: string;
    discount: number;
    total: number;
    items: CartLine[];
  } | null>(null);

  const selectedProduct = selectedProductId
    ? availableProducts.find((p) => p.id === selectedProductId) ?? null
    : null;

  const addToCart = () => {
    if (!selectedProduct) return;
    const qty = Math.max(1, addQty);
    const existing = cart.find((c) => c.id === selectedProduct.id);
    if (existing) {
      setCart(
        cart.map((c) =>
          c.id === selectedProduct.id ? { ...c, quantity: c.quantity + qty } : c
        )
      );
    } else {
      setCart([
        ...cart,
        {
          id: selectedProduct.id,
          name: selectedProduct.name,
          price: selectedProduct.price,
          quantity: qty,
        },
      ]);
    }
    setSelectedProductId(null);
    setAddQty(1);
  };

  const updateCartQuantity = (id: number, delta: number) => {
    setCart(
      cart
        .map((c) => {
          if (c.id !== id) return c;
          const newQty = c.quantity + delta;
          return newQty < 1 ? null : { ...c, quantity: newQty };
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const removeFromCart = (id: number) => {
    setCart(cart.filter((c) => c.id !== id));
  };

  const clearCart = () => {
    setCart([]);
  };

  const subtotal = cart.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const discount = checkoutData.discount || 0;
  const total = Math.max(0, subtotal - discount);

  const openCheckout = () => setCheckoutOpen(true);
  const closeCheckout = () => setCheckoutOpen(false);

  const handleCompleteSale = () => {
    deductQuantities(cart.map((i) => ({ id: i.id, quantity: i.quantity })));
    const now = new Date();
    const receipt = {
      id: `R-${now.getTime().toString(36).toUpperCase()}`,
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      customer: checkoutData.customerName,
      paymentMethod: checkoutData.paymentMethod,
      discount: checkoutData.discount,
      total,
      items: [...cart],
    };
    setReceiptData(receipt);
    closeCheckout();
    setReceiptModalOpen(true);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  const handleCloseReceipt = () => {
    setReceiptModalOpen(false);
    setReceiptData(null);
    setCart([]);
    setCheckoutData({ customerName: '', paymentMethod: 'Cash', discount: 0 });
    closeCheckout();
  };

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <div className="min-w-0">
          <Title level={4} className="!mb-1 !font-bold !text-slate-800">
            Sales (POS)
          </Title>
          <Text type="secondary" className="block text-sm sm:text-base">Search or select a product, set quantity, add to cart, then checkout</Text>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[1fr,minmax(280px,400px)] min-w-0">
          {/* Add product: search or select */}
          <Card className="shadow-sm" title="Add product">
            <p className="mb-4 text-sm text-slate-500">
              Search or select a product, then set quantity and add to cart.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-3">
              <div className="min-w-0 flex-1">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Product
                </label>
                <Select
                  showSearch
                  placeholder="Search or select product..."
                  value={selectedProductId}
                  onChange={(v) => {
                    setSelectedProductId(v);
                    setAddQty(1);
                  }}
                  optionFilterProp="label"
                  options={availableProducts.map((p) => ({
                    value: p.id,
                    label: `${p.name} — GHS ${p.price.toFixed(2)} (${p.category})`,
                  }))}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  allowClear
                  size="large"
                  className="w-full"
                  notFoundContent="No products found"
                />
              </div>
              <div className="w-full sm:w-28">
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Quantity
                </label>
                <InputNumber
                  min={1}
                  value={addQty}
                  onChange={(v) => setAddQty(v ?? 1)}
                  size="large"
                  className="w-full"
                  disabled={!selectedProduct}
                />
              </div>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={addToCart}
                disabled={!selectedProduct}
                size="large"
                className="!bg-teal-600 hover:!bg-teal-700 w-full sm:w-auto"
              >
                Add to cart
              </Button>
            </div>
            {selectedProduct && (
              <div className="mt-4 rounded-lg border border-teal-100 bg-teal-50/50 p-3">
                <Text type="secondary" className="text-xs">
                  Selected: <strong className="text-slate-800">{selectedProduct.name}</strong> — GHS{' '}
                  {selectedProduct.price.toFixed(2)} each
                </Text>
              </div>
            )}
          </Card>

          {/* Cart & checkout */}
          <div className="lg:sticky lg:top-20">
            <Card
              title={
                <Space>
                  <ShoppingCartOutlined />
                  <span>Cart</span>
                  {cart.length > 0 && (
                    <Text type="secondary">({cart.length} item{cart.length !== 1 ? 's' : ''})</Text>
                  )}
                </Space>
              }
              className="shadow-sm"
              extra={
                cart.length > 0 ? (
                  <Button type="text" danger size="small" onClick={clearCart}>
                    Clear
                  </Button>
                ) : null
              }
            >
              {cart.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <ShoppingCartOutlined className="mb-2 text-3xl" />
                  <p>Cart is empty</p>
                  <p className="text-xs">Search or select a product above and add to cart.</p>
                </div>
              ) : (
                <>
                  <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                    {cart.map((line) => (
                      <div
                        key={line.id}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2"
                      >
                        <div className="min-w-0 flex-1">
                          <Text strong className="block truncate text-slate-800">
                            {line.name}
                          </Text>
                          <Text type="secondary" className="text-xs">
                            GHS {line.price.toFixed(2)} × {line.quantity}
                          </Text>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-1 flex-wrap">
                          <div className="flex items-center gap-0.5">
                            <Button
                              type="text"
                              size="small"
                              icon={<MinusOutlined />}
                              onClick={() => updateCartQuantity(line.id, -1)}
                            />
                            <span className="min-w-[24px] text-center text-sm font-semibold">
                              {line.quantity}
                            </span>
                            <Button
                              type="text"
                              size="small"
                              icon={<PlusOutlined />}
                              onClick={() => updateCartQuantity(line.id, 1)}
                            />
                          </div>
                          <Text strong className="text-emerald-600 sm:w-16 sm:text-right">
                            GHS {(line.price * line.quantity).toFixed(2)}
                          </Text>
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => removeFromCart(line.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <Divider className="!my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <Text type="secondary">Subtotal</Text>
                      <Text>GHS {subtotal.toFixed(2)}</Text>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      type="primary"
                      block
                      size="large"
                      icon={<ShoppingCartOutlined />}
                      onClick={openCheckout}
                      className="!bg-teal-600 hover:!bg-teal-700"
                    >
                      Checkout
                    </Button>
                  </div>
                </>
              )}
            </Card>
          </div>
        </div>
      </div>

      {/* Checkout modal */}
      <Modal
        title="Checkout"
        open={checkoutOpen}
        onCancel={closeCheckout}
        footer={null}
        width={420}
        style={{ maxWidth: '95vw' }}
        destroyOnClose
      >
        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            {cart.map((line) => (
              <div key={line.id} className="flex justify-between text-sm">
                <span className="text-slate-700">
                  {line.name} × {line.quantity}
                </span>
                <span className="font-medium">GHS {(line.price * line.quantity).toFixed(2)}</span>
              </div>
            ))}
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Customer name (optional)</label>
            <Input
              prefix={<UserOutlined className="text-slate-400" />}
              placeholder="Customer name"
              value={checkoutData.customerName}
              onChange={(e) =>
                setCheckoutData({ ...checkoutData, customerName: e.target.value })
              }
              size="large"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Payment method</label>
            <Select
              value={checkoutData.paymentMethod}
              onChange={(v) => setCheckoutData({ ...checkoutData, paymentMethod: v })}
              options={[
                { label: 'Cash', value: 'Cash' },
                { label: 'Mobile Money', value: 'Mobile Money' },
                { label: 'Card', value: 'Card' },
              ]}
              className="w-full"
              size="large"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs text-slate-500">Discount (GHS)</label>
            <InputNumber
              min={0}
              value={checkoutData.discount}
              onChange={(v) => setCheckoutData({ ...checkoutData, discount: v ?? 0 })}
              className="w-full"
              size="large"
              addonBefore="GHS"
            />
          </div>

          <Divider className="!my-2" />

          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-teal-600">GHS {total.toFixed(2)}</span>
          </div>

          <Button
            type="primary"
            block
            size="large"
            icon={<PrinterOutlined />}
            onClick={handleCompleteSale}
            className="!bg-teal-600 hover:!bg-teal-700"
          >
            Complete sale &amp; print receipt
          </Button>
        </div>
      </Modal>

      {/* Receipt modal - printable */}
      <Modal
        title="Receipt"
        open={receiptModalOpen}
        onCancel={handleCloseReceipt}
        footer={null}
        width={400}
        style={{ maxWidth: '95vw' }}
        destroyOnClose
        className="receipt-modal"
      >
        {receiptData && (
          <>
            <div className="receipt-print-area bg-white p-6 text-slate-800" id="receipt-print-area">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold">Inventory System</h2>
                <p className="text-xs text-slate-500">Accra - Ghana</p>
                <p className="text-xs text-slate-500">Tel: +233 XX XXX XXXX</p>
              </div>
              <div className="border-t border-b border-slate-200 py-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Receipt</span>
                  <span className="font-semibold">{receiptData.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span>{receiptData.date} · {receiptData.time}</span>
                </div>
                {receiptData.customer && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Customer</span>
                    <span>{receiptData.customer}</span>
                  </div>
                )}
              </div>
              <div className="my-4">
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">Items</p>
                {receiptData.items.map((line) => (
                  <div key={line.id} className="flex justify-between text-sm py-0.5">
                    <span>{line.name} × {line.quantity} @ GHS {line.price.toFixed(2)}</span>
                    <span className="font-medium">GHS {(line.price * line.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {receiptData.discount > 0 && (
                <div className="flex justify-between text-sm py-0.5">
                  <span className="text-slate-500">Discount</span>
                  <span>- GHS {receiptData.discount.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t-2 border-slate-200 pt-3 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-teal-600">GHS {receiptData.total.toFixed(2)}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">Payment: {receiptData.paymentMethod}</p>
              <p className="mt-6 text-center text-xs text-slate-500">Thank you for your business!</p>
            </div>
            <div className="mt-6 flex gap-2 no-print">
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={handlePrintReceipt}
                className="flex-1 !bg-teal-600 hover:!bg-teal-700"
              >
                Print receipt
              </Button>
              <Button onClick={handleCloseReceipt}>Done</Button>
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}
