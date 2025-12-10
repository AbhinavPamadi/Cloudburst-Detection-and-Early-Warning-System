/**
 * Firebase Sector Helpers
 *
 * Database Structure:
 * /sectors/{sectorId}/
 *   - name: string
 *   - centroid: { lat, lng }
 *   - geometry: GeoJSON Polygon
 *   - probability: number (0-100)
 *   - confidence: number (0-1)
 *   - alertLevel: 'normal' | 'elevated' | 'high' | 'critical'
 *   - predictionSource: 'ground' | 'aerial' | 'ground+aerial'
 *   - cloudburstDetected: boolean
 *   - aerialDeployed: boolean
 *   - lastUpdated: timestamp
 *
 * /weather/wind/
 *   - direction: number (degrees)
 *   - speed: number (m/s)
 *   - timestamp: number
 *
 * /aerial/{payloadId}/
 *   - status: 'standby' | 'deploying' | 'active' | 'descending'
 *   - altitude: number
 *   - ascentRate: number
 *   - temperature: number
 *   - pressure: number
 *   - humidity: number
 *   - pwv: number
 *   - batteryLevel: number
 *   - targetSectorId: string
 *   - position: { lat, lng }
 *   - lastUpdated: timestamp
 *
 * /alerts/{alertId}/
 *   - sectorId: string
 *   - type: 'cloudburst_detected' | 'high_probability' | 'aerial_deployed'
 *   - severity: AlertLevel
 *   - message: string
 *   - timestamp: number
 *   - acknowledged: boolean
 *   - acknowledgedAt: number | null
 *   - acknowledgedBy: string | null
 */

import { database, ref, get, set, update, onValue, remove } from './firebase';
import type {
  SectorState,
  WindData,
  AerialUnit,
  Alert,
  AlertLevel,
  AlertSeverity,
  AerialStatus,
  Coordinates,
  SensorNode,
} from '@/types/sector.types';

// ============================================
// Types for Firebase Data
// ============================================

interface FirebaseSectorData {
  name: string;
  nodeId: string;
  centroid: Coordinates;
  geometry: {
    type: 'Polygon';
    coordinates: number[][][];
  };
  probability: number;
  confidence: number;
  alertLevel: AlertLevel;
  predictionSource: 'ground' | 'aerial' | 'ground+aerial';
  cloudburstDetected: boolean;
  cloudburstConfidence?: string;
  aerialDeployed: boolean;
  lastUpdated: number;
  weather?: {
    temperature: number;
    humidity: number;
    pressure: number;
  };
  rainfall?: {
    rate: number;
    accumulated: number;
    duration: number;
  };
}

interface FirebaseWindData {
  direction: number;
  speed: number;
  timestamp: number;
}

interface FirebaseAerialData {
  payloadId: string;
  status: 'standby' | 'deploying' | 'active' | 'descending';
  altitude: number;
  ascentRate: number;
  temperature: number;
  pressure: number;
  humidity: number;
  pwv: number;
  batteryLevel: number;
  targetSectorId: string | null;
  position: Coordinates;
  lastUpdated: number;
}

interface FirebaseAlertData {
  sectorId: string;
  type: 'cloudburst_detected' | 'high_probability' | 'aerial_deployed' | 'aerial_recalled' | 'system_warning';
  severity: AlertSeverity;
  title?: string;
  message: string;
  probability?: number;
  wind?: WindData | null;
  aerialStatus?: AerialStatus | null;
  timestamp: number | string;
  acknowledged: boolean;
  acknowledgedAt: number | string | null;
  acknowledgedBy: string | null;
}

// ============================================
// Helper Functions
// ============================================

function normalizePredictionSource(source: string): 'ground' | 'ground+aerial' | 'unavailable' {
  if (source === 'aerial') return 'ground+aerial';
  if (source === 'ground' || source === 'ground+aerial' || source === 'unavailable') {
    return source;
  }
  return 'unavailable';
}

function normalizeCloudburstConfidence(conf?: string): 'high' | 'medium' | 'low' | null {
  if (!conf) return null;
  const lower = conf.toLowerCase();
  if (lower === 'high' || lower === 'medium' || lower === 'low') {
    return lower as 'high' | 'medium' | 'low';
  }
  return null;
}

