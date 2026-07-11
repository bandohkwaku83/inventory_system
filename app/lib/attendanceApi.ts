import { authHeaders } from './authApi';
import { apiUrl, readApiError } from './productsApi';

/** UI status values used by the attendance page. */
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'leave';

/** Backend status values. */
export type ApiAttendanceStatus = 'present' | 'absent' | 'late' | 'on_leave';

export interface AttendanceRecord {
  id: string;
  staffId: string;
  date: string;
  status: AttendanceStatus;
}

export interface AttendanceMeta {
  statuses: AttendanceStatus[];
}

export interface DailyAttendanceStaffRow {
  staffId: string;
  fullName: string;
  role: string;
  employeeId: string;
  status: AttendanceStatus | null;
  attendanceId: string | null;
}

export interface DailyAttendanceResponse {
  date: string;
  staff: DailyAttendanceStaffRow[];
}

export interface AttendanceHistoryStaff {
  id: string;
  fullName: string;
  role: string;
  employeeId: string;
}

export interface AttendanceHistoryRow {
  staff: AttendanceHistoryStaff;
  attendance: Record<string, AttendanceStatus>;
}

export interface AttendanceHistoryResponse {
  from: string;
  to: string;
  days: string[];
  rows: AttendanceHistoryRow[];
}

export interface AttendanceHistoryParams {
  year: number;
  month: number;
  week: number;
  q?: string;
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  leave: 'On Leave',
};

export const DEFAULT_ATTENDANCE_META: AttendanceMeta = {
  statuses: ['present', 'absent', 'late', 'leave'],
};

function toDateOnly(value?: string | null): string {
  if (!value) return '';
  return value.slice(0, 10);
}

export function mapApiAttendanceStatus(
  status: ApiAttendanceStatus | AttendanceStatus | null | undefined
): AttendanceStatus | null {
  if (!status) return null;
  if (status === 'on_leave') return 'leave';
  return status as AttendanceStatus;
}

export function toApiAttendanceStatus(status: AttendanceStatus): ApiAttendanceStatus {
  return status === 'leave' ? 'on_leave' : status;
}

export async function fetchAttendanceMeta(): Promise<AttendanceMeta> {
  const res = await fetch(apiUrl('/api/attendance/meta'), { headers: authHeaders() });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as { statuses?: string[] };
  const statuses = (data.statuses ?? [])
    .map((s) => mapApiAttendanceStatus(s as ApiAttendanceStatus))
    .filter((s): s is AttendanceStatus => s != null);
  return {
    statuses: statuses.length > 0 ? statuses : DEFAULT_ATTENDANCE_META.statuses,
  };
}

export async function fetchAttendanceDaily(date: string): Promise<{
  date: string;
  records: AttendanceRecord[];
  staff: DailyAttendanceStaffRow[];
}> {
  const query = new URLSearchParams({ date });
  const res = await fetch(apiUrl(`/api/attendance/daily?${query}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    date: string;
    staff: Array<{
      staffId: string;
      fullName: string;
      role: string;
      employeeId: string;
      status: ApiAttendanceStatus | null;
      attendanceId: string | null;
    }>;
  };

  const staff: DailyAttendanceStaffRow[] = (data.staff ?? []).map((row) => ({
    staffId: row.staffId,
    fullName: row.fullName,
    role: row.role,
    employeeId: row.employeeId,
    status: mapApiAttendanceStatus(row.status),
    attendanceId: row.attendanceId,
  }));

  const records: AttendanceRecord[] = staff
    .filter((row) => row.status && row.attendanceId)
    .map((row) => ({
      id: row.attendanceId as string,
      staffId: row.staffId,
      date: data.date,
      status: row.status as AttendanceStatus,
    }));

  return { date: data.date, records, staff };
}

export async function fetchAttendanceHistory(
  params: AttendanceHistoryParams
): Promise<AttendanceHistoryResponse> {
  const query = new URLSearchParams({
    year: String(params.year),
    month: String(params.month),
    week: String(params.week),
  });
  if (params.q !== undefined) query.set('q', params.q);

  const res = await fetch(apiUrl(`/api/attendance/history?${query}`), {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    from: string;
    to: string;
    days: string[];
    rows: Array<{
      staff: { _id: string; fullName: string; role: string; employeeId: string };
      attendance: Record<string, ApiAttendanceStatus>;
    }>;
  };

  return {
    from: data.from,
    to: data.to,
    days: data.days ?? [],
    rows: (data.rows ?? []).map((row) => {
      const attendance: Record<string, AttendanceStatus> = {};
      Object.entries(row.attendance ?? {}).forEach(([date, status]) => {
        const mapped = mapApiAttendanceStatus(status);
        if (mapped) attendance[date] = mapped;
      });
      return {
        staff: {
          id: row.staff._id,
          fullName: row.staff.fullName,
          role: row.staff.role,
          employeeId: row.staff.employeeId,
        },
        attendance,
      };
    }),
  };
}

export async function putAttendance(body: {
  staffId: string;
  date: string;
  status: AttendanceStatus;
}): Promise<AttendanceRecord> {
  const res = await fetch(apiUrl('/api/attendance'), {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      staffId: body.staffId,
      date: body.date,
      status: toApiAttendanceStatus(body.status),
    }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  const data = (await res.json()) as {
    _id: string;
    staffId: string;
    date: string;
    status: ApiAttendanceStatus;
  };
  return {
    id: data._id,
    staffId: data.staffId,
    date: toDateOnly(data.date),
    status: mapApiAttendanceStatus(data.status) ?? 'present',
  };
}

export async function markAllPresentApi(date: string): Promise<{ date: string; updated: number }> {
  const res = await fetch(apiUrl('/api/attendance/mark-all-present'), {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ date }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
  return (await res.json()) as { date: string; updated: number };
}

export async function deleteAttendanceApi(staffId: string, date: string): Promise<void> {
  const res = await fetch(apiUrl('/api/attendance'), {
    method: 'DELETE',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ staffId, date }),
  });
  if (!res.ok) throw new Error(await readApiError(res));
}
