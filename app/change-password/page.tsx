'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { AuthFormShell, authFieldClassName } from '../components/AuthFormShell';
import { useAuth } from '../context/AuthContext';
import { BRAND } from '../lib/brand';

const MIN_PASSWORD_LENGTH = 6;

export default function ChangePasswordPage() {
  const router = useRouter();
  const { user, isBootstrapping, changePassword, logout } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const forced = Boolean(user?.mustResetPassword);

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, isBootstrapping, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentPassword || !newPassword) {
      setError('Enter your current and new passwords.');
      return;
    }
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (newPassword !== confirm) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('Choose a new password that is different from your current one.');
      return;
    }

    setSubmitting(true);
    try {
      const next = await changePassword(currentPassword, newPassword);
      router.replace(next.mustResetPassword ? '/change-password' : '/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isBootstrapping || !user) {
    return (
      <div className="flex min-h-viewport items-center justify-center bg-neutral-100">
        <p className="text-sm text-neutral-500">Checking session…</p>
      </div>
    );
  }

  return (
    <AuthFormShell
      title={forced ? 'Set your password' : 'Change password'}
      subtitle={
        forced
          ? 'For security, you must set a new password before continuing.'
          : 'Update the password for your account.'
      }
      footer={
        forced ? (
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            className="font-medium text-neutral-600 hover:underline"
          >
            Log out
          </button>
        ) : (
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="font-medium text-[#25395c] hover:underline"
          >
            Back to dashboard
          </button>
        )
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="current-password"
            className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
          >
            Current password
          </label>
          <div className="relative">
            <input
              id="current-password"
              name="currentPassword"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
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
            htmlFor="new-password"
            className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
          >
            New password
          </label>
          <input
            id="new-password"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            className={`${authFieldClassName} !pr-3.5`}
          />
        </div>

        <div>
          <label
            htmlFor="confirm-password"
            className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
          >
            Confirm new password
          </label>
          <input
            id="confirm-password"
            name="confirm"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat new password"
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
          {submitting ? 'Saving…' : forced ? 'Save and continue' : 'Update password'}
        </button>
      </form>
    </AuthFormShell>
  );
}
