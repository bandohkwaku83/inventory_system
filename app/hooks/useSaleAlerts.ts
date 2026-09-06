'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { notification } from 'antd';
import { useAuth } from '../context/AuthContext';
import { isAdminRole } from '../lib/permissions';
import {
  fetchRecentSales,
  formatDashboardCurrency,
  type RecentSale,
} from '../lib/dashboardApi';
import {
  relativeTime,
  type AppNotification,
} from '../lib/enterpriseDummyData';

const POLL_MS = 20_000;
const READ_KEY = 'inv-sale-notif-read';
const SEEN_TOAST_KEY = 'inv-sale-toast-seen';
const BOOTSTRAP_KEY = 'inv-sale-alert-bootstrapped';

function readIdSet(key: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? new Set(parsed.map(String)) : new Set();
  } catch {
    return new Set();
  }
}

function writeIdSet(key: string, ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  const trimmed = [...ids].slice(-200);
  localStorage.setItem(key, JSON.stringify(trimmed));
}

function saleToNotification(sale: RecentSale, readIds: Set<string>): AppNotification {
  const currency = sale.currency || 'GHS';
  const amount = formatDashboardCurrency(sale.total, currency);
  const items =
    sale.itemsSummary?.trim() ||
    sale.items
      ?.map((i) => `${i.name} ×${i.quantity}`)
      .join(', ') ||
    'Sale completed';

  return {
    id: `sale-${sale._id || sale.receiptId}`,
    type: 'payment',
    title: `Sale ${sale.receiptId || ''}`.trim() || 'New sale',
    message: `${amount} · ${items}`,
    createdAt: sale.timestamp || new Date().toISOString(),
    read: readIds.has(sale._id) || readIds.has(sale.receiptId),
    href: '/dashboard/receipts',
    priority: 'high',
  };
}

/**
 * Polls recent sales for admin users and surfaces them in the notification bell.
 * Shows a toast for newly completed sales after the first successful poll (avoids
 * spamming on page load). Full push delivery still needs a backend notifications API.
 */
export function useSaleAlerts(): {
  notifications: AppNotification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  relativeTime: typeof relativeTime;
  enabled: boolean;
} {
  const { user } = useAuth();
  const enabled = Boolean(user && isAdminRole(user.role));
  const [sales, setSales] = useState<RecentSale[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(() => readIdSet(READ_KEY));
  const bootstrappedRef = useRef(false);

  const applySales = useCallback((items: RecentSale[]) => {
    setSales(items);

    if (typeof window === 'undefined') return;

    const seenToasts = readIdSet(SEEN_TOAST_KEY);
    const alreadyBootstrapped = localStorage.getItem(BOOTSTRAP_KEY) === '1';

    if (!alreadyBootstrapped) {
      for (const sale of items) {
        seenToasts.add(sale._id || sale.receiptId);
      }
      writeIdSet(SEEN_TOAST_KEY, seenToasts);
      localStorage.setItem(BOOTSTRAP_KEY, '1');
      bootstrappedRef.current = true;
      return;
    }

    bootstrappedRef.current = true;
    const fresh = items.filter((s) => {
      const id = s._id || s.receiptId;
      return id && !seenToasts.has(id);
    });

    for (const sale of fresh) {
      const id = sale._id || sale.receiptId;
      seenToasts.add(id);
      const currency = sale.currency || 'GHS';
      const amount = formatDashboardCurrency(sale.total, currency);
      const itemsLabel =
        sale.itemsSummary?.trim() ||
        sale.items?.map((i) => `${i.name} ×${i.quantity}`).join(', ') ||
        'Items';

      notification.success({
        message: `New sale · ${amount}`,
        description: itemsLabel,
        placement: 'topRight',
        duration: 6,
      });
    }

    if (fresh.length) writeIdSet(SEEN_TOAST_KEY, seenToasts);
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSales([]);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetchRecentSales(15);
        if (!cancelled) applySales(res.items ?? []);
      } catch {
        /* silent — bell stays empty rather than noisy errors */
      }
    };

    void poll();
    const timer = window.setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [enabled, applySales]);

  const notifications = sales.map((s) => saleToNotification(s, readIds));
  const unread = notifications.filter((n) => !n.read).length;

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      const raw = id.replace(/^sale-/, '');
      next.add(id);
      next.add(raw);
      writeIdSet(READ_KEY, next);
      return next;
    });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      for (const s of sales) {
        next.add(s._id);
        next.add(s.receiptId);
        next.add(`sale-${s._id || s.receiptId}`);
      }
      writeIdSet(READ_KEY, next);
      return next;
    });
  }, [sales]);

  return {
    notifications,
    unread,
    markRead,
    markAllRead,
    relativeTime,
    enabled,
  };
}
