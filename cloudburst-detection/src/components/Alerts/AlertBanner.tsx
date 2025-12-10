'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Radio,
  ArrowUp,
  ArrowDown,
  CheckCircle,
  X,
  CloudRain,
} from 'lucide-react';
import type { AerialUnit, AerialStatus, SectorState } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface AlertBannerProps {
  variant: 'aerial-deploying' | 'aerial-active' | 'cloudburst' | 'high-risk';
  aerial?: AerialUnit | null;
  sector?: SectorState | null;
  onDismiss?: () => void;
  className?: string;
}

interface AerialStatusBannerProps {
  aerial: AerialUnit;
  onDismiss?: () => void;
}

interface CloudburstBannerProps {
  sectors: SectorState[];
  onViewSector?: (sector: SectorState) => void;
  onDismiss?: () => void;
}

// ============================================
// Banner Configurations
// ============================================

const BANNER_CONFIGS = {
  'aerial-deploying': {
    bgColor: 'bg-yellow-500',
    textColor: 'text-black',
    Icon: ArrowUp,
    pulse: true,
  },
  'aerial-active': {
    bgColor: 'bg-green-500',
    textColor: 'text-white',
    Icon: CheckCircle,
    pulse: false,
  },
  'aerial-descending': {
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    Icon: ArrowDown,
    pulse: false,
  },
  cloudburst: {
    bgColor: 'bg-red-600',
    textColor: 'text-white',
    Icon: CloudRain,
    pulse: true,
  },
  'high-risk': {
    bgColor: 'bg-orange-500',
    textColor: 'text-white',
    Icon: AlertTriangle,
    pulse: true,
  },
};

// ============================================
// Main Alert Banner
// ============================================

export function AlertBanner({
  variant,
  aerial,
  sector,
  onDismiss,
  className = '',
}: AlertBannerProps) {
  const config = BANNER_CONFIGS[variant];
  const Icon = config.Icon;

  const getMessage = () => {
    switch (variant) {
      case 'aerial-deploying':
        return aerial
          ? `Aerial monitoring deploying to ${aerial.targetSectorId || 'target sector'} • Altitude: ${Math.round(aerial.altitude)}m`
          : 'Aerial monitoring deploying...';
      case 'aerial-active':
        return aerial
          ? `Aerial monitoring active over ${aerial.targetSectorId || 'sector'} • Enhanced prediction enabled`
          : 'Aerial monitoring active';
      case 'cloudburst':
        return sector
          ? `CLOUDBURST DETECTED in ${sector.name || sector.sectorId} • ${Math.round(sector.currentProbability)}% probability`
          : 'CLOUDBURST DETECTED';
      case 'high-risk':
        return sector
          ? `High risk alert: ${sector.name || sector.sectorId} at ${Math.round(sector.currentProbability)}%`
          : 'High risk detected';
      default:
        return '';
    }
  };

  return (
    <div
      className={`
        ${config.bgColor} ${config.textColor}
        px-4 py-2 flex items-center justify-between
        ${config.pulse ? 'animate-pulse' : ''}
        ${className}
      `}
      role="alert"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 flex-shrink-0" />
        <span className="font-medium text-sm">{getMessage()}</span>
        {aerial?.status === 'deploying' && (
          <span className="text-xs opacity-80">
            • ~{Math.round((3000 - aerial.altitude) / aerial.ascentRate / 60)} min to max altitude
          </span>
        )}
      </div>

      {onDismiss && (
        <button
          onClick={onDismiss}
          className="p-1 rounded hover:bg-black/10 transition-colors"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ============================================
// Aerial Status Banner
// ============================================

export function AerialStatusBanner({ aerial, onDismiss }: AerialStatusBannerProps) {
  const variant =
    aerial.status === 'deploying'
      ? 'aerial-deploying'
      : aerial.status === 'active'
      ? 'aerial-active'
      : aerial.status === 'descending'
      ? 'aerial-descending'
      : null;

  if (!variant) return null;

  const config = BANNER_CONFIGS[variant];

  return (
    <AlertBanner
      variant={variant as 'aerial-deploying' | 'aerial-active'}
      aerial={aerial}
      onDismiss={onDismiss}
    />
  );
}

// ============================================
// Cloudburst Banner
// ============================================

export function CloudburstBanner({
  sectors,
  onViewSector,
  onDismiss,
}: CloudburstBannerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlashing, setIsFlashing] = useState(true);

  // Cycle through sectors if multiple
  useEffect(() => {
    if (sectors.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sectors.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [sectors.length]);

  // Flash effect on mount
  useEffect(() => {
    setIsFlashing(true);
    const timeout = setTimeout(() => setIsFlashing(false), 500);
    return () => clearTimeout(timeout);
  }, []);

  if (sectors.length === 0) return null;

  const currentSector = sectors[currentIndex];

  return (
    <div
      className={`
        bg-red-600 text-white px-4 py-3
        ${isFlashing ? 'animate-[flash_200ms_ease-in-out]' : ''}
      `}
      role="alert"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <CloudRain className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-ping" />
          </div>

          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              CLOUDBURST DETECTED
              {sectors.length > 1 && (
                <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded">
                  {sectors.length} sectors
                </span>
              )}
            </div>
            <div className="text-xs opacity-90 flex items-center gap-2">
              <span>{currentSector.name || currentSector.sectorId}</span>
              <span>•</span>
              <span className="font-semibold">
                {Math.round(currentSector.currentProbability)}% probability
              </span>
              {currentSector.cloudburstConfidence && (
                <>
                  <span>•</span>
                  <span>{currentSector.cloudburstConfidence} confidence</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewSector && (
            <button
              onClick={() => onViewSector(currentSector)}
              className="px-3 py-1 text-xs font-medium bg-white text-red-600 rounded
                hover:bg-red-50 transition-colors"
            >
              View Sector
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 rounded hover:bg-white/10 transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Sector indicators for multiple */}
      {sectors.length > 1 && (
        <div className="flex items-center justify-center gap-1 mt-2">
          {sectors.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentIndex ? 'bg-white' : 'bg-white/40'
              }`}
              aria-label={`View sector ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Stacked Banners Container
// ============================================

interface StackedBannersProps {
  aerial: AerialUnit | null;
  cloudburstSectors: SectorState[];
  highRiskSector: SectorState | null;
  onViewSector?: (sector: SectorState) => void;
}

export function StackedBanners({
  aerial,
  cloudburstSectors,
  highRiskSector,
  onViewSector,
}: StackedBannersProps) {
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(new Set());

  const dismiss = (id: string) => {
    setDismissedBanners((prev) => new Set([...prev, id]));
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Cloudburst Banner - Highest Priority */}
      {cloudburstSectors.length > 0 && !dismissedBanners.has('cloudburst') && (
        <CloudburstBanner
          sectors={cloudburstSectors}
          onViewSector={onViewSector}
          onDismiss={() => dismiss('cloudburst')}
        />
      )}

      {/* Aerial Status Banner */}
      {aerial &&
        aerial.status !== 'standby' &&
        !dismissedBanners.has('aerial') && (
          <AerialStatusBanner
            aerial={aerial}
            onDismiss={() => dismiss('aerial')}
          />
        )}

      {/* High Risk Banner - Only if no cloudburst */}
      {cloudburstSectors.length === 0 &&
        highRiskSector &&
        highRiskSector.currentProbability >= 75 &&
        !dismissedBanners.has('high-risk') && (
          <AlertBanner
            variant="high-risk"
            sector={highRiskSector}
            onDismiss={() => dismiss('high-risk')}
          />
        )}
    </div>
  );
}

export default AlertBanner;
