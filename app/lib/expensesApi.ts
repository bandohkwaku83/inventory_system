import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type ExpenseStatus = 'Pending' | 'Paid';

export interface ApiExpense {
  _id: string;
  expenseId: string;
  date: string;
  category: string;
  description: string;
  reference?: string;
  chartAccount: string;
  amount: number;
  currency?: string;
  status: ExpenseStatus | string;
  paidAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Expense {
  id: string;
  expenseId: string;
  date: string;
  category: string;
  description: string;
  reference?: string;
  chartAccount: string;
  amount: number;
  currency: string;
  status: ExpenseStatus;
  paidAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpensesMeta {
  categories: string[];
  statuses: ExpenseStatus[];
  chartAccountByCategory: Record<string, string>;
}

export interface ExpensesSummary {
  totalAmount: number;
  paidAmount: number;
  pendingAmount: number;
  pendingCount: number;
  expenseCount: number;
  currency: string;
}

export interface ExpensesListParams {
  page?: number;
  limit?: number;
  status?: ExpenseStatus | '';
  category?: string;
  q?: string;
}

export interface ExpensesListResult {
  items: Expense[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateExpenseBody {
  date: string;
  category: string;
  description: string;
  amount: number;
  reference?: string;
  markPaid?: boolean;
}

export type UpdateExpenseBody = Partial<
  Pick<CreateExpenseBody, 'date' | 'category' | 'description' | 'amount' | 'reference'>
>;

export const DEFAULT_EXPENSES_META: ExpensesMeta = {
  categories: ['Repairs', 'Miscellaneous', 'Utilities', 'Transport', 'Bank Charges', 'Rent'],
  statuses: ['Pending', 'Paid'],
  chartAccountByCategory: {
    Repairs: 'Repairs & Maintenance',
    Miscellaneous: 'Miscellaneous Expenses',
    Utilities: 'Utilities',
    Transport: 'Transport & Fuel',
    'Bank Charges': 'Bank & Mobile Money Charges',
    Rent: 'Rent',
  },
};

export const EMPTY_EXPENSES_SUMMARY: ExpensesSummary = {
  totalAmount: 0,
  paidAmount: 0,
  pendingAmount: 0,
  pendingCount: 0,
  expenseCount: 0,
  currency: 'GHS',
};

export function expenseResourceUrl(id: string): string {
  return apiUrl(`/api/expenses/${encodeURIComponent(id)}`);
}

function toYmd(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr.slice(0, 10);
  return d.toISOString().slice(0, 10);
}

function normalizeStatus(status: string | undefined): ExpenseStatus {
  const s = (status ?? '').toLowerCase();
  return s === 'paid' ? 'Paid' : 'Pending';
}

export function mapApiExpense(e: ApiExpense): Expense {
  return {
    id: e._id,
    expenseId: e.expenseId,
    date: toYmd(e.date),
    category: e.category,
    description: e.description,
    reference: e.reference?.trim() ? e.reference.trim() : undefined,
    chartAccount: e.chartAccount,
    amount: e.amount,
    currency: e.currency ?? 'GHS',
    status: normalizeStatus(e.status),
    paidAt: e.paidAt ?? undefined,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

export function formatExpenseAmount(value: number, currency = 'GHS'): string {
  return `${currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export async function fetchExpensesMeta(): Promise<ExpensesMeta> {
  const res = await fetch(apiUrl('/api/expenses/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<ExpensesMeta>;
  const categories =
    Array.isArray(data.categories) && data.categories.length > 0
      ? data.categories
      : DEFAULT_EXPENSES_META.categories;
  const statuses =
    Array.isArray(data.statuses) && data.statuses.length > 0
      ? data.statuses.map(normalizeStatus)
      : DEFAULT_EXPENSES_META.statuses;
  const chartAccountByCategory =
    data.chartAccountByCategory && typeof data.chartAccountByCategory === 'object'
      ? data.chartAccountByCategory
      : DEFAULT_EXPENSES_META.chartAccountByCategory;
  return { categories, statuses, chartAccountByCategory };
}

export async function fetchExpensesSummary(): Promise<ExpensesSummary> {
  const res = await fetch(apiUrl('/api/expenses/summary'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<ExpensesSummary>;
  return {
    totalAmount: typeof data.totalAmount === 'number' ? data.totalAmount : 0,
    paidAmount: typeof data.paidAmount === 'number' ? data.paidAmount : 0,
    pendingAmount: typeof data.pendingAmount === 'number' ? data.pendingAmount : 0,
    pendingCount: typeof data.pendingCount === 'number' ? data.pendingCount : 0,
    expenseCount: typeof data.expenseCount === 'number' ? data.expenseCount : 0,
    currency: data.currency ?? 'GHS',
  };
}

export async function fetchExpenses(
  params: ExpensesListParams = {}
): Promise<ExpensesListResult> {
  const query = new URLSearchParams();
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  if (params.status) query.set('status', params.status);
  if (params.category) query.set('category', params.category);
  if (params.q?.trim()) query.set('q', params.q.trim());

  const res = await fetch(apiUrl(`/api/expenses?${query.toString()}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    items?: ApiExpense[];
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  const items = Array.isArray(data.items) ? data.items.map(mapApiExpense) : [];
  return {
    items,
    page: data.page ?? params.page ?? 1,
    limit: data.limit ?? params.limit ?? 20,
    total: data.total ?? items.length,
    totalPages: data.totalPages ?? 1,
  };
}

export async function fetchExpenseById(id: string): Promise<Expense> {
  const res = await fetch(expenseResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiExpense((await res.json()) as ApiExpense);
}

export async function createExpense(body: CreateExpenseBody): Promise<Expense> {
  const payload: Record<string, unknown> = {
    date: body.date,
    category: body.category,
    description: body.description.trim(),
    amount: body.amount,
    reference: body.reference?.trim() ?? '',
  };
  if (body.markPaid !== undefined) payload.markPaid = body.markPaid;

  const res = await fetch(apiUrl('/api/expenses'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiExpense((await res.json()) as ApiExpense);
}

export async function updateExpense(id: string, body: UpdateExpenseBody): Promise<Expense> {
  const payload: Record<string, unknown> = {};
  if (body.date !== undefined) payload.date = body.date;
  if (body.category !== undefined) payload.category = body.category;
  if (body.description !== undefined) payload.description = body.description.trim();
  if (body.amount !== undefined) payload.amount = body.amount;
  if (body.reference !== undefined) payload.reference = body.reference.trim();

  const res = await fetch(expenseResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiExpense((await res.json()) as ApiExpense);
}

export async function markExpensePaid(id: string): Promise<Expense> {
  const res = await fetch(`${expenseResourceUrl(id)}/mark-paid`, {
    method: 'PATCH',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiExpense((await res.json()) as ApiExpense);
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(expenseResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
