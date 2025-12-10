import type {
  Coordinates,
  Sector,
  WindData,
  PropagationEvent,
  WindPropagationResult,
} from '@/types/sector.types';
import { calculateDistance, getBearing, angleDifference } from './geoUtils';

// ============================================
// Constants
// ============================================

// Wind factor thresholds (angle difference in degrees)
const DOWNWIND_THRESHOLD = 45;
const CROSSWIND_FAVORABLE_THRESHOLD = 90;
const CROSSWIND_THRESHOLD = 135;

// Wind factors based on direction alignment
const WIND_FACTORS = {
  downwind: 0.8,         // 0-45° difference
  crosswindFavorable: 0.5, // 45-90° difference
  crosswind: 0.3,        // 90-135° difference
  upwind: 0.1,           // 135-180° difference
} as const;

// Distance decay coefficient
const DISTANCE_DECAY_COEFFICIENT = 0.2;

// Propagation delay coefficient (km to minutes conversion)
// delay_minutes = distance_km / (wind_speed_ms * 0.06)
const PROPAGATION_DELAY_COEFFICIENT = 0.06;

// Minimum probability to propagate
const MIN_PROPAGATION_PROBABILITY = 1;

// Maximum propagation hops
const MAX_PROPAGATION_HOPS = 4;

// ============================================
// Wind Factor Calculations
// ============================================

/**
 * Calculate wind factor based on angle between wind direction and neighbor direction
 * @param windAngle Wind direction in degrees (0-360)
 * @param neighborAngle Angle from source to neighbor centroid (0-360)
 * @returns Wind factor (0.1-0.8)
 */
export function calculateWindFactor(
  windAngle: number,
  neighborAngle: number
): number {
  const diff = angleDifference(windAngle, neighborAngle);

  if (diff <= DOWNWIND_THRESHOLD) {
    return WIND_FACTORS.downwind;
  }
  if (diff <= CROSSWIND_FAVORABLE_THRESHOLD) {
    return WIND_FACTORS.crosswindFavorable;
  }
  if (diff <= CROSSWIND_THRESHOLD) {
    return WIND_FACTORS.crosswind;
  }
  return WIND_FACTORS.upwind;
}

/**
 * Calculate distance decay factor
 * decay = 1 / (1 + distance_km * 0.2)
 * @param distanceKm Distance in kilometers
 * @returns Decay factor (0-1)
 */
export function calculateDistanceDecay(distanceKm: number): number {
  return 1 / (1 + distanceKm * DISTANCE_DECAY_COEFFICIENT);
}

/**
 * Calculate propagation delay in minutes
 * delay = distance_km / (wind_speed_ms * 0.06)
 * @param distanceKm Distance in kilometers
 * @param windSpeedMs Wind speed in m/s
 * @returns Delay in minutes (or Infinity if no wind)
 */
export function calculatePropagationDelay(
  distanceKm: number,
  windSpeedMs: number
): number {
  if (windSpeedMs <= 0) {
    return Infinity; // No wind = no propagation
  }
  return distanceKm / (windSpeedMs * PROPAGATION_DELAY_COEFFICIENT);
}

// ============================================
// Propagation Calculation
// ============================================

/**
 * Calculate propagated probability for a single neighbor sector
 * P_neighbor = P_source * wind_factor * distance_decay
 */
export function calculatePropagatedProbability(
  sourceProbability: number,
  windFactor: number,
  distanceDecay: number
): number {
  return sourceProbability * windFactor * distanceDecay;
}

/**
 * Calculate propagation event for a neighbor sector
 * @param sourceSector Source sector with detected cloudburst/high probability
 * @param targetSector Target neighbor sector
 * @param wind Current wind data
 * @returns PropagationEvent or null if propagation is not viable
 */
export function calculatePropagationToNeighbor(
  sourceSector: Sector,
  targetSector: Sector,
  wind: WindData
): PropagationEvent | null {
  const sourceCentroid = sourceSector.centroid;
  const targetCentroid = targetSector.centroid;

  // Calculate geometric values
  const neighborAngle = getBearing(sourceCentroid, targetCentroid);
  const distanceKm = calculateDistance(sourceCentroid, targetCentroid);

  // Calculate propagation factors
  const windFactor = calculateWindFactor(wind.direction, neighborAngle);
  const distanceDecay = calculateDistanceDecay(distanceKm);
  const delayMinutes = calculatePropagationDelay(distanceKm, wind.speed);

  // Calculate propagated probability
  const propagatedProbability = calculatePropagatedProbability(
    sourceSector.currentProbability,
    windFactor,
    distanceDecay
  );

  // Skip if probability too low or delay is infinite
  if (
    propagatedProbability < MIN_PROPAGATION_PROBABILITY ||
    !isFinite(delayMinutes)
  ) {
    return null;
  }

  return {
    sourceSectorId: sourceSector.sectorId,
    targetSectorId: targetSector.sectorId,
    probability: propagatedProbability,
    windFactor,
    distanceDecay,
    delayMinutes,
    scheduledTime: Date.now() + delayMinutes * 60 * 1000,
  };
}

/**
 * Calculate all propagation events from a source sector to its neighbors
 */
export function propagateFromSector(
  sourceSector: Sector,
  allSectors: Map<string, Sector>,
  wind: WindData
): PropagationEvent[] {
  const events: PropagationEvent[] = [];

  for (const neighborId of sourceSector.neighbors) {
    const neighbor = allSectors.get(neighborId);
    if (!neighbor) continue;

    const event = calculatePropagationToNeighbor(sourceSector, neighbor, wind);
    if (event) {
      events.push(event);
    }
  }

  return events;
}