function getAlertTitle(type: string): string {
  switch (type) {
    case 'cloudburst_detected':
      return 'Cloudburst Detected';
    case 'high_probability':
      return 'High Probability Alert';
    case 'aerial_deployed':
      return 'Aerial Monitoring Deployed';
    case 'aerial_recalled':
      return 'Aerial Unit Recalled';
    case 'system_warning':
      return 'System Warning';
    default:
      return 'Alert';
  }
}

// ============================================
// Database Paths
// ============================================

const PATHS = {
  sectors: 'sectors',
  sector: (id: string) => `sectors/${id}`,
  wind: 'weather/wind',
  aerial: 'aerial',
  aerialUnit: (id: string) => `aerial/${id}`,
  alerts: 'alerts',
  alert: (id: string) => `alerts/${id}`,
  nodes: 'registry/nodes',
};

// ============================================
// Sector Operations
// ============================================

/**
 * Get all sectors from Firebase
 */
export async function getAllSectors(): Promise<Map<string, SectorState>> {
  const sectorsRef = ref(database, PATHS.sectors);
  const snapshot = await get(sectorsRef);

  const sectors = new Map<string, SectorState>();

  if (snapshot.exists()) {
    const data = snapshot.val() as Record<string, FirebaseSectorData>;

    Object.entries(data).forEach(([sectorId, sectorData]) => {
      sectors.set(sectorId, firebaseSectorToState(sectorId, sectorData));
    });
  }

  return sectors;
}

/**
 * Get a single sector by ID
 */
export async function getSector(sectorId: string): Promise<SectorState | null> {
  const sectorRef = ref(database, PATHS.sector(sectorId));
  const snapshot = await get(sectorRef);

  if (snapshot.exists()) {
    return firebaseSectorToState(sectorId, snapshot.val());
  }

  return null;
}

/**
 * Update sector data
 */
export async function updateSector(
  sectorId: string,
  updates: Partial<FirebaseSectorData>
): Promise<void> {
  const sectorRef = ref(database, PATHS.sector(sectorId));
  await update(sectorRef, {
    ...updates,
    lastUpdated: Date.now(),
  });
}

/**
 * Update sector probability
 */
export async function updateSectorProbability(
  sectorId: string,
  probability: number,
  confidence: number,
  source: 'ground' | 'aerial' | 'ground+aerial'
): Promise<void> {
  const alertLevel = getAlertLevelFromProbability(probability);

  await updateSector(sectorId, {
    probability,
    confidence,
    predictionSource: source,
    alertLevel,
    cloudburstDetected: probability >= 85,
    cloudburstConfidence: probability >= 85 ? getConfidenceLabel(confidence) : undefined,
  });
}

/**
 * Subscribe to sector updates
 */
export function subscribeSectors(
  callback: (sectors: Map<string, SectorState>) => void
): () => void {
  const sectorsRef = ref(database, PATHS.sectors);

  const unsubscribe = onValue(sectorsRef, (snapshot) => {
    const sectors = new Map<string, SectorState>();

    if (snapshot.exists()) {
      const data = snapshot.val() as Record<string, FirebaseSectorData>;

      Object.entries(data).forEach(([sectorId, sectorData]) => {
        sectors.set(sectorId, firebaseSectorToState(sectorId, sectorData));
      });
    }

    callback(sectors);
  });

  return () => unsubscribe();
}

/**
 * Subscribe to a single sector
 */
export function subscribeSector(
  sectorId: string,
  callback: (sector: SectorState | null) => void
): () => void {
  const sectorRef = ref(database, PATHS.sector(sectorId));

  const unsubscribe = onValue(sectorRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(firebaseSectorToState(sectorId, snapshot.val()));
    } else {
      callback(null);
    }
  });

  return () => unsubscribe();
}

// ============================================
// Wind Operations
// ============================================

/**
 * Get current wind data
 */
export async function getWind(): Promise<WindData | null> {
  const windRef = ref(database, PATHS.wind);
  const snapshot = await get(windRef);

  if (snapshot.exists()) {
    const data = snapshot.val() as FirebaseWindData;
    return {
      direction: data.direction,
      speed: data.speed,
      timestamp: typeof data.timestamp === 'number'
        ? new Date(data.timestamp).toISOString()
        : data.timestamp,
    };
  }

  return null;
}

