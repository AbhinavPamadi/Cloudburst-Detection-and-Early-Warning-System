import { Delaunay } from 'd3-delaunay';
import type { Polygon } from 'geojson';
import type {
  Coordinates,
  GeoBounds,
  SensorNode,
  Sector,
  VoronoiCell,
  VoronoiResult,
  SectorsGeoJSON,
  SectorGeoJSON,
} from '@/types/sector.types';
import {
  toProjected,
  fromProjected,
  calculateDistance,
  getBoundsCenter,
  padBounds,
  calculateBoundsFromCoordinates,
} from './geoUtils';

// ============================================
// Constants
// ============================================

const MIN_SECTOR_RADIUS_KM = 2;
const MAX_SECTOR_RADIUS_KM = 10;
const DEFAULT_PADDING_KM = 15;

// ============================================
// Voronoi Generation
// ============================================

/**
 * Generate Voronoi tessellation from sensor node locations
 * Creates sector boundaries using d3-delaunay
 */
export function generateVoronoiSectors(
  nodes: SensorNode[],
  bounds?: GeoBounds
): VoronoiResult {
  if (!nodes || nodes.length === 0) {
    return { cells: [], bounds: getDefaultBounds() };
  }

  // Filter nodes with valid coordinates
  const validNodes = nodes.filter(
    (node) =>
      typeof node.latitude === 'number' &&
      typeof node.longitude === 'number' &&
      !isNaN(node.latitude) &&
      !isNaN(node.longitude)
  );

  if (validNodes.length === 0) {
    return { cells: [], bounds: getDefaultBounds() };
  }

  // Calculate bounds if not provided
  const coordinates: Coordinates[] = validNodes.map((n) => ({
    lat: n.latitude,
    lng: n.longitude,
  }));
  const calculatedBounds = bounds || padBounds(
    calculateBoundsFromCoordinates(coordinates),
    DEFAULT_PADDING_KM
  );

  // Calculate center for projection
  const center = getBoundsCenter(calculatedBounds);

  // Project all points to 2D plane
  const projectedPoints: Array<[number, number]> = validNodes.map((node) =>
    toProjected(node.latitude, node.longitude, center.lat)
  );

  // Calculate projected bounds with padding
  const [minX, minY] = toProjected(
    calculatedBounds.minLat,
    calculatedBounds.minLng,
    center.lat
  );
  const [maxX, maxY] = toProjected(
    calculatedBounds.maxLat,
    calculatedBounds.maxLng,
    center.lat
  );

  const voronoiBounds: [number, number, number, number] = [
    minX - DEFAULT_PADDING_KM,
    minY - DEFAULT_PADDING_KM,
    maxX + DEFAULT_PADDING_KM,
    maxY + DEFAULT_PADDING_KM,
  ];

  // Generate Delaunay triangulation and Voronoi diagram
  const delaunay = Delaunay.from(projectedPoints);
  const voronoi = delaunay.voronoi(voronoiBounds);

  // Create cells from Voronoi diagram
  const cells: VoronoiCell[] = validNodes.map((node, index) => {
    const cellPolygon = voronoi.cellPolygon(index);

    // Convert projected polygon back to lat/lng
    const polygon: Array<[number, number]> = cellPolygon
      ? cellPolygon.map((point: [number, number]) => {
          const [x, y] = point;
          const [lat, lng] = fromProjected(x, y, center.lat);
          return [lng, lat] as [number, number]; // GeoJSON uses [lng, lat] order
        })
      : [];

    // Apply radius constraints
    const centroid: Coordinates = { lat: node.latitude, lng: node.longitude };
    const clippedPolygon = clipToRadiusConstraints(
      polygon,
      centroid,
      MIN_SECTOR_RADIUS_KM,
      MAX_SECTOR_RADIUS_KM
    );

    // Find neighbors using Delaunay triangulation
    const neighbors: string[] = [];
    for (const neighborIndex of delaunay.neighbors(index)) {
      neighbors.push(validNodes[neighborIndex].nodeId);
    }

    return {
      id: node.nodeId,
      centroid,
      polygon: clippedPolygon,
      neighbors,
    };
  });

  return { cells, bounds: calculatedBounds };
}

/**
 * Clip polygon vertices to radius constraints
 * Ensures minimum and maximum sector size
 */
function clipToRadiusConstraints(
  polygon: Array<[number, number]>,
  centroid: Coordinates,
  minRadius: number,
  maxRadius: number
): Array<[number, number]> {
  if (polygon.length === 0) return polygon;

  return polygon.map(([lng, lat]) => {
    const point: Coordinates = { lat, lng };
    const distance = calculateDistance(centroid, point);

    if (distance < minRadius) {
      // Extend point to minimum radius
      const ratio = minRadius / distance;
      const newLat = centroid.lat + (lat - centroid.lat) * ratio;
      const newLng = centroid.lng + (lng - centroid.lng) * ratio;
      return [newLng, newLat];
    }

    if (distance > maxRadius) {
      // Contract point to maximum radius
      const ratio = maxRadius / distance;
      const newLat = centroid.lat + (lat - centroid.lat) * ratio;
      const newLng = centroid.lng + (lng - centroid.lng) * ratio;
      return [newLng, newLat];
    }

    return [lng, lat];
  });
}

// ============================================
// GeoJSON Conversion
// ============================================

/**
 * Convert Voronoi cells to GeoJSON FeatureCollection
 */
