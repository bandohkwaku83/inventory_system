/** Backend SKU rules: any characters allowed; max 64; clear with null. Duplicates allowed. */
export const SKU_MAX_LENGTH = 64;

/**
 * Trim SKU for API payloads.
 * - empty / whitespace → `null` (omit on create, or send null on update to clear)
 * - no character whitelist; caller enforces max length via form/import rules
 */
export function normalizeSkuInput(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s === '' ? null : s;
}

export function skuExceedsMaxLength(value: unknown): boolean {
  if (value == null) return false;
  return String(value).trim().length > SKU_MAX_LENGTH;
}

/** Ant Design Form rules — letters, numbers, spaces, symbols all allowed. Duplicates OK. */
export function skuFieldRules(): Array<Record<string, unknown>> {
  return [
    {
      max: SKU_MAX_LENGTH,
      message: `SKU must be at most ${SKU_MAX_LENGTH} characters`,
    },
    {
      validator: async (_: unknown, value: unknown) => {
        const sku = normalizeSkuInput(value);
        if (!sku) return;
        if (sku.length > SKU_MAX_LENGTH) {
          throw new Error(`SKU must be at most ${SKU_MAX_LENGTH} characters`);
        }
      },
    },
  ];
}
