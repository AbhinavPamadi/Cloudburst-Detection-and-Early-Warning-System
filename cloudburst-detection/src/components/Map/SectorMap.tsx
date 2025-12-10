'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { SectorOverlay } from './SectorOverlay';
import { WindIndicators } from './WindIndicator';
import { AerialMarkers } from './AerialMarker';
import { NodeMarkers } from './NodeMarker';
import { CloudMarkers } from './CloudMarker';
import { CloudTrajectories } from './CloudTrajectory';
import { SectorLegend } from './SectorLegend';
import type { SectorState, WindData, AerialPayload, Coordinates, NodeData, CloudData } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface SectorMapProps {
  sectors: Map<string, SectorState>;
  nodes?: Map<string, NodeData>;
  clouds?: CloudData[];
  wind: WindData | null;
  aerialPayloads?: AerialPayload[];
  selectedSectorId?: string | null;
  onSectorSelect?: (sector: SectorState | null) => void;
  onSectorHover?: (sector: SectorState | null) => void;
  onNodeClick?: (node: NodeData) => void;
  onCloudClick?: (cloud: CloudData) => void;
  showWindIndicators?: boolean;
  showAerialMarkers?: boolean;
  showNodeMarkers?: boolean;
  showCloudMarkers?: boolean;
  showCloudTrajectories?: boolean;
  showLegend?: boolean;
  center?: Coordinates;
  zoom?: number;
  className?: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_CENTER: Coordinates = { lat: 31.1048, lng: 77.1734 }; // Himachal Pradesh
const DEFAULT_ZOOM = 9;

// ============================================
// Component
// ============================================

export function SectorMap({
  sectors,
  nodes,
  clouds = [],
  wind,
  aerialPayloads = [],
  selectedSectorId,
  onSectorSelect,
  onSectorHover,
  onNodeClick,
  onCloudClick,
  showWindIndicators = true,
  showAerialMarkers = true,
  showNodeMarkers = true,
  showCloudMarkers = true,
  showCloudTrajectories = true,
  showLegend = true,
  center = DEFAULT_CENTER,
  zoom = DEFAULT_ZOOM,
  className = '',
}: SectorMapProps) {
  const [isConnected, setIsConnected] = useState(true);
  const [hoveredSector, setHoveredSector] = useState<SectorState | null>(null);

  // Convert nodes Map to array for rendering
  const nodesArray = nodes ? Array.from(nodes.values()) : [];

  // Handle sector click
  const handleSectorClick = useCallback(
    (sector: SectorState) => {
      onSectorSelect?.(sector);
    },
    [onSectorSelect]
  );

  // Handle sector hover
  const handleSectorHover = useCallback(
    (sector: SectorState | null) => {
      setHoveredSector(sector);
      onSectorHover?.(sector);
    },
    [onSectorHover]
  );

  // Check if any aerial is active
  const aerialActive = (aerialPayloads || []).some(
    (p) => p.status === 'active' || p.status === 'deploying'
  );

  return (
    <div className={`relative h-full w-full ${className}`}>
      {/* Connection status indicator */}
      <div
        className={`absolute top-3 right-3 z-[1000] flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium shadow-md ${
          isConnected
            ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
            : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
        }`}
      >
        <span
          className={`h-2 w-2 rounded-full ${
            isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
          }`}
        />
        {isConnected ? 'Live' : 'Disconnected'}
      </div>

      {/* Map */}
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={zoom}
        className="h-full w-full"
        style={{ zIndex: 0 }}
        zoomControl={false}
      >
        {/* Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Zoom Control */}
        <ZoomControl position="topleft" />

        {/* Sector Polygons */}
        <SectorOverlay
          sectors={sectors}
          onSectorClick={handleSectorClick}
          onSectorHover={handleSectorHover}
          selectedSectorId={selectedSectorId}
        />

        {/* Wind Indicators */}
        {showWindIndicators && wind && (
          <WindIndicators
            sectors={sectors}
            wind={wind}
            showOnlyOnCloudburst={true}
          />
        )}

        {/* Cloud Trajectories (rendered behind clouds) */}
        {showCloudTrajectories && clouds.length > 0 && (
          <CloudTrajectories clouds={clouds} showMarkers={true} />
        )}

        {/* Cloud Markers */}
        {showCloudMarkers && clouds.length > 0 && (
          <CloudMarkers clouds={clouds} onCloudClick={onCloudClick} />
        )}

        {/* Node Markers */}
        {showNodeMarkers && nodesArray.length > 0 && (
          <NodeMarkers nodes={nodesArray} onNodeClick={onNodeClick} />
        )}

        {/* Aerial Markers */}
        {showAerialMarkers && <AerialMarkers payloads={aerialPayloads} />}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <SectorLegend
          position="bottomright"
          showAerialStatus={showAerialMarkers}
          aerialActive={aerialActive}
        />
      )}

      {/* Hovered sector info (mini tooltip at bottom) */}
      {hoveredSector && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg px-4 py-2 text-sm">
          <span className="font-medium">{hoveredSector.name || hoveredSector.sectorId}</span>
          <span className="mx-2 text-gray-400">|</span>
          <span
            className={`font-semibold ${
              hoveredSector.currentProbability >= 75
                ? 'text-red-600'
                : hoveredSector.currentProbability >= 50
                ? 'text-orange-600'
                : hoveredSector.currentProbability >= 25
                ? 'text-yellow-600'
                : 'text-green-600'
            }`}
          >
            {Math.round(hoveredSector.currentProbability)}%
          </span>
          <span className="text-gray-400 ml-2">probability</span>
        </div>
      )}
    </div>
  );
}

export default SectorMap;
