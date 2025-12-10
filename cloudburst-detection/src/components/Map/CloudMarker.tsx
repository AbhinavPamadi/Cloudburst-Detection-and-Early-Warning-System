'use client';

import { useMemo, useEffect, useState } from 'react';
import { Marker, Tooltip, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { CloudData, CloudIntensity } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface CloudMarkerProps {
  cloud: CloudData;
  onClick?: (cloud: CloudData) => void;
  showTrajectory?: boolean;
}

// ============================================
// Constants
// ============================================

const INTENSITY_SIZES: Record<CloudIntensity, number> = {
  light: 40,
  moderate: 60,
  heavy: 80,
};

const INTENSITY_LABELS: Record<CloudIntensity, string> = {
  light: 'Light',
  moderate: 'Moderate',
  heavy: 'Heavy',
};

// ============================================
// Helper Functions
// ============================================

function createCloudIcon(intensity: CloudIntensity, coverage: number): L.DivIcon {
  const size = INTENSITY_SIZES[intensity];
  const opacity = 0.6; // 60% transparent as requested

  // SVG cloud shape
  const svgCloud = `
    <svg
      width="${size}"
      height="${size * 0.6}"
      viewBox="0 0 100 60"
      xmlns="http://www.w3.org/2000/svg"
      style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));"
    >
      <!-- Main cloud body -->
      <ellipse cx="50" cy="40" rx="40" ry="20" fill="rgba(255,255,255,${opacity})" />
      <ellipse cx="30" cy="35" rx="25" ry="18" fill="rgba(255,255,255,${opacity})" />
      <ellipse cx="70" cy="35" rx="25" ry="18" fill="rgba(255,255,255,${opacity})" />
      <ellipse cx="45" cy="25" rx="22" ry="16" fill="rgba(255,255,255,${opacity})" />
      <ellipse cx="60" cy="28" rx="20" ry="14" fill="rgba(255,255,255,${opacity})" />
      <!-- Border/outline -->
      <ellipse cx="50" cy="40" rx="40" ry="20" fill="none" stroke="rgba(200,200,200,0.8)" stroke-width="1" />
    </svg>
  `;

  return L.divIcon({
    className: 'cloud-marker-container',
    html: `
      <div class="cloud-marker" style="
        position: relative;
        width: ${size}px;
        height: ${size * 0.6}px;
        animation: cloudFloat 3s ease-in-out infinite;
        cursor: pointer;
      ">
        ${svgCloud}
      </div>
    `,
    iconSize: [size, size * 0.6],
    iconAnchor: [size / 2, size * 0.3],
  });
}

function getDirectionLabel(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(degrees / 45) % 8;
  return directions[index];
}

// ============================================
// Component
// ============================================

export function CloudMarker({ cloud, onClick }: CloudMarkerProps) {
  const map = useMap();
  const [animatedPosition, setAnimatedPosition] = useState(cloud.position);

  // Memoize icon creation
  const icon = useMemo(
    () => createCloudIcon(cloud.intensity, cloud.coverage),
    [cloud.intensity, cloud.coverage]
  );

  // Animate cloud movement based on wind
  useEffect(() => {
    const animationDuration = 10000; // 10 seconds per animation cycle
    const startTime = Date.now();
    const startPos = { ...cloud.position };

    // Calculate movement per animation cycle (scaled down for visibility)
    const metersPerSecond = cloud.movement.speed;
    const radians = (cloud.movement.direction * Math.PI) / 180;

    // Move about 100m in the animation cycle for visible effect
    const movementScale = 0.001; // Degrees per animation cycle
    const dLat = movementScale * Math.cos(radians);
    const dLng = movementScale * Math.sin(radians);

    let animationFrame: number;

    const animate = () => {
      const elapsed = (Date.now() - startTime) % animationDuration;
      const progress = elapsed / animationDuration;

      // Smooth oscillating movement
      const easedProgress = Math.sin(progress * Math.PI);

      setAnimatedPosition({
        lat: startPos.lat + dLat * easedProgress,
        lng: startPos.lng + dLng * easedProgress,
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
    };
  }, [cloud.position, cloud.movement]);

  const handleClick = () => {
    onClick?.(cloud);
  };

  return (
    <Marker
      position={[animatedPosition.lat, animatedPosition.lng]}
      icon={icon}
      zIndexOffset={1000}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -20]} permanent={false}>
        <div className="text-xs">
          <div className="font-semibold">
            {INTENSITY_LABELS[cloud.intensity]} Cloud
          </div>
          <div className="mt-1">
            <span className="text-gray-500">CAPE:</span>{' '}
            <span className="font-medium">{Math.round(cloud.cape)} J/kg</span>
          </div>
          <div>
            <span className="text-gray-500">Temp:</span>{' '}
            <span className="font-medium">{cloud.temperature.toFixed(1)}°C</span>
          </div>
          <div>
            <span className="text-gray-500">Moving:</span>{' '}
            <span className="font-medium">
              {getDirectionLabel(cloud.movement.direction)} at {cloud.movement.speed.toFixed(1)} m/s
            </span>
          </div>
        </div>
      </Tooltip>

      <Popup>
        <div className="p-2 min-w-52">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span className="text-lg">☁️</span>
            {INTENSITY_LABELS[cloud.intensity]} Cloud Formation
          </h3>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Intensity</span>
              <span className={`font-medium ${
                cloud.intensity === 'heavy' ? 'text-red-600' :
                cloud.intensity === 'moderate' ? 'text-orange-600' :
                'text-blue-600'
              }`}>
                {INTENSITY_LABELS[cloud.intensity]}
              </span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between">
              <span className="text-gray-500">CAPE</span>
              <span className="font-medium">{Math.round(cloud.cape)} J/kg</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cloud Top Temp</span>
              <span className="font-medium">{cloud.temperature.toFixed(1)}°C</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Coverage</span>
              <span className="font-medium">{Math.round(cloud.coverage)}%</span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between">
              <span className="text-gray-500">Latitude</span>
              <span className="font-medium">{cloud.position.lat.toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Longitude</span>
              <span className="font-medium">{cloud.position.lng.toFixed(4)}°</span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between">
              <span className="text-gray-500">Wind Speed</span>
              <span className="font-medium">{cloud.movement.speed.toFixed(1)} m/s</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Direction</span>
              <span className="font-medium">
                {cloud.movement.direction.toFixed(0)}° ({getDirectionLabel(cloud.movement.direction)})
              </span>
            </div>

            {cloud.predictedPath.length > 0 && (
              <>
                <hr className="my-2" />
                <div className="text-gray-500 mb-1">Predicted Position (1hr):</div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lat</span>
                  <span className="font-medium">
                    {cloud.predictedPath[cloud.predictedPath.length - 1].lat.toFixed(4)}°
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Lng</span>
                  <span className="font-medium">
                    {cloud.predictedPath[cloud.predictedPath.length - 1].lng.toFixed(4)}°
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================
// Multiple Cloud Markers Component
// ============================================

interface CloudMarkersProps {
  clouds: CloudData[];
  onCloudClick?: (cloud: CloudData) => void;
}

export function CloudMarkers({ clouds, onCloudClick }: CloudMarkersProps) {
  return (
    <>
      {clouds.map((cloud) => (
        <CloudMarker
          key={cloud.cloudId}
          cloud={cloud}
          onClick={onCloudClick}
        />
      ))}
    </>
  );
}

export default CloudMarker;
