'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Search as SearchIcon,
  LocalShipping as LocalShippingIcon,
  Storefront as StorefrontIcon,
  AccountCircle as AccountCircleIcon,
  AttachMoney as AttachMoneyIcon,
  BarChart as BarChartIcon,
  Description as DescriptionIcon,
  LocalOffer as LocalOfferIcon,
  Sell as SellIcon,
  Work as WorkIcon,
  EventAvailable as EventAvailableIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Logout as LogoutIcon,
  Inventory2 as InventoryIcon,
  Category as CategoryIcon,
  Gavel as GavelIcon,
  Settings as SettingsIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { roleLabel } from '../context/UsersContext';
import { useSettings } from '../context/SettingsContext';
import {
  PATH_PERMISSIONS,
  defaultLandingPath,
  userCanAccessPath,
} from '../lib/permissions';
import { BRAND, BRAND_DEEP, SYSTEM_LOGO } from '../lib/brand';
import { useActionLoader } from './LoaderProvider';

type MenuItem = {
  text: string;
  icon: React.ElementType;
  path: string;
};

type MenuSection = {
  heading: string;
  items: MenuItem[];
};

const menuSections: MenuSection[] = [
  {
    heading: 'Overview',
    items: [
      { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
      { text: 'Charts', icon: BarChartIcon, path: '/dashboard/charts' },
    ],
  },
  {
    heading: 'Catalog',
    items: [
      { text: 'Products', icon: StorefrontIcon, path: '/dashboard/products' },
      { text: 'Inventory', icon: InventoryIcon, path: '/dashboard/inventory' },
      { text: 'Categories', icon: CategoryIcon, path: '/dashboard/categories' },
      { text: 'Price List', icon: SellIcon, path: '/dashboard/price-list' },
      { text: 'Suppliers', icon: LocalOfferIcon, path: '/dashboard/suppliers' },
      { text: 'Purchases', icon: LocalShippingIcon, path: '/dashboard/purchases' },
    ],
  },
  {
    heading: 'Sales',
    items: [
      { text: 'Point of Sale', icon: ShoppingCartIcon, path: '/dashboard/sales' },
      { text: 'Sales Reports', icon: AssessmentIcon, path: '/dashboard/reports' },
      { text: 'Receipts', icon: ReceiptIcon, path: '/dashboard/receipts' },
      { text: 'Proforma Invoices', icon: DescriptionIcon, path: '/dashboard/proforma-invoices' },
    ],
  },
  {
    heading: 'Finance',
    items: [
      // { text: 'Bank', icon: AccountBalanceWalletIcon, path: '/dashboard/bank' },
      { text: 'Expenses', icon: AttachMoneyIcon, path: '/dashboard/expenses' },
      { text: 'GRA Reports', icon: GavelIcon, path: '/dashboard/gra-reports' },
    ],
  },
  {
    heading: 'People',
    items: [
      // { text: 'Payroll', icon: WorkIcon, path: '/dashboard/payroll' },
      { text: 'Staff Management', icon: EventAvailableIcon, path: '/dashboard/attendance' },
      { text: 'Users', icon: AdminPanelSettingsIcon, path: '/dashboard/users' },
    ],
  },
  {
    heading: 'System',
    items: [{ text: 'Settings', icon: SettingsIcon, path: '/dashboard/settings' }],
  },
];

function isPathActive(pathname: string, path: string) {
  if (path === '/dashboard') return pathname === '/dashboard';
  return pathname === path || pathname.startsWith(`${path}/`);
}

function SidebarBrand({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [logoSrc, setLogoSrc] = useState(logoUrl || SYSTEM_LOGO);

  useEffect(() => {
    setLogoSrc(logoUrl || SYSTEM_LOGO);
  }, [logoUrl]);

  return (
    <div className="shrink-0 border-b border-white/10 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <img
          src={logoSrc}
          alt=""
          className="h-10 w-10 shrink-0 object-contain"
          onError={() => setLogoSrc(SYSTEM_LOGO)}
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[0.8125rem] font-semibold leading-snug tracking-tight text-white">
            {name || 'Onyx Build & Partners Limited'}
          </p>
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-200/90">
            Inventory
          </p>
        </div>
      </div>
    </div>
  );
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isBootstrapping } = useAuth();
  const { roles, businessInfo } = useSettings();
  const { actionStatus } = useActionLoader();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [navQuery, setNavQuery] = useState('');
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const navSearchRef = useRef<HTMLInputElement>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (isBootstrapping) return;
    if (!user) {
      router.replace('/login');
    }
  }, [user, isBootstrapping, router]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuToggle = () => setProfileMenuOpen(!profileMenuOpen);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        navSearchRef.current?.focus();
        if (window.innerWidth < 768) setMobileOpen(true);
      }
      if (event.key === 'Escape' && navQuery) {
        setNavQuery('');
        navSearchRef.current?.blur();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navQuery]);

  if (isBootstrapping || !user) return null;

  const canAccess = (path: string) =>
    userCanAccessPath(user.role, user.entitlements, path, roles);

  const query = navQuery.trim().toLowerCase();

  const filteredSections = menuSections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!canAccess(item.path)) return false;
        if (!query) return true;
        return (
          item.text.toLowerCase().includes(query) ||
          section.heading.toLowerCase().includes(query)
        );
      }),
    }))
    .filter((section) => section.items.length > 0);

  const landingPath = defaultLandingPath(user.role, roles, user.entitlements);
  const allowedPaths = Object.keys(PATH_PERMISSIONS).filter((path) => canAccess(path));
  if (allowedPaths.length === 1 && pathname !== allowedPaths[0]) {
    void Promise.resolve().then(() => router.replace(allowedPaths[0]));
  } else if (
    allowedPaths.length > 0 &&
    !allowedPaths.includes(pathname) &&
    !canAccess(pathname)
  ) {
    void Promise.resolve().then(() => router.replace(landingPath));
  }

  const navigateTo = (path: string) => {
    router.push(path);
    setNavQuery('');
    if (window.innerWidth < 768) setMobileOpen(false);
  };

  const initials =
    (user?.name ?? 'A')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'A';

  const drawer = (
    <div
      className="flex h-full min-h-0 w-full flex-col text-white"
      style={{
        background: `linear-gradient(180deg, ${BRAND} 0%, ${BRAND_DEEP} 100%)`,
      }}
    >
      <SidebarBrand name={businessInfo.name} logoUrl={businessInfo.logoUrl} />

      <div className="shrink-0 px-3 pt-3">
        <label className="relative block">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">
            <SearchIcon className="!text-[1rem]" />
          </span>
          <input
            ref={navSearchRef}
            type="search"
            value={navQuery}
            onChange={(e) => setNavQuery(e.target.value)}
            placeholder="Find a page…"
            aria-label="Filter navigation"
            className="w-full rounded-lg border border-white/12 bg-white/[0.07] py-2 pl-9 pr-16 text-[0.8125rem] text-white placeholder:text-white/45 outline-none transition focus:border-sky-300/40 focus:bg-white/[0.11] focus:ring-2 focus:ring-sky-300/20"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-1 sm:flex">
            {navQuery ? null : (
              <kbd className="rounded border border-white/15 bg-white/5 px-1.5 py-0.5 text-[10px] font-medium text-white/45">
                ⌘K
              </kbd>
            )}
          </span>
          {navQuery ? (
            <button
              type="button"
              onClick={() => setNavQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-white/55 hover:bg-white/10 hover:text-white"
              aria-label="Clear search"
            >
              <CloseIcon className="!text-[0.95rem]" />
            </button>
          ) : null}
        </label>
      </div>

      <nav className="min-h-0 flex-1 overflow-y-auto px-2.5 py-3" aria-label="Primary">
        {filteredSections.length === 0 ? (
          <p className="px-3 py-6 text-center text-[0.8125rem] text-white/55">
            No pages match “{navQuery.trim()}”
          </p>
        ) : (
          filteredSections.map((section, idx) => (
            <div key={section.heading} className={idx === 0 ? '' : 'mt-4'}>
              <p className="mb-1 px-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
                {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const isSelected = isPathActive(pathname, item.path);
                  const Icon = item.icon;
                  return (
                    <li key={item.path}>
                      <button
                        type="button"
                        onClick={() => navigateTo(item.path)}
                        aria-current={isSelected ? 'page' : undefined}
                        className={`group relative flex w-full items-center gap-2.5 rounded-lg py-2 pl-2.5 pr-3 text-left transition-colors duration-150 ${
                          isSelected
                            ? 'bg-white/12 font-semibold text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                            : 'text-white/80 hover:bg-white/[0.08] hover:text-white'
                        }`}
                      >
                        {isSelected && (
                          <span
                            className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-sky-300"
                            aria-hidden
                          />
                        )}
                        <span
                          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            isSelected
                              ? 'bg-sky-300/15 text-sky-200'
                              : 'bg-white/[0.06] text-white/65 group-hover:bg-white/10 group-hover:text-white/90'
                          }`}
                        >
                          <Icon className="!text-[1rem]" />
                        </span>
                        <span className="truncate text-[0.875rem] leading-tight">{item.text}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))
        )}
      </nav>

      <div className="shrink-0 border-t border-white/10 p-2.5">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.06] px-2.5 py-2 ring-1 ring-white/8">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-300/20 text-[0.7rem] font-bold tracking-wide text-sky-100 ring-1 ring-sky-200/20">
            {initials}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[0.8125rem] font-semibold text-white">
              {user?.name ?? 'Account'}
            </p>
            <p className="truncate text-[11px] font-medium text-sky-100/75">
              {roleLabel(user.role, roles)}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              router.replace('/login');
            }}
            title="Log out"
            aria-label="Log out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white/65 transition-colors hover:bg-red-500/20 hover:text-red-200"
          >
            <LogoutIcon className="!text-[1.05rem]" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-viewport min-w-0">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={handleDrawerToggle}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-viewport max-h-[100dvh] w-[272px] max-w-[85vw] flex-shrink-0 transform shadow-[6px_0_24px_-12px_rgba(0,0,0,0.25)] transition-transform duration-300 ease-in-out sm:max-w-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {drawer}
      </aside>

      {/* Spacer keeps main content clear of the fixed sidebar on desktop */}
      <div className="hidden w-[272px] flex-shrink-0 md:block" aria-hidden />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="fixed top-0 right-0 left-0 z-30 border-b border-slate-200 bg-white text-slate-800 shadow-sm md:left-[272px]">
          <div className="relative flex h-14 min-w-0 items-center gap-2 px-3 sm:h-16 sm:gap-4 sm:px-6">
            <button
              onClick={handleDrawerToggle}
              className="-ml-1 rounded-lg p-2 touch-manipulation transition-colors hover:bg-slate-100 md:hidden"
              aria-label="open drawer"
            >
              <MenuIcon className="text-slate-700" />
            </button>
            <div className="relative hidden min-w-0 max-w-[200px] flex-1 sm:block sm:max-w-[280px] lg:max-w-[400px]">
              <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                <SearchIcon className="text-base" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-2 text-sm outline-none transition-all focus:border-[#25395c] focus:bg-white focus:ring-4 focus:ring-[rgba(37,57,92,0.12)] sm:py-2.5 sm:pl-12 sm:pr-3"
              />
            </div>
            <div className="ml-auto flex flex-shrink-0 items-center gap-2 sm:gap-3">
              <div className="mr-1 hidden items-center leading-tight xl:flex">
                <span className="text-[12px] font-semibold text-slate-600">
                  {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div className="relative" ref={profileMenuRef}>
                <button
                  onClick={handleProfileMenuToggle}
                  className="p-0 transition-transform duration-200 hover:scale-105"
                >
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full"
                    style={{ backgroundColor: BRAND }}
                  >
                    <AccountCircleIcon className="text-lg text-white" />
                  </div>
                </button>
                {profileMenuOpen && (
                  <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <div className="border-b border-slate-100 px-4 py-2.5">
                      <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">
                        {user.email || 'Administrator'}
                      </p>
                      <p
                        className="mt-0.5 text-[11px] font-medium uppercase tracking-wide"
                        style={{ color: BRAND }}
                      >
                        {roleLabel(user.role, roles)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileMenuOpen(false);
                        logout();
                        router.replace('/login');
                      }}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogoutIcon className="shrink-0 text-base" aria-hidden />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {(actionStatus === 'loading' || actionStatus === 'success') && (
            <div
              className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] overflow-hidden ${
                actionStatus === 'success' ? 'bg-emerald-100' : 'bg-slate-100'
              }`}
              role="status"
              aria-live="polite"
              aria-label={actionStatus === 'success' ? 'Saved successfully' : 'Saving'}
              aria-busy={actionStatus === 'loading'}
            >
              {actionStatus === 'loading' ? (
                <div
                  className="h-full w-1/3 animate-loader-line rounded-full"
                  style={{ backgroundColor: BRAND }}
                />
              ) : (
                <div className="h-full w-full bg-emerald-500 transition-all duration-300" />
              )}
            </div>
          )}
          {actionStatus === 'success' && (
            <div className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2">
              <div className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[12px] font-semibold text-emerald-700 shadow-sm">
                <svg
                  className="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                  aria-hidden
                >
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 4.5"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Saved successfully
              </div>
            </div>
          )}
        </header>

        <div className="h-16 flex-none bg-slate-50 sm:h-20" aria-hidden="true" />
        <main className="safe-area-bottom min-h-viewport-minus-header min-w-0 flex-1 overflow-x-hidden overflow-y-visible bg-slate-50 p-3 pb-8 sm:p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
