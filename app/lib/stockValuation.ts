/** Minimal product shape needed for stock valuation. */
export type StockProduct = {
  quantity: number;
  price: number;
  costPrice: number | null;
  reorderLevel: number;
  sku?: string;
  name: string;
  category: string;
  unit: string;
};

export type StockValuationSummary = {
  skuCount: number;
  totalUnits: number;
  /** Sum of qty × costPrice (missing cost treated as 0). */
  costValue: number;
  /** Sum of qty × selling price. */
  retailValue: number;
  /** SKUs with quantity > 0 but no cost price set. */
  missingCostCount: number;
};

export function summarizeStock(products: StockProduct[]): StockValuationSummary {
  let totalUnits = 0;
  let costValue = 0;
  let retailValue = 0;
  let missingCostCount = 0;

  for (const p of products) {
    const qty = Number(p.quantity) || 0;
    totalUnits += qty;
    retailValue += qty * (Number(p.price) || 0);
    if (p.costPrice == null || Number.isNaN(Number(p.costPrice))) {
      if (qty > 0) missingCostCount += 1;
    } else {
      costValue += qty * Number(p.costPrice);
    }
  }

  return {
    skuCount: products.length,
    totalUnits,
    costValue,
    retailValue,
    missingCostCount,
  };
}

function csvEscape(value: string | number): string {
  return `"${String(value).replace(/"/g, '""')}"`;
}

/** Build a stock CSV. When `includeValues` is false, value columns are omitted. */
export function buildStockSummaryCsv(
  products: StockProduct[],
  options: { includeValues: boolean; currency?: string } = { includeValues: false }
): string {
  const currency = options.currency ?? 'GHS';
  const header = options.includeValues
    ? [
        'SKU',
        'Name',
        'Category',
        'Unit',
        'Quantity',
        `Cost Price (${currency})`,
        `Selling Price (${currency})`,
        `Cost Value (${currency})`,
        `Retail Value (${currency})`,
        'Status',
      ]
    : ['SKU', 'Name', 'Category', 'Unit', 'Quantity', 'Status'];

  const lines = products.map((p) => {
    const qty = Number(p.quantity) || 0;
    const cost = p.costPrice == null ? null : Number(p.costPrice);
    const price = Number(p.price) || 0;
    const status =
      qty === 0 ? 'Out of stock' : qty <= p.reorderLevel ? 'Low stock' : 'In stock';

    if (!options.includeValues) {
      return [p.sku ?? '', p.name, p.category, p.unit, qty, status]
        .map(csvEscape)
        .join(',');
    }

    return [
      p.sku ?? '',
      p.name,
      p.category,
      p.unit,
      qty,
      cost == null ? '' : cost.toFixed(2),
      price.toFixed(2),
      cost == null ? '' : (qty * cost).toFixed(2),
      (qty * price).toFixed(2),
      status,
    ]
      .map(csvEscape)
      .join(',');
  });

  return [header.join(','), ...lines].join('\n');
}

export function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function formatMoney(value: number, currency = 'GHS'): string {
  return `${currency} ${value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
