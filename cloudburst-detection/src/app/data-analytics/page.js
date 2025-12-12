"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";
import { BarChart2 } from "lucide-react";
import { useTranslations } from "next-intl";

const GraphsContent = dynamic(
  () => import("@/app/graphs/page").then((mod) => mod.default),
  {
    ssr: false,
  }
);

const AdminAnalytics = dynamic(
  () =>
    import("@/features/analytics/AnalyticalPanel").then((mod) => mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Loading analytics…
        </p>
      </div>
    ),
  }
);

export default function DataAnalyticsPage() {
  const t = useTranslations("dataAnalytics");
  return (
    <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.SUPER_ADMIN, Roles.USER]}>
      <div className="px-4 pb-6 pt-4 md:px-6">
        <header className="mb-4 flex items-center gap-2">
          <BarChart2 className="h-5 w-5 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {t("title")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("subtitle")}
            </p>
          </div>
        </header>

        <div className="space-y-6">
          {/* Data & Graphs Section */}
          <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              {t("dataGraphs")}
            </h2>
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
              {t("dataGraphsDesc")}
            </p>
            <Suspense
              fallback={
                <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
                  {t("loadingCharts")}
                </div>
              }
            >
              <GraphsContent />
            </Suspense>
          </section>

          {/* Analytics Section – admin-only, but page itself already admin-guarded */}
          <section className="rounded-xl bg-white p-4 shadow-sm dark:bg-gray-900">
            <h2 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white">
              {t("analytics")}
            </h2>
            <p className="mb-3 text-xs text-gray-600 dark:text-gray-400">
              {t("analyticsDesc")}
            </p>
            <Suspense>
              <AdminAnalytics />
            </Suspense>
          </section>
        </div>
      </div>
    </ProtectedPage>
  );
}
