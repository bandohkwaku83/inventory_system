'use client';

import React from 'react';
import { Storefront as StorefrontIcon } from '@mui/icons-material';

interface LoaderProps {
  isLoading: boolean;
}

export default function Loader({ isLoading }: LoaderProps) {
  if (!isLoading) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-teal-600 via-teal-700 to-teal-800"
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      {/* Subtle pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '24px 24px',
        }}
        aria-hidden
      />

      <div className="relative flex flex-col items-center gap-10">
        {/* Icon + text */}
        <div className="flex flex-col items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-white/15 backdrop-blur-sm ring-1 ring-white/20 shadow-2xl">
            <StorefrontIcon className="text-white text-5xl" />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-sm">
              Inventory System
            </h1>
            <p className="mt-2 text-sm font-medium text-teal-100">
              Please wait
            </p>
          </div>
        </div>

        {/* Dots pulse */}
        <div className="flex items-center gap-2" aria-hidden>
          <span className="h-2 w-2 rounded-full bg-white/90 animate-loader-dot [animation-delay:0ms]" />
          <span className="h-2 w-2 rounded-full bg-white/90 animate-loader-dot [animation-delay:160ms]" />
          <span className="h-2 w-2 rounded-full bg-white/90 animate-loader-dot [animation-delay:320ms]" />
        </div>
      </div>

      {/* Bottom line loader */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
        <div
          className="h-full w-1/3 bg-white rounded-full animate-loader-line"
          aria-hidden
        />
      </div>
    </div>
  );
}
