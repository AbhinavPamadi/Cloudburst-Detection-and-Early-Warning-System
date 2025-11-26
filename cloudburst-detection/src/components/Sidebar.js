// src/components/layout/Sidebar.jsx
'use client';

/**
 * Sidebar
 * - Props:
 *    collapsed: boolean
 *    setCollapsed: (b) => void
 *    mobileOpen: boolean
 *    setMobileOpen: (b) => void
 *
 * - Purpose: Left navigation. Desktop uses a fixed aside; mobile drawer is controlled by AppShell.
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart2,
  Bell,
  Users,
  MapPin,
  Settings,
  Info,
  TrendingUp,
  LogOut,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Roles } from '@/features/auth/authService';
import classNames from '@/utils/classNames';
import React from 'react';

const NAV_ITEMS = [
  { href: '/', label: 'Home', icon: LayoutDashboard, roles: [Roles.ADMIN, Roles.NODE_REGISTRAR, Roles.USER] },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: [Roles.ADMIN] },
  { href: '/data-analytics', label: 'Data & Analytics', icon: BarChart2, roles: [Roles.ADMIN] },
  { href: '/alerts', label: 'Alerts', icon: Bell, roles: [Roles.ADMIN] },
  { href: '/prediction', label: 'Predictions', icon: TrendingUp, roles: [Roles.ADMIN, Roles.NODE_REGISTRAR, Roles.USER] },
  { href: '/contacts', label: 'Contacts', icon: Users, roles: [Roles.ADMIN, Roles.USER, Roles.NODE_REGISTRAR] },
  { href: '/register', label: 'Register Node', icon: MapPin, roles: [Roles.NODE_REGISTRAR] },
  { href: '/settings', label: 'Settings', icon: Settings, roles: [Roles.ADMIN] },
  { href: '/about', label: 'About', icon: Info, roles: [Roles.ADMIN, Roles.USER, Roles.NODE_REGISTRAR] },
];

export default function Sidebar({
  collapsed = false,
  setCollapsed = () => {},
  mobileOpen = false,
  setMobileOpen = () => {},
}) {
  const pathname = usePathname();
  const { role, isAuthenticated, user, logout } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) =>
    !item.roles || !role ? true : item.roles.includes(role)
  );

  const handleLogout = async () => {
    await logout();
  };

  return (
    <nav
      className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800"
      aria-label="Main navigation"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 py-4 border-b border-gray-200 dark:border-gray-800">
        <button
          type="button"
          className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg px-1"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white font-bold">
            CB
          </span>
          {!collapsed && (
            <span className="font-semibold text-gray-900 dark:text-white">
              Cloudburst
            </span>
          )}
        </button>

        {/* Navbar now owns theme + language toggles; keep header minimal here */}
      </div>

      {/* Nav links */}
      <div className="flex-1 overflow-y-auto py-4 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={classNames(
                'group flex items-center gap-3 px-4 py-2 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
                active
                  ? 'bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-200'
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
              onClick={() => {
                // If mobile drawer is open, close it on navigation
                if (mobileOpen) setMobileOpen(false);
              }}
            >
              <Icon className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>

      {/* User / Logout */}
      <div className="border-t border-gray-200 dark:border-gray-800 px-4 py-3 space-y-2">
        {isAuthenticated && (
          <div className={classNames('flex items-center justify-between gap-2', collapsed ? 'flex-col items-start' : '')}>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-gray-400">Signed in as</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                {user?.email}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Role: {role}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-red-50 dark:bg-red-900/30 px-3 py-2 text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </nav>
  );
}
