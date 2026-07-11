'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Input,
  type InputRef,
  Button,
  InputNumber,
  Modal,
  message,
} from 'antd';
import {
  PlusOutlined,
  MinusOutlined,
  DeleteOutlined,
  PrinterOutlined,
  UserOutlined,
  SearchOutlined,
  ClearOutlined,
  WalletOutlined,
  MobileOutlined,
  TagOutlined,
  ScanOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import DashboardLayout from '../../components/DashboardLayout';
import ReceiptDocument from '../../components/ReceiptDocument';
import { useProducts, type Product } from '../../context/ProductsContext';
import { useSales } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';

type PaymentMethod = 'Cash' | 'Mobile Money';

interface CartLine {
  id: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
  stock: number;
}

const currency = (v: number) => `GHS ${v.toFixed(2)}`;

const parseScan = (
  raw: string
): { quantity: number; query: string } => {
  const trimmed = raw.trim();
  if (!trimmed) return { quantity: 1, query: '' };
  const starMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*[*xX]\s*(.+)$/);
  if (starMatch) {
    return { quantity: Number(starMatch[1]) || 1, query: starMatch[2].trim() };
  }
  const spaceMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s+(.+)$/);
  if (spaceMatch) {
    return { quantity: Number(spaceMatch[1]) || 1, query: spaceMatch[2].trim() };
  }
  return { quantity: 1, query: trimmed };
};

const findProduct = (products: Product[], query: string): Product | undefined => {
  if (!query) return undefined;
  const q = query.toLowerCase();
  return (
    products.find((p) => p.sku && p.sku.toLowerCase() === q) ??
    products.find((p) => p.sku && p.sku.toLowerCase().includes(q)) ??
    products.find((p) => p.name.toLowerCase() === q) ??
    products.find((p) => p.name.toLowerCase().includes(q))
  );
};

