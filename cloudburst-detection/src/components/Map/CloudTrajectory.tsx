'use client';

import { useMemo } from 'react';
import { Polyline, CircleMarker, Tooltip } from 'react-leaflet';
import type { CloudData } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface CloudTrajectoryProps {
  cloud: CloudData;
  showMarkers?: boolean;
}

// ============================================
// Constants
// ============================================

const TIME_LABELS = ['15 min', '30 min', '45 min', '1 hr'];
const TRAJECTORY_COLOR = '#60a5fa'; // blue-400
const MARKER_COLORS = [
  'rgba(96, 165, 250, 0.9)',   // 15min - most opaque
  'rgba(96, 165, 250, 0.7)',   // 30min
  'rgba(96, 165, 250, 0.5)',   // 45min
  'rgba(96, 165, 250, 0.3)',   // 1hr - most faded
];

// ============================================
// Component
// ============================================

export function CloudTrajectory({ cloud, showMarkers = true }: CloudTrajectoryProps) {
  // Build the full path: current position + predicted positions
  const fullPath = useMemo(() => {
    const positions: [number, number][] = [
      [cloud.position.lat, cloud.position.lng],
    ];

    cloud.predictedPath.forEach((pos) => {
      positions.push([pos.lat, pos.lng]);
    });

    return positions;
  }, [cloud.position, cloud.predictedPath]);

  // Only show if we have predicted path
  if (cloud.predictedPath.length === 0) {
    return null;
  }

  return (
    <>
      {/* Dashed trajectory line */}
      <Polyline
        positions={fullPath}
        pathOptions={{
          color: TRAJECTORY_COLOR,
          weight: 2,
          opacity: 0.8,
          dashArray: '8, 8',
          lineCap: 'round',
          lineJoin: 'round',
        }}
      />

      {/* Time interval markers */}
      {showMarkers && cloud.predictedPath.map((pos, index) => (
        <CircleMarker
          key={`trajectory-${cloud.cloudId}-${index}`}
          center={[pos.lat, pos.lng]}
          radius={6 - index} // Smaller as time increases
          pathOptions={{
            color: 'white',
            weight: 2,
            fillColor: MARKER_COLORS[index] || MARKER_COLORS[3],
            fillOpacity: 1,
          }}
        >
          <Tooltip direction="top" offset={[0, -8]} permanent={false}>
            <div className="text-xs">
              <div className="font-semibold">{TIME_LABELS[index] || `${(index + 1) * 15} min`}</div>
              <div className="text-gray-500">
                {pos.lat.toFixed(4)}°, {pos.lng.toFixed(4)}°
              </div>
            </div>
          </Tooltip>
        </CircleMarker>
      ))}

      {/* Current position marker (origin) */}
      <CircleMarker
        center={[cloud.position.lat, cloud.position.lng]}
        radius={4}
        pathOptions={{
          color: 'white',
          weight: 2,
          fillColor: '#22c55e', // green for current
          fillOpacity: 1,
        }}
      >
        <Tooltip direction="top" offset={[0, -8]} permanent={false}>
          <div className="text-xs">
            <div className="font-semibold">Current Position</div>
          </div>
        </Tooltip>
      </CircleMarker>
    </>
  );
}

// ============================================
// Multiple Cloud Trajectories Component
// ============================================

interface CloudTrajectoriesProps {
  clouds: CloudData[];
  showMarkers?: boolean;
}

export function CloudTrajectories({ clouds, showMarkers = true }: CloudTrajectoriesProps) {
  return (
    <>
      {clouds.map((cloud) => (
        <CloudTrajectory
          key={`traj-${cloud.cloudId}`}
          cloud={cloud}
          showMarkers={showMarkers}
        />
      ))}
    </>
  );
}

export default CloudTrajectory;