/**
 * Update wind data
 */
export async function updateWind(wind: Omit<WindData, 'timestamp'>): Promise<void> {
  const windRef = ref(database, PATHS.wind);
  await set(windRef, {
    direction: wind.direction,
    speed: wind.speed,
    timestamp: Date.now(),
  });
}

/**
 * Subscribe to wind updates
 */
export function subscribeWind(
  callback: (wind: WindData | null) => void
): () => void {
  const windRef = ref(database, PATHS.wind);

  const unsubscribe = onValue(windRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.val() as FirebaseWindData;
      callback({
        direction: data.direction,
        speed: data.speed,
        timestamp: typeof data.timestamp === 'number'
          ? new Date(data.timestamp).toISOString()
          : data.timestamp,
      });
    } else {
      callback(null);
    }
  });

  return () => unsubscribe();
}

// ============================================
// Aerial Operations
// ============================================

/**
 * Get aerial unit status
 */
export async function getAerial(payloadId: string = 'primary'): Promise<AerialUnit | null> {
  const aerialRef = ref(database, PATHS.aerialUnit(payloadId));
  const snapshot = await get(aerialRef);

  if (snapshot.exists()) {
    return firebaseAerialToUnit(snapshot.val());
  }

  return null;
}

/**
 * Deploy aerial monitoring
 */
export async function deployAerial(
  payloadId: string,
  targetSectorId: string,
  position: Coordinates
): Promise<void> {
  const aerialRef = ref(database, PATHS.aerialUnit(payloadId));

  await set(aerialRef, {
    payloadId,
    status: 'deploying',
    altitude: 0,
    ascentRate: 5, // 5 m/s default ascent
    temperature: 25,
    pressure: 1013,
    humidity: 50,
    pwv: 15,
    batteryLevel: 100,
    targetSectorId,
    position,
    lastUpdated: Date.now(),
  });

  // Create deployment alert
  await createAlert({
    alertId: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    sectorId: targetSectorId,
    type: 'aerial_deployed',
    severity: 'info',
    title: 'Aerial Monitoring Deployed',
    message: `Aerial monitoring deploying to sector ${targetSectorId}`,
    probability: 0,
    wind: null,
    aerialStatus: 'deploying',
  });
}

/**
 * Recall aerial unit
 */
export async function recallAerial(payloadId: string): Promise<void> {
  const aerialRef = ref(database, PATHS.aerialUnit(payloadId));

  await update(aerialRef, {
    status: 'descending',
    ascentRate: -3, // Descend at 3 m/s
    lastUpdated: Date.now(),
  });
}

/**
 * Update aerial status
 */
export async function updateAerial(
  payloadId: string,
  updates: Partial<FirebaseAerialData>
): Promise<void> {
  const aerialRef = ref(database, PATHS.aerialUnit(payloadId));
  await update(aerialRef, {
    ...updates,
    lastUpdated: Date.now(),
  });
}

/**
 * Subscribe to aerial updates
 */
export function subscribeAerial(
  payloadId: string,
  callback: (aerial: AerialUnit | null) => void
): () => void {
  const aerialRef = ref(database, PATHS.aerialUnit(payloadId));

  const unsubscribe = onValue(aerialRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(firebaseAerialToUnit(snapshot.val()));
    } else {
      callback(null);
    }
  });

  return () => unsubscribe();
}

// ============================================
// Alert Operations
// ============================================

/**
 * Get all alerts
 */