export function voronoiToGeoJSON(
  cells: VoronoiCell[],
  sectors?: Map<string, Sector>
): SectorsGeoJSON {
  const features: SectorGeoJSON[] = cells.map((cell) => {
    const sector = sectors?.get(`sector_${cell.id}`);

    // Ensure polygon is closed (first point = last point)
    const coordinates = [...cell.polygon];
    if (coordinates.length > 0) {
      const first = coordinates[0];
      const last = coordinates[coordinates.length - 1];
      if (first[0] !== last[0] || first[1] !== last[1]) {
        coordinates.push([...first]);
      }
    }

    return {
      type: 'Feature' as const,
      properties: {
        sectorId: `sector_${cell.id}`,
        nodeId: cell.id,
        probability: sector?.currentProbability ?? 0,
        alertLevel: sector?.alertLevel ?? 'normal',
        cloudburstDetected: sector?.cloudburstDetected ?? false,
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [coordinates],
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Convert a single Voronoi cell to GeoJSON Polygon
 */
export function cellToPolygon(cell: VoronoiCell): Polygon {
  const coordinates = [...cell.polygon];

  // Ensure polygon is closed
  if (coordinates.length > 0) {
    const first = coordinates[0];
    const last = coordinates[coordinates.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coordinates.push([...first]);
    }
  }

  return {
    type: 'Polygon',
    coordinates: [coordinates],
  };
}

// ============================================
// Sector Creation
// ============================================

/**
 * Create Sector objects from Voronoi cells and nodes
 */
export function createSectorsFromVoronoi(
  voronoiResult: VoronoiResult,
  nodes: SensorNode[]
): Map<string, Sector> {
  const sectors = new Map<string, Sector>();
  const nodeMap = new Map(nodes.map((n) => [n.nodeId, n]));

  for (const cell of voronoiResult.cells) {
    const node = nodeMap.get(cell.id);
    if (!node) continue;

    const sectorId = `sector_${cell.id}`;

    const sector: Sector = {
      sectorId,
      nodeId: cell.id,
      name: node.name || `Sector ${cell.id}`,
      boundaries: cellToPolygon(cell),
      centroid: cell.centroid,
      neighbors: cell.neighbors.map((n) => `sector_${n}`),
      currentProbability: 0,
      confidence: 0,
      predictionSource: node.status === 'active' ? 'ground' : 'unavailable',
      alertLevel: 'normal',
      cloudburstDetected: false,
      cloudburstConfidence: null,
      aerialDeployed: false,
      lastUpdated: new Date().toISOString(),
    };

    sectors.set(sectorId, sector);
  }

  return sectors;
}

// ============================================
// Neighbor Operations
// ============================================

/**
 * Find all sectors within a certain distance of a given sector
 */
export function findNearbySectors(
  sectorId: string,
  sectors: Map<string, Sector>,
  maxDistanceKm: number
): string[] {
  const sector = sectors.get(sectorId);
  if (!sector) return [];

  const nearby: string[] = [];

  for (const [id, otherSector] of sectors) {
    if (id === sectorId) continue;

    const distance = calculateDistance(sector.centroid, otherSector.centroid);
    if (distance <= maxDistanceKm) {
      nearby.push(id);
    }
  }

  return nearby;
}

/**
 * Get all direct neighbors of a sector
 */
export function getNeighborSectors(
  sectorId: string,
  sectors: Map<string, Sector>
): Sector[] {
  const sector = sectors.get(sectorId);
  if (!sector) return [];

  return sector.neighbors
    .map((neighborId) => sectors.get(neighborId))
    .filter((s): s is Sector => s !== undefined);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get default bounds for India region
 */
function getDefaultBounds(): GeoBounds {
  return {
    minLat: 20,
    maxLat: 35,
    minLng: 70,
    maxLng: 90,
  };
}

/**
 * Check if sectors need regeneration (nodes changed)
 */
export function needsRegeneration(
  currentCells: VoronoiCell[],
  nodes: SensorNode[]
): boolean {
  if (currentCells.length !== nodes.length) return true;

  const currentIds = new Set(currentCells.map((c) => c.id));
  const nodeIds = new Set(nodes.map((n) => n.nodeId));

  // Check if any IDs are different
  for (const id of currentIds) {
    if (!nodeIds.has(id)) return true;
  }

  // Check if any node positions changed significantly
  for (const node of nodes) {
    const cell = currentCells.find((c) => c.id === node.nodeId);
    if (!cell) return true;

    const distance = calculateDistance(
      cell.centroid,
      { lat: node.latitude, lng: node.longitude }
    );

    // Regenerate if any node moved more than 100 meters
    if (distance > 0.1) return true;
  }

  return false;
}

/**
 * Get sector by coordinates (find which sector contains a point)
 */
export function getSectorAtPoint(
  point: Coordinates,
  sectors: Map<string, Sector>
): Sector | null {
  let closestSector: Sector | null = null;
  let minDistance = Infinity;

  for (const sector of sectors.values()) {
    const distance = calculateDistance(point, sector.centroid);
    if (distance < minDistance) {
      minDistance = distance;
      closestSector = sector;
    }
  }

  return closestSector;
}

/**
 * Calculate total monitored area
 * @returns Area in square kilometers
 */
export function calculateTotalMonitoredArea(cells: VoronoiCell[]): number {
  // Approximate using max sector radius for each cell
  return cells.length * Math.PI * Math.pow(MAX_SECTOR_RADIUS_KM, 2);
}
