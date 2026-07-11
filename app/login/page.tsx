'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  MailOutline as MailOutlineIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { BRAND, SYSTEM_LOGO } from '../lib/brand';

const LOGIN_HERO_IMAGE = '/images/login-image.png';

const LOGIN_HERO_MENU_LABELS: readonly string[] = [
  'Products',
  'Inventory',
  'Purchases',
  'Sales',
  'Expenses',
];

const fieldClassName =
  'w-full rounded-[10px] border border-neutral-200 bg-white py-3 pl-3.5 pr-11 text-[0.9375rem] text-neutral-900 shadow-sm outline-none transition placeholder:text-neutral-400 hover:border-neutral-300 focus:border-[#25395c] focus:shadow-[0_0_0_3px_rgba(37,57,92,0.14)]';

function HeroMenuStripLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
      {children}
    </span>
  );
}

export default function LoginPage() {
  const { user, login, isBootstrapping } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    if (!isBootstrapping && user) router.replace('/dashboard');
  }, [user, isBootstrapping, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !password) {
      setError('Enter your email and password.');
      return;
    }
    setSubmitting(true);
    try {
      await login(trimmed, password);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isBootstrapping) {
    return (
      <div className="flex h-viewport items-center justify-center bg-white">
        <p className="text-sm text-neutral-500">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="h-viewport w-full overflow-hidden bg-white lg:bg-neutral-100 lg:p-8 xl:p-12 2xl:p-16">
      <div className="mx-auto grid h-full w-full max-w-[1360px] overflow-hidden bg-white lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:rounded-3xl lg:shadow-[0_25px_50px_-12px_rgba(0,0,0,0.12)] lg:ring-1 lg:ring-neutral-200/80">
        {/* ── Hero column (left) ── */}
        <aside
          className="relative hidden h-full min-h-0 flex-col overflow-hidden text-white lg:flex lg:rounded-l-3xl"
          style={{ backgroundColor: BRAND }}
          aria-label="Product preview"
        >
          <div className="relative z-[1] flex h-full min-h-0 w-full flex-1 flex-col px-6 py-8 sm:px-8 lg:px-10 lg:py-10 xl:px-12">
            <header className="w-full shrink-0">
              <h2 className="max-w-[22ch] text-balance text-[1.75rem] font-bold leading-[1.15] tracking-tight text-white lg:text-[2rem] lg:leading-[1.15] xl:text-[2.125rem]">
                The simplest way to manage your store
              </h2>
              <p className="mt-3 max-w-[52ch] text-pretty text-[0.9375rem] leading-relaxed text-white/85 lg:mt-4">
                Sign in to reach your dashboard, inventory, and day-to-day operations in one place.
              </p>
            </header>

            <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-center py-4 lg:py-4">
              <div
                className="relative flex w-full max-w-[min(100%,50rem)] max-h-full items-center justify-center"
                style={{ filter: 'drop-shadow(0 18px 36px rgba(0,0,0,0.22))' }}
              >
                <div className="relative w-full overflow-hidden">
                  <Image
                    src={LOGIN_HERO_IMAGE}
                    alt="Onyx inventory dashboard preview"
                    width={1400}
                    height={900}
                    className="h-auto max-h-full w-full object-contain"
                    sizes="(max-width: 1024px) 100vw, 55vw"
                    priority
                  />
                </div>
              </div>
            </div>

            <footer className="mt-auto w-full shrink-0 border-t border-white/20 pt-5">
              <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 lg:justify-between">
                {LOGIN_HERO_MENU_LABELS.map((label) => (
                  <HeroMenuStripLabel key={label}>{label}</HeroMenuStripLabel>
                ))}
              </div>
            </footer>
          </div>
        </aside>

        {/* ── Form column (right) ── */}
        <main className="relative flex h-full min-h-0 flex-col justify-between overflow-y-auto bg-white lg:rounded-r-3xl">
          <div className="mx-auto flex w-full max-w-[420px] shrink-0 flex-1 flex-col justify-center px-6 py-6 sm:max-w-[460px] sm:px-8 lg:px-12">
            <div className="w-full">
              <a href="/login" className="mb-7 inline-flex min-w-0 items-center gap-3 no-underline">
                <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-neutral-900 p-1.5 sm:h-[4.5rem] sm:w-[4.5rem]">
                  <img src={SYSTEM_LOGO} alt="" className="max-h-full max-w-full object-contain" />
                </span>
                <span className="truncate text-[1.25rem] font-bold tracking-tight text-neutral-900 sm:text-[1.375rem]">
                  Onyx Build &amp; Partners
                </span>
              </a>

              <h1
                id="login-title"
                className="text-[1.875rem] font-bold leading-[1.15] tracking-tight text-neutral-900 sm:text-[2rem]"
              >
                Log in
              </h1>
              <p className="mt-2.5 text-[0.9375rem] leading-snug text-neutral-500 lg:whitespace-nowrap">
                Welcome back. Enter your email and password to continue.
              </p>

              <form
                onSubmit={handleSubmit}
                className="mt-7 flex flex-col gap-4"
                aria-labelledby="login-title"
                aria-describedby={error ? 'login-error' : undefined}
              >
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600">
                    Email
                  </label>
                  <div className="relative">
                    <input
                      id="login-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Your Email"
                      className={fieldClassName}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                      <MailOutlineIcon className="!text-[1.2rem]" />
                    </span>
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      className={fieldClassName}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon className="!text-[1.2rem]" />
                      ) : (
                        <VisibilityIcon className="!text-[1.2rem]" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="-mt-0.5 text-right">
                  <a
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="text-sm font-medium text-red-500 underline-offset-2 hover:text-red-600 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>

                {error && (
                  <p
                    id="login-error"
                    className="rounded-[10px] border border-red-100 bg-red-50/90 px-3.5 py-2.5 text-sm font-medium text-red-700"
                    role="alert"
                  >
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[10px] py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_6px_22px_-6px_rgba(37,57,92,0.55)] transition hover:shadow-[0_10px_28px_-6px_rgba(37,57,92,0.58)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25395c]/50 focus-visible:ring-offset-2 active:translate-y-px active:shadow-[0_4px_14px_-4px_rgba(37,57,92,0.45)] disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: BRAND }}
                >
                  {submitting ? 'Signing in…' : 'LOGIN'}
                </button>
              </form>
            </div>
          </div>

          <p className="mx-auto w-full max-w-[420px] shrink-0 px-6 pb-5 pt-2 text-left text-xs text-neutral-400 sm:max-w-[460px] sm:px-8 lg:px-12">
            © Onyx Build &amp; Partners Limited {year}
          </p>
        </main>
      </div>
    </div>
  );
}
