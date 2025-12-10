'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  X,
  MapPin,
  Thermometer,
  Gauge,
  Droplets,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  CloudRain,
  ChevronLeft,
  ExternalLink,
} from 'lucide-react';
import type { SectorState, WindData } from '@/types/sector.types';
import { getProbabilityColor, getAlertLevelName } from '@/utils/colorScale';
import { getCardinalDirection } from '@/utils/geoUtils';
import { formatConfidence, getPredictionSourceLabel } from '@/utils/sectorCalculations';

// ============================================
// Types
// ============================================

interface SectorModalProps {
  sector: SectorState | null;
  wind: WindData | null;
  isOpen: boolean;
  onClose: () => void;
  onViewOnMap?: (sector: SectorState) => void;
}

type Trend = 'increasing' | 'decreasing' | 'stable';

// ============================================
// Constants
// ============================================

const MIN_TOUCH_SIZE = 44;
const SWIPE_THRESHOLD = 100;

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

function ReadingCard({
  icon,
  label,
  value,
  unit,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit: string;
  iconColor: string;
}) {
  return (
    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      </div>
      <div className="text-xl font-bold text-gray-900 dark:text-white">
        {value}
        <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
          {unit}
        </span>
      </div>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function SectorModal({
  sector,
  wind,
  isOpen,
  onClose,
  onViewOnMap,
}: SectorModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [translateX, setTranslateX] = useState(0);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Handle swipe to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStart) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStart.x;

      // Only allow swiping right to dismiss
      if (deltaX > 0) {
        setTranslateX(deltaX);
      }
    },
    [touchStart]
  );

  const handleTouchEnd = useCallback(() => {
    if (translateX > SWIPE_THRESHOLD) {
      onClose();
    }
    setTranslateX(0);
    setTouchStart(null);
  }, [translateX, onClose]);

  if (!isOpen || !sector) return null;

  // Calculate trend
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

  const probabilityColor = getProbabilityColor(sector.currentProbability);

  return (
    <div className="fixed inset-0 z-50 md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="absolute inset-0 bg-white dark:bg-gray-900 transform transition-transform duration-300"
        style={{
          transform: `translateX(${translateX}px)`,
          opacity: 1 - translateX / 300,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Header */}
        <header className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 z-10">
          <div className="flex items-center justify-between p-4">
            <button
              onClick={onClose}
              className="flex items-center gap-1 text-gray-600 dark:text-gray-400"
              style={{ minWidth: MIN_TOUCH_SIZE, minHeight: MIN_TOUCH_SIZE }}
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Back</span>
            </button>

            <h1 className="font-semibold text-gray-900 dark:text-white">
              Sector Details
            </h1>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
              style={{ minWidth: MIN_TOUCH_SIZE, minHeight: MIN_TOUCH_SIZE }}
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="overflow-y-auto h-[calc(100vh-64px)] pb-safe">
          {/* Probability Hero */}
          <div
            className="p-6 text-center"
            style={{
              backgroundColor: `${probabilityColor}15`,
            }}
          >
            <div className="flex items-center justify-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">
                {sector.name || sector.sectorId}
              </h2>
            </div>

            <div className="flex items-center justify-center gap-3 mb-3">
              <span
                className="text-6xl font-bold"
                style={{ color: probabilityColor }}
              >
                {Math.round(sector.currentProbability)}%
              </span>
              <TrendIcon trend={trend} className="w-8 h-8" />
            </div>

            <div className="text-gray-600 dark:text-gray-400">
              {getAlertLevelName(sector.alertLevel)} Risk
            </div>

            <div className="flex items-center justify-center gap-3 mt-3">
              <span
                className={`text-xs font-medium px-3 py-1 rounded-full ${
                  sector.predictionSource === 'ground+aerial'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                    : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                }`}
              >
                {getPredictionSourceLabel(sector.predictionSource)}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {formatConfidence(sector.confidence)} confidence
              </span>
            </div>
          </div>

          {/* Cloudburst Alert */}
          {sector.cloudburstDetected && (
            <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-full">
                  <CloudRain className="w-6 h-6 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-red-700 dark:text-red-300">
                    Cloudburst Detected!
                  </h3>
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Confidence: {sector.cloudburstConfidence || 'Medium'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Weather Readings Grid */}
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
              Current Readings
            </h3>

            <div className="grid grid-cols-2 gap-3">
              {sector.rainfall && (
                <ReadingCard
                  icon={<Droplets className="w-5 h-5" />}
                  iconColor="text-blue-500"
                  label="Rainfall"
                  value={sector.rainfall.rate.toFixed(1)}
                  unit="mm/hr"
                />
              )}

              {wind && (
                <ReadingCard
                  icon={<Wind className="w-5 h-5" />}
                  iconColor="text-cyan-500"
                  label="Wind"
                  value={`${wind.speed.toFixed(1)} ${getCardinalDirection(wind.direction)}`}
                  unit="m/s"
                />
              )}

              {sector.weather && (
                <>
                  <ReadingCard
                    icon={<Gauge className="w-5 h-5" />}
                    iconColor="text-purple-500"
                    label="Pressure"
                    value={sector.weather.pressure.toFixed(0)}
                    unit="hPa"
                  />

                  <ReadingCard
                    icon={<Droplets className="w-5 h-5" />}
                    iconColor="text-teal-500"
                    label="Humidity"
                    value={sector.weather.humidity}
                    unit="%"
                  />

                  <ReadingCard
                    icon={<Thermometer className="w-5 h-5" />}
                    iconColor="text-orange-500"
                    label="Temperature"
                    value={sector.weather.temperature.toFixed(1)}
                    unit="°C"
                  />
                </>
              )}
            </div>
          </div>

          {/* Node Info */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>Node: {sector.nodeId}</span>
              <span>
                Updated:{' '}
                {new Date(sector.lastUpdated).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-4 space-y-3">
            {onViewOnMap && (
              <button
                onClick={() => {
                  onViewOnMap(sector);
                  onClose();
                }}
                className="w-full py-3 px-4 bg-blue-500 text-white rounded-xl font-medium
                  flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors"
                style={{ minHeight: MIN_TOUCH_SIZE }}
              >
                <MapPin className="w-5 h-5" />
                View on Map
              </button>
            )}

            <button
              onClick={onClose}
              className="w-full py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300
                rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              style={{ minHeight: MIN_TOUCH_SIZE }}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SectorModal;
