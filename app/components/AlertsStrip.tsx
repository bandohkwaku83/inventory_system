'use client';

import React from 'react';
import Link from 'next/link';
import {
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  LocalShipping as TransferIcon,
  Payment as PaymentIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export type AlertItem = {
  id: string;
  type: 'warning' | 'info' | 'success' | 'danger';
  title: string;
  message: string;
  href?: string;
  actionLabel?: string;
};

const ALERT_STYLES: Record<
  AlertItem['type'],
  { bg: string; border: string; icon: string; text: string }
> = {
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: 'text-amber-600',
    text: 'text-amber-900',
  },
  info: {
    bg: 'bg-sky-50',
    border: 'border-sky-200',
    icon: 'text-sky-600',
    text: 'text-sky-900',
  },
  success: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: 'text-emerald-600',
    text: 'text-emerald-900',
  },
  danger: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    icon: 'text-red-600',
    text: 'text-red-900',
  },
};

const ALERT_ICONS: Record<AlertItem['type'], React.ElementType> = {
  warning: WarningIcon,
  info: TransferIcon,
  success: CheckIcon,
  danger: PaymentIcon,
};

export default function AlertsStrip({
  alerts,
  onDismiss,
}: {
  alerts: AlertItem[];
  onDismiss?: (id: string) => void;
}) {
  if (alerts.length === 0) return null;

  return (
    <section
      className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Action alerts"
    >
      {alerts.map((alert) => {
        const styles = ALERT_STYLES[alert.type];
        const Icon = ALERT_ICONS[alert.type];
        const inner = (
          <div
            className={`group relative flex items-start gap-3 rounded-xl border p-3.5 transition-all hover:shadow-md ${styles.bg} ${styles.border}`}
          >
            <span className={`mt-0.5 shrink-0 ${styles.icon}`}>
              <Icon className="!text-[1.1rem]" />
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[12.5px] font-bold leading-tight ${styles.text}`}>
                {alert.title}
              </p>
              <p className={`mt-0.5 text-[11.5px] leading-snug opacity-80 ${styles.text}`}>
                {alert.message}
              </p>
              {alert.actionLabel && alert.href && (
                <span className="mt-1.5 inline-block text-[11px] font-semibold underline underline-offset-2 opacity-90">
                  {alert.actionLabel} →
                </span>
              )}
            </div>
            {onDismiss && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDismiss(alert.id);
                }}
                className="shrink-0 rounded p-0.5 opacity-40 transition hover:opacity-100"
                aria-label="Dismiss alert"
              >
                <CloseIcon className="!text-[0.9rem]" />
              </button>
            )}
          </div>
        );

        return alert.href ? (
          <Link key={alert.id} href={alert.href} className="block">
            {inner}
          </Link>
        ) : (
          <div key={alert.id}>{inner}</div>
        );
      })}
    </section>
  );
}
