'use client';

import { useEffect, useState } from 'react';
import {
  fetchDashboard,
  fetchDashboardSummary,
  type DashboardData,
  type DashboardSummary,
} from '../../lib/dashboardApi';
import { fetchStaffSummary, type StaffSummary } from '../../lib/staffApi';

export function useDashboardData() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [dash, sum, staff] = await Promise.all([
          fetchDashboard({ days: 7, topLimit: 5, recentLimit: 10 }),
          fetchDashboardSummary().catch(() => null),
          fetchStaffSummary().catch(() => null),
        ]);
        if (!cancelled) {
          setDashboard(dash);
          setSummary(sum);
          setStaffSummary(staff);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { dashboard, summary, staffSummary, loading, error };
}

export function useGreeting() {
  const today = new Date();
  const greeting = (() => {
    const h = today.getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  })();
  const dateLabel = today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  return { greeting, dateLabel };
}
