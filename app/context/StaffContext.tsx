'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { message } from 'antd';
import { useActionLoader } from '../components/LoaderProvider';
import { useAuth } from './AuthContext';
import { hasEntitlement } from '../lib/permissions';
import {
  ATTENDANCE_STATUS_LABELS,
  deleteAttendanceApi,
  fetchAttendanceDaily,
  fetchAttendanceHistory,
  fetchAttendanceMeta,
  markAllPresentApi,
  putAttendance,
  type AttendanceHistoryParams,
  type AttendanceHistoryResponse,
  type AttendanceRecord,
  type AttendanceStatus,
} from '../lib/attendanceApi';
import {
  createStaff,
  DEFAULT_STAFF_META,
  deleteStaffApi,
  EMPLOYMENT_TYPE_LABELS,
  fetchStaff,
  fetchStaffMeta,
  fetchStaffSummary,
  updateStaffApi,
  type CreateStaffBody,
  type StaffMember,
  type StaffMeta,
  type StaffSummary,
  type UpdateStaffBody,
} from '../lib/staffApi';

export type { AttendanceRecord, AttendanceStatus, StaffMember };
export { ATTENDANCE_STATUS_LABELS, EMPLOYMENT_TYPE_LABELS };

interface StaffContextValue {
  staff: StaffMember[];
  staffLoading: boolean;
  staffMeta: StaffMeta;
  summary: StaffSummary | null;
  attendance: AttendanceRecord[];
  attendanceLoading: boolean;
  history: AttendanceHistoryResponse | null;
  historyLoading: boolean;
  refreshStaff: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshDaily: (date: string) => Promise<void>;
  refreshHistory: (params: AttendanceHistoryParams) => Promise<void>;
  addStaff: (input: CreateStaffBody) => Promise<StaffMember>;
  updateStaff: (id: string, updates: UpdateStaffBody) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  getStaff: (id: string) => StaffMember | undefined;
  getAttendanceForDate: (date: string) => AttendanceRecord[];
  upsertAttendance: (staffId: string, date: string, status: AttendanceStatus) => Promise<void>;
  clearAttendance: (staffId: string, date: string) => Promise<void>;
  markAllPresent: (date: string) => Promise<void>;
}

const StaffContext = createContext<StaffContextValue | null>(null);

