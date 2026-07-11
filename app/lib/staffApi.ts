import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

export type StaffGender = 'male' | 'female' | 'other';
export type StaffEmploymentType = 'full_time' | 'part_time' | 'contract' | 'casual';
export type StaffStatus = 'active' | 'inactive';

export interface StaffEmergencyContact {
  fullName: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
}

export interface ApiStaff {
  _id: string;
  fullName: string;
  employeeId: string;
  dateOfBirth?: string | null;
  gender?: StaffGender;
  ghanaCardId?: string;
  phone: string;
  email?: string;
  city?: string;
  residentialAddress?: string;
  emergencyContact?: StaffEmergencyContact;
  role: string;
  department?: string;
  hireDate: string;
  employmentType: StaffEmploymentType;
  status: StaffStatus;
  baseSalary: number;
  transport: number;
  otherAllowances: number;
  ssnitDeduction: number;
  payeDeduction: number;
  bankName?: string;
  accountNumber?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  phone: string;
  email?: string;
  employeeNumber?: string;
  dateOfBirth?: string;
  gender?: StaffGender;
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
  employmentType: StaffEmploymentType;
  baseSalary: number;
  transportAllowance: number;
  otherAllowances: number;
  ssnitDeduction: number;
  payeDeduction: number;
  status: StaffStatus;
}

export interface StaffMeta {
  genders: StaffGender[];
  relationships: string[];
  departments: string[];
  employmentTypes: StaffEmploymentType[];
  statuses: StaffStatus[];
}

export interface StaffSummary {
  date: string;
  activeStaff: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  unmarked: number;
}

export interface StaffListParams {
  status?: StaffStatus | '';
  q?: string;
}

export type CreateStaffBody = Omit<StaffMember, 'id' | 'employeeNumber'>;
export type UpdateStaffBody = Partial<CreateStaffBody>;

export const EMPLOYMENT_TYPE_LABELS: Record<StaffEmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  casual: 'Casual',
};

export const DEFAULT_STAFF_META: StaffMeta = {
  genders: ['male', 'female', 'other'],
  relationships: ['spouse', 'parent', 'sibling', 'child', 'relative', 'friend', 'other'],
  departments: ['sales', 'stock', 'delivery', 'admin', 'finance', 'other'],
  employmentTypes: ['full_time', 'part_time', 'contract', 'casual'],
  statuses: ['active', 'inactive'],
};

