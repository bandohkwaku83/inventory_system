'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { MailOutline as MailOutlineIcon } from '@mui/icons-material';
import { AuthFormShell, authFieldClassName } from '../components/AuthFormShell';
import { forgotPasswordApi } from '../lib/authApi';
import { BRAND } from '../lib/brand';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Enter your email address.');
      return;
    }
    setSubmitting(true);
    try {
      await forgotPasswordApi(trimmed);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset email.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFormShell
      title="Forgot password"
      subtitle={
        submitted
          ? 'Check your inbox for the next step.'
          : 'Enter your account email and we’ll send a reset link if it exists.'
      }
      footer={
        <Link href="/login" className="font-medium text-[#25395c] hover:underline">
          Back to log in
        </Link>
      }
    >
      {submitted ? (
        <div
          className="rounded-[10px] border border-emerald-100 bg-emerald-50/90 px-3.5 py-3 text-sm font-medium text-emerald-800"
          role="status"
        >
          If an account exists for that email, we’ve sent a password reset link. It expires in one
          hour.
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
          <div>
            <label
              htmlFor="forgot-email"
              className="mb-2 block text-[0.8125rem] font-semibold text-neutral-600"
            >
              Email
            </label>
            <div className="relative">
              <input
                id="forgot-email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your Email"
                className={authFieldClassName}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                <MailOutlineIcon className="!text-[1.2rem]" />
              </span>
            </div>
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
            {submitting ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthFormShell>
  );
}
