import * as XLSX from 'xlsx';

export interface ProductImportRow {
  name: string;
  category: string;
  unit: string;
  quantity: number;
  reorderLevel: number;
  price: number;
  costPrice: number | null;
  sku?: string;
  description?: string;
}

const REQUIRED_HEADERS = [
  'name',
  'category',
  'unit',
  'quantity',
  'reorderlevel',
  'price',
  'costprice',
] as const;

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

function pick(row: Record<string, string>, key: string): string {
  return row[normKey(key)] ?? '';
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

function rowsToImport(rows: Record<string, string>[]): ProductImportRow[] {
  if (rows.length === 0) return [];

  const first = normRow(rows[0]);
  const keys = Object.keys(first);
  const hasHeaders = REQUIRED_HEADERS.every((h) => keys.includes(h));
  if (!hasHeaders) {
    throw new Error(
      'Spreadsheet must include headers: name, category, unit, quantity, reorderLevel, price, costPrice, sku (optional), description (optional)'
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
      description: pick(r, 'description') || undefined,
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

export function downloadProductTemplate() {
  const headers = [
    'name',
    'category',
    'unit',
    'quantity',
    'reorderLevel',
    'price',
    'costPrice',
    'sku',
    'description',
  ];
  const sample = [
    'LED Bulb 9W',
    'Lighting',
    'units',
    '50',
    '10',
    '25.00',
    '18.00',
    'LED-009',
    'Warm white bulb',
  ];
  const ws = XLSX.utils.aoa_to_sheet([headers, sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Products');
  XLSX.writeFile(wb, 'product-import-template.xlsx');
}
