/** Default thumbnail when a product has no uploaded image. */
export const DEFAULT_PRODUCT_IMAGE = '/images/picture-icon.jpg';

export function productImageSrc(image?: string | null): string {
  const src = image?.trim();
  return src ? src : DEFAULT_PRODUCT_IMAGE;
}

export function getApiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  const raw = (fromEnv || 'http://localhost:8000').replace(/\/+$/, '');
  // Paths already include `/api/...`; allow env with or without trailing `/api`.
  return raw.replace(/\/api$/i, '');
}

export function apiUrl(path: string): string {
  const base = getApiBase();
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

/** One product by id — same as `PATCH` / `DELETE` / `GET` on `/api/products/:id`. */
export function productResourceUrl(id: string): string {
  return apiUrl(`/api/products/${encodeURIComponent(id)}`);
}

/** Turn relative upload paths from the API into absolute URLs the browser can load. */
export function resolveMediaUrl(url: string | null | undefined): string | null {
  if (url == null || url === '') return null;
  const u = url.trim();
  if (!u) return null;
  if (u.startsWith('data:') || u.startsWith('blob:')) return u;
  if (/^https?:\/\//i.test(u)) return u;
  const base = getApiBase();
  if (u.startsWith('/')) return `${base}${u}`;
  return `${base}/${u}`;
}

export interface ApiCategory {
  _id: string;
  name: string;
}

export interface ApiProduct {
  _id: string;
  sku?: string;
  barcode?: string;
  name: string;
  category: ApiCategory | string;
  description?: string;
  sellingPrice: number;
  costPrice: number | null;
  unit: string;
  stockQuantity: number;
  reorderAt: number;
  maxStock?: number | null;
  maximumStock?: number | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappedProduct {
  id: string;
  name: string;
  category: string;
  categoryId: string;
  price: number;
  costPrice: number | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  lastRestocked: string;
  sku?: string;
  barcode?: string;
  maxStock?: number | null;
  description?: string;
  image?: string | null;
}

export function mapApiProduct(p: ApiProduct): MappedProduct {
  const cat = typeof p.category === 'object' && p.category ? p.category : null;
  const maxStock =
    typeof p.maxStock === 'number'
      ? p.maxStock
      : typeof p.maximumStock === 'number'
        ? p.maximumStock
        : p.maxStock === null || p.maximumStock === null
          ? null
          : undefined;
  return {
    id: p._id,
    name: p.name,
    category: cat?.name ?? String(p.category ?? ''),
    categoryId: cat?._id ?? '',
    price: p.sellingPrice,
    costPrice: p.costPrice,
    unit: p.unit,
    quantity: p.stockQuantity,
    reorderLevel: p.reorderAt,
    lastRestocked: (p.updatedAt || p.createdAt || '').split('T')[0] ?? '',
    sku: p.sku?.trim() || undefined,
    barcode: p.barcode?.trim() || undefined,
    maxStock,
    description: p.description ?? '',
    image: resolveMediaUrl(p.imageUrl),
  };
}

export async function readApiError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return res.statusText || `HTTP ${res.status}`;
    try {
      const j = JSON.parse(text) as { message?: string; error?: string };
      return j.message || j.error || text;
    } catch {
      return text;
    }
  } catch {
    return res.statusText || `HTTP ${res.status}`;
  }
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const r = await fetch(dataUrl);
  const blob = await r.blob();
  return new File([blob], filename, { type: blob.type || 'image/jpeg' });
}

export async function createProductApi(input: {
  name: string;
  categoryId: string;
  description?: string;
  price: number;
  costPrice?: number | null;
  sku?: string | null;
  barcode?: string | null;
  unit: string;
  quantity: number;
  reorderLevel: number;
  maxStock?: number | null;
  image?: string | null;
}): Promise<MappedProduct> {
  const formData = new FormData();
  formData.append('name', input.name);
  formData.append('categoryId', input.categoryId);
  formData.append('sellingPrice', String(input.price));
  formData.append('unit', input.unit);
  formData.append('stockQuantity', String(input.quantity));
  formData.append('reorderAt', String(input.reorderLevel));
  if (input.sku?.trim()) formData.append('sku', input.sku.trim());
  if (input.barcode?.trim()) formData.append('barcode', input.barcode.trim());
  if (input.maxStock != null) formData.append('maxStock', String(input.maxStock));
  if (input.description?.trim()) formData.append('description', input.description.trim());
  if (input.costPrice != null) formData.append('costPrice', String(input.costPrice));
  if (input.image?.startsWith('data:')) {
    const file = await dataUrlToFile(input.image, 'product.jpg');
    formData.append('image', file);
  }
  const res = await fetch(apiUrl('/api/products'), { method: 'POST', body: formData });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiProduct;
  return mapApiProduct(data);
}