/**
 * Calculate full propagation cascade (multi-hop)
 * Propagates probability from source through multiple layers of neighbors
 */
export function calculatePropagationCascade(
  sourceSector: Sector,
  allSectors: Map<string, Sector>,
  wind: WindData,
  maxHops: number = MAX_PROPAGATION_HOPS
): WindPropagationResult {
  const allEvents: PropagationEvent[] = [];
  const affectedSectors = new Set<string>();
  const visited = new Set<string>([sourceSector.sectorId]);

  // Queue of sectors to process: [sectorId, currentHop, cumulativeProbability]
  const queue: Array<{
    sectorId: string;
    hop: number;
    probability: number;
  }> = [
    {
      sectorId: sourceSector.sectorId,
      hop: 0,
      probability: sourceSector.currentProbability,
    },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.hop >= maxHops) continue;

    const currentSector = allSectors.get(current.sectorId);
    if (!currentSector) continue;

    // Create a virtual sector with the propagated probability for this hop
    const virtualSector: Sector = {
      ...currentSector,
      currentProbability: current.probability,
    };

    // Calculate propagation to neighbors
    const events = propagateFromSector(virtualSector, allSectors, wind);

    for (const event of events) {
      // Don't revisit sectors
      if (visited.has(event.targetSectorId)) continue;

      allEvents.push(event);
      affectedSectors.add(event.targetSectorId);
      visited.add(event.targetSectorId);

      // Add to queue for further propagation
      queue.push({
        sectorId: event.targetSectorId,
        hop: current.hop + 1,
        probability: event.probability,
      });
    }
  }

  return {
    events: allEvents,
    affectedSectors: Array.from(affectedSectors),
  };
}

// ============================================
// Propagation Application
// ============================================

/**
 * Apply propagation events to sectors
 * Uses maximum of current and propagated probability
 */
export function applyPropagationEvents(
  sectors: Map<string, Sector>,
  events: PropagationEvent[]
): Map<string, Sector> {
  const updatedSectors = new Map(sectors);

  for (const event of events) {
    const sector = updatedSectors.get(event.targetSectorId);
    if (!sector) continue;

    // Take maximum of current and propagated probability
    const newProbability = Math.max(
      sector.currentProbability,
      event.probability
    );

    if (newProbability > sector.currentProbability) {
      updatedSectors.set(event.targetSectorId, {
        ...sector,
        currentProbability: newProbability,
        lastUpdated: new Date().toISOString(),
      });
    }
  }

  return updatedSectors;
}

/**
 * Get events that should be applied now (scheduled time has passed)
 */
export function getDueEvents(events: PropagationEvent[]): PropagationEvent[] {
  const now = Date.now();
  return events.filter((event) => event.scheduledTime <= now);
}

/**
 * Get events that are still pending (scheduled for future)
 */
export function getPendingEvents(events: PropagationEvent[]): PropagationEvent[] {
  const now = Date.now();
  return events.filter((event) => event.scheduledTime > now);
}

// ============================================
// Visualization Helpers
// ============================================

/**
 * Get arrow data for visualizing propagation between sectors
 */
export function getPropagationArrows(
  events: PropagationEvent[],
  sectors: Map<string, Sector>
): Array<{
  from: Coordinates;
  to: Coordinates;
  probability: number;
  delayMinutes: number;
}> {
  return events
    .map((event) => {
      const source = sectors.get(event.sourceSectorId);
      const target = sectors.get(event.targetSectorId);

      if (!source || !target) return null;

      return {
        from: source.centroid,
        to: target.centroid,
        probability: event.probability,
        delayMinutes: event.delayMinutes,
      };
    })
    .filter((arrow): arrow is NonNullable<typeof arrow> => arrow !== null);
}

/**
 * Calculate estimated time until propagation reaches a sector
 */
export function getEstimatedArrivalTime(
  events: PropagationEvent[],
  targetSectorId: string
): number | null {
  const targetEvent = events.find((e) => e.targetSectorId === targetSectorId);
  if (!targetEvent) return null;

  const now = Date.now();
  const remainingMs = targetEvent.scheduledTime - now;

  return remainingMs > 0 ? Math.ceil(remainingMs / 60000) : 0; // Return minutes
}

// ============================================
// Wind Direction Helpers
// ============================================

/**
 * Get sectors that are downwind from a source
 */
export function getDownwindSectors(
  sourceSector: Sector,
  allSectors: Map<string, Sector>,
  windDirection: number
): Sector[] {
  const downwind: Sector[] = [];

  for (const [, sector] of allSectors) {
    if (sector.sectorId === sourceSector.sectorId) continue;

    const neighborAngle = getBearing(sourceSector.centroid, sector.centroid);
    const diff = angleDifference(windDirection, neighborAngle);

    if (diff <= DOWNWIND_THRESHOLD) {
      downwind.push(sector);
    }
  }

  return downwind;
}

/**
 * Check if a sector is in the wind path from source
 */
export function isInWindPath(
  sourceSector: Sector,
  targetSector: Sector,
  windDirection: number,
  toleranceDegrees: number = 45
): boolean {
  const neighborAngle = getBearing(sourceSector.centroid, targetSector.centroid);
  const diff = angleDifference(windDirection, neighborAngle);
  return diff <= toleranceDegrees;
}
