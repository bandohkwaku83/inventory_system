'use client';

import React from 'react';
import { BRAND, SYSTEM_LOGO } from '../lib/brand';

interface LoaderProps {
  isLoading: boolean;
}

export default function Loader({ isLoading }: LoaderProps) {
  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ease-out ${
        isLoading ? 'opacity-100' : 'pointer-events-none opacity-0'
      }`}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      aria-hidden={!isLoading}
    >
      <div className="flex flex-col items-center">
        <span
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl p-1.5 shadow-[0_8px_24px_-12px_rgba(37,57,92,0.35)]"
          style={{ backgroundColor: BRAND }}
        >
          <img src={SYSTEM_LOGO} alt="" className="max-h-full max-w-full object-contain" />
        </span>

        <div className="mt-5 text-center">
          <p className="text-[15px] font-semibold tracking-tight text-slate-900">
            Onyx Build &amp; Partners
          </p>
          <p className="mt-1 text-[10.5px] font-medium uppercase tracking-[0.22em] text-slate-400">
            Inventory
          </p>
        </div>

        <div className="mt-6 h-[2px] w-28 overflow-hidden rounded-full bg-slate-200/80" aria-hidden>
          <div
            className="h-full w-1/3 rounded-full animate-loader-line"
            style={{ backgroundColor: BRAND }}
          />
        </div>
      </div>
    </div>
  );
}
