'use client';

import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import type { AlertLevel, SectorState, Alert } from '@/types/sector.types';
import { PROBABILITY_COLORS } from '@/utils/colorScale';

// ============================================
// Types
// ============================================

interface AlertSummaryProps {
  sectorsByAlertLevel: Record<AlertLevel, number>;
  highestProbabilitySector: SectorState | null;
  activeCloudbursts: SectorState[];
  unacknowledgedAlerts: Alert[];
  onSectorClick?: (sector: SectorState) => void;
  onAlertClick?: (alert: Alert) => void;
}

// ============================================
// Constants
// ============================================

const ALERT_LEVEL_CONFIG = {
  normal: {
    label: 'Low Risk',
    color: PROBABILITY_COLORS.green,
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    textColor: 'text-green-700 dark:text-green-300',
    icon: CheckCircle,
  },
  elevated: {
    label: 'Elevated',
    color: PROBABILITY_COLORS.yellow,
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    textColor: 'text-yellow-700 dark:text-yellow-300',
    icon: Info,
  },
  high: {
    label: 'High Risk',
    color: PROBABILITY_COLORS.orange,
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    textColor: 'text-orange-700 dark:text-orange-300',
    icon: AlertCircle,
  },
  critical: {
    label: 'Critical',
    color: PROBABILITY_COLORS.red,
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    textColor: 'text-red-700 dark:text-red-300',
    icon: AlertTriangle,
  },
};

// ============================================
// Component
// ============================================

export function AlertSummary({
  sectorsByAlertLevel,
  highestProbabilitySector,
  activeCloudbursts,
  unacknowledgedAlerts,
  onSectorClick,
  onAlertClick,
}: AlertSummaryProps) {
  const hasAlerts =
    sectorsByAlertLevel.critical > 0 ||
    sectorsByAlertLevel.high > 0 ||
    activeCloudbursts.length > 0;

  return (
    <section className="p-4 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Alert Summary
        {unacknowledgedAlerts.length > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {unacknowledgedAlerts.length}
          </span>
        )}
      </h2>

      {/* Risk Level Counts */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {(Object.keys(ALERT_LEVEL_CONFIG) as AlertLevel[]).map((level) => {
          const config = ALERT_LEVEL_CONFIG[level];
          const count = sectorsByAlertLevel[level];
          const Icon = config.icon;

          return (
            <div
              key={level}
              className={`${config.bgColor} rounded-lg p-2 flex items-center gap-2`}
            >
              <Icon className={`w-4 h-4 ${config.textColor}`} />
              <div>
                <div className={`text-lg font-bold ${config.textColor}`}>{count}</div>
                <div className={`text-xs ${config.textColor} opacity-80`}>
                  {config.label}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Highest Probability Sector */}
      {highestProbabilitySector && highestProbabilitySector.currentProbability > 25 && (
        <div className="mb-4">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Highest Probability
          </h3>
          <button
            onClick={() => onSectorClick?.(highestProbabilitySector)}
            className={`w-full text-left p-3 rounded-lg transition-colors ${
              highestProbabilitySector.alertLevel === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                : highestProbabilitySector.alertLevel === 'high'
                ? 'bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30'
                : 'bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30'
            }`}
          >
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm text-gray-900 dark:text-white">
                {highestProbabilitySector.name || highestProbabilitySector.sectorId}
              </span>
              <span
                className={`text-lg font-bold ${
                  highestProbabilitySector.alertLevel === 'critical'
                    ? 'text-red-600 dark:text-red-400'
                    : highestProbabilitySector.alertLevel === 'high'
                    ? 'text-orange-600 dark:text-orange-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`}
              >
                {Math.round(highestProbabilitySector.currentProbability)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {highestProbabilitySector.cloudburstDetected
                ? 'Cloudburst Detected!'
                : `Node: ${highestProbabilitySector.nodeId}`}
            </div>
          </button>
        </div>
      )}

      {/* Active Cloudbursts */}
      {activeCloudbursts.length > 0 && (
        <div>
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 flex items-center gap-1">
            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            Active Cloudbursts ({activeCloudbursts.length})
          </h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {activeCloudbursts.map((sector) => (
              <button
                key={sector.sectorId}
                onClick={() => onSectorClick?.(sector)}
                className="w-full text-left p-2 rounded-lg bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors border border-red-200 dark:border-red-800"
              >
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm text-red-900 dark:text-red-100">
                    {sector.name || sector.sectorId}
                  </span>
                  <span className="text-sm font-bold text-red-600 dark:text-red-400">
                    {Math.round(sector.currentProbability)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* No Alerts Message */}
      {!hasAlerts && (
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
          <p className="text-sm">All sectors within normal range</p>
        </div>
      )}
    </section>
  );
}

export default AlertSummary;
