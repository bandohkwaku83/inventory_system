/** Shared dummy finance data for Bank, Expenses, and Chart of Accounts pages. */

export type AccountType = 'asset' | 'liability' | 'income' | 'expense';

export interface ChartAccount {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  status: 'active' | 'inactive';
  description?: string;
  balance?: number;
}

export interface CashAccount {
  id: string;
  name: string;
  type: 'cash' | 'mobile_money' | 'bank';
  chartAccountId: string;
  balance: number;
}

export type BankTxnSource = 'sale' | 'purchase' | 'expense' | 'payroll' | 'transfer' | 'manual';

export interface BankTransaction {
  id: string;
  date: string;
  cashAccountId: string;
  description: string;
  amount: number;
  direction: 'in' | 'out';
  source: BankTxnSource;
  reference?: string;
  chartAccountId?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  chartAccountId: string;
}

export interface ExpenseEntry {
  id: string;
  date: string;
  categoryId: string;
  description: string;
  amount: number;
  status: 'paid' | 'pending';
  cashAccountId?: string;
  reference?: string;
}

export const CHART_ACCOUNTS: ChartAccount[] = [
  { id: 'ca-1000', code: '1000', name: 'Cash on Hand', type: 'asset', status: 'active', balance: 4280.5 },
  { id: 'ca-1010', code: '1010', name: 'Mobile Money', type: 'asset', status: 'active', balance: 15640 },
  { id: 'ca-1020', code: '1020', name: 'Bank Account', type: 'asset', status: 'active', balance: 28450 },
  { id: 'ca-1100', code: '1100', name: 'Inventory', type: 'asset', status: 'active', balance: 38200 },
  { id: 'ca-2100', code: '2100', name: 'Accounts Payable', type: 'liability', status: 'active', balance: 3200 },
  { id: 'ca-2200', code: '2200', name: 'Tax Payable (GRA)', type: 'liability', status: 'active', balance: 1840.25 },
  { id: 'ca-4000', code: '4000', name: 'Sales Revenue', type: 'income', status: 'active', balance: 124580 },
  { id: 'ca-6100', code: '6100', name: 'Rent', type: 'expense', status: 'active', balance: 4500 },
  { id: 'ca-6200', code: '6200', name: 'Utilities', type: 'expense', status: 'active', balance: 2180 },
  { id: 'ca-6300', code: '6300', name: 'Transport & Fuel', type: 'expense', status: 'active', balance: 940.5 },
  { id: 'ca-6400', code: '6400', name: 'Salaries & Wages', type: 'expense', status: 'active', balance: 5100 },
  { id: 'ca-6500', code: '6500', name: 'Repairs & Maintenance', type: 'expense', status: 'active', balance: 320 },
  { id: 'ca-6600', code: '6600', name: 'Bank & Mobile Money Charges', type: 'expense', status: 'active', balance: 85 },
  { id: 'ca-6900', code: '6900', name: 'Miscellaneous Expenses', type: 'expense', status: 'active', balance: 210 },
];

export const CASH_ACCOUNTS: CashAccount[] = [
  { id: 'cash-1', name: 'Cash Drawer', type: 'cash', chartAccountId: 'ca-1000', balance: 4280.5 },
  { id: 'cash-2', name: 'Mobile Money (MTN)', type: 'mobile_money', chartAccountId: 'ca-1010', balance: 15640 },
  { id: 'cash-3', name: 'Ecobank Business', type: 'bank', chartAccountId: 'ca-1020', balance: 28450 },
];

export const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-rent', name: 'Rent', chartAccountId: 'ca-6100' },
  { id: 'cat-util', name: 'Utilities', chartAccountId: 'ca-6200' },
  { id: 'cat-transport', name: 'Transport', chartAccountId: 'ca-6300' },
  { id: 'cat-salary', name: 'Salaries', chartAccountId: 'ca-6400' },
  { id: 'cat-repairs', name: 'Repairs', chartAccountId: 'ca-6500' },
  { id: 'cat-bank-fees', name: 'Bank Charges', chartAccountId: 'ca-6600' },
  { id: 'cat-misc', name: 'Miscellaneous', chartAccountId: 'ca-6900' },
];

