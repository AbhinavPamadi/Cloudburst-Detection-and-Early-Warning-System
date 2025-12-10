'use client';

import {
  MapPin,
  Thermometer,
  Gauge,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  CloudRain,
} from 'lucide-react';
import type { SectorState, WindData, PredictionSource } from '@/types/sector.types';
import { getProbabilityColor, getAlertLevelName } from '@/utils/colorScale';
import { getCardinalDirection } from '@/utils/geoUtils';
import { formatConfidence, getPredictionSourceLabel } from '@/utils/sectorCalculations';

// ============================================
// Types
// ============================================

interface SectorDetailProps {
  sector: SectorState;
  wind: WindData | null;
  onClose?: () => void;
}

type Trend = 'increasing' | 'decreasing' | 'stable';

// ============================================
// Helper Components
// ============================================

function TrendIcon({ trend, className = '' }: { trend: Trend; className?: string }) {
  switch (trend) {
    case 'increasing':
      return <TrendingUp className={`text-red-500 ${className}`} />;
    case 'decreasing':
      return <TrendingDown className={`text-green-500 ${className}`} />;
    default:
      return <Minus className={`text-gray-400 ${className}`} />;
  }
}

function PredictionBadge({ source }: { source: PredictionSource }) {
  const label = getPredictionSourceLabel(source);
  const bgColor =
    source === 'ground+aerial'
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
      : source === 'ground'
      ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${bgColor}`}>
      {label}
    </span>
  );
}

// ============================================
// Component
// ============================================

export function SectorDetail({ sector, wind, onClose }: SectorDetailProps) {
  // Calculate trend from history (simplified)
  const trend: Trend =
    sector.historicalProbability.length >= 2
      ? sector.historicalProbability[sector.historicalProbability.length - 1].probability >
        sector.historicalProbability[0].probability
        ? 'increasing'
        : sector.historicalProbability[sector.historicalProbability.length - 1].probability <
          sector.historicalProbability[0].probability
        ? 'decreasing'
        : 'stable'
      : 'stable';

  return (
    <section className="p-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Sector Details
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {sector.name || sector.sectorId}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>

      {/* Large Probability Display */}
      <div
        className="rounded-xl p-4 mb-4 text-center"
        style={{
          backgroundColor: `${getProbabilityColor(sector.currentProbability)}20`,
          borderLeft: `4px solid ${getProbabilityColor(sector.currentProbability)}`,
        }}
      >
        <div className="flex items-center justify-center gap-2">
          <span
            className="text-4xl font-bold"
            style={{ color: getProbabilityColor(sector.currentProbability) }}
          >
            {Math.round(sector.currentProbability)}%
          </span>
          <TrendIcon trend={trend} className="w-6 h-6" />
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          {getAlertLevelName(sector.alertLevel)} Risk
        </div>
        <div className="flex items-center justify-center gap-2 mt-2">
          <PredictionBadge source={sector.predictionSource} />
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatConfidence(sector.confidence)} confidence
          </span>
        </div>
      </div>

      {/* Cloudburst Detection Alert */}
      {sector.cloudburstDetected && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4">
          <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
            <CloudRain className="w-5 h-5" />
            <span className="font-semibold text-sm">Cloudburst Detected!</span>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Confidence: {sector.cloudburstConfidence || 'Medium'}
          </p>
        </div>
      )}

      {/* Weather Readings */}
      <div className="space-y-3">
        <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Current Readings
        </h3>

        {/* Rainfall */}
        {sector.rainfall && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Rainfall</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sector.rainfall.rate.toFixed(1)} mm/hr
              </span>
              <TrendIcon trend="stable" className="w-3 h-3 inline ml-1" />
            </div>
          </div>
        )}

        {/* Wind */}
        {wind && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Wind className="w-4 h-4 text-cyan-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Wind</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {wind.speed.toFixed(1)} m/s
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                {getCardinalDirection(wind.direction)}
              </span>
            </div>
          </div>
        )}

        {/* Pressure */}
        {sector.weather && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Gauge className="w-4 h-4 text-purple-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Pressure</span>
            </div>
            <div className="text-right">
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {sector.weather.pressure.toFixed(0)} hPa
              </span>
              <TrendIcon trend="stable" className="w-3 h-3 inline ml-1" />
            </div>
          </div>
        )}

        {/* Humidity */}
        {sector.weather && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4 text-teal-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Humidity</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {sector.weather.humidity}%
            </span>
          </div>
        )}

        {/* Temperature */}
        {sector.weather && (
          <div className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-orange-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">Temperature</span>
            </div>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {sector.weather.temperature.toFixed(1)}°C
            </span>
          </div>
        )}
      </div>

      {/* Node Info */}
      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>Node ID: {sector.nodeId}</span>
          <span>
            Updated:{' '}
            {new Date(sector.lastUpdated).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </div>
    </section>
  );
}

export default SectorDetail;
