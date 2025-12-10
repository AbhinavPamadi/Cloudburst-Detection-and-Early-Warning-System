import type { Feature, Polygon, FeatureCollection } from 'geojson';

// ============================================
// Core Geographic Types
// ============================================

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeoBounds {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ============================================
// Sensor & Weather Data Types
// ============================================

export interface WeatherData {
  temperature: number;        // Celsius
  pressure: number;           // hPa
  humidity: number;           // 0-100 percentage
  timestamp: string;          // ISO 8601
}

export interface RainfallData {
  rate: number;               // mm/hr
  cumulative: number;         // mm total
  timestamp: string;          // ISO 8601
}

export interface WindData {
  speed: number;              // m/s
  direction: number;          // degrees 0-360 (0=North, 90=East, 180=South, 270=West)
  timestamp: string;          // ISO 8601
}

export interface AerialSensorData {
  altitude: number;           // meters
  temperature: number;        // Celsius
  pressure: number;           // hPa
  humidity: number;           // 0-100 percentage
  pwv: number;                // Precipitable Water Vapor in mm
  timestamp: string;          // ISO 8601
}

// ============================================
// Node Registry Types
// ============================================

export type NodeStatus = 'active' | 'inactive';
export type NodeType = 'sensor' | 'gateway';

export interface SensorNode {
  nodeId: string;
  name: string;
  latitude: number;
  longitude: number;
  sectorId: string;
  status: NodeStatus;
  type: NodeType;
  lastSeen: string;           // ISO 8601
  nearbyNodes?: string[];
}

export interface NodeReadings {
  nodeId: string;
  weather: WeatherData | null;
  rainfall: RainfallData | null;
  wind: WindData | null;
}

// ============================================
// Sector Types
// ============================================

export type AlertLevel = 'normal' | 'elevated' | 'high' | 'critical';
export type PredictionSource = 'ground' | 'ground+aerial' | 'unavailable';

export interface Sector {
  sectorId: string;
  nodeId: string;             // Primary node for this sector
  name: string;
  boundaries: Polygon;        // GeoJSON Polygon
  centroid: Coordinates;
  neighbors: string[];        // Adjacent sectorIds
  currentProbability: number; // 0-100
  confidence: number;         // 0-1
  predictionSource: PredictionSource;
  alertLevel: AlertLevel;
  cloudburstDetected: boolean;
  cloudburstConfidence: 'high' | 'medium' | 'low' | null;
  aerialDeployed: boolean;
  lastUpdated: string;        // ISO 8601
}

export interface SectorState extends Sector {
  weather: WeatherData | null;
  rainfall: RainfallData | null;
  wind: WindData | null;
  historicalProbability: ProbabilityHistoryPoint[];
}

export interface ProbabilityHistoryPoint {
  probability: number;
  timestamp: string;
}

export interface SectorGeoJSON extends Feature<Polygon> {
  properties: {
    sectorId: string;
    nodeId: string;
    probability: number;
    alertLevel: AlertLevel;
    cloudburstDetected: boolean;
  };
}

export interface SectorsGeoJSON extends FeatureCollection<Polygon> {
  features: SectorGeoJSON[];
}

// ============================================
// Probability Calculation Types
// ============================================

export interface ProbabilityFactors {
  rainfallFactor: number;     // 0-100
  pressureFactor: number;     // 0-100
  humidityFactor: number;     // 0-100
}

export interface ProbabilityCalculation {
  baseProbability: number;
  groundFactors: ProbabilityFactors;
  aerialFactors: ProbabilityFactors | null;
  combinedProbability: number;
  confidence: number;
  source: PredictionSource;
}

export interface CloudburstDetection {
  detected: boolean;
  confidence: 'high' | 'medium' | 'low';
  rainfallRate: number;
  pressureDropRate: number;   // hPa per hour
}

// ============================================
// Wind Propagation Types
// ============================================

export interface PropagationEvent {
  sourceSectorId: string;
  targetSectorId: string;
  probability: number;
  windFactor: number;
  distanceDecay: number;
  delayMinutes: number;
  scheduledTime: number;      // Unix timestamp
}

export interface WindPropagationResult {
  events: PropagationEvent[];
  affectedSectors: string[];
}

// ============================================
// Aerial Monitoring Types
// ============================================

export type AerialStatus = 'standby' | 'deploying' | 'active' | 'descending';

export interface AerialPayload {
  payloadId: string;
  status: AerialStatus;
  assignedSectorId: string | null;
  position: Coordinates | null;
  readings: AerialSensorData | null;
  batteryLevel: number;       // 0-100
  ascentRate: number;         // m/s (negative for descent)
  estimatedMaxAltitudeTime: string | null;
  lastUpdated: string;        // ISO 8601
}

// Simplified aerial unit interface for UI components
export interface AerialUnit {
  payloadId: string;
  status: AerialStatus;
  targetSectorId: string | null;
  position: Coordinates | null;
  altitude: number;
  ascentRate: number;
  temperature: number;
  pressure: number;
  humidity: number;
  pwv: number;
  batteryLevel: number;
  lastUpdated: number;        // Unix timestamp
}

// Helper to convert AerialPayload to AerialUnit
export function aerialPayloadToUnit(payload: AerialPayload): AerialUnit {
  return {
    payloadId: payload.payloadId,
    status: payload.status,
    targetSectorId: payload.assignedSectorId,
    position: payload.position,
    altitude: payload.readings?.altitude ?? 0,
    ascentRate: payload.ascentRate,
    temperature: payload.readings?.temperature ?? 0,
    pressure: payload.readings?.pressure ?? 0,
    humidity: payload.readings?.humidity ?? 0,
    pwv: payload.readings?.pwv ?? 0,
    batteryLevel: payload.batteryLevel,
    lastUpdated: payload.lastUpdated ? new Date(payload.lastUpdated).getTime() : Date.now(),
  };
}

export interface AerialDeploymentTrigger {
  sectorId: string;
  probability: number;
  duration: number;           // seconds above threshold
  windSpeed: number;
  canDeploy: boolean;
  reason: string | null;
}

// ============================================
// Alert Types
// ============================================

export type AlertType =
  | 'cloudburst_detected'
  | 'high_probability'
  | 'aerial_deployed'
  | 'aerial_recalled'
  | 'system_warning';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  alertId: string;
  sectorId: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  probability: number;
  wind: WindData | null;
  aerialStatus: AerialStatus | null;
  timestamp: string;          // ISO 8601
  acknowledged: boolean;
  acknowledgedAt: string | null;
  acknowledgedBy: string | null;
}

