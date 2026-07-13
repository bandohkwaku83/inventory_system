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
    <div className="receipt-print-area mx-auto max-w-[320px] bg-white p-4 font-mono text-[11px] leading-relaxed text-slate-900 sm:p-5">
      <div className="mb-3 text-center">
        {receiptSettings.showLogo ? (
          <img
            src={businessInfo.logoUrl || '/images/logo.png'}
            alt=""
            className="mx-auto mb-2 h-12 w-auto max-w-[140px] object-contain brightness-0"
          />
        ) : null}
        <h2 className="text-sm font-bold uppercase tracking-wide">{businessInfo.name}</h2>
        {receiptSettings.showAddress && businessInfo.address && (
          <p className="mt-0.5 text-[10px] text-slate-600">{businessInfo.address}</p>
        )}
        {receiptSettings.showPhone && businessInfo.phone && (
          <p className="text-[10px] text-slate-600">Tel: {businessInfo.phone}</p>
        )}
        {receiptSettings.showEmail && businessInfo.email && (
          <p className="text-[10px] text-slate-600">{businessInfo.email}</p>
        )}
        {receiptSettings.showTaxId && businessInfo.taxId && (
          <p className="text-[10px] text-slate-600">TIN: {businessInfo.taxId}</p>
        )}
      </div>

      <div className="border-y border-dashed border-slate-300 py-2 text-[10px]">
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">{isProforma ? 'Proforma' : 'Receipt'}</span>
          <span className="font-semibold">{id}</span>
        </div>
        <div className="flex justify-between gap-2">
          <span className="text-slate-500">Date</span>
          <span>
            {date} {time}
          </span>
        </div>
        {customer && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Customer</span>
            <span className="max-w-[55%] truncate text-right">{customer}</span>
          </div>
        )}
        {!isProforma && servedByName && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Served by</span>
            <span className="max-w-[55%] truncate text-right">{servedByName}</span>
          </div>
        )}
        {isProforma && validUntil && (
          <div className="flex justify-between gap-2">
            <span className="text-slate-500">Valid until</span>
            <span>{validUntil}</span>
          </div>
        )}
      </div>

      <div className="my-3">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-1 pr-1">Item</th>
              <th className="pb-1 text-center">Qty</th>
              <th className="pb-1 text-right">Amt</th>
            </tr>
          </thead>
          <tbody>
            {items.map((line, idx) => (
              <tr key={line.id ?? idx} className="align-top">
                <td className="py-0.5 pr-1">
                  <div className="font-medium">{line.name}</div>
                  {line.sku && <div className="text-[9px] text-slate-500">{line.sku}</div>}
                  <div className="text-[9px] text-slate-500">@ {formatGhs(line.price)}</div>
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

      <div className="space-y-0.5 border-t border-dashed border-slate-300 pt-2 text-[10px]">
        <div className="flex justify-between">
          <span className="text-slate-500">Subtotal (excl. tax)</span>
          <span>{formatGhs(tax.taxableValue)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">NHIL (2.5%)</span>
          <span>{formatGhs(tax.nhil)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">GETFund (2.5%)</span>
          <span>{formatGhs(tax.getfund)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">COVID Levy (1%)</span>
          <span>{formatGhs(tax.covidLevy)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">VAT (15%)</span>
          <span>{formatGhs(tax.vat)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-rose-600">
            <span>Discount</span>
            <span>− {formatGhs(discount)}</span>
          </div>
        )}
        <div className="flex justify-between border-t border-slate-300 pt-1 text-xs font-bold">
          <span>{isProforma ? 'Proforma Total' : 'Total'}</span>
          <span>{formatGhs(total)}</span>
        </div>
      </div>

      {!isProforma && paymentMethod && (
        <p className="mt-2 text-[10px] text-slate-600">Payment: {paymentMethod}</p>
      )}
      {!isProforma && typeof cashTendered === 'number' && cashTendered > 0 && (
        <p className="text-[10px] text-slate-600">Cash tendered: {formatGhs(cashTendered)}</p>
      )}
      {!isProforma && typeof change === 'number' && change >= 0 && cashTendered != null && (
        <p className="text-[10px] font-medium text-[#25395c]">Change: {formatGhs(change)}</p>
      )}

      {isProforma && (
        <p className="mt-2 text-[9px] italic text-slate-500">
          This is a proforma invoice — not a tax invoice. Prices are subject to change.
        </p>
      )}

      {notes && <p className="mt-2 text-[10px] text-slate-600">{notes}</p>}

      <p className="mt-4 text-center text-[10px] text-slate-500">
        {receiptSettings.footerMessage || 'Thank you for your business!'}
      </p>
    </div>
  );
}
