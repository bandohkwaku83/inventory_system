'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Input,
  type InputRef,
  Button,
  InputNumber,
  Modal,
  message,
  Space,
  Select,
  Form,
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
import { useRouter, useSearchParams } from 'next/navigation';
import DashboardLayout from '../../components/DashboardLayout';
import ReceiptDocument from '../../components/ReceiptDocument';
import { useProducts, type Product } from '../../context/ProductsContext';
import { useSales, type Sale } from '../../context/SalesContext';
import { useAuth } from '../../context/AuthContext';
import { useSettings } from '../../context/SettingsContext';
import { useCustomers } from '../../context/CustomersContext';

const WALK_IN_VALUE = '__walk_in__';

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

function SalesPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { visibleProducts, refreshProducts } = useProducts();
  const { sales, salesLoading, addSale, updateSale } = useSales();
  const { customers, addCustomer, refreshCustomers } = useCustomers();
  const { user } = useAuth();
  const { posPreferences } = useSettings();
  const products = visibleProducts;
  const scanRef = useRef<InputRef>(null);
  const [completing, setCompleting] = useState(false);
  const [savingPending, setSavingPending] = useState(false);

  const [scan, setScan] = useState('');
  const [cart, setCart] = useState<CartLine[]>([]);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  /** When set, settle/save updates this pending sale instead of creating a new one. */
  const [editingSaleId, setEditingSaleId] = useState<string | null>(null);
  const editHydratedRef = useRef<string | null>(null);

  const [customerId, setCustomerId] = useState<string>(WALK_IN_VALUE);
  const [addCustomerOpen, setAddCustomerOpen] = useState(false);
  const [customerForm] = Form.useForm();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    () => posPreferences.defaultPaymentMethod
  );
  const [discountEnabled, setDiscountEnabled] = useState(
    () => posPreferences.discountsEnabledByDefault
  );
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

  const loadSaleIntoCart = useCallback(
    (sale: Sale) => {
      const lines: CartLine[] = sale.items.map((item) => {
        const product = products.find((p) => p.id === item.id);
        return {
          id: item.id,
          name: item.name,
          sku: item.sku ?? product?.sku,
          price: item.price,
          quantity: item.quantity,
          // Allow at least the parked qty even if live stock is lower (e.g. reserved).
          stock: Math.max(product?.quantity ?? 0, item.quantity),
        };
      });
      setCart(lines);
      setLastAddedId(null);
      if (sale.customerId) {
        setCustomerId(sale.customerId);
      } else {
        const match = customers.find(
          (c) => c.name.toLowerCase() === sale.customer.toLowerCase()
        );
        setCustomerId(match?.id ?? WALK_IN_VALUE);
      }
      setPaymentMethod(sale.paymentMethod);
      if (sale.discount > 0) {
        setDiscountEnabled(true);
        setDiscount(sale.discount);
      } else {
        setDiscountEnabled(false);
        setDiscount(0);
      }
      setCashTendered(0);
      setPaymentOpen(false);
      setEditingSaleId(sale.id);
      messageApi.info(`Editing pending sale ${sale.id} — add or change items, then settle`);
      focusScanner();
    },
    [customers, focusScanner, messageApi, products]
  );

  // Resume a pending sale from Receipts (?edit=receiptId)
  useEffect(() => {
    const editId = searchParams.get('edit');
    if (!editId || salesLoading) return;
    if (editHydratedRef.current === editId) return;

    const sale = sales.find((s) => s.id === editId || s.apiId === editId);
    if (!sale) {
      editHydratedRef.current = editId;
      messageApi.error('Pending sale not found');
      router.replace('/dashboard/sales');
      return;
    }
    if (sale.status !== 'pending') {
      editHydratedRef.current = editId;
      messageApi.warning('Only pending sales can be edited on the register');
      router.replace('/dashboard/sales');
      return;
    }

    editHydratedRef.current = editId;
    loadSaleIntoCart(sale);
    router.replace('/dashboard/sales');
  }, [loadSaleIntoCart, messageApi, router, sales, salesLoading, searchParams]);

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
    setCustomerId(WALK_IN_VALUE);
    setLastAddedId(null);
    setPaymentOpen(false);
    setEditingSaleId(null);
    editHydratedRef.current = null;
    focusScanner();
  };

  const customerName = useMemo(() => {
    if (customerId === WALK_IN_VALUE) return '';
    return customers.find((c) => c.id === customerId)?.name ?? '';
  }, [customerId, customers]);

  const customerOptions = useMemo(
    () => [
      {
        value: WALK_IN_VALUE,
        label: 'Walk-in customer',
      },
      ...customers.map((c) => ({
        value: c.id,
        label: c.city ? `${c.name} · ${c.city}` : c.name,
      })),
    ],
    [customers]
  );

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
    cart.length > 0 &&
    (paymentMethod !== 'Cash' || change >= 0) &&
    (!posPreferences.requireCustomerName ||
      (customerId !== WALK_IN_VALUE && customerName.trim().length > 0));

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

  const handleCreateCustomer = async () => {
    try {
      const vals = await customerForm.validateFields();
      const created = await addCustomer({
        name: vals.name,
        phone: vals.phone,
        location: vals.location,
      });
      setCustomerId(created.id);
      setAddCustomerOpen(false);
      customerForm.resetFields();
      messageApi.success(`Added ${created.name}`);
    } catch (e) {
      if (e && typeof e === 'object' && 'errorFields' in e) return;
      messageApi.error(e instanceof Error ? e.message : 'Could not add customer');
    }
  };

  const salePayloadBase = useCallback(
    () => ({
      customer: customerName || 'Walk-in',
      customerId: customerId === WALK_IN_VALUE ? null : customerId,
      paymentMethod,
      discount: appliedDiscount,
      items: cart.map((l) => ({
        productId: l.id,
        quantity: l.quantity,
        price: l.price,
      })),
    }),
    [appliedDiscount, cart, customerId, customerName, paymentMethod]
  );

  /** Leaving settle without completing always parks the cart as pending. */
  const skipAutoPendingRef = useRef(false);

  const leaveSettleAsPending = async () => {
    if (completing || savingPending) return;
    if (cart.length === 0) {
      setPaymentOpen(false);
      focusScanner();
      return;
    }
    setSavingPending(true);
    try {
      if (editingSaleId) {
        await updateSale(editingSaleId, {
          ...salePayloadBase(),
          status: 'pending',
        });
        messageApi.success('Pending sale updated');
      } else {
        await addSale({ ...salePayloadBase(), status: 'pending' });
        messageApi.success('Sale kept as pending — edit or complete it from Receipts');
      }
      setPaymentOpen(false);
      clearCart();
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Could not save pending sale');
    } finally {
      setSavingPending(false);
    }
  };

  const completeSale = async () => {
    if (!canCompleteSale || completing) return;
    if (
      posPreferences.requireCustomerName &&
      (customerId === WALK_IN_VALUE || !customerName.trim())
    ) {
      messageApi.warning('Select a customer to complete this sale');
      return;
    }
    setCompleting(true);
    try {
      const payload = {
        ...salePayloadBase(),
        cashTendered: paymentMethod === 'Cash' ? cashTendered : undefined,
        status: 'completed' as const,
      };
      const record = editingSaleId
        ? await updateSale(editingSaleId, payload)
        : await addSale(payload);
      try {
        await refreshProducts();
      } catch {
        /* stock already updated server-side */
      }
      try {
        await refreshCustomers();
      } catch {
        /* totals update is best-effort */
      }
      setReceiptData({
        id: record.id,
        date: record.date,
        time: record.time,
        customer: customerName || 'Walk-in',
        servedByName: record.servedByName || user?.name,
        paymentMethod,
        discount: appliedDiscount,
        subtotal,
        total,
        cashTendered: record.cashTendered,
        change: record.change,
        items: [...cart],
      });
      skipAutoPendingRef.current = true;
      setEditingSaleId(null);
      editHydratedRef.current = null;
      setPaymentOpen(false);
      setReceiptOpen(true);
    } catch (e) {
      messageApi.error(e instanceof Error ? e.message : 'Could not complete sale');
    } finally {
      setCompleting(false);
    }
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

        {editingSaleId ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900">
            <span>
              Editing pending sale{' '}
              <span className="font-mono font-semibold">{editingSaleId}</span> — scan or find items
              to add, then settle when ready.
            </span>
            <Button
              size="small"
              onClick={() => {
                clearCart();
                messageApi.info('Edit cancelled');
              }}
            >
              Cancel edit
            </Button>
          </div>
        ) : null}

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
            <Space.Compact className="!w-40">
              <Space.Addon>GHS</Space.Addon>
              <InputNumber
                min={0}
                max={subtotal}
                step={0.5}
                value={discount}
                onChange={(v) => setDiscount(typeof v === 'number' ? v : 0)}
                className="w-full"
              />
            </Space.Compact>
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
          if (skipAutoPendingRef.current) {
            skipAutoPendingRef.current = false;
            focusScanner();
            return;
          }
          void leaveSettleAsPending();
        }}
        footer={null}
        width={480}
        destroyOnHidden
        maskClosable={!completing && !savingPending}
        closable={!completing && !savingPending}
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
              <div className="flex gap-2">
                <Select
                  showSearch
                  size="large"
                  className="min-w-0 flex-1"
                  value={customerId}
                  onChange={setCustomerId}
                  optionFilterProp="label"
                  prefix={<UserOutlined className="text-slate-400" />}
                  options={customerOptions}
                  placeholder="Select customer"
                />
                <Button
                  size="large"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    customerForm.resetFields();
                    setAddCustomerOpen(true);
                  }}
                  title="Add customer"
                />
              </div>
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
                    <Space.Compact block>
                      <Space.Addon>GHS</Space.Addon>
                      <InputNumber
                        min={0}
                        step={1}
                        value={cashTendered}
                        onChange={(v) => setCashTendered(typeof v === 'number' ? v : 0)}
                        className="w-full"
                        size="large"
                      />
                    </Space.Compact>
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

            <div className="space-y-2 pt-1">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="large"
                  disabled={completing || savingPending}
                  loading={savingPending}
                  onClick={() => void leaveSettleAsPending()}
                >
                  Close
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<PrinterOutlined />}
                  disabled={!canCompleteSale || completing || savingPending}
                  loading={completing}
                  onClick={() => void completeSale()}
                  className="!bg-[#25395c] !font-bold hover:!bg-[#1a2842] disabled:!opacity-50"
                >
                  Complete &amp; print
                </Button>
              </div>
              <p className="text-center text-[11px] text-slate-400">
                {editingSaleId
                  ? 'Closing without completing saves changes as pending on Receipts.'
                  : 'Closing without completing keeps this sale as pending on Receipts.'}
              </p>
            </div>
          </div>
        </div>
      </Modal>

      <Modal
        title="Add customer"
        open={addCustomerOpen}
        onCancel={() => {
          setAddCustomerOpen(false);
          customerForm.resetFields();
        }}
        onOk={() => void handleCreateCustomer()}
        okText="Add customer"
        destroyOnHidden
      >
        <Form form={customerForm} layout="vertical" className="mt-4">
          <Form.Item
            name="name"
            label="Company / name"
            rules={[{ required: true, message: 'Enter company or name' }]}
          >
            <Input placeholder="e.g. Acme Ltd or John Doe" />
          </Form.Item>
          <Form.Item
            name="phone"
            label="Phone"
            rules={[{ required: true, message: 'Enter phone number' }]}
          >
            <Input placeholder="e.g. 024 000 0000" />
          </Form.Item>
          <Form.Item name="location" label="Location">
            <Input placeholder="Optional — city or area" />
          </Form.Item>
        </Form>
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

export default function SalesPage() {
  return (
    <Suspense
      fallback={
        <DashboardLayout>
          <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
            Loading register…
          </div>
        </DashboardLayout>
      }
    >
      <SalesPageInner />
    </Suspense>
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
