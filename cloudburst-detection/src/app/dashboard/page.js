"use client";

import { useState, useEffect, useMemo } from "react";
import { ref, onValue } from "firebase/database";
import dynamic from "next/dynamic";
import { database } from "@/lib/firebase";
import NodeStatusBadge from "@/components/NodeStatusBadge";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";
import { getNodeStatus as getNodeStatusFromUtils } from "@/lib/utils";
import {
  AlertCircle,
  ArrowUpRight,
  MapPinned,
  MapPin,
  Thermometer,
  Gauge,
  Droplets,
  Activity,
  Signal,
  ChevronRight,
} from "lucide-react";
import classNames from "@/utils/classNames";
import { useTranslations } from "next-intl";
import WindSpeedInput from "@/components/WindSpeedInput";
import { useAuth } from "@/features/auth/AuthContext";
import { checkAndUpdateNodeStatus, startNodeStatusMonitoring } from "@/utils/nodeStatusMonitor";

const DashboardMap = dynamic(() => import("@/components/DashboardMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center bg-gray-800">
      <div className="text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-4 border-blue-500" />
        <p className="text-sm font-medium text-gray-300">Loading map…</p>
      </div>
    </div>
  ),
});

function getNodeStatus(node) {
  // Check if realtime data exists
  if (!node?.realtime) {
    return "offline";
  }
  
  // Check status directly from Firebase realtime data (case-insensitive)
  const firebaseStatus = node.realtime.status;
  
  if (firebaseStatus) {
    const statusLower = String(firebaseStatus).toLowerCase();
    // Green only if status is "active", "ONLINE", or "online" (case-insensitive)
    if (statusLower === "active" || statusLower === "online") {
      return "online";
    }
  }
  
  // Red for any other status or if status is missing
  return "offline";
}

