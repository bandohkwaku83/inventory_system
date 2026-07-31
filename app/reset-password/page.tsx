'use client';

import React, { Suspense, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { AuthFormShell, authFieldClassName } from '../components/AuthFormShell';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../lib/brand';

const MIN_PASSWORD_LENGTH = 6;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword } = useAuth();

  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams]);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [linkExpired, setLinkExpired] = useState(!token);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!token) {
      setLinkExpired(true);
      return;
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const user = await resetPassword(token, password);
      router.replace(user.mustResetPassword ? '/change-password' : '/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not reset password.';
      if (/expired|invalid|not found|token/i.test(msg)) {
        setLinkExpired(true);
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (linkExpired) {
    return (
      <AuthFormShell
        title="Link expired"
        subtitle="This reset link is invalid or has expired. Request a new one to continue."
        footer={
          <div className="flex flex-col gap-2">
            <Link href="/forgot-password" className="font-medium text-[#25395c] hover:underline">
              Request a new reset link
            </Link>
            <Link href="/login" className="font-medium text-neutral-600 hover:underline">
              Back to log in
            </Link>
          </div>
        }
      >
        <div
          className="rounded-[10px] border border-amber-100 bg-amber-50/90 px-3.5 py-3 text-sm font-medium text-amber-900"
          role="status"
        >
          Password reset links expire after one hour (invite links after seven days).
        </div>
      </AuthFormShell>
    );
  }

  return (
    <AuthFormShell
      title="Set new password"
      subtitle="Choose a new password for your account. You’ll be signed in afterward."
      footer={
        <Link href="/login" className="font-medium text-[#25395c] hover:underline">
          Back to log in
        </Link>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="reset-password"
            className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
          >
            New password
          </label>
          <div className="relative">
            <input
              id="reset-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
              className={authFieldClassName}
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

        <div>
          <label
            htmlFor="reset-confirm"
            className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
          >
            Confirm password
          </label>
          <input
            id="reset-confirm"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            className={`${authFieldClassName} !pr-3.5`}
          />
        </div>

        {error ? (
          <p
            className="rounded-[10px] border border-red-100 bg-red-50/90 px-3.5 py-2.5 text-sm font-medium text-red-700"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-[10px] py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-[0_6px_22px_-6px_rgba(37,57,92,0.55)] transition hover:shadow-[0_10px_28px_-6px_rgba(37,57,92,0.58)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25395c]/50 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70"
          style={{ backgroundColor: BRAND }}
        >
          {submitting ? 'Saving…' : 'Set password'}
        </button>
      </form>
    </AuthFormShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-viewport items-center justify-center bg-neutral-100">
          <p className="text-sm text-neutral-500">Loading…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
