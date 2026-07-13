'use client';

import React, { useMemo } from 'react';
import {
  EventAvailable as EventAvailableIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Work as WorkIcon,
  PeopleAlt as PeopleAltIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import type { StaffSummary } from '../../lib/staffApi';
import {
  BRAND,
  DashboardError,
  DashboardHeader,
  QuickActionsSection,
  StatCardsGrid,
  filterQuickActions,
  type QuickAction,
  type StatCard,
} from './shared';
import { useGreeting } from './useDashboardData';

const HR_QUICK_ACTIONS: QuickAction[] = [
  { key: 'attendance', label: 'Staff & Attendance', icon: EventAvailableIcon, href: '/dashboard/attendance' },
  { key: 'payroll', label: 'Payroll', icon: WorkIcon, href: '/dashboard/payroll' },
  { key: 'users', label: 'System Users', icon: AdminPanelSettingsIcon, href: '/dashboard/users' },
];

export default function HrDashboard({
  staffSummary,
  error,
  canAccess,
}: {
  staffSummary: StaffSummary | null;
  error: string | null;
  canAccess: (path: string) => boolean;
}) {
  const { greeting, dateLabel } = useGreeting();

  const stats: StatCard[] = useMemo(() => {
    if (!staffSummary) return [];
    const cards: StatCard[] = [];

    if (canAccess('/dashboard/attendance')) {
      cards.push(
        {
          key: 'active-staff',
          label: 'Active Staff',
          value: String(staffSummary.activeStaff),
          icon: PeopleAltIcon,
          href: '/dashboard/attendance',
          accent: BRAND,
        },
        {
          key: 'present',
          label: 'Present Today',
          value: String(staffSummary.presentToday),
          icon: CheckCircleIcon,
          href: '/dashboard/attendance',
          accent: '#16a34a',
        },
        {
          key: 'absent',
          label: 'Absent Today',
          value: String(staffSummary.absentToday),
          icon: CancelIcon,
          href: '/dashboard/attendance',
          accent: '#dc2626',
        },
        {
          key: 'late',
          label: 'Late Today',
          value: String(staffSummary.lateToday),
          icon: ScheduleIcon,
          href: '/dashboard/attendance',
          accent: '#ea580c',
        }
      );
    }

    return cards;
  }, [staffSummary, canAccess]);

  const quickActions = filterQuickActions(HR_QUICK_ACTIONS, canAccess);

  return (
    <div className="space-y-5 sm:space-y-6">
      {error ? <DashboardError message={error} /> : null}
      <DashboardHeader
        dateLabel={dateLabel}
        greeting={greeting}
        subtitle="People management — staff records and daily attendance"
        primaryAction={
          canAccess('/dashboard/attendance')
            ? { label: 'Mark Attendance', href: '/dashboard/attendance', icon: EventAvailableIcon }
            : undefined
        }
      />
      {stats.length > 0 ? <StatCardsGrid stats={stats} /> : null}
      <QuickActionsSection
        actions={quickActions}
        title="People shortcuts"
        description="Staff, attendance, and user accounts"
      />
      {staffSummary && (staffSummary.unmarked ?? 0) > 0 && canAccess('/dashboard/attendance') ? (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 sm:px-5">
          <p className="text-sm font-semibold text-sky-900">
            {staffSummary.unmarked} staff member{staffSummary.unmarked !== 1 ? 's' : ''} not marked
            today
          </p>
          <p className="mt-0.5 text-xs text-sky-800">
            Open staff management to record today&apos;s attendance.
          </p>
        </div>
      ) : null}
      {!staffSummary && !error ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Attendance summary will appear here once staff records are set up.
          </p>
        </div>
      ) : null}
    </div>
  );
}