function formatTimeAgo(timestamp) {
  if (!timestamp) return "Never";
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const { user } = useAuth();
  const [nodes, setNodes] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Check if user is super admin
  const isSuperAdmin = user?.email === "super@gmail.com";

  useEffect(() => {
    const nodesRef = ref(database, "nodes");
    const unsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        try {
          const data = snapshot.val() || {};
          const allNodes = Object.entries(data);

          const parsedNodes = [];
          allNodes.forEach(([nodeId, node]) => {
            if (!node.metadata) return;

            // Accept latitude/longitude from either latitude/longitude or lat/lng keys
            const rawLat =
              node.metadata.latitude ?? node.metadata.lat ?? node.metadata.Latitude;
            const rawLon =
              node.metadata.longitude ?? node.metadata.lng ?? node.metadata.Longitude;

            const latNum =
              rawLat === undefined || rawLat === null ? null : parseFloat(rawLat);
            const lonNum =
              rawLon === undefined || rawLon === null ? null : parseFloat(rawLon);

            const hasValidCoordinates =
              Number.isFinite(latNum) &&
              Number.isFinite(lonNum) &&
              latNum >= -90 &&
              latNum <= 90 &&
              lonNum >= -180 &&
              lonNum <= 180;

            // Preserve existing realtime data, don't overwrite it
            // Always include the node so it appears in lists/metrics, even if coordinates are missing.
            // Map rendering will filter out nodes without valid coordinates.
            parsedNodes.push({
              id: nodeId,
              ...node,
              // Explicitly preserve realtime data - don't let spread operator lose it
              realtime: node.realtime,
              metadata: {
                ...node.metadata,
                latitude: latNum,
                longitude: lonNum,
              },
              hasValidCoordinates,
            });
          });

          setNodes(parsedNodes);
          setError(null);
        } catch (err) {
          console.error(err);
          setError("Failed to process node data");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Monitor node status and update to offline if hardware is off
  useEffect(() => {
    // Check immediately on mount
    checkAndUpdateNodeStatus(15); // 15 minutes timeout

    // Then check every 5 minutes
    const intervalId = setInterval(() => {
      checkAndUpdateNodeStatus(15);
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  const activeNodes = useMemo(
    () => nodes.filter((n) => getNodeStatus(n) === "online"),
    [nodes]
  );

  const metrics = useMemo(() => {
    const totalNodes = nodes.length;
    const activeCount = activeNodes.length;
    let totalDataPoints = 0;
    let activeAlerts = 0;

    nodes.forEach((node) => {
      if (node.history) {
        totalDataPoints += Object.keys(node.history).length;
      }
      if (node.alerts) {
        activeAlerts += Object.values(node.alerts).filter(
          (a) => !a.acknowledged
        ).length;
      }
    });

    return {
      totalNodes,
      activeCount,
      totalDataPoints,
      activeAlerts,
    };
  }, [nodes, activeNodes]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-4 border-blue-600 dark:border-blue-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t("loading")}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            {t("error")}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            {error}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("retry")}
          </button>
        </div>
      </div>
    );
  }

  if (nodes.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <MapPin className="mx-auto mb-4 h-16 w-16 text-gray-400 dark:text-gray-500" />
          <h2 className="mb-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t("noNodes")}
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">
            {t("registerFirst")}
          </p>
          <a
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            {t("registerFirstButton")}
          </a>
        </div>
      </div>
    );
  }

  /* ---------- Panels ---------- */

  const MapPanel = (
    <div className="relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-lg ring-1 ring-black/10 dark:from-slate-800 dark:to-slate-900">
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
              <MapPinned className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">{t("liveFloodMap")}</h3>
              <p className="text-xs text-sky-100/80">{t("liveView")}</p>
            </div>
          </div>

        <button
          type="button"
          onClick={() => setMapExpanded(true)}
          className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          aria-label="Expand map"
        >
          <ArrowUpRight className="h-4 w-4" />
          <span>{t("expand")}</span>
        </button>
      </div>

      <div className="h-80 md:h-[420px]">
        <DashboardMap
          // Show only nodes that have valid coordinates on the map
          nodes={nodes.filter((n) => n.hasValidCoordinates)}
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          getNodeStatus={getNodeStatus}
          formatTimeAgo={formatTimeAgo}
          showLegend={false}
        />
      </div>

      <div className="absolute bottom-4 left-4 rounded-md bg-white/10 px-3 py-1 text-xs text-white">
        {nodes.length} node{nodes.length === 1 ? "" : "s"} •{" "}
        {activeNodes.length} online
      </div>
    </div>
  );

  const NodesPanel = (
    <div className="flex h-[420px] flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-white/6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("activeSensors")}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("liveOverview")}
        </p>
      </div>

      <ul className="flex-1 divide-y divide-gray-200 overflow-y-auto p-4 dark:divide-white/6">
        {nodes.map((node) => {
          const lastUpdateMs = node.realtime?.lastUpdate
            ? (typeof node.realtime.lastUpdate === "string"
                ? parseInt(node.realtime.lastUpdate, 10) * 1000
                : node.realtime.lastUpdate)
            : null;
          const isSelected =
            selectedNode?.metadata?.nodeId === node.metadata?.nodeId || selectedNode?.id === node.id;
          return (
            <li
              key={node.id || node.metadata?.nodeId || node.metadata?.name || `node-${node.metadata?.nodeId || 'unknown'}`}
              className="py-2"
            >
              <button
                type="button"
                onClick={() => setSelectedNode(node)}
                className={classNames(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left hover:bg-white/3",
                  isSelected ? "bg-white/5" : ""
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {node.metadata.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatTimeAgo(lastUpdateMs)}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <NodeStatusBadge
                    status={getNodeStatus(node)}
                    showDot
                    showText={false}
                  />
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );

  const SensorsPanel = (
    <div className="flex h-[320px] flex-col overflow-hidden rounded-2xl bg-white p-0 shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-white/6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          {t("predictionPanel")}
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t("aiInsights")}
        </p>
      </div>

      <div className="p-4 grid gap-3 md:grid-cols-2">
        <SmallInfoCard
          color="red"
          title="Temperature"
          text="Live snapshot of latest readings across active nodes."
          Icon={Thermometer}
        />
        <SmallInfoCard
          color="blue"
          title="Pressure"
          text="Watch for sharp drops indicative of potential cloudbursts."
          Icon={Gauge}
        />
        <SmallInfoCard
          color="cyan"
          title="Humidity"
          text="High humidity with heavy rainfall can raise risk levels."
          Icon={Droplets}
        />
        <SmallInfoCard
          color="green"
          title="Network"
          text="Monitor connectivity health for each deployed node."
          Icon={Signal}
        />
      </div>
    </div>
  );

  const WindSpeedPanel = selectedNode ? (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10">
      <WindSpeedInput
        nodeId={selectedNode.id || selectedNode.metadata?.nodeId}
        onSuccess={(speed) => {
          console.log("Wind speed saved:", speed);
        }}
        onError={(error) => {
          console.error("Error saving wind speed:", error);
        }}
      />
    </div>
  ) : (
    <div className="rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10">
      <div className="flex h-full items-center justify-center text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Select a node to input wind speed
        </p>
      </div>
    </div>
  );

  const NetworkStatsPanel = (
    <section
      className="flex h-[320px] flex-col rounded-2xl bg-white p-4 shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10"
      aria-label="Network statistics"
    >
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t("networkStats")}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t("updatedEvery")}
          </p>
        </div>
        <Activity
          className="h-5 w-5 text-blue-500 dark:text-blue-400"
          aria-hidden="true"
        />
      </div>

      <div className="grid flex-1 grid-cols-2 gap-4">
        <MetricCard
          label={t("uptime")}
          value={`${(Math.random() * (99 - 96) + 96).toFixed(1)}%`}
        />
        <MetricCard label={t("predictedEvents")} value={3} />
        <MetricCard label={t("totalNodes")} value={metrics.totalNodes} />
        <MetricCard label={t("activeAlerts")} value={metrics.activeAlerts} />
      </div>
    </section>
  );

  /* ---------- Render ---------- */

  return (
    <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.SUPER_ADMIN, Roles.USER]}>
      <div className="pt-4 pb-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              {t("title")}
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {t("subtitle")}
            </p>
          </div>
        </header>

        {/* Top row: map (wide) + active nodes list */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">{MapPanel}</div>
          <div className="lg:col-span-1">{NodesPanel}</div>
        </div>

        {/* Bottom row: network stats + sensors/prediction-style panel */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">{NetworkStatsPanel}</div>
          <div className="lg:col-span-2">{SensorsPanel}</div>
        </div>

        {/* Wind Speed Input Panel - Only visible to super admin */}
        {isSuperAdmin && (
          <div className="mt-6">
            {WindSpeedPanel}
          </div>
        )}

        {mapExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex h-full w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-600/10 text-blue-700 dark:bg-white/10 dark:text-white">
                    <MapPinned className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {t("mapFullscreen")}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMapExpanded(false)}
                  className="rounded-md px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/6"
                >
                  {t("close")}
                </button>
              </div>
              <div className="flex-1">
                <DashboardMap
                  nodes={nodes}
                  selectedNode={selectedNode}
                  setSelectedNode={setSelectedNode}
                  getNodeStatus={getNodeStatus}
                  formatTimeAgo={formatTimeAgo}
                  showLegend={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

/* ----------------- small subcomponents ----------------- */

function MetricCard({ label, value }) {
  return (
    <div
      className="flex flex-col justify-between rounded-lg bg-gray-100 p-4 text-left dark:bg-gray-900/40"
      tabIndex={0}
    >
      <p className="text-xs font-medium text-gray-700 dark:text-gray-400">
        {label}
      </p>
      <div className="mt-2 flex items-baseline justify-between">
        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
          {value}
        </p>
        <span className="text-xs text-green-600 dark:text-green-400">+2%</span>
      </div>
    </div>
  );
}

function SmallInfoCard({ color = "blue", title, text, Icon }) {
  const base = "rounded-lg p-3";
  const bg =
    color === "red"
      ? "bg-red-50 text-red-800 dark:bg-red-700/10 dark:text-red-200"
      : color === "cyan"
      ? "bg-cyan-50 text-cyan-800 dark:bg-cyan-700/10 dark:text-cyan-200"
      : color === "green"
      ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-700/10 dark:text-emerald-200"
      : "bg-sky-50 text-sky-800 dark:bg-sky-700/10 dark:text-sky-200";

  return (
    <div className={`${base} ${bg} flex flex-col justify-between`}>
      <div className="flex items-center gap-2">
        <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-white/70 text-gray-900 dark:bg-white/5 dark:text-white">
          <Icon className="h-4 w-4" />
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {title}
        </p>
      </div>
      <p className="mt-2 text-xs text-gray-700 dark:text-white/80">{text}</p>
    </div>
  );
}
