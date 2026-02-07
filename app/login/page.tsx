'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { Storefront as StorefrontIcon, CheckCircle as CheckIcon } from '@mui/icons-material';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [role, setRole] = useState<'admin' | 'sales'>('sales');

  useEffect(() => {
    if (user) router.replace('/dashboard');
  }, [user, router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    login('', role);
    router.push('/dashboard');
  };

  const roles: { id: 'admin' | 'sales'; title: string; description: string }[] = [
    { id: 'admin', title: 'Admin', description: 'Full access to all areas' },
    { id: 'sales', title: 'Sales person', description: 'Dashboard, products, sales (POS) and receipts' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:flex sm:items-center sm:justify-center login-safe-area">
      <div className="mx-auto w-full max-w-[400px]">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200/60">
          {/* Header strip */}
          <div className="bg-teal-600 px-6 py-8 text-white">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20">
                <StorefrontIcon className="!text-[2rem]" />
              </div>
              <div className="text-left">
                <h1 className="text-xl font-bold tracking-tight">Inventory System</h1>
                <p className="text-sm text-teal-100">Sign in to continue</p>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 py-8 sm:px-8">
            <fieldset className="border-0 p-0">
              <legend className="mb-3 block text-sm font-medium text-slate-700">Role</legend>
              <div className="space-y-2">
                {roles.map((r) => {
                  const isSelected = role === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setRole(r.id)}
                      aria-pressed={isSelected}
                      className={`flex w-full items-start gap-4 rounded-xl border-2 px-4 py-3.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                        isSelected
                          ? 'border-teal-500 bg-teal-50/80'
                          : 'border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-100/80'
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                          isSelected ? 'border-teal-500 bg-teal-500' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <CheckIcon className="text-white !text-[14px]" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <span className={`block font-semibold ${isSelected ? 'text-teal-800' : 'text-slate-800'}`}>
                          {r.title}
                        </span>
                        <span className="mt-0.5 block text-xs text-slate-500">{r.description}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <button
              type="submit"
              className="mt-8 w-full rounded-xl bg-teal-600 py-3.5 font-semibold text-white shadow-md transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
            >
              Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
