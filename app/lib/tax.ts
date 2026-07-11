/** Ghana standard-rated supply tax breakdown (tax-inclusive prices). */

export const GHANA_TAX_RATES = {
  nhil: 0.025,
  getfund: 0.025,
  covidLevy: 0.01,
  vat: 0.15,
} as const;

/** Multiplier from tax-exclusive base to tax-inclusive total. */
export const GHANA_INCLUSIVE_MULTIPLIER =
  1 +
  GHANA_TAX_RATES.nhil +
  GHANA_TAX_RATES.getfund +
  GHANA_TAX_RATES.covidLevy +
  (1 + GHANA_TAX_RATES.nhil + GHANA_TAX_RATES.getfund + GHANA_TAX_RATES.covidLevy) *
    GHANA_TAX_RATES.vat;

export interface TaxBreakdown {
  /** Tax-exclusive subtotal before discount. */
  taxableValue: number;
  nhil: number;
  getfund: number;
  covidLevy: number;
  vat: number;
  /** Sum of all tax components. */
  totalTax: number;
  /** Tax-inclusive total (should match input for standard-rated items). */
  grandTotal: number;
  discount: number;
}

export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Split a tax-inclusive amount into exclusive value + Ghana levies & VAT. */
export function breakdownTaxInclusive(
  inclusiveTotal: number,
  discount = 0
): TaxBreakdown {
  const afterDiscount = Math.max(0, inclusiveTotal - discount);
  const taxableValue = roundMoney(afterDiscount / GHANA_INCLUSIVE_MULTIPLIER);
  const nhil = roundMoney(taxableValue * GHANA_TAX_RATES.nhil);
  const getfund = roundMoney(taxableValue * GHANA_TAX_RATES.getfund);
  const covidLevy = roundMoney(taxableValue * GHANA_TAX_RATES.covidLevy);
  const vatBase = taxableValue + nhil + getfund + covidLevy;
  const vat = roundMoney(vatBase * GHANA_TAX_RATES.vat);
  const totalTax = roundMoney(nhil + getfund + covidLevy + vat);
  const grandTotal = roundMoney(taxableValue + totalTax);

  return {
    taxableValue,
    nhil,
    getfund,
    covidLevy,
    vat,
    totalTax,
    grandTotal,
    discount: roundMoney(discount),
  };
}

export const formatGhs = (v: number) => `GHS ${v.toFixed(2)}`;
