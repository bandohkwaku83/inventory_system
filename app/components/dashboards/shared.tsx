'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from 'antd';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { BRAND } from '../../lib/brand';

export { BRAND };

export type StatCard = {
  key: string;
  label: string;
  value: string;
  delta?: { value: string; trend: 'up' | 'down' };
  icon: React.ElementType;
  href: string;
  accent: string;
  spark?: number[];
};

export type QuickAction = {
  key: string;
  label: string;
  icon: React.ElementType;
  href: string;
};

export function Sparkline({
  id,
  data,
  color,
  height = 36,
}: {
  id: string;
  data: number[];
  color: string;
  height?: number;
}) {
  const width = 100;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const padY = 3;
  const usableH = height - padY * 2;
  const points = data.map((v, i) => {
    const x = i * step;
    const y = padY + (1 - (v - min) / range) * usableH;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const lineD = `M ${points.join(' L ')}`;
  const areaD = `${lineD} L ${width.toFixed(2)},${height} L 0,${height} Z`;
  const gradientId = `spark-grad-${id}`;
  const lastIdx = data.length - 1;
  const last = points[lastIdx]?.split(',').map(Number) ?? [width, height / 2];
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="block h-9 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradientId})`} />
      <path
        d={lineD}
        stroke={color}
        strokeWidth={1.6}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2.4} fill={color} />
      <circle cx={last[0]} cy={last[1]} r={4.6} fill={color} fillOpacity={0.18} />
    </svg>
  );
}

export function DashboardHeader({
  dateLabel,
  greeting,
  subtitle,
  primaryAction,
}: {
  dateLabel: string;
  greeting: string;
  subtitle?: string;
  primaryAction?: { label: string; href: string; icon: React.ElementType };
}) {
  const PrimaryIcon = primaryAction?.icon;
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
          {dateLabel}
        </p>
        <h1 className="mt-1 text-[1.5rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-[1.75rem]">
          {greeting}, welcome back
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        ) : null}
      </div>
      {primaryAction && PrimaryIcon ? (
        <Button
          type="primary"
          href={primaryAction.href}
          icon={<PrimaryIcon className="!text-[1rem]" />}
        >
          {primaryAction.label}
        </Button>
      ) : null}
    </header>
  );
}

export function DashboardError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function StatCardsGrid({ stats }: { stats: StatCard[] }) {
  return (
    <section
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      aria-label="Key metrics"
    >
      {stats.map((s) => {
        const Icon = s.icon;
        const trendUp = s.delta?.trend === 'up';
        const accent = s.accent;
        return (
          <Link
            key={s.key}
            href={s.href}
            className="group relative isolate flex flex-col overflow-hidden rounded-2xl bg-white p-5 ring-1 ring-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-20px_rgba(15,23,42,0.25)]"
            style={{
              backgroundImage: `linear-gradient(180deg, ${accent}07 0%, transparent 55%)`,
            }}
          >
            <span
              className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full opacity-70 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background: `radial-gradient(circle at center, ${accent}26, transparent 70%)`,
              }}
              aria-hidden
            />
            <div className="relative flex items-start justify-between gap-3">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-500">
                {s.label}
              </p>
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm ring-1 ring-inset transition-transform duration-300 group-hover:scale-110"
                style={{
                  background: `linear-gradient(135deg, ${accent} 0%, ${accent}cc 100%)`,
                  color: '#ffffff',
                  boxShadow: `0 6px 16px -8px ${accent}99`,
                  // @ts-expect-error css variable
                  '--tw-ring-color': `${accent}33`,
                }}
              >
                <Icon className="!text-[1.05rem]" />
              </span>
            </div>
            <div className="relative mt-4 flex items-end gap-2">
              <p className="text-[2rem] font-extrabold leading-none tracking-tight text-slate-900">
                {s.value}
              </p>
              {s.delta ? (
                <span
                  className={`mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10.5px] font-bold ${
                    trendUp ? 'bg-[#25395c]/10 text-[#25395c]' : 'bg-red-50 text-red-700'
                  }`}
                >
                  {trendUp ? (
                    <TrendingUpIcon className="!text-[0.85rem]" />
                  ) : (
                    <TrendingDownIcon className="!text-[0.85rem]" />
                  )}
                  {s.delta.value}
                </span>
              ) : null}
            </div>
            {s.spark?.length ? (
              <div className="relative -mx-5 -mb-5 mt-5">
                <Sparkline id={s.key} data={s.spark} color={accent} height={44} />
              </div>
            ) : null}
          </Link>
        );
      })}
    </section>
  );
}

export function QuickActionsSection({
  actions,
  title = 'Quick actions',
  description = 'Jump to your most common tasks',
}: {
  actions: QuickAction[];
  title?: string;
  description?: string;
}) {
  if (actions.length === 0) return null;
  return (
    <section
      className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5"
      aria-label="Quick actions"
    >
      <div className="mb-3">
        <h2 className="text-sm font-bold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <Link
              key={a.key}
              href={a.href}
              className="group flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:border-transparent hover:bg-white hover:shadow-md"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors"
                style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
              >
                <Icon className="!text-[1.1rem]" />
              </span>
              <span className="text-[12.5px] font-semibold text-slate-700 group-hover:text-slate-900">
                {a.label}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function SectionCard({
  title,
  subtitle,
  href,
  linkLabel = 'View all',
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  linkLabel?: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${BRAND}14`, color: BRAND }}
          >
            <Icon className="!text-[1.05rem]" />
          </span>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{title}</h2>
            {subtitle ? <p className="text-[11.5px] text-slate-500">{subtitle}</p> : null}
          </div>
        </div>
        {href ? (
          <Link
            href={href}
            className="text-xs font-semibold transition hover:underline"
            style={{ color: BRAND }}
          >
            {linkLabel}
          </Link>
        ) : null}
      </header>
      <div className="px-2 py-1.5 sm:px-3 sm:py-2 overflow-x-auto">{children}</div>
    </div>
  );
}

export function filterQuickActions(
  actions: QuickAction[],
  canAccess: (path: string) => boolean
): QuickAction[] {
  return actions.filter((a) => canAccess(a.href));
}
