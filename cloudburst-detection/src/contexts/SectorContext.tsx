'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import type {
  Sector,
  SectorState,
  WindData,
  AerialPayload,
  Alert,
  AlertLevel,
  SensorNode,
  ProbabilityHistoryPoint,
  NodeData,
  CloudData,
  AlertHistoryItem,
} from '@/types/sector.types';
import {
  generateVoronoiSectors,
  createSectorsFromVoronoi,
} from '@/utils/voronoiGenerator';
import { getAlertLevel } from '@/utils/sectorCalculations';

// ============================================
// Demo Data Generation (for testing)
// ============================================

// Generate demo nodes for each sector
function generateDemoNodes(sectors: Map<string, SectorState>): Map<string, NodeData> {
  const nodes = new Map<string, NodeData>();
  let nodeIndex = 0;

  sectors.forEach((sector) => {
    // Create 2-3 nodes per sector
    const nodeCount = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < nodeCount; i++) {
      const nodeId = `node-${sector.sectorId}-${i}`;
      const isOnline = Math.random() > 0.2; // 80% chance of being online

      nodes.set(nodeId, {
        nodeId,
        name: `${sector.name} Node ${i + 1}`,
        position: {
          lat: sector.centroid.lat + (Math.random() - 0.5) * 0.1,
          lng: sector.centroid.lng + (Math.random() - 0.5) * 0.1,
        },
        status: isOnline ? 'online' : 'offline',
        lastSeen: isOnline
          ? new Date().toISOString()
          : new Date(Date.now() - Math.random() * 86400000).toISOString(),
        readings: isOnline ? {
          temperature: 15 + Math.random() * 10,
          pressure: 900 + Math.random() * 50,
          humidity: 60 + Math.random() * 35,
          rssi: -50 - Math.random() * 40,
        } : undefined,
      });
      nodeIndex++;
    }
  });

  return nodes;
}

// Generate demo cloud data based on high-probability sectors
function generateDemoClouds(sectors: Map<string, SectorState>, wind: WindData | null): CloudData[] {
  const clouds: CloudData[] = [];

  // Find sectors with probability > 50% for cloud placement
  sectors.forEach((sector) => {
    if (sector.currentProbability > 50) {
      const windSpeed = wind?.speed || 5;
      const windDirection = wind?.direction || 45;

      // Calculate predicted path based on wind
      const predictedPath: { lat: number; lng: number }[] = [];
      for (let i = 1; i <= 4; i++) {
        // Move cloud in wind direction over time (15min intervals)
        const distanceKm = (windSpeed * 900 * i) / 1000; // 15 min in km
        const radians = (windDirection * Math.PI) / 180;
        const dLat = (distanceKm / 111) * Math.cos(radians);
        const dLng = (distanceKm / (111 * Math.cos(sector.centroid.lat * Math.PI / 180))) * Math.sin(radians);

        predictedPath.push({
          lat: sector.centroid.lat + dLat,
          lng: sector.centroid.lng + dLng,
        });
      }

      clouds.push({
        cloudId: `cloud-${sector.sectorId}`,
        position: {
          lat: sector.centroid.lat,
          lng: sector.centroid.lng,
        },
        cape: 1500 + Math.random() * 2000, // CAPE in J/kg
        temperature: -10 - Math.random() * 20, // Cloud top temp
        coverage: 40 + sector.currentProbability * 0.5,
        intensity: sector.currentProbability > 80 ? 'heavy' :
                   sector.currentProbability > 60 ? 'moderate' : 'light',
        movement: {
          speed: windSpeed,
          direction: windDirection,
        },
        predictedPath,
        lastUpdated: new Date().toISOString(),
      });
    }
  });

  return clouds;
}

