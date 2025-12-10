'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, Filter, MapPin, X } from 'lucide-react';
import type { AlertHistoryItem, AlertHistoryStatus, AlertSeverity, SectorState } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface OccurrencesPanelProps {
  alertHistory: AlertHistoryItem[];
  sectors: Map<string, SectorState>;
  onViewOnMap?: (sectorId: string) => void;
  onAcknowledge?: (alertId: string) => void;
  className?: string;
}

interface FilterState {
  severity: AlertSeverity | 'all';
  status: AlertHistoryStatus | 'all';
  sectorId: string | null;
}

// ============================================
// Constants
// ============================================

const SEVERITY_STYLES: Record<AlertSeverity, { bg: string; text: string; icon: string }> = {
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
  warning: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', icon: 'text-orange-500' },
  info: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', icon: 'text-blue-500' },
};

const STATUS_STYLES: Record<AlertHistoryStatus, { bg: string; text: string }> = {
  active: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300' },
  acknowledged: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  dismissed: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
};

// ============================================
// Helper Functions
// ============================================

function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

function getAlertTypeLabel(type: string): string {
  switch (type) {
    case 'cloudburst': return 'Cloudburst Detected';
    case 'high_probability': return 'High Probability Alert';
    case 'aerial_deployed': return 'Aerial Deployed';
    case 'system_warning': return 'System Warning';
    default: return type;
  }
}

// ============================================
// Alert History Item Component
// ============================================

interface AlertHistoryItemCardProps {
  item: AlertHistoryItem;
  onViewOnMap?: (sectorId: string) => void;
  onAcknowledge?: (alertId: string) => void;
}

function AlertHistoryItemCard({ item, onViewOnMap, onAcknowledge }: AlertHistoryItemCardProps) {
  const severityStyle = SEVERITY_STYLES[item.severity];
  const statusStyle = STATUS_STYLES[item.status];

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 p-3 ${severityStyle.bg}`}>
      {/* Header Row */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`w-4 h-4 ${severityStyle.icon}`} />
          <span className={`text-sm font-semibold ${severityStyle.text}`}>
            {getAlertTypeLabel(item.type)}
          </span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full ${statusStyle.bg} ${statusStyle.text}`}>
          {item.status}
        </span>
      </div>

      {/* Sector Info */}
      <div className="mb-2">
        <p className="text-sm text-gray-700 dark:text-gray-200 font-medium">
          {item.sectorName}
        </p>
        {item.message && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {item.message}
          </p>
        )}
      </div>

      {/* Probability */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Probability:</span>
        <span className={`text-sm font-semibold ${
          item.probability >= 75 ? 'text-red-600' :
          item.probability >= 50 ? 'text-orange-600' :
          item.probability >= 25 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {Math.round(item.probability)}%
        </span>
      </div>

      {/* Timestamp and Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          {formatTimestamp(item.timestamp)}
          {item.acknowledgedBy && (
            <span className="ml-2">
              by {item.acknowledgedBy.split('@')[0]}
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {onViewOnMap && (
            <button
              onClick={() => onViewOnMap(item.sectorId)}
              className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
            >
              <MapPin className="w-3 h-3" />
              View
            </button>
          )}
          {item.status === 'active' && onAcknowledge && (
            <button
              onClick={() => onAcknowledge(item.alertId)}
              className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline"
            >
              <CheckCircle className="w-3 h-3" />
              Acknowledge
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OccurrencesPanel({
  alertHistory,
  sectors,
  onViewOnMap,
  onAcknowledge,
  className = '',
}: OccurrencesPanelProps) {
  const [filters, setFilters] = useState<FilterState>({
    severity: 'all',
    status: 'all',
    sectorId: null,
  });
  const [showFilters, setShowFilters] = useState(false);

  // Get unique sectors for filter dropdown
  const sectorOptions = useMemo(() => {
    const uniqueSectors = new Map<string, string>();
    alertHistory.forEach((item) => {
      uniqueSectors.set(item.sectorId, item.sectorName);
    });
    return Array.from(uniqueSectors.entries());
  }, [alertHistory]);

  // Filter alerts
  const filteredAlerts = useMemo(() => {
    return alertHistory.filter((item) => {
      if (filters.severity !== 'all' && item.severity !== filters.severity) return false;
      if (filters.status !== 'all' && item.status !== filters.status) return false;
      if (filters.sectorId && item.sectorId !== filters.sectorId) return false;
      return true;
    });
  }, [alertHistory, filters]);

  // Count by status
  const statusCounts = useMemo(() => {
    return {
      active: alertHistory.filter(a => a.status === 'active').length,
      acknowledged: alertHistory.filter(a => a.status === 'acknowledged').length,
      dismissed: alertHistory.filter(a => a.status === 'dismissed').length,
    };
  }, [alertHistory]);

  const clearFilters = () => {
    setFilters({ severity: 'all', status: 'all', sectorId: null });
  };

  const hasFilters = filters.severity !== 'all' || filters.status !== 'all' || filters.sectorId !== null;

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Alert History
          </h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-sm ${
              hasFilters
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {/* Status Summary */}
        <div className="flex gap-2">
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            {statusCounts.active} Active
          </span>
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {statusCounts.acknowledged} Ack
          </span>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg space-y-3">
            {/* Severity Filter */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Severity
              </label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(f => ({ ...f, severity: e.target.value as any }))}
                className="w-full text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(f => ({ ...f, status: e.target.value as any }))}
                className="w-full text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="acknowledged">Acknowledged</option>
                <option value="dismissed">Dismissed</option>
              </select>
            </div>

            {/* Sector Filter */}
            <div>
              <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                Sector
              </label>
              <select
                value={filters.sectorId || ''}
                onChange={(e) => setFilters(f => ({ ...f, sectorId: e.target.value || null }))}
                className="w-full text-sm rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1"
              >
                <option value="">All Sectors</option>
                {sectorOptions.map(([id, name]) => (
                  <option key={id} value={id}>{name}</option>
                ))}
              </select>
            </div>

            {/* Clear Filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-3 h-3" />
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Alert List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {hasFilters ? 'No alerts match your filters' : 'No alert history'}
            </p>
          </div>
        ) : (
          filteredAlerts.map((item) => (
            <AlertHistoryItemCard
              key={item.alertId}
              item={item}
              onViewOnMap={onViewOnMap}
              onAcknowledge={onAcknowledge}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default OccurrencesPanel;