export const BANK_TRANSACTIONS: BankTransaction[] = [
  {
    id: 'B-1042',
    date: '2026-07-09',
    cashAccountId: 'cash-2',
    description: 'POS sale — Mobile Money',
    amount: 342.5,
    direction: 'in',
    source: 'sale',
    reference: 'RCP-8841',
    chartAccountId: 'ca-4000',
  },
  {
    id: 'B-1041',
    date: '2026-07-09',
    cashAccountId: 'cash-1',
    description: 'POS sale — Cash',
    amount: 128,
    direction: 'in',
    source: 'sale',
    reference: 'RCP-8840',
    chartAccountId: 'ca-4000',
  },
  {
    id: 'B-1040',
    date: '2026-07-08',
    cashAccountId: 'cash-3',
    description: 'Supplier payment — Accra Wholesale Ltd',
    amount: 4500,
    direction: 'out',
    source: 'purchase',
    reference: 'PO-1204',
    chartAccountId: 'ca-2100',
  },
  {
    id: 'B-1039',
    date: '2026-07-08',
    cashAccountId: 'cash-2',
    description: 'POS sale — Mobile Money',
    amount: 890,
    direction: 'in',
    source: 'sale',
    reference: 'RCP-8836',
    chartAccountId: 'ca-4000',
  },
  {
    id: 'B-1038',
    date: '2026-07-07',
    cashAccountId: 'cash-1',
    description: 'Electricity bill — ECG',
    amount: 1200,
    direction: 'out',
    source: 'expense',
    reference: 'E-2102',
    chartAccountId: 'ca-6200',
  },
  {
    id: 'B-1037',
    date: '2026-07-07',
    cashAccountId: 'cash-1',
    description: 'Fuel & delivery runs',
    amount: 85.5,
    direction: 'out',
    source: 'expense',
    reference: 'E-2101',
    chartAccountId: 'ca-6300',
  },
  {
    id: 'B-1036',
    date: '2026-07-06',
    cashAccountId: 'cash-3',
    description: 'March payroll — Kwaku Boateng',
    amount: 850,
    direction: 'out',
    source: 'payroll',
    reference: 'PL-9001',
    chartAccountId: 'ca-6400',
  },
  {
    id: 'B-1035',
    date: '2026-07-06',
    cashAccountId: 'cash-1',
    description: 'Transfer to Mobile Money',
    amount: 2000,
    direction: 'out',
    source: 'transfer',
    reference: 'TRF-0041',
  },
  {
    id: 'B-1034',
    date: '2026-07-06',
    cashAccountId: 'cash-2',
    description: 'Transfer from Cash Drawer',
    amount: 2000,
    direction: 'in',
    source: 'transfer',
    reference: 'TRF-0041',
  },
  {
    id: 'B-1033',
    date: '2026-07-05',
    cashAccountId: 'cash-2',
    description: 'POS sale — Mobile Money',
    amount: 1560,
    direction: 'in',
    source: 'sale',
    reference: 'RCP-8820',
    chartAccountId: 'ca-4000',
  },
  {
    id: 'B-1032',
    date: '2026-07-05',
    cashAccountId: 'cash-3',
    description: 'Shop rent — July',
    amount: 4500,
    direction: 'out',
    source: 'expense',
    reference: 'E-2098',
    chartAccountId: 'ca-6100',
  },
  {
    id: 'B-1031',
    date: '2026-07-04',
    cashAccountId: 'cash-1',
    description: 'POS sale — Cash',
    amount: 275,
    direction: 'in',
    source: 'sale',
    reference: 'RCP-8815',
    chartAccountId: 'ca-4000',
  },
];

export const EXPENSE_ENTRIES: ExpenseEntry[] = [
  {
    id: 'E-2104',
    date: '2026-07-09',
    categoryId: 'cat-repairs',
    description: 'Fridge compressor repair',
    amount: 320,
    status: 'pending',
  },
  {
    id: 'E-2103',
    date: '2026-07-08',
    categoryId: 'cat-misc',
    description: 'Cleaning supplies',
    amount: 65,
    status: 'pending',
  },
  {
    id: 'E-2102',
    date: '2026-07-07',
    categoryId: 'cat-util',
    description: 'Electricity bill — ECG',
    amount: 1200,
    status: 'paid',
    cashAccountId: 'cash-1',
    reference: 'ECG-JUL-2026',
  },
  {
    id: 'E-2101',
    date: '2026-07-07',
    categoryId: 'cat-transport',
    description: 'Fuel & delivery runs',
    amount: 85.5,
    status: 'paid',
    cashAccountId: 'cash-1',
  },
  {
    id: 'E-2099',
    date: '2026-07-06',
    categoryId: 'cat-bank-fees',
    description: 'Mobile money withdrawal charges',
    amount: 12,
    status: 'paid',
    cashAccountId: 'cash-2',
  },
  {
    id: 'E-2098',
    date: '2026-07-05',
    categoryId: 'cat-rent',
    description: 'Shop rent — July',
    amount: 4500,
    status: 'paid',
    cashAccountId: 'cash-3',
    reference: 'RENT-JUL-2026',
  },
  {
    id: 'E-2097',
    date: '2026-07-03',
    categoryId: 'cat-util',
    description: 'Water bill — GWCL',
    amount: 980,
    status: 'paid',
    cashAccountId: 'cash-1',
  },
  {
    id: 'E-2096',
    date: '2026-07-02',
    categoryId: 'cat-transport',
    description: 'Market pickup — Tema',
    amount: 120,
    status: 'paid',
    cashAccountId: 'cash-1',
  },
];

