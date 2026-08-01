'use client';

import React from 'react';
import { breakdownTaxInclusive, formatGhs } from '../lib/tax';
import { useSettings } from '../context/SettingsContext';

export interface ReceiptLineItem {
  id?: string;
  name: string;
  sku?: string;
  price: number;
  quantity: number;
}

export interface ReceiptDocumentProps {
  type?: 'sale' | 'proforma';
  id: string;
  date: string;
  time: string;
  customer?: string;
  servedByName?: string;
  paymentMethod?: string;
  items: ReceiptLineItem[];
  subtotal: number;
  discount?: number;
  total: number;
  cashTendered?: number;
  change?: number;
  notes?: string;
  validUntil?: string;
}

export default function ReceiptDocument({
  type = 'sale',
  id,
  date,
  time,
  customer,
  servedByName,
  paymentMethod,
  items,
  subtotal,
  discount = 0,
  total,
  cashTendered,
  change,
  notes,
  validUntil,
}: ReceiptDocumentProps) {
  const { businessInfo, receiptSettings } = useSettings();
  const tax = breakdownTaxInclusive(subtotal, discount);
  const isProforma = type === 'proforma';

  return (
    <div className="receipt-print-area mx-auto w-full max-w-[302px] bg-white px-3 py-3 font-mono text-[11px] leading-snug text-slate-900">
      <div className="mb-2 text-center">
        {receiptSettings.showLogo ? (
          <img
            src={businessInfo.logoUrl || '/images/logo.png'}
            alt=""
            className="mx-auto mb-1.5 h-10 w-auto max-w-[120px] object-contain brightness-0"
          />
        ) : null}
        <h2 className="text-[12px] font-bold uppercase leading-tight tracking-wide">
          {businessInfo.name}
        </h2>
        {receiptSettings.showAddress && businessInfo.address && (
          <p className="mt-0.5 text-[9px] text-slate-600">{businessInfo.address}</p>
        )}
        {receiptSettings.showPhone && businessInfo.phone && (
          <p className="text-[9px] text-slate-600">Tel: {businessInfo.phone}</p>
        )}
        {receiptSettings.showEmail && businessInfo.email && (
          <p className="text-[9px] text-slate-600">{businessInfo.email}</p>
        )}
        {receiptSettings.showTaxId && businessInfo.taxId && (
          <p className="text-[9px] text-slate-600">TIN: {businessInfo.taxId}</p>
        )}
      </div>

      <div className="receipt-meta border-y border-dashed border-slate-300 py-1.5 text-[9px]">
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">{isProforma ? 'Proforma' : 'Receipt'}</span>
          <span className="font-semibold">{id}</span>
        </div>
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">Date</span>
          <span>
            {date} {time}
          </span>
        </div>
        {customer && (
          <div className="receipt-row flex justify-between gap-1">
            <span className="text-slate-500">Customer</span>
            <span className="max-w-[58%] truncate text-right">{customer}</span>
          </div>
        )}
        {!isProforma && servedByName && (
          <div className="receipt-row flex justify-between gap-1">
            <span className="text-slate-500">Served by</span>
            <span className="max-w-[58%] truncate text-right">{servedByName}</span>
          </div>
        )}
        {isProforma && validUntil && (
          <div className="receipt-row flex justify-between gap-1">
            <span className="text-slate-500">Valid until</span>
            <span>{validUntil}</span>
          </div>
        )}
      </div>

      <div className="my-2">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-0.5 pr-1 font-medium">Item</th>
              <th className="w-8 pb-0.5 text-center font-medium">Qty</th>
              <th className="w-14 pb-0.5 text-right font-medium">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((line, idx) => (
              <tr key={line.id ?? idx} className="align-top">
                <td className="py-0.5 pr-1">
                  <div className="font-medium leading-tight">{line.name}</div>
                  {line.sku && <div className="text-[8px] text-slate-500">{line.sku}</div>}
                  <div className="text-[8px] text-slate-500">@ {formatGhs(line.price)}</div>
                </td>
                <td className="py-0.5 text-center">{line.quantity}</td>
                <td className="py-0.5 text-right font-medium">
                  {formatGhs(line.price * line.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="receipt-totals space-y-0.5 border-t border-dashed border-slate-300 pt-1.5 text-[9px]">
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">Subtotal (excl. tax)</span>
          <span>{formatGhs(tax.taxableValue)}</span>
        </div>
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">NHIL (2.5%)</span>
          <span>{formatGhs(tax.nhil)}</span>
        </div>
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">GETFund (2.5%)</span>
          <span>{formatGhs(tax.getfund)}</span>
        </div>
        <div className="receipt-row flex justify-between gap-1">
          <span className="text-slate-500">VAT (15%)</span>
          <span>{formatGhs(tax.vat)}</span>
        </div>
        {discount > 0 && (
          <div className="receipt-row flex justify-between gap-1 text-rose-600">
            <span>Discount</span>
            <span>− {formatGhs(discount)}</span>
          </div>
        )}
        <div className="receipt-total-line flex justify-between gap-1 border-t border-slate-300 pt-1 text-[11px] font-bold">
          <span>{isProforma ? 'Proforma Total' : 'Total'}</span>
          <span>{formatGhs(total)}</span>
        </div>
      </div>

      {!isProforma && paymentMethod && (
        <p className="mt-1.5 text-[9px] text-slate-600">Payment: {paymentMethod}</p>
      )}
      {!isProforma && typeof cashTendered === 'number' && cashTendered > 0 && (
        <p className="text-[9px] text-slate-600">Cash tendered: {formatGhs(cashTendered)}</p>
      )}
      {!isProforma && typeof change === 'number' && change >= 0 && cashTendered != null && (
        <p className="text-[9px] font-medium text-[#25395c]">Change: {formatGhs(change)}</p>
      )}

      {isProforma && (
        <p className="mt-1.5 text-[8px] italic text-slate-500">
          This is a proforma invoice — not a tax invoice. Prices are subject to change.
        </p>
      )}

      {notes && <p className="mt-1.5 text-[9px] text-slate-600">{notes}</p>}

      <p className="mt-2.5 text-center text-[9px] text-slate-500">
        {receiptSettings.footerMessage || 'Thank you for your business!'}
      </p>
    </div>
  );
}
