import type { Coordinates, GeoBounds } from '@/types/sector.types';

// ============================================
// Constants
// ============================================

const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// ============================================
// Distance Calculations
// ============================================

/**
 * Calculate distance between two coordinates using Haversine formula
 * @returns Distance in kilometers
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLon = (lon2 - lon1) * DEG_TO_RAD;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * DEG_TO_RAD) *
      Math.cos(lat2 * DEG_TO_RAD) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate distance between two Coordinates objects
 * @returns Distance in kilometers
 */
export function calculateDistance(from: Coordinates, to: Coordinates): number {
  return haversineDistance(from.lat, from.lng, to.lat, to.lng);
}

// ============================================
// Bearing & Angle Calculations
// ============================================

/**
 * Calculate bearing angle from one point to another
 * @returns Bearing in degrees (0-360, 0=North, 90=East, 180=South, 270=West)
 */
export function calculateBearing(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const lat1Rad = fromLat * DEG_TO_RAD;
  const lat2Rad = toLat * DEG_TO_RAD;
  const dLngRad = (toLng - fromLng) * DEG_TO_RAD;

  const y = Math.sin(dLngRad) * Math.cos(lat2Rad);
  const x =
    Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLngRad);

  let bearing = Math.atan2(y, x) * RAD_TO_DEG;
  return (bearing + 360) % 360; // Normalize to 0-360
}

/**
 * Calculate bearing between two Coordinates objects
 * @returns Bearing in degrees (0-360)
 */
export function getBearing(from: Coordinates, to: Coordinates): number {
  return calculateBearing(from.lat, from.lng, to.lat, to.lng);
}

/**
 * Calculate absolute angle difference between two angles
 * @returns Difference in degrees (0-180)
 */
export function angleDifference(angle1: number, angle2: number): number {
  let diff = Math.abs(angle1 - angle2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

/**
 * Normalize angle to 0-360 range
 */
export function normalizeAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

// ============================================
// Wind Direction Helpers
// ============================================

/**
 * Get cardinal direction from angle
 */
export function getCardinalDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalizeAngle(degrees) / 45) % 8;
  return directions[index];
}

/**
 * Get full cardinal direction name
 */
export function getFullCardinalDirection(degrees: number): string {
  const directions = [
    'North',
    'Northeast',
    'East',
    'Southeast',
    'South',
    'Southwest',
    'West',
    'Northwest',
  ];
  const index = Math.round(normalizeAngle(degrees) / 45) % 8;
  return directions[index];
}

/**
 * Format wind direction for display
 * @returns String like "90° (E)" or "315° (NW)"
 */
export function formatWindDirection(degrees: number): string {
  const normalized = Math.round(normalizeAngle(degrees));
  const cardinal = getCardinalDirection(degrees);
  return `${normalized}° (${cardinal})`;
}

// ============================================
// Coordinate Projections
// ============================================

/**
 * Convert lat/lng to projected coordinates (equirectangular projection)
 * Suitable for local regions (not crossing poles or dateline)
 * @param centerLat Reference latitude for projection
 * @returns [x, y] in kilometers from center
 */
export function toProjected(
  lat: number,
  lng: number,
  centerLat: number
): [number, number] {
  const latRad = lat * DEG_TO_RAD;
  const lngRad = lng * DEG_TO_RAD;
  const centerLatRad = centerLat * DEG_TO_RAD;

  const x = EARTH_RADIUS_KM * lngRad * Math.cos(centerLatRad);
  const y = EARTH_RADIUS_KM * latRad;

  return [x, y];
}

/**
 * Convert projected coordinates back to lat/lng
 * @param centerLat Reference latitude used in projection
 * @returns [lat, lng]
 */
export function fromProjected(
  x: number,
  y: number,
  centerLat: number
): [number, number] {
  const centerLatRad = centerLat * DEG_TO_RAD;

  const lat = (y / EARTH_RADIUS_KM) * RAD_TO_DEG;
  const lng = (x / (EARTH_RADIUS_KM * Math.cos(centerLatRad))) * RAD_TO_DEG;

  return [lat, lng];
}

// ============================================
// Bounds Calculations
// ============================================

/**
 * Calculate bounding box from array of coordinates
 */
export function calculateBoundsFromCoordinates(coords: Coordinates[]): GeoBounds {
  if (coords.length === 0) {
    // Default bounds (India center)
    return { minLat: 20, maxLat: 35, minLng: 70, maxLng: 90 };
  }

  const lats = coords.map((c) => c.lat);
  const lngs = coords.map((c) => c.lng);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLng: Math.min(...lngs),
    maxLng: Math.max(...lngs),
  };
}

