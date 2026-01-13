// src/app/data-analytics/page.js
"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";
import { BarChart2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";

// ============================================
// Dynamic Imports
// ============================================

const GraphsContent = dynamic(
  () => import("@/app/graphs/page").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => <LoadingCard message="Loading charts..." />,
  }
);

// ============================================
// Components
// ============================================

function LoadingCard({ message = "Loading..." }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center gap-3 rounded-xl bg-white p-8 shadow-sm dark:bg-gray-900">
      <Loader2 className="h-5 w-5 animate-spin text-blue-600" aria-hidden="true" />
      <p className="text-sm text-gray-600 dark:text-gray-400" role="status">
        {message}
      </p>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
        {title}
      </h2>
      {description && (
        <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function DataAnalyticsPage() {
  const t = useTranslations("dataAnalytics");

  return (
    <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.SUPER_ADMIN, Roles.USER]}>
      <div className="px-4 pb-6 pt-4 md:px-6">
        {/* Page Header */}
        <header className="mb-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/30">
              <BarChart2 className="h-5 w-5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t("title")}
              </h1>
              <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-400">
                {t("subtitle")}
              </p>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="space-y-6">
          {/* Data & Graphs Section */}
          <section 
            className="rounded-xl bg-white p-6 shadow-sm dark:bg-gray-900"
            aria-labelledby="graphs-section"
          >
            <SectionHeader
              title={t("dataGraphs")}
              description={t("dataGraphsDesc")}
            />
            <Suspense fallback={<LoadingCard message={t("loadingCharts")} />}>
              <GraphsContent />
            </Suspense>
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}