export function StaffProvider({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapping } = useAuth();
  const { runWithLoader } = useActionLoader();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffMeta, setStaffMeta] = useState<StaffMeta>(DEFAULT_STAFF_META);
  const [summary, setSummary] = useState<StaffSummary | null>(null);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [history, setHistory] = useState<AttendanceHistoryResponse | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [dailyDate, setDailyDate] = useState<string | null>(null);
  const [messageApi, contextHolder] = message.useMessage();

  const refreshStaff = useCallback(async () => {
    const rows = await fetchStaff();
    setStaff(rows);
  }, []);

  const refreshSummary = useCallback(async () => {
    const next = await fetchStaffSummary();
    setSummary(next);
  }, []);

  const refreshDaily = useCallback(async (date: string) => {
    setAttendanceLoading(true);
    try {
      const result = await fetchAttendanceDaily(date);
      setDailyDate(result.date);
      setAttendance(result.records);
    } finally {
      setAttendanceLoading(false);
    }
  }, []);

  const refreshHistory = useCallback(async (params: AttendanceHistoryParams) => {
    setHistoryLoading(true);
    try {
      const result = await fetchAttendanceHistory(params);
      setHistory(result);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      setStaff([]);
      setSummary(null);
      setAttendance([]);
      setHistory(null);
      setStaffLoading(false);
      return;
    }

    if (!hasEntitlement(user.entitlements, 'staff_attendance')) {
      setStaff([]);
      setSummary(null);
      setAttendance([]);
      setHistory(null);
      setStaffLoading(false);
      return;
    }

    void (async () => {
      setStaffLoading(true);
      try {
        const [meta] = await Promise.all([
          fetchStaffMeta().catch(() => DEFAULT_STAFF_META),
          fetchAttendanceMeta().catch(() => null),
          refreshStaff(),
          refreshSummary(),
        ]);
        setStaffMeta(meta);
      } catch (e) {
        messageApi.error(e instanceof Error ? e.message : 'Failed to load staff');
      } finally {
        setStaffLoading(false);
      }
    })();
  }, [isBootstrapping, user, refreshStaff, refreshSummary, messageApi]);

  const getStaff = useCallback(
    (id: string) => staff.find((s) => s.id === id),
    [staff]
  );

  const refreshAfterStaffChange = useCallback(async () => {
    await Promise.all([
      refreshStaff(),
      refreshSummary(),
      dailyDate ? refreshDaily(dailyDate) : Promise.resolve(),
    ]);
  }, [refreshStaff, refreshSummary, refreshDaily, dailyDate]);

  const addStaff = useCallback(
    async (input: CreateStaffBody): Promise<StaffMember> => {
      return runWithLoader(async () => {
        try {
          const created = await createStaff(input);
          await refreshAfterStaffChange();
          return created;
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to add staff';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshAfterStaffChange, runWithLoader]
  );

  const updateStaff = useCallback(
    async (id: string, updates: UpdateStaffBody) => {
      if (Object.keys(updates).length === 0) return;
      return runWithLoader(async () => {
        try {
          await updateStaffApi(id, updates);
          await refreshAfterStaffChange();
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to update staff';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshAfterStaffChange, runWithLoader]
  );

  const deleteStaff = useCallback(
    async (id: string) => {
      return runWithLoader(async () => {
        try {
          await deleteStaffApi(id);
          await refreshAfterStaffChange();
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to remove staff';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshAfterStaffChange, runWithLoader]
  );

  const getAttendanceForDate = useCallback(
    (date: string) => attendance.filter((a) => a.date === date),
    [attendance]
  );

  const upsertAttendance = useCallback(
    async (staffId: string, date: string, status: AttendanceStatus) => {
      return runWithLoader(async () => {
        try {
          await putAttendance({ staffId, date, status });
          await Promise.all([refreshDaily(date), refreshSummary()]);
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to update attendance';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshDaily, refreshSummary, runWithLoader]
  );

  const clearAttendance = useCallback(
    async (staffId: string, date: string) => {
      return runWithLoader(async () => {
        try {
          await deleteAttendanceApi(staffId, date);
          await Promise.all([refreshDaily(date), refreshSummary()]);
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to clear attendance';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshDaily, refreshSummary, runWithLoader]
  );

  const markAllPresent = useCallback(
    async (date: string) => {
      return runWithLoader(async () => {
        try {
          await markAllPresentApi(date);
          await Promise.all([refreshDaily(date), refreshSummary()]);
        } catch (e) {
          const err = e instanceof Error ? e.message : 'Failed to mark all present';
          messageApi.error(err);
          throw new Error(err);
        }
      });
    },
    [messageApi, refreshDaily, refreshSummary, runWithLoader]
  );

  const value = useMemo(
    () => ({
      staff,
      staffLoading,
      staffMeta,
      summary,
      attendance,
      attendanceLoading,
      history,
      historyLoading,
      refreshStaff,
      refreshSummary,
      refreshDaily,
      refreshHistory,
      addStaff,
      updateStaff,
      deleteStaff,
      getStaff,
      getAttendanceForDate,
      upsertAttendance,
      clearAttendance,
      markAllPresent,
    }),
    [
      staff,
      staffLoading,
      staffMeta,
      summary,
      attendance,
      attendanceLoading,
      history,
      historyLoading,
      refreshStaff,
      refreshSummary,
      refreshDaily,
      refreshHistory,
      addStaff,
      updateStaff,
      deleteStaff,
      getStaff,
      getAttendanceForDate,
      upsertAttendance,
      clearAttendance,
      markAllPresent,
    ]
  );

  return (
    <StaffContext.Provider value={value}>
      {contextHolder}
      {children}
    </StaffContext.Provider>
  );
}

export function useStaff() {
  const ctx = useContext(StaffContext);
  if (!ctx) throw new Error('useStaff must be used within StaffProvider');
  return ctx;
}
