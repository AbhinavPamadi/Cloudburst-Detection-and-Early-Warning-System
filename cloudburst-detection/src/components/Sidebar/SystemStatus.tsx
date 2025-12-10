'use client';

import { Activity, Wifi, WifiOff, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { AerialStatus } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface SystemStatusProps {
  totalNodes: number;
  activeNodes: number;
  sectorsMonitored: number;
  aerialStatus: AerialStatus;
  lastDataSync: Date | null;
  isConnected: boolean;
}

// ============================================
// Constants
// ============================================

const AERIAL_STATUS_COLORS: Record<AerialStatus, string> = {
  standby: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  deploying: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  descending: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
};

const AERIAL_STATUS_LABELS: Record<AerialStatus, string> = {
  standby: 'Standby',
  deploying: 'Deploying',
  active: 'Active',
  descending: 'Descending',
};

// ============================================
// Component
// ============================================

export function SystemStatus({
  totalNodes,
  activeNodes,
  sectorsMonitored,
  aerialStatus,
  lastDataSync,
  isConnected,
}: SystemStatusProps) {
  const lastSyncText = lastDataSync
    ? formatDistanceToNow(lastDataSync, { addSuffix: true })
    : 'Never';

  return (
    <section className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <Activity className="w-4 h-4" />
        System Status
      </h2>

      <div className="space-y-3">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-500" />
            )}
            Connection
          </span>
          <span
            className={`text-sm font-medium ${
              isConnected ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}
          >
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Nodes Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Total Nodes</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            <span className="text-green-600 dark:text-green-400">{activeNodes}</span>
            <span className="text-gray-400 dark:text-gray-500"> / {totalNodes}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">active</span>
          </span>
        </div>

        {/* Sectors Monitored */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sectors Monitored</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {sectorsMonitored}
          </span>
        </div>

        {/* Aerial Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Aerial Status</span>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${AERIAL_STATUS_COLORS[aerialStatus]}`}
          >
            {AERIAL_STATUS_LABELS[aerialStatus]}
          </span>
        </div>

        {/* Last Sync */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Last Sync
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">{lastSyncText}</span>
        </div>
      </div>
    </section>
  );
}

export default SystemStatus;
