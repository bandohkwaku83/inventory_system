import * as XLSX from 'xlsx';
import type ExcelJS from 'exceljs';

export interface ProductImportRow {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  price: number;
  costPrice: number | null;
  sku?: string;
}

const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name'],
  category: ['category'],
  unit: ['unit'],
  quantity: ['quantity'],
  reorderlevel: ['reorderlevel', 'reorder', 'minimumstock', 'minstock'],
  price: ['price', 'sellingprice', 'selling'],
  costprice: ['costprice', 'cost'],
  sku: ['sku', 'sku/serialnumber', 'sku/serialno', 'serialnumber', 'serialno'],
};

function normKey(key: string): string {
  return key.trim().toLowerCase().replace(/\s+/g, '');
}

function normRow(r: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(r)) {
    out[normKey(k)] = String(v ?? '').trim();
  }
  return out;
}

function pick(row: Record<string, string>, canonical: string): string {
  const aliases = HEADER_ALIASES[canonical] ?? [canonical];
  for (const alias of aliases) {
    const value = row[alias];
    if (value != null && value !== '') return value;
  }
  return '';
}

function hasField(keys: string[], canonical: string): boolean {
  const aliases = HEADER_ALIASES[canonical] ?? [canonical];
  return aliases.some((alias) => keys.includes(alias));
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const parseLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const headers = parseLine(lines[0]).map((h) => normKey(h));
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((h, j) => {
      row[h] = values[j] ?? '';
    });
    rows.push(row);
  }
  return rows;
}

const REQUIRED_FIELDS = [
  'name',
  'category',
  'unit',
  'quantity',
  'reorderlevel',
  'price',
  'costprice',
] as const;

function rowsToImport(rows: Record<string, string>[]): ProductImportRow[] {
  if (rows.length === 0) return [];

  const first = normRow(rows[0]);
  const keys = Object.keys(first);
  const hasHeaders = REQUIRED_FIELDS.every((field) => hasField(keys, field));
  if (!hasHeaders) {
    throw new Error(
      'Spreadsheet must include headers: SKU/Serial number, Name, Category, unit, quantity, reorder, cost price, selling price'
    );
  }

  const out: ProductImportRow[] = [];
  for (const raw of rows) {
    const r = normRow(raw);
    const name = pick(r, 'name');
    if (!name) continue;

    const costRaw = pick(r, 'costprice');
    out.push({
      name,
      category: pick(r, 'category') || 'General',
      unit: pick(r, 'unit') || 'units',
      quantity: parseInt(pick(r, 'quantity'), 10) || 0,
      reorderLevel: parseInt(pick(r, 'reorderlevel'), 10) || 0,
      price: parseFloat(pick(r, 'price')) || 0,
      costPrice: costRaw ? parseFloat(costRaw) || 0 : null,
      sku: pick(r, 'sku') || undefined,
    });
  }
  return out;
}

export async function parseProductSpreadsheet(file: File): Promise<ProductImportRow[]> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv')) {
    const text = await file.text();
    return rowsToImport(parseCSV(text));
  }

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
      defval: '',
      raw: false,
    });
    return rowsToImport(json);
  }

  throw new Error('Unsupported file type. Upload .csv, .xlsx, or .xls');
}

function escapeSheetName(name: string): string {
  return name.replace(/'/g, "''");
}

function addListValidation(
  sheet: ExcelJS.Worksheet,
  column: string,
  listSheetName: string,
  listLength: number
) {
  if (listLength <= 0) return;
  const lastRow = Math.max(listLength, 1);
  // ExcelJS supports dataValidations at runtime; typings omit the property.
  const validations = (
    sheet as ExcelJS.Worksheet & {
      dataValidations: {
        add: (
          range: string,
          validation: {
            type: 'list';
            allowBlank?: boolean;
            showErrorMessage?: boolean;
            errorTitle?: string;
            error?: string;
            formulae: string[];
          }
        ) => void;
      };
    }
  ).dataValidations;
  validations.add(`${column}2:${column}1001`, {
    type: 'list',
    allowBlank: true,
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: 'Please select a value from the dropdown list.',
    formulae: [`'${escapeSheetName(listSheetName)}'!$A$1:$A$${lastRow}`],
  });
}

export async function downloadProductTemplate(options?: {
  categories?: string[];
  units?: string[];
}) {
  const ExcelJS = (await import('exceljs')).default;
  const categories = (options?.categories ?? []).map((c) => c.trim()).filter(Boolean);
  const units = (options?.units ?? []).map((u) => u.trim()).filter(Boolean);

  const wb = new ExcelJS.Workbook();
  const sheet = wb.addWorksheet('Products');

  const headers = [
    'SKU/Serial number',
    'Name',
    'Category',
    'unit',
    'quantity',
    'reorder',
    'cost price',
    'selling price',
  ];
  sheet.addRow(headers);
  sheet.getRow(1).font = { bold: true };

  const sampleCategory = categories[0] ?? 'Lighting';
  const sampleUnit = units[0] ?? 'units';
  sheet.addRow([
    'LED-009',
    'LED Bulb 9W',
    sampleCategory,
    sampleUnit,
    50,
    10,
    18,
    25,
  ]);

  // Display cost price / selling price with two decimals (e.g. 18.00)
  sheet.getColumn(7).numFmt = '0.00';
  sheet.getColumn(8).numFmt = '0.00';

  sheet.columns = [
    { key: 'sku', width: 18 },
    { key: 'name', width: 22 },
    { key: 'category', width: 18 },
    { key: 'unit', width: 12 },
    { key: 'quantity', width: 12 },
    { key: 'reorder', width: 12 },
    { key: 'costPrice', width: 12 },
    { key: 'price', width: 14 },
  ];

  // Category = column C, unit = column D
  if (categories.length > 0) {
    const catSheet = wb.addWorksheet('Categories');
    categories.forEach((name, i) => {
      catSheet.getCell(i + 1, 1).value = name;
    });
    catSheet.state = 'veryHidden';
    addListValidation(sheet, 'C', 'Categories', categories.length);
  }

  if (units.length > 0) {
    const unitSheet = wb.addWorksheet('Units');
    units.forEach((name, i) => {
      unitSheet.getCell(i + 1, 1).value = name;
    });
    unitSheet.state = 'veryHidden';
    addListValidation(sheet, 'D', 'Units', units.length);
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'product-import-template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}
