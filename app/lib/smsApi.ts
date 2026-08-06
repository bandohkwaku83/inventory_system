import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export interface SmsMeta {
  configured: boolean;
  senderId: string | null;
  provider: string | null;
}

export interface SendSmsBody {
  message: string;
  recipients: string[] | string;
}

export interface SendSmsResult {
  message: string;
  sender: string;
  recipients: string[];
  invalid: string[];
}

export async function fetchSmsMeta(): Promise<SmsMeta> {
  const res = await fetch(apiUrl('/api/sms/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<SmsMeta>;
  return {
    configured: Boolean(data.configured),
    senderId: data.senderId ?? null,
    provider: data.provider ?? null,
  };
}

export async function sendSms(body: SendSmsBody): Promise<SendSmsResult> {
  const res = await fetch(apiUrl('/api/sms/send'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Partial<SendSmsResult> & {
    message?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || data.error || `Failed to send SMS (${res.status})`);
  }
  return {
    message: data.message || 'SMS sent',
    sender: data.sender || '',
    recipients: Array.isArray(data.recipients) ? data.recipients : [],
    invalid: Array.isArray(data.invalid) ? data.invalid : [],
  };
}