export async function getAlerts(): Promise<Alert[]> {
  const alertsRef = ref(database, PATHS.alerts);
  const snapshot = await get(alertsRef);

  const alerts: Alert[] = [];

  if (snapshot.exists()) {
    const data = snapshot.val() as Record<string, FirebaseAlertData>;

    Object.entries(data).forEach(([alertId, alertData]) => {
      alerts.push({
        alertId,
        sectorId: alertData.sectorId,
        type: alertData.type,
        severity: alertData.severity,
        title: alertData.title ?? getAlertTitle(alertData.type),
        message: alertData.message,
        probability: alertData.probability ?? 0,
        wind: alertData.wind ?? null,
        aerialStatus: alertData.aerialStatus ?? null,
        timestamp: typeof alertData.timestamp === 'number'
          ? new Date(alertData.timestamp).toISOString()
          : alertData.timestamp,
        acknowledged: alertData.acknowledged,
        acknowledgedAt: alertData.acknowledgedAt
          ? typeof alertData.acknowledgedAt === 'number'
            ? new Date(alertData.acknowledgedAt).toISOString()
            : alertData.acknowledgedAt
          : null,
        acknowledgedBy: alertData.acknowledgedBy,
      });
    });
  }

  return alerts.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Create a new alert
 */
export async function createAlert(
  alert: Omit<Alert, 'timestamp' | 'acknowledged' | 'acknowledgedAt' | 'acknowledgedBy'>
): Promise<string> {
  const alertsRef = ref(database, PATHS.alerts);
  const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const alertRef = ref(database, PATHS.alert(alertId));

  await set(alertRef, {
    ...alert,
    timestamp: Date.now(),
    acknowledged: false,
    acknowledgedAt: null,
    acknowledgedBy: null,
  });

  return alertId;
}

/**
 * Acknowledge an alert
 */
export async function acknowledgeAlert(
  alertId: string,
  userId?: string
): Promise<void> {
  const alertRef = ref(database, PATHS.alert(alertId));

  await update(alertRef, {
    acknowledged: true,
    acknowledgedAt: Date.now(),
    acknowledgedBy: userId || 'anonymous',
  });
}

/**
 * Delete an alert
 */
export async function deleteAlert(alertId: string): Promise<void> {
  const alertRef = ref(database, PATHS.alert(alertId));
  await remove(alertRef);
}

/**
 * Subscribe to alerts
 */
export function subscribeAlerts(
  callback: (alerts: Alert[]) => void
): () => void {
  const alertsRef = ref(database, PATHS.alerts);

  const unsubscribe = onValue(alertsRef, (snapshot) => {
    const alerts: Alert[] = [];

    if (snapshot.exists()) {
      const data = snapshot.val() as Record<string, FirebaseAlertData>;

      Object.entries(data).forEach(([alertId, alertData]) => {
        alerts.push({
          alertId,
          sectorId: alertData.sectorId,
          type: alertData.type,
          severity: alertData.severity,
          title: alertData.title ?? getAlertTitle(alertData.type),
          message: alertData.message,
          probability: alertData.probability ?? 0,
          wind: alertData.wind ?? null,
          aerialStatus: alertData.aerialStatus ?? null,
          timestamp: typeof alertData.timestamp === 'number'
            ? new Date(alertData.timestamp).toISOString()
            : alertData.timestamp,
          acknowledged: alertData.acknowledged,
          acknowledgedAt: alertData.acknowledgedAt
            ? typeof alertData.acknowledgedAt === 'number'
              ? new Date(alertData.acknowledgedAt).toISOString()
              : alertData.acknowledgedAt
            : null,
          acknowledgedBy: alertData.acknowledgedBy,
        });
      });
    }

    callback(alerts.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    ));
  });

  return () => unsubscribe();
}

// ============================================
// Node Operations
// ============================================

/**
 * Get all sensor nodes
 */
export async function getNodes(): Promise<SensorNode[]> {
  const nodesRef = ref(database, PATHS.nodes);
  const snapshot = await get(nodesRef);

  const nodes: SensorNode[] = [];

  if (snapshot.exists()) {
    const data = snapshot.val() as Record<string, any>;

    Object.entries(data).forEach(([nodeId, nodeData]) => {
      const lat = nodeData.latitude ?? nodeData.location?.lat ?? nodeData.location?.latitude;
      const lng = nodeData.longitude ?? nodeData.location?.lng ?? nodeData.location?.longitude;
      if (lat !== undefined && lng !== undefined) {
        nodes.push({
          nodeId,
          name: nodeData.name ?? nodeId,
          latitude: lat,
          longitude: lng,
          sectorId: nodeData.sectorId ?? '',
          status: nodeData.status === 'inactive' ? 'inactive' : 'active',
          type: nodeData.type === 'gateway' ? 'gateway' : 'sensor',
          lastSeen: typeof nodeData.lastSeen === 'number'
            ? new Date(nodeData.lastSeen).toISOString()
            : nodeData.lastSeen ?? new Date().toISOString(),
          nearbyNodes: nodeData.nearbyNodes,
        });
      }
    });
  }

  return nodes;
}

