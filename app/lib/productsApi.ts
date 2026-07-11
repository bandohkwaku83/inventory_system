/** Default thumbnail when a product has no uploaded image. */
export const DEFAULT_PRODUCT_IMAGE = '/images/picture-icon.jpg';

export function productImageSrc(image?: string | null): string {
  const src = image?.trim();
  return src ? src : DEFAULT_PRODUCT_IMAGE;
}

export function getApiBase(): string {
  const fromEnv =
    typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : undefined;
  return (fromEnv || 'http://localhost:8000').replace(/\/$/, '');
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
  name: string;
  category: ApiCategory | string;
  description?: string;
  sellingPrice: number;
  costPrice: number | null;
  unit: string;
  stockQuantity: number;
  reorderAt: number;
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
  description?: string;
  image?: string | null;
}

export function mapApiProduct(p: ApiProduct): MappedProduct {
  const cat = typeof p.category === 'object' && p.category ? p.category : null;
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
