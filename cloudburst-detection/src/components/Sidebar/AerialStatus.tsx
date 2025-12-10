'use client';

import {
  Activity,
  ArrowUp,
  ArrowDown,
  Minus,
  Thermometer,
  Gauge,
  Droplets,
  Battery,
  Clock,
  MapPin,
} from 'lucide-react';
import type { AerialUnit, AerialStatus as AerialStatusType } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface AerialStatusProps {
  aerial: AerialUnit | null;
  targetSectorName?: string;
}

// ============================================
// Constants
// ============================================

const STATUS_CONFIG: Record<AerialStatusType, { label: string; color: string; bgColor: string }> = {
  standby: {
    label: 'Standby',
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-700',
  },
  deploying: {
    label: 'Deploying',
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  active: {
    label: 'Active',
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-100 dark:bg-green-900/30',
  },
  descending: {
    label: 'Descending',
    color: 'text-orange-600 dark:text-orange-400',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
};

const MAX_ALTITUDE = 3000; // meters

// ============================================
// Helper Components
// ============================================

function AltitudeIndicator({ altitude }: { altitude: number }) {
  const percentage = Math.min(100, (altitude / MAX_ALTITUDE) * 100);

  return (
    <div className="relative h-24 w-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
        style={{ height: `${percentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-2 h-2 bg-white rounded-full shadow-sm" />
      </div>
    </div>
  );
}

function AscentRateIcon({ rate }: { rate: number }) {
  if (rate > 0.5) return <ArrowUp className="w-4 h-4 text-green-500" />;
  if (rate < -0.5) return <ArrowDown className="w-4 h-4 text-orange-500" />;
  return <Minus className="w-4 h-4 text-gray-400" />;
}

function BatteryIndicator({ level }: { level: number }) {
  const getColor = () => {
    if (level > 50) return 'text-green-500';
    if (level > 20) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <div className="flex items-center gap-1">
      <Battery className={`w-4 h-4 ${getColor()}`} />
      <span className={`text-sm font-medium ${getColor()}`}>{level}%</span>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function AerialStatus({ aerial, targetSectorName }: AerialStatusProps) {
  if (!aerial) {
    return (
      <section className="p-4 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Aerial Monitoring
        </h2>
        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
          <div className="text-sm">No aerial unit deployed</div>
          <div className="text-xs mt-1">
            Will auto-deploy when probability exceeds 50% for 30 seconds
          </div>
        </div>
      </section>
    );
  }

  const statusConfig = STATUS_CONFIG[aerial.status];
  const estimatedTimeToMax =
    aerial.status === 'deploying' && aerial.ascentRate > 0
      ? Math.round((MAX_ALTITUDE - aerial.altitude) / aerial.ascentRate / 60)
      : null;

  return (
    <section className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-4 h-4" />
          Aerial Monitoring
        </h2>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusConfig.bgColor} ${statusConfig.color}`}>
          {statusConfig.label}
        </span>
      </div>

      {/* Target Sector */}
      {aerial.targetSectorId && (
        <div className="flex items-center gap-2 mb-3 text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>Monitoring: {targetSectorName || aerial.targetSectorId}</span>
        </div>
      )}

      <div className="flex gap-4">
        {/* Altitude Indicator */}
        <div className="flex flex-col items-center">
          <AltitudeIndicator altitude={aerial.altitude} />
          <div className="mt-2 text-center">
            <div className="text-lg font-bold text-gray-900 dark:text-white">
              {Math.round(aerial.altitude)}m
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Altitude</div>
          </div>
        </div>

        {/* Readings Grid */}
        <div className="flex-1 grid grid-cols-2 gap-2">
          {/* Ascent Rate */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <AscentRateIcon rate={aerial.ascentRate} />
              <span>Rate</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {Math.abs(aerial.ascentRate).toFixed(1)} m/s
            </div>
          </div>

          {/* Temperature */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Thermometer className="w-3 h-3 text-orange-500" />
              <span>Temp</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {aerial.temperature.toFixed(1)}°C
            </div>
          </div>

          {/* Pressure */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Gauge className="w-3 h-3 text-purple-500" />
              <span>Pressure</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {aerial.pressure.toFixed(0)} hPa
            </div>
          </div>

          {/* PWV */}
          <div className="p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Droplets className="w-3 h-3 text-blue-500" />
              <span>PWV</span>
            </div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">
              {aerial.pwv.toFixed(1)} mm
            </div>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <BatteryIndicator level={aerial.batteryLevel} />

        {estimatedTimeToMax && (
          <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            <span>~{estimatedTimeToMax} min to max altitude</span>
          </div>
        )}

        {aerial.status === 'active' && (
          <div className="text-xs text-green-600 dark:text-green-400">
            Enhanced monitoring active
          </div>
        )}
      </div>
    </section>
  );
}

export default AerialStatus;
