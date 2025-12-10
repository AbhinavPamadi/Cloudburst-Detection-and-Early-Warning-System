// src/components/AppShell.jsx
"use client";

/**
 * AppShell
 * - Manages sidebar collapsed state and mobile drawer.
 * - Applies left margin to main content so the fixed Sidebar does not cover pages.
 * - Keeps login/auth routes full-width (no sidebar).
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, LogOut } from "lucide-react";
import Sidebar from "./Sidebar";
import classNames from "@/utils/classNames";
import { useAuth } from "@/features/auth/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const { user, role, logout } = useAuth();

  // Auth route(s) that should render full-width without the sidebar
  const isAuthRoute =
    pathname === "/" ||
    pathname === "/login" ||
    pathname === "/signup" ||
    pathname.startsWith("/auth");

  // Sidebar state (lifted here so layout can apply matching margins)
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.style.overflow = "hidden";
      document.body.style.overflow = "hidden";
    } else {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    }
    return () => {
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // left margin classes for main content (must match Sidebar widths)
  // We now use an overlay drawer, so main content is full-width (no left margin).

  if (isAuthRoute) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        {/* Minimal navbar for auth pages */}
        <header className="sticky top-0 z-30 border-b border-gray-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur px-4 sm:px-6">
          <div className="mx-auto w-full max-w-7xl flex h-16 items-center justify-between">
            {/* Project name */}
            <Link href="/home" className="flex items-center gap-2">
              <img
                src="/favicon.ico"
                alt="Cloudburst logo"
                className="h-8 w-8 rounded-md"
              />
              <span className="text-lg font-bold text-gray-900 dark:text-white">
                Cloudburst Sentinel
              </span>
            </Link>
            {/* Theme toggle and language switcher */}
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
          </div>
        </header>
        <main className="pt-4 pb-8">
          <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Top navbar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-900 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/home" className="flex items-center">
            <img
              src="/favicon.ico"
              alt="Cloudburst logo"
              className="h-8 w-8 rounded-md mr-3"
            />
          </Link>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-gray-100">
              Cloudburst Detection System
            </span>
            {role && (
              <span className="text-[11px] uppercase tracking-wide text-gray-400">
                {role.toLowerCase()}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageSwitcher />
          {user && (
            <>
              <div className="hidden sm:flex items-center gap-2 text-sm text-gray-200">
                <span className="max-w-[160px] truncate">{user.email}</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold">
                  {user.email?.[0]?.toUpperCase() || "U"}
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Logout</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Sidebar drawer overlay (for all breakpoints) */}
      <div
        className={classNames(
          "fixed inset-y-0 left-0 z-40 w-64 transform bg-gray-900 shadow-xl transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!mobileOpen}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
        />
      </div>
      <div
        className={classNames(
          "fixed inset-0 z-30 bg-black/40 transition-opacity duration-300",
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />

      {/* Main content */}
      <main className="pt-16">
        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
