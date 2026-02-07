'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Inventory as InventoryIcon,
  ShoppingCart as ShoppingCartIcon,
  Receipt as ReceiptIcon,
  Assessment as AssessmentIcon,
  Settings as SettingsIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Storefront as StorefrontIcon,
  LocalShipping as LocalShippingIcon,
  AccountCircle as AccountCircleIcon,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth, isAdminOnlyPath, type Role } from '../context/AuthContext';

const allMenuItems = [
  { text: 'Dashboard', icon: DashboardIcon, path: '/dashboard' },
  { text: 'Products', icon: StorefrontIcon, path: '/dashboard/products' },
  { text: 'Inventory', icon: InventoryIcon, path: '/dashboard/inventory', roles: ['admin'] as Role[] },
  { text: 'Purchases', icon: LocalShippingIcon, path: '/dashboard/purchases', roles: ['admin'] as Role[] },
  { text: 'Sales (POS)', icon: ShoppingCartIcon, path: '/dashboard/sales' },
  { text: 'Receipts', icon: ReceiptIcon, path: '/dashboard/receipts' },
  { text: 'Reports', icon: AssessmentIcon, path: '/dashboard/reports', roles: ['admin'] as Role[] },
  // { text: 'Settings', icon: SettingsIcon, path: '/dashboard/settings', roles: ['admin'] as Role[] },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout, isAdmin } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const menuItems = allMenuItems.filter((item) => !item.roles || item.roles.includes(user?.role ?? 'sales'));

  useEffect(() => {
    if (!user) {
      router.replace('/login');
      return;
    }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    if (user.role === 'sales' && isAdminOnlyPath(pathname)) {
      router.replace('/dashboard');
    }
  }, [user, pathname, router]);

  const handleDrawerToggle = () => setMobileOpen(!mobileOpen);
  const handleProfileMenuToggle = () => setProfileMenuOpen(!profileMenuOpen);

  const handleLogout = () => {
    setProfileMenuOpen(false);
    logout();
    router.replace('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    if (profileMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  if (!user) return null;

  const drawer = (
    <div className="h-full flex flex-col">
      <div className="p-6 flex items-center gap-3 bg-teal-600 text-white">
        <div className="p-2 rounded-lg bg-white/20 flex items-center justify-center">
          <StorefrontIcon className="text-base" />
        </div>
        <h1 className="font-bold text-base whitespace-nowrap">Inventory System</h1>
      </div>
      <div className="border-t border-slate-200"></div>
      <ul className="px-4 py-2 flex-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isSelected = pathname === item.path;
          const IconComponent = item.icon;
          return (
            <li key={item.text} className="mb-1">
              <button
                onClick={() => {
                  router.push(item.path);
                  if (window.innerWidth < 768) setMobileOpen(false);
                }}
                className={`w-full rounded-lg py-3 px-3 transition-all duration-200 flex items-center gap-3 ${
                  isSelected
                    ? 'bg-teal-600 text-white hover:bg-teal-700'
                    : 'hover:bg-teal-50 hover:translate-x-1 text-slate-700'
                }`}
              >
                <IconComponent className={`text-base ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                <span className={`text-sm ${isSelected ? 'font-semibold' : 'font-normal'}`}>
                  {item.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  return (
    <div className="flex min-h-viewport min-w-0">
      {/* Mobile Drawer Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={handleDrawerToggle}
        />
      )}

      {/* Sidebar - sticky on desktop so it stays visible when scrolling */}
      <aside
        className={`fixed md:sticky md:top-0 md:h-viewport md:self-start inset-y-0 left-0 z-50 w-[260px] max-w-[85vw] sm:max-w-none flex-shrink-0 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {drawer}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        {/* Top App Bar */}
        <header className="fixed top-0 right-0 left-0 md:left-[260px] z-30 bg-white text-slate-800 shadow-sm border-b border-slate-200">
          <div className="px-3 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              onClick={handleDrawerToggle}
              className="md:hidden p-2 -ml-1 hover:bg-teal-50 rounded-lg transition-colors touch-manipulation"
              aria-label="open drawer"
            >
              <MenuIcon className="text-slate-700" />
            </button>
            <div className="relative flex-1 min-w-0 max-w-[200px] sm:max-w-[280px] lg:max-w-[400px] hidden sm:block">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <SearchIcon className="text-base" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="w-full py-2 pl-9 pr-2 sm:py-2.5 sm:pl-12 sm:pr-3 text-sm rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
              />
            </div>
            <div className="ml-auto flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              <button className="p-2 hover:bg-teal-50 rounded-lg transition-colors relative" aria-label="Notifications">
                <NotificationsIcon className="text-slate-700" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  4
                </span>
              </button>
              <div className="relative" ref={profileMenuRef}>
              <button
                onClick={handleProfileMenuToggle}
                className="p-0 hover:scale-105 transition-transform duration-200"
              >
                <div className="w-9 h-9 bg-teal-600 rounded-full flex items-center justify-center">
                  <AccountCircleIcon className="text-white text-lg" />
                </div>
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <div className="border-b border-slate-100 px-4 py-2.5">
                    <p className="truncate text-sm font-medium text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-500">{isAdmin ? 'Admin' : 'Sales person'}</p>
                  </div>
                  <button
                    onClick={() => { setProfileMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Profile
                  </button>
                  {/* Settings link commented out with sidebar Settings
                  {isAdmin && (
                    <button
                      onClick={() => { setProfileMenuOpen(false); router.push('/dashboard/settings'); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Account Settings
                    </button>
                  )}
                  */}
                  <div className="border-t border-slate-200 my-1" />
                  <button
                    onClick={handleLogout}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogoutIcon className="text-base" />
                    Logout
                  </button>
                </div>
              )}
              </div>
            </div>
          </div>
        </header>

        {/* Spacer so fixed header doesn't cover page title – header height + gap */}
        <div className="h-16 flex-none bg-slate-50 sm:h-20" aria-hidden="true" />
        {/* Main Content Area */}
        <main className="flex-1 p-3 sm:p-6 md:p-8 pb-8 bg-slate-50 min-h-viewport-minus-header min-w-0 overflow-x-hidden overflow-y-visible safe-area-bottom">
          {children}
        </main>
      </div>
    </div>
  );
}
