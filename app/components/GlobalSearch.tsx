'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  Inventory2 as ProductIcon,
  People as CustomerIcon,
  Receipt as ReceiptIcon,
  LocalShipping as SupplierIcon,
  Person as StaffIcon,
  Dashboard as PageIcon,
} from '@mui/icons-material';
import { GLOBAL_SEARCH_INDEX, type GlobalSearchResult } from '../lib/enterpriseDummyData';

const TYPE_ICONS: Record<GlobalSearchResult['type'], React.ElementType> = {
  product: ProductIcon,
  customer: CustomerIcon,
  receipt: ReceiptIcon,
  supplier: SupplierIcon,
  staff: StaffIcon,
  page: PageIcon,
};

const TYPE_LABELS: Record<GlobalSearchResult['type'], string> = {
  product: 'Product',
  customer: 'Customer',
  receipt: 'Receipt',
  supplier: 'Supplier',
  staff: 'Staff',
  page: 'Page',
};

interface GlobalSearchProps {
  navPages?: { title: string; subtitle: string; href: string }[];
}

export default function GlobalSearch({ navPages = [] }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const q = query.trim().toLowerCase();

  const results: GlobalSearchResult[] = q
    ? [
        ...GLOBAL_SEARCH_INDEX.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.subtitle.toLowerCase().includes(q) ||
            r.type.includes(q)
        ),
        ...navPages
          .filter(
            (p) =>
              p.title.toLowerCase().includes(q) || p.subtitle.toLowerCase().includes(q)
          )
          .map((p, i) => ({
            id: `page-${i}`,
            type: 'page' as const,
            title: p.title,
            subtitle: p.subtitle,
            href: p.href,
          })),
      ].slice(0, 8)
    : [];

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  const navigate = (href: string) => {
    router.push(href);
    setQuery('');
    setOpen(false);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter' && results[activeIdx]) {
      e.preventDefault();
      navigate(results[activeIdx].href);
    }
  };

  return (
    <div ref={containerRef} className="relative min-w-0 flex-1 max-w-[400px]">
      <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
        <SearchIcon className="text-base" />
      </div>
      <input
        ref={inputRef}
        type="search"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Search products, customers, receipts…"
        aria-label="Global search"
        aria-expanded={open && results.length > 0}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-16 text-sm outline-none transition-all focus:border-[#25395c] focus:bg-white focus:ring-4 focus:ring-[rgba(37,57,92,0.12)] sm:py-2.5 sm:pl-10"
      />
      <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 sm:flex">
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            className="pointer-events-auto rounded p-0.5 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <CloseIcon className="!text-[0.95rem]" />
          </button>
        ) : (
          <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
            ⌘/
          </kbd>
        )}
      </span>

      {open && q && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl animate-fade-in-down">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-slate-500">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <ul role="listbox" className="max-h-[320px] overflow-y-auto py-1">
              {results.map((r, i) => {
                const Icon = TYPE_ICONS[r.type];
                const isActive = i === activeIdx;
                return (
                  <li key={r.id} role="option" aria-selected={isActive}>
                    <button
                      type="button"
                      onClick={() => navigate(r.href)}
                      onMouseEnter={() => setActiveIdx(i)}
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                        isActive ? 'bg-slate-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#25395c]/8 text-[#25395c]">
                        <Icon className="!text-[1rem]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{r.title}</p>
                        <p className="truncate text-xs text-slate-500">{r.subtitle}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {TYPE_LABELS[r.type]}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
