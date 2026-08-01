import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface GraTaxBreakdown {
  taxableValue: number;
  nhil: number;
  getfund: number;
  vat: number;
}

export interface GraSaleItemRow {
  name: string;
  quantity: number;
  unitPrice: number;
  lineDiscount: number;
  lineTotal: number;
  taxBreakdown: GraTaxBreakdown;
  /** Optional extras if API includes them */
  _id?: string;
  productId?: string;
  sku?: string;
  lineSubtotal?: number;
}

export interface GraSaleRow {
  receiptId: string;
  date: string;
  time: string;
  customer: string;
  paymentMethod: string;
  subtotal: number;
  discount: number;
  total: number;
  taxBreakdown: GraTaxBreakdown;
  items?: GraSaleItemRow[];
  /** Optional if API includes Mongo ids */
  _id?: string;
}

export interface GraReportSummary {
  transactionCount: number;
  itemCount: number;
  grossSales: number;
  totalDiscount: number;
  netSales: number;
  taxableValue: number;
  nhil: number;
  getfund: number;
  vat: number;
  currency: string;
}

export interface GraReportResponse {
  period: { from: string | null; to: string | null };
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
