'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  Notifications as NotificationsIcon,
  Inventory2 as StockIcon,
  CheckCircle as ApprovalIcon,
  LocalShipping as TransferIcon,
  Payment as PaymentIcon,
  Info as SystemIcon,
} from '@mui/icons-material';
import { NOTIFICATIONS, relativeTime, type AppNotification } from '../lib/enterpriseDummyData';

const TYPE_ICONS: Record<AppNotification['type'], React.ElementType> = {
  low_stock: StockIcon,
  approval: ApprovalIcon,
  transfer: TransferIcon,
  payment: PaymentIcon,
  system: SystemIcon,
};

const PRIORITY_DOT: Record<AppNotification['priority'], string> = {
  high: 'bg-red-500',
  medium: 'bg-amber-500',
  low: 'bg-slate-300',
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <NotificationsIcon className="!text-[1.15rem]" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,360px)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in-down">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-800">Notifications</p>
              {unread > 0 && (
                <p className="text-[11px] text-slate-500">{unread} unread</p>
              )}
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] font-semibold text-[#25395c] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-[360px] overflow-y-auto">
            {notifications.map((n) => {
              const Icon = TYPE_ICONS[n.type];
              const content = (
                <div
                  className={`flex gap-3 px-4 py-3 transition-colors hover:bg-slate-50 ${
                    !n.read ? 'bg-sky-50/40' : ''
                  }`}
                >
                  <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#25395c]/8 text-[#25395c]">
                    <Icon className="!text-[1rem]" />
                    {!n.read && (
                      <span
                        className={`absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ${PRIORITY_DOT[n.priority]}`}
                      />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-slate-800">{n.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-slate-500">{n.message}</p>
                    <p className="mt-1 text-[10px] font-medium text-slate-400">
                      {relativeTime(n.createdAt)}
                    </p>
                  </div>
                </div>
              );
              return (
                <li key={n.id} className="border-b border-slate-50 last:border-0">
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={() => {
                        markRead(n.id);
                        setOpen(false);
                      }}
                    >
                      {content}
                    </Link>
                  ) : (
                    <button type="button" className="w-full text-left" onClick={() => markRead(n.id)}>
                      {content}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