export interface AlertAcknowledgement {
  alertId: string;
  userId: string;
}

// ============================================
// API Response Types
// ============================================

export interface SectorsApiResponse {
  sectors: Sector[];
  timestamp: string;
}

export interface SectorDetailApiResponse {
  sector: Sector;
  weather: WeatherData | null;
  rainfall: RainfallData | null;
  wind: WindData | null;
  history: ProbabilityHistoryPoint[];
  timestamp: string;
}

export interface SectorPredictionApiResponse {
  sectorId: string;
  groundFactors: ProbabilityFactors;
  aerialFactors: ProbabilityFactors | null;
  combinedProbability: number;
  confidence: number;
  source: PredictionSource;
  timestamp: string;
}

export interface AerialStatusApiResponse {
  payloads: AerialPayload[];
  activeCount: number;
  timestamp: string;
}

// ============================================
// WebSocket / SSE Message Types
// ============================================

export type WSMessageType =
  | 'probability_update'
  | 'wind_update'
  | 'alert_triggered'
  | 'aerial_status_change'
  | 'cloudburst_detected'
  | 'connection_status';

export interface WSMessage<T = unknown> {
  type: WSMessageType;
  payload: T;
  timestamp: string;
}

export interface ProbabilityUpdatePayload {
  sectorId: string;
  probability: number;
  source: PredictionSource;
  alertLevel: AlertLevel;
}

export interface WindUpdatePayload {
  sectorId: string;
  wind: WindData;
}

export interface AlertTriggeredPayload {
  alert: Alert;
}

export interface AerialStatusChangePayload {
  payload: AerialPayload;
  previousStatus: AerialStatus;
}

export interface CloudburstDetectedPayload {
  sectorId: string;
  detection: CloudburstDetection;
  alert: Alert;
}

// ============================================
// UI State Types
// ============================================

export interface SectorPanelState {
  selectedSector: Sector | null;
  hoveredSector: Sector | null;
  showLegend: boolean;
  showWindIndicators: boolean;
  showAerialMarkers: boolean;
}

export interface MapViewState {
  center: Coordinates;
  zoom: number;
  bounds: GeoBounds | null;
}

export interface SystemStatusState {
  totalNodes: number;
  activeNodes: number;
  totalSectors: number;
  aerialStatus: AerialStatus;
  lastDataSync: string;
  isConnected: boolean;
}

export interface AlertSummaryState {
  greenCount: number;         // 0-25%
  yellowCount: number;        // 26-50%
  orangeCount: number;        // 51-75%
  redCount: number;           // 76-100%
  highestProbabilitySector: Sector | null;
  activeCloudbursts: Sector[];
}

// ============================================
// Hook Return Types
// ============================================

export interface UseSectorDataReturn {
  sectors: Map<string, SectorState>;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseSectorStreamReturn {
  isConnected: boolean;
  sectors: Sector[];
  wind: WindData | null;
  lastMessage: WSMessage | null;
  reconnect: () => void;
}

export interface UseCloudburstPredictionReturn {
  calculateProbability: (nodeReadings: NodeReadings) => ProbabilityCalculation;
  detectCloudburst: (rainfall: RainfallData, pressureHistory: number[]) => CloudburstDetection;
}

export interface UseWindPropagationReturn {
  propagate: (sourceSector: Sector, allSectors: Map<string, Sector>, wind: WindData) => WindPropagationResult;
  pendingEvents: PropagationEvent[];
  clearPendingEvents: () => void;
}

export interface UseAerialStatusReturn {
  payloads: AerialPayload[];
  activePayload: AerialPayload | null;
  deploy: (sectorId: string) => Promise<void>;
  recall: (payloadId: string) => Promise<void>;
  canDeploy: (sectorId: string) => AerialDeploymentTrigger;
}

export interface UseAlertsReturn {
  alerts: Alert[];
  unacknowledgedCount: number;
  acknowledge: (alertId: string) => Promise<void>;
  dismissAll: () => void;
}

// ============================================
// Voronoi Types
// ============================================

export interface VoronoiCell {
  id: string;
  centroid: Coordinates;
  polygon: Array<[number, number]>; // [[lng, lat], ...]
  neighbors: string[];
}

export interface VoronoiResult {
  cells: VoronoiCell[];
  bounds: GeoBounds;
}

// ============================================
// Color Scale Types
// ============================================

export interface ProbabilityColorScale {
  green: string;    // 0-25%
  yellow: string;   // 26-50%
  orange: string;   // 51-75%
  red: string;      // 76-100%
}

export const PROBABILITY_COLORS: ProbabilityColorScale = {
  green: '#22c55e',
  yellow: '#eab308',
  orange: '#f97316',
  red: '#ef4444',
} as const;

// ============================================
// Utility Types
// ============================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