export function chartAccountById(id: string): ChartAccount | undefined {
  return CHART_ACCOUNTS.find((a) => a.id === id);
}

export function cashAccountById(id: string): CashAccount | undefined {
  return CASH_ACCOUNTS.find((a) => a.id === id);
}

export function expenseCategoryById(id: string): ExpenseCategory | undefined {
  return EXPENSE_CATEGORIES.find((c) => c.id === id);
}

export function formatGhs(value: number): string {
  return `GHS ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  asset: 'Asset',
  liability: 'Liability',
  income: 'Income',
  expense: 'Expense',
};

export const BANK_SOURCE_LABELS: Record<BankTxnSource, string> = {
  sale: 'Sale',
  purchase: 'Purchase',
  expense: 'Expense',
  payroll: 'Payroll',
  transfer: 'Transfer',
  manual: 'Manual',
};

export const CASH_ACCOUNT_TYPE_LABELS: Record<CashAccount['type'], string> = {
  cash: 'Cash',
  mobile_money: 'Mobile Money',
  bank: 'Bank',
};

export interface PayrollEmployee {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  employeeNumber?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  ghanaCardId?: string;
  address?: string;
  city?: string;
  department?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  emergencyContactAltPhone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  notes?: string;
  hireDate: string;
  employmentType: 'full_time' | 'part_time';
  baseSalary: number;
  transportAllowance: number;
  otherAllowances: number;
  ssnitDeduction: number;
  payeDeduction: number;
  status: 'active' | 'inactive';
}

export type PayrollRecordStatus = 'draft' | 'recorded';

export interface PayrollEntry {
  id: string;
  employeeId: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  workingDays: number;
  daysPresent: number;
  baseSalary: number;
  allowances: number;
  deductions: number;
  netPay: number;
  status: PayrollRecordStatus;
  recordedDate?: string;
  notes?: string;
}

export const PAYROLL_EMPLOYEES: PayrollEmployee[] = [
  {
    id: 'emp-1',
    name: 'Kwaku Boateng',
    role: 'Cashier',
    phone: '024 412 3456',
    email: 'kwaku.boateng@ladepuls.com',
    employeeNumber: 'EMP-001',
    dateOfBirth: '1995-06-12',
    gender: 'male',
    ghanaCardId: 'GHA-712345678-9',
    address: '12 Ring Road East',
    city: 'Accra',
    department: 'Sales',
    emergencyContactName: 'Akosua Boateng',
    emergencyContactRelationship: 'Spouse',
    emergencyContactPhone: '024 998 7654',
    bankName: 'GCB Bank',
    bankAccountNumber: '1234567890',
    hireDate: '2024-03-15',
    employmentType: 'full_time',
    baseSalary: 850,
    transportAllowance: 50,
    otherAllowances: 0,
    ssnitDeduction: 55,
    payeDeduction: 30,
    status: 'active',
  },
  {
    id: 'emp-2',
    name: 'Serwaa Mensah',
    role: 'Stock Attendant',
    phone: '055 789 1023',
    email: 'serwaa.mensah@ladepuls.com',
    employeeNumber: 'EMP-002',
    dateOfBirth: '1998-11-03',
    gender: 'female',
    ghanaCardId: 'GHA-723456789-0',
    address: '45 Spintex Road',
    city: 'Accra',
    department: 'Warehouse',
    emergencyContactName: 'Yaw Mensah',
    emergencyContactRelationship: 'Parent',
    emergencyContactPhone: '055 112 3344',
    bankName: 'Ecobank',
    bankAccountNumber: '0987654321',
    hireDate: '2024-08-01',
    employmentType: 'full_time',
    baseSalary: 760,
    transportAllowance: 40,
    otherAllowances: 0,
    ssnitDeduction: 49,
    payeDeduction: 27,
    status: 'active',
  },
  {
    id: 'emp-3',
    name: 'Ama Darko',
    role: 'Supervisor',
    phone: '020 334 5678',
    hireDate: '2023-01-10',
    employmentType: 'full_time',
    baseSalary: 1200,
    transportAllowance: 100,
    otherAllowances: 0,
    ssnitDeduction: 78,
    payeDeduction: 42,
    status: 'active',
  },
  {
    id: 'emp-4',
    name: 'Kofi Asante',
    role: 'Delivery Rider',
    phone: '027 901 2345',
    hireDate: '2025-02-20',
    employmentType: 'full_time',
    baseSalary: 680,
    transportAllowance: 80,
    otherAllowances: 0,
    ssnitDeduction: 0,
    payeDeduction: 0,
    status: 'active',
  },
  {
    id: 'emp-5',
    name: 'Abena Osei',
    role: 'Cleaner',
    phone: '054 678 9012',
    hireDate: '2022-06-01',
    employmentType: 'part_time',
    baseSalary: 600,
    transportAllowance: 0,
    otherAllowances: 0,
    ssnitDeduction: 0,
    payeDeduction: 0,
    status: 'inactive',
  },
];

export const PAYROLL_ENTRIES: PayrollEntry[] = [
  {
    id: 'PR-9012',
    employeeId: 'emp-1',
    period: 'Jul 2026',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    workingDays: 22,
    daysPresent: 21,
    baseSalary: 850,
    allowances: 50,
    deductions: 85,
    netPay: 815,
    status: 'draft',
    notes: '1 day absent — unpaid leave',
  },
  {
    id: 'PR-9011',
    employeeId: 'emp-2',
    period: 'Jul 2026',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    workingDays: 22,
    daysPresent: 22,
    baseSalary: 760,
    allowances: 40,
    deductions: 76,
    netPay: 724,
    status: 'draft',
  },
  {
    id: 'PR-9010',
    employeeId: 'emp-3',
    period: 'Jul 2026',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    workingDays: 22,
    daysPresent: 22,
    baseSalary: 1200,
    allowances: 100,
    deductions: 120,
    netPay: 1180,
    status: 'draft',
  },
  {
    id: 'PR-9009',
    employeeId: 'emp-4',
    period: 'Jul 2026',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    workingDays: 22,
    daysPresent: 20,
    baseSalary: 680,
    allowances: 80,
    deductions: 0,
    netPay: 760,
    status: 'draft',
    notes: '2 late deliveries — no deduction applied',
  },
  {
    id: 'PR-9004',
    employeeId: 'emp-1',
    period: 'Jun 2026',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    workingDays: 21,
    daysPresent: 21,
    baseSalary: 850,
    allowances: 50,
    deductions: 85,
    netPay: 815,
    status: 'recorded',
    recordedDate: '2026-07-02',
  },
  {
    id: 'PR-9003',
    employeeId: 'emp-2',
    period: 'Jun 2026',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    workingDays: 21,
    daysPresent: 21,
    baseSalary: 760,
    allowances: 40,
    deductions: 76,
    netPay: 724,
    status: 'recorded',
    recordedDate: '2026-07-02',
  },
  {
    id: 'PR-9002',
    employeeId: 'emp-3',
    period: 'Jun 2026',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    workingDays: 21,
    daysPresent: 21,
    baseSalary: 1200,
    allowances: 100,
    deductions: 120,
    netPay: 1180,
    status: 'recorded',
    recordedDate: '2026-07-02',
  },
  {
    id: 'PR-9001',
    employeeId: 'emp-4',
    period: 'Jun 2026',
    periodStart: '2026-06-01',
    periodEnd: '2026-06-30',
    workingDays: 21,
    daysPresent: 21,
    baseSalary: 680,
    allowances: 80,
    deductions: 0,
    netPay: 760,
    status: 'recorded',
    recordedDate: '2026-07-02',
  },
];

export function payrollEmployeeById(id: string): PayrollEmployee | undefined {
  return PAYROLL_EMPLOYEES.find((e) => e.id === id);
}

export function employeeMonthlyAllowances(emp: PayrollEmployee): number {
  return emp.transportAllowance + emp.otherAllowances;
}

export function employeeMonthlyDeductions(emp: PayrollEmployee): number {
  return emp.ssnitDeduction + emp.payeDeduction;
}

export function employeeExpectedNet(emp: PayrollEmployee): number {
  return emp.baseSalary + employeeMonthlyAllowances(emp) - employeeMonthlyDeductions(emp);
}

export const PAYROLL_RECORD_STATUS_LABELS: Record<PayrollRecordStatus, string> = {
  draft: 'Draft',
  recorded: 'Recorded',
};

export const EMPLOYMENT_TYPE_LABELS: Record<PayrollEmployee['employmentType'], string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
};

export const PAYROLL_PERIODS = ['Jul 2026', 'Jun 2026', 'May 2026'] as const;