/**
 * Subscribe to node updates
 */
export function subscribeNodes(
  callback: (nodes: SensorNode[]) => void
): () => void {
  const nodesRef = ref(database, PATHS.nodes);

  const unsubscribe = onValue(nodesRef, (snapshot) => {
    const nodes: SensorNode[] = [];

    if (snapshot.exists()) {
      const data = snapshot.val() as Record<string, any>;

      Object.entries(data).forEach(([nodeId, nodeData]) => {
        const lat = nodeData.latitude ?? nodeData.location?.lat ?? nodeData.location?.latitude;
        const lng = nodeData.longitude ?? nodeData.location?.lng ?? nodeData.location?.longitude;
        if (lat !== undefined && lng !== undefined) {
          nodes.push({
            nodeId,
            name: nodeData.name ?? nodeId,
            latitude: lat,
            longitude: lng,
            sectorId: nodeData.sectorId ?? '',
            status: nodeData.status === 'inactive' ? 'inactive' : 'active',
            type: nodeData.type === 'gateway' ? 'gateway' : 'sensor',
            lastSeen: typeof nodeData.lastSeen === 'number'
              ? new Date(nodeData.lastSeen).toISOString()
              : nodeData.lastSeen ?? new Date().toISOString(),
            nearbyNodes: nodeData.nearbyNodes,
          });
        }
      });
    }

    callback(nodes);
  });

  return () => unsubscribe();
}

// ============================================
// Helper Functions
// ============================================

function firebaseSectorToState(
  sectorId: string,
  data: FirebaseSectorData
): SectorState {
  return {
    sectorId,
    nodeId: data.nodeId,
    name: data.name,
    boundaries: data.geometry,
    centroid: data.centroid,
    neighbors: [], // Will be calculated by voronoi generator
    currentProbability: data.probability,
    historicalProbability: [], // Can be fetched separately
    alertLevel: data.alertLevel,
    predictionSource: normalizePredictionSource(data.predictionSource),
    confidence: data.confidence,
    cloudburstDetected: data.cloudburstDetected,
    cloudburstConfidence: normalizeCloudburstConfidence(data.cloudburstConfidence),
    aerialDeployed: data.aerialDeployed,
    weather: data.weather ? {
      temperature: data.weather.temperature,
      pressure: data.weather.pressure,
      humidity: data.weather.humidity,
      timestamp: new Date(data.lastUpdated).toISOString(),
    } : null,
    rainfall: data.rainfall ? {
      rate: data.rainfall.rate,
      cumulative: data.rainfall.accumulated ?? 0,
      timestamp: new Date(data.lastUpdated).toISOString(),
    } : null,
    wind: null, // Wind is fetched separately
    lastUpdated: new Date(data.lastUpdated).toISOString(),
  };
}

function firebaseAerialToUnit(data: FirebaseAerialData): AerialUnit {
  return {
    payloadId: data.payloadId,
    status: data.status,
    altitude: data.altitude,
    ascentRate: data.ascentRate,
    temperature: data.temperature,
    pressure: data.pressure,
    humidity: data.humidity,
    pwv: data.pwv,
    batteryLevel: data.batteryLevel,
    targetSectorId: data.targetSectorId,
    position: data.position,
    lastUpdated: data.lastUpdated,
  };
}

function getAlertLevelFromProbability(probability: number): AlertLevel {
  if (probability >= 75) return 'critical';
  if (probability >= 50) return 'high';
  if (probability >= 25) return 'elevated';
  return 'normal';
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return 'High';
  if (confidence >= 0.5) return 'Medium';
  return 'Low';
}

// ============================================
// Exports
// ============================================

export {
  PATHS,
  type FirebaseSectorData,
  type FirebaseWindData,
  type FirebaseAerialData,
  type FirebaseAlertData,
};
