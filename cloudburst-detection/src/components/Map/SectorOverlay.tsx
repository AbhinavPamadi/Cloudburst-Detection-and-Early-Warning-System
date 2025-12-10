'use client';

import { useEffect, useRef, useCallback } from 'react';
import { GeoJSON, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Layer, LeafletMouseEvent } from 'leaflet';
import type { Feature, Polygon } from 'geojson';
import type { SectorState, SectorsGeoJSON, AlertLevel } from '@/types/sector.types';
import {
  getProbabilityColor,
  getProbabilityOpacity,
  PROBABILITY_COLORS,
} from '@/utils/colorScale';

// ============================================
// Types
// ============================================

interface SectorOverlayProps {
  sectors: Map<string, SectorState>;
  onSectorClick?: (sector: SectorState) => void;
  onSectorHover?: (sector: SectorState | null) => void;
  selectedSectorId?: string | null;
  showPulseAnimation?: boolean;
}

// ============================================
// Style Functions
// ============================================

function getSectorStyle(
  probability: number,
  alertLevel: AlertLevel,
  isSelected: boolean,
  cloudburstDetected: boolean
) {
  const baseStyle = {
    fillColor: getProbabilityColor(probability),
    fillOpacity: isSelected ? 0.6 : 0.4,
    color: '#ffffff',
    weight: isSelected ? 3 : 2,
    opacity: 0.8,
  };

  // Add red border for critical/high alert levels
  if (alertLevel === 'critical' || cloudburstDetected) {
    return {
      ...baseStyle,
      color: PROBABILITY_COLORS.red,
      weight: 3,
      dashArray: undefined,
    };
  }

  if (alertLevel === 'high') {
    return {
      ...baseStyle,
      color: PROBABILITY_COLORS.orange,
      weight: 2,
    };
  }

  return baseStyle;
}

function getHoverStyle(probability: number) {
  return {
    fillOpacity: 0.6,
    weight: 3,
  };
}

// ============================================
// Component
// ============================================

export function SectorOverlay({
  sectors,
  onSectorClick,
  onSectorHover,
  selectedSectorId,
  showPulseAnimation = true,
}: SectorOverlayProps) {
  const map = useMap();
  const geoJsonRef = useRef<L.GeoJSON | null>(null);
  const sectorsArrayRef = useRef<SectorState[]>([]);

  // Convert sectors map to GeoJSON
  const geoJsonData: SectorsGeoJSON = {
    type: 'FeatureCollection',
    features: Array.from(sectors.values())
      .filter((sector) => sector.boundaries?.coordinates?.length > 0)
      .map((sector) => ({
        type: 'Feature' as const,
        properties: {
          sectorId: sector.sectorId,
          nodeId: sector.nodeId,
          probability: sector.currentProbability,
          alertLevel: sector.alertLevel,
          cloudburstDetected: sector.cloudburstDetected,
        },
        geometry: sector.boundaries,
      })),
  };

  // Store sectors array for lookup
  sectorsArrayRef.current = Array.from(sectors.values());

  // Style function for GeoJSON
  const style = useCallback(
    (feature: any) => {
      if (!feature?.properties) return {};

      const { probability, alertLevel, cloudburstDetected, sectorId } =
        feature.properties;
      const isSelected = sectorId === selectedSectorId;

      return getSectorStyle(
        probability || 0,
        alertLevel || 'normal',
        isSelected,
        cloudburstDetected || false
      );
    },
    [selectedSectorId]
  );

  // Event handlers for each feature
  const onEachFeature = useCallback(
    (feature: Feature<Polygon>, layer: Layer) => {
      const sectorId = feature.properties?.sectorId;
      const sector = sectors.get(sectorId);

      if (!sector) return;

      // Click handler
      layer.on('click', () => {
        onSectorClick?.(sector);
      });

      // Hover handlers
      layer.on('mouseover', (e: LeafletMouseEvent) => {
        onSectorHover?.(sector);

        const target = e.target as L.Path;
        const probability = feature.properties?.probability || 0;

        target.setStyle(getHoverStyle(probability));
        target.bringToFront();
      });

      layer.on('mouseout', (e: LeafletMouseEvent) => {
        onSectorHover?.(null);

        // Reset style
        if (geoJsonRef.current) {
          geoJsonRef.current.resetStyle(e.target);
        }
      });

      // Add tooltip
      const tooltipContent = `
        <div class="sector-tooltip">
          <div class="font-semibold">${sector.name || sector.sectorId}</div>
          <div class="text-sm">
            <span class="font-medium">${Math.round(sector.currentProbability)}%</span> probability
          </div>
          <div class="text-xs text-gray-500">Click for details</div>
        </div>
      `;

      layer.bindTooltip(tooltipContent, {
        sticky: true,
        className: 'sector-tooltip-container',
        direction: 'top',
        offset: [0, -10],
      });
    },
    [sectors, onSectorClick, onSectorHover]
  );

  // Update styles when selection changes
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle((feature: any) => style(feature));
    }
  }, [selectedSectorId, style]);

  // Generate a key that changes when sector probabilities change significantly
  const sectorsKey = Array.from(sectors.values())
    .map((s) => `${s.sectorId}-${Math.round(s.currentProbability)}-${s.alertLevel}`)
    .join('|');

  return (
    <GeoJSON
      ref={geoJsonRef}
      key={sectorsKey}
      data={geoJsonData}
      style={style}
      onEachFeature={onEachFeature}
    />
  );
}

export default SectorOverlay;
