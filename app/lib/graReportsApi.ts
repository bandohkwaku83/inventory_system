import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface GraTaxBreakdown {
  taxableValue: number;
  nhil: number;
  getfund: number;
  covid: number;
  vat: number;
}

export interface GraSaleRow {
  _id: string;
  receiptId: string;
  date: string;
  time: string;
  customer: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  taxBreakdown: GraTaxBreakdown;
}

export interface GraReportSummary {
  transactionCount: number;
  grossSales: number;
  totalDiscount: number;
  netSales: number;
  taxableValue: number;
  nhil: number;
  getfund: number;
  covid: number;
  vat: number;
  currency: string;
}

export interface GraReportResponse {
  period: { from: string; to: string };
  summary: GraReportSummary;
  sales: GraSaleRow[];
}

export async function fetchGraReport(from: string, to: string): Promise<GraReportResponse> {
  const params = new URLSearchParams({ from, to });
  const res = await fetch(apiUrl(`/api/reports/gra?${params}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<GraReportResponse>;
}
