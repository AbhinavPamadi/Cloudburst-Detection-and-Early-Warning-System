'use client';

import { useMemo } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import type { SectorState, WindData } from '@/types/sector.types';
import { getCardinalDirection } from '@/utils/geoUtils';

// ============================================
// Types
// ============================================

interface WindIndicatorProps {
  sector: SectorState;
  wind: WindData;
  showOnlyOnCloudburst?: boolean;
}

// ============================================
// Constants
// ============================================

const MIN_ARROW_SIZE = 20;
const MAX_ARROW_SIZE = 60;
const MAX_WIND_SPEED = 20; // m/s for full scale

// ============================================
// Helper Functions
// ============================================

function calculateArrowSize(windSpeed: number): number {
  const normalized = Math.min(windSpeed / MAX_WIND_SPEED, 1);
  return MIN_ARROW_SIZE + normalized * (MAX_ARROW_SIZE - MIN_ARROW_SIZE);
}

function createWindArrowIcon(
  direction: number,
  speed: number,
  isPulsing: boolean
): L.DivIcon {
  const size = calculateArrowSize(speed);
  const pulseClass = isPulsing ? 'wind-arrow-pulse' : '';

  // Arrow points in direction wind is blowing TO
  const svgArrow = `
    <svg
      width="${size}"
      height="${size}"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style="transform: rotate(${direction}deg); filter: drop-shadow(1px 1px 2px rgba(0,0,0,0.5));"
      class="${pulseClass}"
    >
      <path
        d="M12 4L12 20M12 4L6 10M12 4L18 10"
        stroke="white"
        stroke-width="3"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
      <path
        d="M12 4L12 20M12 4L6 10M12 4L18 10"
        stroke="#1e40af"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
  `;

  return L.divIcon({
    className: 'wind-indicator-container',
    html: `
      <div class="wind-indicator ${pulseClass}" style="
        width: ${size}px;
        height: ${size}px;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${svgArrow}
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ============================================
// Component
// ============================================

export function WindIndicator({
  sector,
  wind,
  showOnlyOnCloudburst = true,
}: WindIndicatorProps) {
  // Memoize icon creation (must be before any conditional returns)
  const icon = useMemo(
    () => {
      if (!wind || wind.speed < 0.5) return null;
      return createWindArrowIcon(wind.direction, wind.speed, sector.cloudburstDetected);
    },
    [wind?.direction, wind?.speed, sector.cloudburstDetected]
  );

  const cardinalDir = wind ? getCardinalDirection(wind.direction) : '';

  // Only show on cloudburst detection if flag is set
  if (showOnlyOnCloudburst && !sector.cloudburstDetected) {
    return null;
  }

  // Don't show if no wind or very low wind
  if (!wind || wind.speed < 0.5 || !icon) {
    return null;
  }

  return (
    <Marker
      position={[sector.centroid.lat, sector.centroid.lng]}
      icon={icon}
      interactive={true}
      zIndexOffset={1000}
    >
      <Tooltip
        direction="top"
        offset={[0, -15]}
        permanent={false}
        className="wind-tooltip"
      >
        <div className="text-xs font-medium">
          <div className="flex items-center gap-1">
            <span className="text-blue-600">{wind.speed.toFixed(1)}</span>
            <span className="text-gray-500">m/s</span>
          </div>
          <div className="text-gray-600">
            {Math.round(wind.direction)}° ({cardinalDir})
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

// ============================================
// Multiple Wind Indicators Component
// ============================================

interface WindIndicatorsProps {
  sectors: Map<string, SectorState>;
  wind: WindData | null;
  showOnlyOnCloudburst?: boolean;
}

export function WindIndicators({
  sectors,
  wind,
  showOnlyOnCloudburst = true,
}: WindIndicatorsProps) {
  if (!wind) return null;

  const sectorsToShow = showOnlyOnCloudburst
    ? Array.from(sectors.values()).filter((s) => s.cloudburstDetected)
    : Array.from(sectors.values());

  return (
    <>
      {sectorsToShow.map((sector) => (
        <WindIndicator
          key={`wind-${sector.sectorId}`}
          sector={sector}
          wind={wind}
          showOnlyOnCloudburst={false}
        />
      ))}
    </>
  );
}

export default WindIndicator;
