import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface DashboardMetric {
  value: number;
  count?: number;
  changePercent: number;
  currency?: string;
  productCount?: number;
  periodDays?: number;
}

export interface DashboardMetrics {
  todaysSales: DashboardMetric;
  revenue7d: DashboardMetric;
  inventoryItems: DashboardMetric;
  activeCustomers: DashboardMetric;
}

export interface SalesPerformancePoint {
  date: string;
  day: string;
  revenue: number;
  count?: number;
}

export interface SalesPerformance {
  periodDays: number;
  currency: string;
  series: SalesPerformancePoint[];
}

export interface TopProduct {
  name: string;
  productId: string;
  quantity: number;
  revenue: number;
}

export interface TopProducts {
  periodDays: number;
  currency: string;
  items: TopProduct[];
}

export interface RecentSaleItem {
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  _id: string;
}

export interface RecentSale {
  _id: string;
  receiptId: string;
  itemsSummary: string;
  items: RecentSaleItem[];
  total: number;
  currency: string;
  time: string;
  timestamp: string;
  customer: string;
  paymentMethod: string;
}

export interface RecentRestock {
  _id: string;
  purchaseId: string;
  item: string;
  productId: string;
  quantity: number;
  quantityLabel: string;
  supplier: string;
  supplierId: string;
  date: string;
}

export interface CashflowSeriesPoint {
  date: string;
  day: string;
  amount: number;
}

export interface CashflowSeries {
  title: string;
  note?: string;
  series: CashflowSeriesPoint[];
}

export interface Cashflow {
  periodDays: number;
  currency: string;
  income: CashflowSeries;
  expenses: CashflowSeries;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  salesPerformance: SalesPerformance;
  topProducts: TopProducts;
  recentSales: RecentSale[];
  recentRestocks: RecentRestock[];
  cashflow: Cashflow;
  currency: string;
}

export interface DashboardSummary {
  products: { total: number; lowStock: number };
  suppliers: { active: number };
  purchases: { count: number; outstanding: number };
  sales: { count: number; revenue: number; currency: string };
  metrics: DashboardMetrics;
  recentSales: RecentSale[];
}

export interface DashboardQuery {
  days?: number;
  topLimit?: number;
  recentLimit?: number;
}

export function formatDashboardCurrency(value: number, currency = 'GHS'): string {
  return `${currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatChangePercent(changePercent: number): {
  value: string;
  trend: 'up' | 'down';
} {
  const sign = changePercent > 0 ? '+' : '';
  return {
    value: `${sign}${changePercent.toFixed(1)}%`,
    trend: changePercent >= 0 ? 'up' : 'down',
  };
}

async function dashboardFetch<T>(path: string): Promise<T> {
  const res = await fetch(apiUrl(path), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return res.json() as Promise<T>;
}

export async function fetchDashboard(query: DashboardQuery = {}): Promise<DashboardData> {
  const params = new URLSearchParams();
  if (query.days != null) params.set('days', String(query.days));
  if (query.topLimit != null) params.set('topLimit', String(query.topLimit));
  if (query.recentLimit != null) params.set('recentLimit', String(query.recentLimit));
  const qs = params.toString();
  return dashboardFetch<DashboardData>(`/api/dashboard${qs ? `?${qs}` : ''}`);
}

export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  return dashboardFetch<DashboardSummary>('/api/dashboard/summary');
}

export async function fetchDashboardMetrics(): Promise<{
  metrics: DashboardMetrics;
  currency: string;
}> {
  return dashboardFetch('/api/dashboard/metrics');
}

export async function fetchSalesPerformance(days = 7): Promise<SalesPerformance> {
  return dashboardFetch<SalesPerformance>(`/api/dashboard/sales-performance?days=${days}`);
}

export async function fetchTopProducts(days = 7, limit = 5): Promise<TopProducts> {
  return dashboardFetch<TopProducts>(
    `/api/dashboard/top-products?days=${days}&limit=${limit}`
  );
}

export async function fetchRecentSales(limit = 10): Promise<{ items: RecentSale[] }> {
  return dashboardFetch<{ items: RecentSale[] }>(
    `/api/dashboard/recent-sales?limit=${limit}`
  );
}

export async function fetchRecentRestocks(limit = 10): Promise<{ items: RecentRestock[] }> {
  return dashboardFetch<{ items: RecentRestock[] }>(
    `/api/dashboard/recent-restocks?limit=${limit}`
  );
}

export async function fetchCashflow(days = 7): Promise<Cashflow> {
  return dashboardFetch<Cashflow>(`/api/dashboard/cashflow?days=${days}`);
}