function toDateOnly(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

export function labelizeMetaValue(value: string): string {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function staffResourceUrl(id: string): string {
  return apiUrl(`/api/staff/${encodeURIComponent(id)}`);
}

export function mapApiStaff(s: ApiStaff): StaffMember {
  return {
    id: s._id,
    name: s.fullName,
    role: s.role,
    phone: s.phone ?? '',
    email: s.email || undefined,
    employeeNumber: s.employeeId || undefined,
    dateOfBirth: toDateOnly(s.dateOfBirth) || undefined,
    gender: s.gender,
    ghanaCardId: s.ghanaCardId || undefined,
    address: s.residentialAddress || undefined,
    city: s.city || undefined,
    department: s.department || undefined,
    emergencyContactName: s.emergencyContact?.fullName || undefined,
    emergencyContactRelationship: s.emergencyContact?.relationship || undefined,
    emergencyContactPhone: s.emergencyContact?.phone || undefined,
    emergencyContactAltPhone: s.emergencyContact?.alternatePhone || undefined,
    bankName: s.bankName || undefined,
    bankAccountNumber: s.accountNumber || undefined,
    notes: s.notes || undefined,
    hireDate: toDateOnly(s.hireDate) ?? '',
    employmentType: s.employmentType,
    baseSalary: Number(s.baseSalary) || 0,
    transportAllowance: Number(s.transport) || 0,
    otherAllowances: Number(s.otherAllowances) || 0,
    ssnitDeduction: Number(s.ssnitDeduction) || 0,
    payeDeduction: Number(s.payeDeduction) || 0,
    status: s.status,
  };
}

function toApiStaffBody(input: CreateStaffBody | UpdateStaffBody): Record<string, unknown> {
  const body: Record<string, unknown> = {};

  if (input.name !== undefined) body.fullName = input.name;
  if (input.dateOfBirth !== undefined) body.dateOfBirth = input.dateOfBirth || null;
  if (input.gender !== undefined) body.gender = input.gender;
  if (input.ghanaCardId !== undefined) body.ghanaCardId = input.ghanaCardId ?? '';
  if (input.phone !== undefined) body.phone = input.phone;
  if (input.email !== undefined) body.email = input.email ?? '';
  if (input.city !== undefined) body.city = input.city ?? '';
  if (input.address !== undefined) body.residentialAddress = input.address ?? '';
  if (input.role !== undefined) body.role = input.role;
  if (input.department !== undefined) body.department = input.department;
  if (input.hireDate !== undefined) body.hireDate = input.hireDate;
  if (input.employmentType !== undefined) body.employmentType = input.employmentType;
  if (input.status !== undefined) body.status = input.status;
  if (input.baseSalary !== undefined) body.baseSalary = input.baseSalary;
  if (input.transportAllowance !== undefined) body.transport = input.transportAllowance;
  if (input.otherAllowances !== undefined) body.otherAllowances = input.otherAllowances;
  if (input.ssnitDeduction !== undefined) body.ssnitDeduction = input.ssnitDeduction;
  if (input.payeDeduction !== undefined) body.payeDeduction = input.payeDeduction;
  if (input.bankName !== undefined) body.bankName = input.bankName ?? '';
  if (input.bankAccountNumber !== undefined) body.accountNumber = input.bankAccountNumber ?? '';
  if (input.notes !== undefined) body.notes = input.notes ?? '';

  const hasEmergency =
    input.emergencyContactName !== undefined ||
    input.emergencyContactRelationship !== undefined ||
    input.emergencyContactPhone !== undefined ||
    input.emergencyContactAltPhone !== undefined;

  if (hasEmergency) {
    body.emergencyContact = {
      fullName: input.emergencyContactName ?? '',
      relationship: input.emergencyContactRelationship ?? '',
      phone: input.emergencyContactPhone ?? '',
      alternatePhone: input.emergencyContactAltPhone ?? '',
    };
  }

  return body;
}

export async function fetchStaffMeta(): Promise<StaffMeta> {
  const res = await fetch(apiUrl('/api/staff/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as Partial<StaffMeta>;
  return {
    genders: Array.isArray(data.genders) && data.genders.length > 0 ? data.genders : DEFAULT_STAFF_META.genders,
    relationships:
      Array.isArray(data.relationships) && data.relationships.length > 0
        ? data.relationships
        : DEFAULT_STAFF_META.relationships,
    departments:
      Array.isArray(data.departments) && data.departments.length > 0
        ? data.departments
        : DEFAULT_STAFF_META.departments,
    employmentTypes:
      Array.isArray(data.employmentTypes) && data.employmentTypes.length > 0
        ? data.employmentTypes
        : DEFAULT_STAFF_META.employmentTypes,
    statuses:
      Array.isArray(data.statuses) && data.statuses.length > 0 ? data.statuses : DEFAULT_STAFF_META.statuses,
  };
}

export async function fetchStaffSummary(): Promise<StaffSummary> {
  const res = await fetch(apiUrl('/api/staff/summary'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as StaffSummary;
}

export async function fetchStaff(params: StaffListParams = {}): Promise<StaffMember[]> {
  const query = new URLSearchParams();
  if (params.status) query.set('status', params.status);
  if (params.q !== undefined) query.set('q', params.q);
  const qs = query.toString();
  const res = await fetch(apiUrl(`/api/staff${qs ? `?${qs}` : ''}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data)) throw new Error('Invalid staff response');
  return (data as ApiStaff[]).map(mapApiStaff);
}

export async function fetchStaffById(id: string): Promise<StaffMember> {
  const res = await fetch(staffResourceUrl(id), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStaff((await res.json()) as ApiStaff);
}

export async function createStaff(body: CreateStaffBody): Promise<StaffMember> {
  const res = await fetch(apiUrl('/api/staff'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(toApiStaffBody(body)),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStaff((await res.json()) as ApiStaff);
}

export async function updateStaffApi(id: string, body: UpdateStaffBody): Promise<StaffMember> {
  const res = await fetch(staffResourceUrl(id), {
    method: 'PATCH',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(toApiStaffBody(body)),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return mapApiStaff((await res.json()) as ApiStaff);
}

export async function deleteStaffApi(id: string): Promise<void> {
  const res = await fetch(staffResourceUrl(id), {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