export default function SalesPage() {
  const { visibleProducts, deductQuantities } = useProducts();
  const { addSale } = useSales();
  const { user } = useAuth();
  const products = visibleProducts;
  const scanRef = useRef<InputRef>(null);

  const [scan, setScan] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);

  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [cashTendered, setCashTendered] = useState<number>(0);

  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState('');
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<{
    id: string;
    date: string;
    time: string;
    customer: string;
    servedByName?: string;
    paymentMethod: PaymentMethod;
    discount: number;
    total: number;
    subtotal: number;
    cashTendered?: number;
    change?: number;
    items: CartLine[];
  } | null>(null);

  const [messageApi, messageCtx] = message.useMessage();
  const [clock, setClock] = useState('');

  const focusScanner = useCallback(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    focusScanner();
  }, [focusScanner]);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleString('en-GB', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  const addProductToCart = useCallback(
    (product: Product, qty = 1) => {
      if (product.quantity <= 0) {
        messageApi.warning(`${product.name} is out of stock`);
        return;
      }
      setCart((prev) => {
        const existing = prev.find((l) => l.id === product.id);
        if (existing) {
          const next = Math.min(existing.quantity + qty, product.quantity);
          if (next === existing.quantity) {
            messageApi.warning(`Only ${product.quantity} ${product.name} in stock`);
            return prev;
          }
          setLastAddedId(product.id);
          return prev.map((l) =>
            l.id === product.id ? { ...l, quantity: next } : l
          );
        }
        const startQty = Math.min(qty, product.quantity);
        if (qty > product.quantity) {
          messageApi.warning(`Only ${product.quantity} ${product.name} in stock`);
        }
        setLastAddedId(product.id);
        return [
          ...prev,
          {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            quantity: startQty,
            stock: product.quantity,
          },
        ];
      });
    },
    [messageApi]
  );

  const handleScan = () => {
    const { quantity, query } = parseScan(scan);
    if (!query) return;
    const product = findProduct(products, query);
    if (!product) {
      messageApi.error(`No product matches “${query}”`);
      return;
    }
    addProductToCart(product, Math.max(1, Math.floor(quantity)));
    setScan('');
    focusScanner();
  };

  const bumpLine = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => {
          if (l.id !== id) return l;
          const next = l.quantity + delta;
          if (next < 1) return null;
          if (next > l.stock) return l;
          return { ...l, quantity: next };
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const setLineQuantity = (id: string, qty: number) => {
    setCart((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, quantity: Math.max(1, Math.min(l.stock, Math.floor(qty || 1))) }
          : l
      )
    );
  };

  const removeLine = (id: string) => {
    setCart((prev) => prev.filter((l) => l.id !== id));
    if (lastAddedId === id) setLastAddedId(null);
  };

  const clearCart = () => {
    setCart([]);
    setDiscount(0);
    setDiscountEnabled(false);
    setCashTendered(0);
    setCustomerName('');
    setLastAddedId(null);
    setPaymentOpen(false);
    focusScanner();
  };

  const subtotal = cart.reduce((s, l) => s + l.price * l.quantity, 0);
  const appliedDiscount = discountEnabled ? Math.min(discount || 0, subtotal) : 0;
  const total = Math.max(0, subtotal - appliedDiscount);
  const change = (cashTendered || 0) - total;
  const cartQty = cart.reduce((s, l) => s + l.quantity, 0);

  const suggestCashButtons = useMemo(() => {
    if (total <= 0) return [];
    const values = new Set<number>();
    values.add(Math.ceil(total));
    values.add(total);
    [10, 20, 50, 100, 200, 500].forEach((n) => {
      if (n >= total) values.add(n);
    });
    return Array.from(values)
      .sort((a, b) => a - b)
      .slice(0, 6);
  }, [total]);

  const canCompleteSale =
    cart.length > 0 && (paymentMethod !== 'Cash' || change >= 0);

  const openPayment = useCallback(() => {
    if (cart.length === 0) {
      messageApi.warning('Scan or add items before payment');
      return;
    }
    setCashTendered(paymentMethod === 'Cash' ? Math.ceil(total) : 0);
    setPaymentOpen(true);
  }, [cart.length, messageApi, paymentMethod, total]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F12') {
        e.preventDefault();
        openPayment();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPayment]);

  const completeSale = async () => {
    if (!canCompleteSale) return;
    try {
      await deductQuantities(cart.map((l) => ({ id: l.id, quantity: l.quantity })));
    } catch {
      return;
    }
    const now = new Date();
    const record = {
      id: `R-${now.getTime().toString(36).toUpperCase()}`,
      timestamp: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      customer: customerName || 'Walk-in',
      servedBy: user?.id,
      servedByName: user?.name,
      paymentMethod,
      discount: appliedDiscount,
      subtotal,
      total,
      cashTendered: paymentMethod === 'Cash' ? cashTendered : undefined,
      change: paymentMethod === 'Cash' ? change : undefined,
      items: cart.map((l) => ({
        id: l.id,
        name: l.name,
        sku: l.sku,
        price: l.price,
        quantity: l.quantity,
      })),
    };
    addSale(record);
    setReceiptData({
      id: record.id,
      date: record.date,
      time: record.time,
      customer: customerName,
      servedByName: user?.name,
      paymentMethod,
      discount: appliedDiscount,
      subtotal,
      total,
      cashTendered: record.cashTendered,
      change: record.change,
      items: [...cart],
    });
    setPaymentOpen(false);
    setReceiptOpen(true);
  };

  const closeReceipt = () => {
    setReceiptOpen(false);
    setReceiptData(null);
    clearCart();
  };

  return (
    <DashboardLayout>
      {messageCtx}
      <div className="pos-register flex min-h-[calc(100dvh-7rem)] flex-col overflow-hidden rounded-lg border border-slate-300 bg-slate-100 shadow-sm lg:min-h-[calc(100dvh-5.5rem)]">

        {/* Register toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 bg-[#1e3a5f] px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <Input
              ref={scanRef}
              size="large"
              prefix={<BarcodeOutlined className="text-lg text-[#1e3a5f]" />}
              placeholder="Scan barcode or enter SKU / PLU — press Enter"
              value={scan}
              onChange={(e) => setScan(e.target.value)}
              onPressEnter={handleScan}
              autoFocus
              allowClear
              className="!h-11 !rounded !border-0 !bg-white !shadow-sm [&_input]:!text-[15px] [&_input]:!font-semibold"
            />
          </div>
          <ToolbarButton icon={<SearchOutlined />} label="Find item" onClick={() => setFindOpen(true)} />
          <ToolbarButton
            icon={<TagOutlined />}
            label={discountEnabled ? 'Discount on' : 'Discount'}
            active={discountEnabled}
            onClick={() => {
              const next = !discountEnabled;
              setDiscountEnabled(next);
              if (!next) setDiscount(0);
            }}
          />
          <ToolbarButton
            icon={<ClearOutlined />}
            label="Clear sale"
            danger
            disabled={cart.length === 0}
            onClick={clearCart}
          />
        </div>

        {user?.role === 'cashier' && user.categoryIds.length > 0 && (
          <div className="border-b border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-800">
            Category-restricted register — only your assigned product categories are available.
          </div>
        )}

        {/* Transaction table */}
        <div className="min-h-0 flex-1 overflow-auto bg-white">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="bg-[#2c5282] text-[11px] font-bold uppercase tracking-wide text-white">
                <th className="w-12 border-r border-[#1e3a5f]/40 py-2.5 pl-4 text-left">#</th>
                <th className="border-r border-[#1e3a5f]/40 py-2.5 text-left">Description</th>
                <th className="w-24 border-r border-[#1e3a5f]/40 py-2.5 text-center">Qty</th>
                <th className="w-28 border-r border-[#1e3a5f]/40 py-2.5 text-right pr-3">Unit price</th>
                <th className="w-32 py-2.5 pr-4 text-right">Amount</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {cart.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-24 text-center">
                    <BarcodeOutlined className="mb-3 text-4xl text-slate-300" />
                    <p className="text-base font-semibold text-slate-600">Waiting for scan</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Scan items at the register. Use <strong>Find item</strong> if barcode fails.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Tip: type <span className="font-mono">3*SKU</span> for quantity
                    </p>
                  </td>
                </tr>
              ) : (
                cart.map((line, idx) => {
                  const isLast = line.id === lastAddedId;
                  return (
                    <tr
                      key={line.id}
                      className={`border-b border-slate-200 ${
                        isLast
                          ? 'bg-amber-50'
                          : idx % 2 === 0
                          ? 'bg-white'
                          : 'bg-slate-50/80'
                      }`}
                    >
                      <td className="py-2.5 pl-4 font-mono text-xs text-slate-500">
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-slate-800">{line.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500">
                          {line.sku && (
                            <span className="font-mono text-slate-600">{line.sku}</span>
                          )}
                          <span>Stock: {line.stock}</span>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <div className="mx-auto flex w-fit items-center border border-slate-300 bg-white">
                          <button
                            type="button"
                            onClick={() => bumpLine(line.id, -1)}
                            className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100"
                            aria-label="Decrease"
                          >
                            <MinusOutlined className="text-xs" />
                          </button>
                          <InputNumber
                            size="small"
                            min={1}
                            max={line.stock}
                            value={line.quantity}
                            onChange={(v) =>
                              setLineQuantity(line.id, typeof v === 'number' ? v : 1)
                            }
                            controls={false}
                            variant="borderless"
                            className="!w-10 [&_.ant-input-number-input]:!text-center [&_.ant-input-number-input]:!font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => bumpLine(line.id, 1)}
                            disabled={line.quantity >= line.stock}
                            className="flex h-8 w-8 items-center justify-center text-slate-600 hover:bg-slate-100 disabled:text-slate-300"
                            aria-label="Increase"
                          >
                            <PlusOutlined className="text-xs" />
                          </button>
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono text-slate-700">
                        {currency(line.price)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-mono text-[15px] font-bold text-slate-900">
                        {currency(line.price * line.quantity)}
                      </td>
                      <td className="py-2.5 pr-2">
                        <button
                          type="button"
                          onClick={() => removeLine(line.id)}
                          className="flex h-7 w-7 items-center justify-center text-slate-400 hover:text-red-600"
                          aria-label="Remove line"
                        >
                          <DeleteOutlined className="text-xs" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Discount row (when enabled) */}
        {discountEnabled && (
          <div className="flex flex-wrap items-center gap-3 border-t border-slate-300 bg-slate-50 px-4 py-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Sale discount
            </span>
            <InputNumber
              min={0}
              max={subtotal}
              step={0.5}
              value={discount}
              onChange={(v) => setDiscount(typeof v === 'number' ? v : 0)}
              addonBefore="GHS"
              className="!w-40"
            />
            <span className="text-sm text-slate-500">
              Max {currency(subtotal)}
            </span>
          </div>
        )}

        {/* Register footer — totals + pay */}
        <div className="border-t-2 border-[#1e3a5f] bg-[#1e3a5f] text-white">
          <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <span>
                Lines: <strong>{cart.length}</strong>
              </span>
              <span>
                Units: <strong>{cartQty}</strong>
              </span>
              <span>
                Subtotal: <strong className="font-mono">{currency(subtotal)}</strong>
              </span>
              {appliedDiscount > 0 && (
                <span className="text-amber-200">
                  Discount: <strong className="font-mono">− {currency(appliedDiscount)}</strong>
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-semibold uppercase tracking-widest text-blue-200">
                  Amount due
                </div>
                <div className="font-mono text-3xl font-bold leading-none tracking-tight">
                  {currency(total)}
                </div>
              </div>
              <Button
                type="primary"
                size="large"
                disabled={cart.length === 0}
                onClick={openPayment}
                className="!h-12 !min-w-[140px] !rounded !border-0 !bg-white !px-6 !text-base !font-bold uppercase tracking-wide !text-[#1e3a5f] hover:!bg-slate-100 hover:!text-[#1e3a5f] disabled:!bg-white/40 disabled:!text-white/70"
              >
                Pay / F12
              </Button>
            </div>
          </div>

          {/* Status bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 bg-[#152a45] px-4 py-1.5 text-[11px] text-blue-200/80">
            <span>Register: Sales (POS)</span>
            <span>Cashier: {user?.name ?? user?.email ?? '—'}</span>
            <span className="flex items-center gap-1">
              <ScanOutlined />
              Scanner ready
            </span>
            <span>{clock}</span>
          </div>
        </div>
      </div>

      {/* Payment modal — Melcom-style settle screen */}
      <Modal
        title={null}
        open={paymentOpen}
        onCancel={() => {
          setPaymentOpen(false);
          focusScanner();
        }}
        footer={null}
        width={480}
        destroyOnHidden
        className="pos-payment-modal"
        styles={{ body: { padding: 0 } }}
      >
        <div className="overflow-hidden rounded-lg">
          <div className="bg-[#1e3a5f] px-5 py-4 text-white">
            <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">
              Settle transaction
            </p>
            <p className="mt-1 font-mono text-4xl font-bold">{currency(total)}</p>
            <p className="mt-1 text-sm text-blue-200">
              {cartQty} unit{cartQty !== 1 ? 's' : ''} · {cart.length} line
              {cart.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Customer
              </label>
              <Input
                prefix={<UserOutlined className="text-slate-400" />}
                placeholder="Walk-in customer"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                size="large"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Payment method
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(['Cash', 'Mobile Money'] as PaymentMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method !== 'Cash') setCashTendered(0);
                      else setCashTendered(Math.ceil(total));
                    }}
                    className={`flex items-center justify-center gap-2 rounded border-2 py-3 text-sm font-bold transition-colors ${
                      paymentMethod === method
                        ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    {method === 'Cash' ? <WalletOutlined /> : <MobileOutlined />}
                    {method}
                  </button>
                ))}
              </div>
            </div>

            {paymentMethod === 'Cash' && (
              <div className="rounded border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cash tendered
                </p>
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {suggestCashButtons.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashTendered(amount)}
                      className={`rounded border px-3 py-1.5 font-mono text-sm font-semibold ${
                        cashTendered === amount
                          ? 'border-[#1e3a5f] bg-[#1e3a5f] text-white'
                          : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                      }`}
                    >
                      {currency(amount)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-400">
                      Received
                    </label>
                    <InputNumber
                      min={0}
                      step={1}
                      value={cashTendered}
                      onChange={(v) => setCashTendered(typeof v === 'number' ? v : 0)}
                      className="w-full"
                      size="large"
                      addonBefore="GHS"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-medium text-slate-400">
                      Change
                    </label>
                    <div
                      className={`flex h-10 items-center justify-end rounded border px-3 font-mono text-lg font-bold ${
                        change < 0
                          ? 'border-red-300 bg-red-50 text-red-600'
                          : 'border-[#25395c]/35 bg-[#25395c]/10 text-[#25395c]'
                      }`}
                    >
                      {change < 0 ? 'Short' : currency(change)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button
                size="large"
                onClick={() => {
                  setPaymentOpen(false);
                  focusScanner();
                }}
              >
                Back
              </Button>
              <Button
                type="primary"
                size="large"
                icon={<PrinterOutlined />}
                disabled={!canCompleteSale}
                onClick={completeSale}
                className="!bg-[#25395c] !font-bold hover:!bg-[#1a2842] disabled:!opacity-50"
              >
                Complete &amp; print
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* Find item (PLU lookup) */}
      <Modal
        title="Find item (PLU lookup)"
        open={findOpen}
        onCancel={() => {
          setFindOpen(false);
          setFindQuery('');
          focusScanner();
        }}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setFindOpen(false);
              setFindQuery('');
              focusScanner();
            }}
            className="!bg-[#1e3a5f] hover:!bg-[#2c5282]"
          >
            Return to register
          </Button>
        }
        width={600}
        destroyOnHidden
      >
        <div className="space-y-3">
          <Input
            autoFocus
            size="large"
            allowClear
            prefix={<SearchOutlined className="text-slate-400" />}
            placeholder="Search by name, category or SKU…"
            value={findQuery}
            onChange={(e) => setFindQuery(e.target.value)}
            onPressEnter={() => {
              const q = findQuery.trim().toLowerCase();
              const match = products.find(
                (p) =>
                  p.quantity > 0 &&
                  (p.name.toLowerCase().includes(q) ||
                    (p.sku ?? '').toLowerCase().includes(q))
              );
              if (match) addProductToCart(match, 1);
            }}
          />

          <div className="max-h-[400px] overflow-y-auto border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-[11px] font-bold uppercase text-slate-600">
                  <th className="py-2 pl-3 text-left">Description</th>
                  <th className="w-24 py-2 text-left">SKU</th>
                  <th className="w-20 py-2 text-center">Stock</th>
                  <th className="w-28 py-2 pr-3 text-right">Price</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const q = findQuery.trim().toLowerCase();
                  const list = products.filter((p) => {
                    if (p.quantity <= 0) return false;
                    if (!q) return true;
                    return (
                      p.name.toLowerCase().includes(q) ||
                      (p.sku ?? '').toLowerCase().includes(q) ||
                      (p.category ?? '').toLowerCase().includes(q)
                    );
                  });

                  if (list.length === 0) {
                    return (
                      <tr>
                        <td colSpan={5} className="py-10 text-center text-slate-500">
                          No products match{q ? ` "${findQuery}"` : ''}.
                        </td>
                      </tr>
                    );
                  }

                  return list.map((p, idx) => {
                    const inCart = cart.find((l) => l.id === p.id);
                    const inCartQty = inCart?.quantity ?? 0;
                    const atMax = inCartQty >= p.quantity;
                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-slate-100 ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                        }`}
                      >
                        <td className="py-2 pl-3">
                          <div className="font-semibold text-slate-800">{p.name}</div>
                          {p.category && (
                            <div className="text-[11px] text-slate-500">{p.category}</div>
                          )}
                        </td>
                        <td className="py-2 font-mono text-xs text-slate-600">
                          {p.sku ?? '—'}
                        </td>
                        <td className="py-2 text-center text-slate-600">{p.quantity}</td>
                        <td className="py-2 pr-3 text-right font-mono font-semibold">
                          {currency(p.price)}
                        </td>
                        <td className="py-2 pr-2">
                          <Button
                            type="primary"
                            size="small"
                            icon={<PlusOutlined />}
                            disabled={atMax}
                            onClick={() => addProductToCart(p, 1)}
                            className="!bg-[#1e3a5f] hover:!bg-[#2c5282]"
                          >
                            Add
                          </Button>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* Receipt */}
      <Modal
        title="Receipt"
        open={receiptOpen}
        onCancel={closeReceipt}
        footer={null}
        width={400}
        style={{ maxWidth: '95vw' }}
        destroyOnHidden
        className="receipt-modal"
      >
        {receiptData && (
          <>
            <ReceiptDocument
              type="sale"
              id={receiptData.id}
              date={receiptData.date}
              time={receiptData.time}
              customer={receiptData.customer || 'Walk-in'}
              servedByName={receiptData.servedByName}
              paymentMethod={receiptData.paymentMethod}
              items={receiptData.items}
              subtotal={receiptData.subtotal}
              discount={receiptData.discount}
              total={receiptData.total}
              cashTendered={receiptData.cashTendered}
              change={receiptData.change}
            />
            <div className="no-print mt-6 flex gap-2">
              <Button
                type="primary"
                icon={<PrinterOutlined />}
                onClick={() => window.print()}
                className="flex-1 !bg-[#1e3a5f] hover:!bg-[#2c5282]"
              >
                Print receipt
              </Button>
              <Button onClick={closeReceipt}>New sale</Button>
            </div>
          </>
        )}
      </Modal>
    </DashboardLayout>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  active,
  danger,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex h-11 shrink-0 items-center gap-2 rounded px-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active
          ? 'bg-amber-400 text-[#1e3a5f]'
          : danger
          ? 'bg-white/10 text-white hover:bg-red-500/80'
          : 'bg-white/10 text-white hover:bg-white/20'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
