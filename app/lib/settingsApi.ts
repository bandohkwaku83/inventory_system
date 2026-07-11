import { authHeaders } from './authApi';
import { apiUrl, readApiError, resolveMediaUrl } from './productsApi';

export interface ApiBusinessInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  logoUrl?: string | null;
}

export interface ApiReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  showEmail: boolean;
  footerMessage: string;
}

export interface ApiAppSettings {
  _id: string;
  business: ApiBusinessInfo;
  receipt: ApiReceiptSettings;
  createdAt?: string;
  updatedAt?: string;
}

export interface BusinessInfoPayload {
  name: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
}

export interface AppSettingsPayload {
  business?: Partial<BusinessInfoPayload>;
  receipt?: Partial<ApiReceiptSettings>;
  clearLogo?: boolean;
}

export function mapBusinessLogoUrl(logoUrl: string | null | undefined): string | null {
  return resolveMediaUrl(logoUrl);
}

export async function fetchAppSettings(): Promise<ApiAppSettings> {
  const res = await fetch(apiUrl('/api/settings'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiAppSettings;
  if (!data?.business || !data?.receipt) {
    throw new Error('Invalid settings response');
  }
  return data;
}

export async function updateAppSettings(payload: AppSettingsPayload): Promise<ApiAppSettings> {
  const res = await fetch(apiUrl('/api/settings'), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiAppSettings;
  if (!data?.business || !data?.receipt) {
    throw new Error('Invalid settings response');
  }
  return data;
}

/** Upload store logo via multipart `logo` field. */
export async function uploadBusinessLogo(file: File): Promise<ApiAppSettings> {
  const formData = new FormData();
  formData.append('logo', file);
  const res = await fetch(apiUrl('/api/settings'), {
    method: 'PATCH',
    headers: authHeaders(),
    body: formData,
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as ApiAppSettings;
  if (!data?.business || !data?.receipt) {
    throw new Error('Invalid settings response');
  }
  return data;
}

/** Remove the store logo. */
export async function clearBusinessLogo(): Promise<ApiAppSettings> {
  return updateAppSettings({ clearLogo: true });
}