// Generate demo alert history
function generateDemoAlertHistory(sectors: Map<string, SectorState>): AlertHistoryItem[] {
  const history: AlertHistoryItem[] = [];
  let alertIndex = 0;

  // Create some historical alerts
  sectors.forEach((sector) => {
    if (sector.currentProbability > 40) {
      // Recent active alert
      history.push({
        alertId: `alert-${alertIndex++}`,
        type: sector.cloudburstDetected ? 'cloudburst' : 'high_probability',
        severity: sector.currentProbability > 75 ? 'critical' :
                  sector.currentProbability > 50 ? 'warning' : 'info',
        sectorId: sector.sectorId,
        sectorName: sector.name,
        probability: sector.currentProbability,
        timestamp: new Date().toISOString(),
        status: 'active',
        message: sector.cloudburstDetected
          ? `Cloudburst detected in ${sector.name}!`
          : `High probability (${sector.currentProbability}%) in ${sector.name}`,
      });
    }

    // Add some historical acknowledged alerts
    if (Math.random() > 0.5) {
      const pastTime = new Date(Date.now() - Math.random() * 86400000 * 3);
      history.push({
        alertId: `alert-${alertIndex++}`,
        type: 'high_probability',
        severity: 'warning',
        sectorId: sector.sectorId,
        sectorName: sector.name,
        probability: 50 + Math.random() * 30,
        timestamp: pastTime.toISOString(),
        status: 'acknowledged',
        acknowledgedBy: 'operator@example.com',
        acknowledgedAt: new Date(pastTime.getTime() + 300000).toISOString(),
        message: `Previous alert in ${sector.name}`,
      });
    }
  });

  // Sort by timestamp descending
  return history.sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

function generateDemoSectors(): Map<string, SectorState> {
  const demoSectors = new Map<string, SectorState>();

  // Demo data for Uttarakhand region (cloudburst-prone area)
  const demoData = [
    { id: 'sector-1', name: 'Chamoli North', lat: 30.42, lng: 79.33, prob: 45 },
    { id: 'sector-2', name: 'Pithoragarh East', lat: 29.58, lng: 80.22, prob: 72 },
    { id: 'sector-3', name: 'Rudraprayag', lat: 30.28, lng: 78.98, prob: 88, cloudburst: true },
    { id: 'sector-4', name: 'Uttarkashi West', lat: 30.73, lng: 78.45, prob: 23 },
    { id: 'sector-5', name: 'Tehri Central', lat: 30.38, lng: 78.48, prob: 56 },
    { id: 'sector-6', name: 'Dehradun Valley', lat: 30.32, lng: 78.03, prob: 15 },
  ];

  demoData.forEach((data) => {
    const sector: SectorState = {
      sectorId: data.id,
      nodeId: `node-${data.id}`,
      name: data.name,
      boundaries: {
        type: 'Polygon',
        coordinates: [[
          [data.lng - 0.15, data.lat - 0.1],
          [data.lng + 0.15, data.lat - 0.1],
          [data.lng + 0.15, data.lat + 0.1],
          [data.lng - 0.15, data.lat + 0.1],
          [data.lng - 0.15, data.lat - 0.1],
        ]],
      },
      centroid: { lat: data.lat, lng: data.lng },
      neighbors: [],
      currentProbability: data.prob,
      confidence: 0.75 + Math.random() * 0.2,
      predictionSource: data.prob > 60 ? 'ground+aerial' : 'ground',
      alertLevel: getAlertLevel(data.prob),
      cloudburstDetected: data.cloudburst || false,
      cloudburstConfidence: data.cloudburst ? 'high' : null,
      aerialDeployed: data.prob > 50,
      lastUpdated: new Date().toISOString(),
      weather: {
        temperature: 15 + Math.random() * 10,
        humidity: 70 + Math.random() * 25,
        pressure: 900 + Math.random() * 50,
        timestamp: new Date().toISOString(),
      },
      rainfall: {
        rate: data.prob > 50 ? 20 + Math.random() * 30 : Math.random() * 10,
        cumulative: Math.random() * 100,
        timestamp: new Date().toISOString(),
      },
      wind: null,
      historicalProbability: Array.from({ length: 12 }, (_, i) => ({
        timestamp: Date.now() - (11 - i) * 5 * 60 * 1000,
        probability: Math.max(0, Math.min(100, data.prob + (Math.random() - 0.5) * 20)),
      })),
    };
    demoSectors.set(data.id, sector);
  });

  return demoSectors;
}

// ============================================
// Context Types
// ============================================

interface SectorContextValue {
  // State
  sectors: Map<string, SectorState>;
  nodes: Map<string, NodeData>;
  clouds: CloudData[];
  alertHistory: AlertHistoryItem[];
  wind: WindData | null;
  aerialPayloads: AerialPayload[];
  alerts: Alert[];
  selectedSector: SectorState | null;
  hoveredSector: SectorState | null;
  selectedNode: NodeData | null;
  selectedCloud: CloudData | null;

  // Status
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  lastSync: Date | null;

  // Statistics
  totalNodes: number;
  activeNodes: number;
  sectorsByAlertLevel: Record<AlertLevel, number>;

  // Actions
  selectSector: (sector: SectorState | null) => void;
  selectNode: (node: NodeData | null) => void;
  selectCloud: (cloud: CloudData | null) => void;
  setHoveredSector: (sectorId: string | null) => void;
  refreshSectors: () => Promise<void>;
  updateSectorProbability: (sectorId: string, probability: number) => Promise<void>;
  deployAerial: (sectorId: string) => Promise<void>;
  recallAerial: (payloadId: string) => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
}

const SectorContext = createContext<SectorContextValue | null>(null);

// ============================================
// Provider Props
// ============================================

interface SectorProviderProps {
  children: ReactNode;
  debounceMs?: number;
}

// ============================================
// Provider Component
// ============================================

export function SectorProvider({
  children,
  debounceMs = 1000,
}: SectorProviderProps) {
  // State
  const [sectors, setSectors] = useState<Map<string, SectorState>>(new Map());
  const [nodes, setNodes] = useState<Map<string, NodeData>>(new Map());
  const [clouds, setClouds] = useState<CloudData[]>([]);
  const [alertHistory, setAlertHistory] = useState<AlertHistoryItem[]>([]);
  const [wind, setWind] = useState<WindData | null>(null);
  const [aerialPayloads, setAerialPayloads] = useState<AerialPayload[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedSectorId, setSelectedSectorId] = useState<string | null>(null);
  const [hoveredSectorId, setHoveredSectorId] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedCloudId, setSelectedCloudId] = useState<string | null>(null);

  // Status
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Node counts
  const [totalNodes, setTotalNodes] = useState(0);
  const [activeNodes, setActiveNodes] = useState(0);

  // Refs for debouncing
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingUpdatesRef = useRef<Map<string, Partial<SectorState>>>(new Map());

  // ============================================
  // Computed Values
  // ============================================

  const selectedSector = selectedSectorId
    ? sectors.get(selectedSectorId) || null
    : null;

  const hoveredSector = hoveredSectorId
    ? sectors.get(hoveredSectorId) || null
    : null;

  const selectedNode = selectedNodeId
    ? nodes.get(selectedNodeId) || null
    : null;

  const selectedCloud = selectedCloudId
    ? clouds.find(c => c.cloudId === selectedCloudId) || null
    : null;

  const sectorsByAlertLevel: Record<AlertLevel, number> = {
    normal: 0,
    elevated: 0,
    high: 0,
    critical: 0,
  };

  sectors.forEach((sector) => {
    sectorsByAlertLevel[sector.alertLevel]++;
  });

  // ============================================
  // Actions
  // ============================================

  const selectSector = useCallback((sector: SectorState | null) => {
    setSelectedSectorId(sector?.sectorId || null);
  }, []);

  const selectNode = useCallback((node: NodeData | null) => {
    setSelectedNodeId(node?.nodeId || null);
  }, []);

  const selectCloud = useCallback((cloud: CloudData | null) => {
    setSelectedCloudId(cloud?.cloudId || null);
  }, []);

  const setHoveredSector = useCallback((sectorId: string | null) => {
    setHoveredSectorId(sectorId);
  }, []);

  const refreshSectors = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/sectors', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to refresh sectors');
      }
      // Firebase listener will pick up the changes
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateSectorProbability = useCallback(
    async (sectorId: string, probability: number) => {
      try {
        const response = await fetch(`/api/sectors/${sectorId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ probability }),
        });

        if (!response.ok) {
          throw new Error('Failed to update sector probability');
        }
      } catch (err) {
        setError((err as Error).message);
        throw err;
      }
    },
    []
  );

  const deployAerial = useCallback(async (sectorId: string) => {
    try {
      const response = await fetch('/api/aerial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy', sectorId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to deploy aerial');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const recallAerial = useCallback(async (payloadId: string) => {
    try {
      const response = await fetch('/api/aerial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recall', payloadId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to recall aerial');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  const acknowledgeAlert = useCallback(async (alertId: string) => {
    try {
      const response = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertId, userId: 'current-user' }), // TODO: Get from auth
      });

      if (!response.ok) {
        throw new Error('Failed to acknowledge alert');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    }
  }, []);

  // ============================================
  // Firebase Subscriptions
  // ============================================

  useEffect(() => {
    // Subscribe to sectors
    const sectorsRef = ref(database, 'sectors');
    const sectorsUnsubscribe = onValue(
      sectorsRef,
      (snapshot) => {
        // Connection succeeded - set connected regardless of data
        setIsConnected(true);
        setLastSync(new Date());
        setError(null);

        if (snapshot.exists()) {
          const sectorsData = snapshot.val();
          const newSectors = new Map<string, SectorState>();

          Object.entries(sectorsData).forEach(([sectorId, data]: [string, any]) => {
            const sector: SectorState = {
              sectorId,
              nodeId: data.nodeId || '',
              name: data.name || `Sector ${sectorId}`,
              boundaries: data.boundaries || { type: 'Polygon', coordinates: [] },
              centroid: data.centroid || { lat: 0, lng: 0 },
              neighbors: data.neighbors || [],
              currentProbability: data.currentProbability || 0,
              confidence: data.confidence || 0,
              predictionSource: data.predictionSource || 'ground',
              alertLevel: data.alertLevel || getAlertLevel(data.currentProbability || 0),
              cloudburstDetected: data.cloudburstDetected || false,
              cloudburstConfidence: data.cloudburstConfidence || null,
              aerialDeployed: data.aerialDeployed || false,
              lastUpdated: data.lastUpdated || new Date().toISOString(),
              weather: null,
              rainfall: null,
              wind: null,
              historicalProbability: [],
            };

            newSectors.set(sectorId, sector);
          });

          setSectors(newSectors);
        } else {
          // No sectors in Firebase - generate demo sectors for testing
          const demoSectors = generateDemoSectors();
          setSectors(demoSectors);

          // Also generate demo nodes and clouds
          const demoNodes = generateDemoNodes(demoSectors);
          setNodes(demoNodes);
          setTotalNodes(demoNodes.size);
          setActiveNodes(Array.from(demoNodes.values()).filter(n => n.status === 'online').length);

          // Generate demo alert history
          const demoHistory = generateDemoAlertHistory(demoSectors);
          setAlertHistory(demoHistory);
        }
        setIsLoading(false);
      },
      (err) => {
        setError(err.message);
        setIsConnected(false);
        setIsLoading(false);
      }
    );

    // Subscribe to nodes for counts
    const nodesRef = ref(database, 'nodes');
    const nodesUnsubscribe = onValue(
      nodesRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const nodesData = snapshot.val();
          const nodeList = Object.values(nodesData);
          setTotalNodes(nodeList.length);
          setActiveNodes(
            nodeList.filter(
              (n: any) => n.realtime?.status === 'online'
            ).length
          );
        }
      },
      (err) => {
        console.error('Nodes subscription error:', err);
      }
    );

    // Subscribe to wind data
    const windRef = ref(database, 'weather/wind');
    const windUnsubscribe = onValue(
      windRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const windData = snapshot.val();
          setWind({
            speed: windData.speed || 0,
            direction: windData.direction || 0,
            timestamp: windData.timestamp || new Date().toISOString(),
          });
        }
      },
      (err) => {
        console.error('Wind subscription error:', err);
      }
    );

    // Subscribe to aerial payloads
    const aerialRef = ref(database, 'aerial');
    const aerialUnsubscribe = onValue(
      aerialRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const aerialData = snapshot.val();
          const payloads: AerialPayload[] = Object.entries(aerialData).map(
            ([payloadId, data]: [string, any]) => ({
              payloadId,
              status: data.status || 'standby',
              assignedSectorId: data.assignedSectorId || null,
              position: data.position || null,
              readings: data.readings || null,
              batteryLevel: data.batteryLevel || 100,
              ascentRate: data.ascentRate || 0,
              estimatedMaxAltitudeTime: data.estimatedMaxAltitudeTime || null,
              lastUpdated: data.lastUpdated || new Date().toISOString(),
            })
          );
          setAerialPayloads(payloads);
        } else {
          setAerialPayloads([]);
        }
      },
      (err) => {
        console.error('Aerial subscription error:', err);
      }
    );

    // Subscribe to alerts
    const alertsRef = ref(database, 'alerts');
    const alertsUnsubscribe = onValue(
      alertsRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const alertsData = snapshot.val();
          const alertList: Alert[] = Object.entries(alertsData)
            .map(([alertId, data]: [string, any]) => ({
              alertId,
              sectorId: data.sectorId || '',
              type: data.type || 'system_warning',
              severity: data.severity || 'info',
              title: data.title || '',
              message: data.message || '',
              probability: data.probability || 0,
              wind: data.wind || null,
              aerialStatus: data.aerialStatus || null,
              timestamp: data.timestamp || new Date().toISOString(),
              acknowledged: data.acknowledged || false,
              acknowledgedAt: data.acknowledgedAt || null,
              acknowledgedBy: data.acknowledgedBy || null,
            }))
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
          setAlerts(alertList);
        } else {
          setAlerts([]);
        }
      },
      (err) => {
        console.error('Alerts subscription error:', err);
      }
    );

    // Cleanup
    return () => {
      off(sectorsRef);
      off(nodesRef);
      off(windRef);
      off(aerialRef);
      off(alertsRef);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // ============================================
  // Cloud Data Generation (updates when sectors/wind change)
  // ============================================

  useEffect(() => {
    if (sectors.size > 0) {
      const demoClouds = generateDemoClouds(sectors, wind);
      setClouds(demoClouds);
    }
  }, [sectors, wind]);

  // ============================================
  // Context Value
  // ============================================

  const value: SectorContextValue = {
    // State
    sectors,
    nodes,
    clouds,
    alertHistory,
    wind,
    aerialPayloads,
    alerts,
    selectedSector,
    hoveredSector,
    selectedNode,
    selectedCloud,

    // Status
    isLoading,
    isConnected,
    error,
    lastSync,

    // Statistics
    totalNodes,
    activeNodes,
    sectorsByAlertLevel,

    // Actions
    selectSector,
    selectNode,
    selectCloud,
    setHoveredSector,
    refreshSectors,
    updateSectorProbability,
    deployAerial,
    recallAerial,
    acknowledgeAlert,
  };

  return (
    <SectorContext.Provider value={value}>{children}</SectorContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSectors(): SectorContextValue {
  const context = useContext(SectorContext);

  if (!context) {
    throw new Error('useSectors must be used within a SectorProvider');
  }

  return context;
}

// Alias for useSectors (alternative naming)
export const useSectorContext = useSectors;

export default SectorContext;
