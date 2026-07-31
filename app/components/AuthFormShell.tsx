'use client';

import React from 'react';
import { SYSTEM_LOGO } from '../lib/brand';

export const authFieldClassName =
  'w-full rounded-[10px] border border-neutral-200 bg-white py-3 pl-3.5 pr-11 text-[0.9375rem] text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#25395c] focus:shadow-[0_0_0_3px_rgba(37,57,92,0.14)]';

export function AuthFormShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-viewport w-full items-center justify-center bg-neutral-100 px-4 py-10">
      <div className="w-full max-w-[440px] overflow-hidden rounded-3xl bg-white shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] ring-1 ring-neutral-200/80">
        <div className="px-6 py-8 sm:px-9 sm:py-10">
          <a href="/login" className="mb-7 inline-flex min-w-0 items-center gap-3 no-underline">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900 p-1.5">
              <img src={SYSTEM_LOGO} alt="" className="max-h-full max-w-full object-contain" />
            </span>
            <span className="truncate text-[1.125rem] font-bold tracking-tight text-neutral-900">
              Onyx Build &amp; Partners
            </span>
          </a>

          <h1 className="text-[1.75rem] font-bold leading-[1.15] tracking-tight text-neutral-900">
            {title}
          </h1>
          <p className="mt-2.5 text-[0.9375rem] leading-snug text-neutral-500">{subtitle}</p>

          <div className="mt-7">{children}</div>

          {footer ? <div className="mt-6 text-sm text-neutral-500">{footer}</div> : null}
        </div>

        <p className="border-t border-neutral-100 px-6 py-4 text-xs text-neutral-400 sm:px-9">
          © Onyx Build &amp; Partners Limited {year}
        </p>
      </div>
    </div>
  );
}