/**
 * Add padding to bounds
 * @param paddingKm Padding in kilometers
 */
export function padBounds(bounds: GeoBounds, paddingKm: number): GeoBounds {
  // Approximate padding in degrees
  const paddingLat = paddingKm / 111; // ~111 km per degree latitude
  const avgLat = (bounds.minLat + bounds.maxLat) / 2;
  const paddingLng = paddingKm / (111 * Math.cos(avgLat * DEG_TO_RAD));

  return {
    minLat: bounds.minLat - paddingLat,
    maxLat: bounds.maxLat + paddingLat,
    minLng: bounds.minLng - paddingLng,
    maxLng: bounds.maxLng + paddingLng,
  };
}

/**
 * Calculate center point of bounds
 */
export function getBoundsCenter(bounds: GeoBounds): Coordinates {
  return {
    lat: (bounds.minLat + bounds.maxLat) / 2,
    lng: (bounds.minLng + bounds.maxLng) / 2,
  };
}

/**
 * Check if a point is within bounds
 */
export function isWithinBounds(point: Coordinates, bounds: GeoBounds): boolean {
  return (
    point.lat >= bounds.minLat &&
    point.lat <= bounds.maxLat &&
    point.lng >= bounds.minLng &&
    point.lng <= bounds.maxLng
  );
}

// ============================================
// Point Operations
// ============================================

/**
 * Calculate midpoint between two coordinates
 */
export function getMidpoint(from: Coordinates, to: Coordinates): Coordinates {
  // For short distances, simple average works well
  return {
    lat: (from.lat + to.lat) / 2,
    lng: (from.lng + to.lng) / 2,
  };
}

/**
 * Calculate a point at given distance and bearing from origin
 * @param origin Starting point
 * @param distanceKm Distance in kilometers
 * @param bearing Bearing in degrees (0-360)
 * @returns Destination coordinates
 */
export function getDestinationPoint(
  origin: Coordinates,
  distanceKm: number,
  bearing: number
): Coordinates {
  const lat1Rad = origin.lat * DEG_TO_RAD;
  const lng1Rad = origin.lng * DEG_TO_RAD;
  const bearingRad = bearing * DEG_TO_RAD;
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  const lat2Rad = Math.asin(
    Math.sin(lat1Rad) * Math.cos(angularDistance) +
      Math.cos(lat1Rad) * Math.sin(angularDistance) * Math.cos(bearingRad)
  );

  const lng2Rad =
    lng1Rad +
    Math.atan2(
      Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(lat1Rad),
      Math.cos(angularDistance) - Math.sin(lat1Rad) * Math.sin(lat2Rad)
    );

  return {
    lat: lat2Rad * RAD_TO_DEG,
    lng: lng2Rad * RAD_TO_DEG,
  };
}

// ============================================
// Polygon Operations
// ============================================

/**
 * Calculate centroid of a polygon
 * @param polygon Array of [lat, lng] pairs
 */
export function calculatePolygonCentroid(
  polygon: Array<[number, number]>
): Coordinates {
  if (polygon.length === 0) {
    return { lat: 0, lng: 0 };
  }

  let latSum = 0;
  let lngSum = 0;

  for (const [lat, lng] of polygon) {
    latSum += lat;
    lngSum += lng;
  }

  return {
    lat: latSum / polygon.length,
    lng: lngSum / polygon.length,
  };
}

/**
 * Calculate area of a polygon (approximate, for small areas)
 * @returns Area in square kilometers
 */
export function calculatePolygonArea(polygon: Array<[number, number]>): number {
  if (polygon.length < 3) return 0;

  // Use shoelace formula with projected coordinates
  const centroid = calculatePolygonCentroid(polygon);
  const projected = polygon.map(([lat, lng]) =>
    toProjected(lat, lng, centroid.lat)
  );

  let area = 0;
  for (let i = 0; i < projected.length; i++) {
    const j = (i + 1) % projected.length;
    area += projected[i][0] * projected[j][1];
    area -= projected[j][0] * projected[i][1];
  }

  return Math.abs(area) / 2;
}

// ============================================
// Validation
// ============================================

/**
 * Validate latitude value
 */
export function isValidLatitude(lat: number): boolean {
  return typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90;
}

/**
 * Validate longitude value
 */
export function isValidLongitude(lng: number): boolean {
  return typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180;
}

/**
 * Validate coordinates object
 */
export function isValidCoordinates(coords: Coordinates): boolean {
  return isValidLatitude(coords.lat) && isValidLongitude(coords.lng);
}
