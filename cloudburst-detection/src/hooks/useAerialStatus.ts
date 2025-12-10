'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  AerialPayload,
  AerialStatus,
  AerialDeploymentTrigger,
  Sector,
} from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface UseAerialStatusOptions {
  onDeploy?: (payloadId: string, sectorId: string) => void;
  onStatusChange?: (payload: AerialPayload, previousStatus: AerialStatus) => void;
  probabilityThreshold?: number;
  thresholdDuration?: number; // seconds
  maxWindSpeed?: number; // m/s
}

interface UseAerialStatusReturn {
  payloads: AerialPayload[];
  activePayload: AerialPayload | null;
  deploy: (sectorId: string) => Promise<void>;
  recall: (payloadId: string) => Promise<void>;
  canDeploy: (sectorId: string, sector: Sector) => AerialDeploymentTrigger;
  isDeploying: boolean;
  error: string | null;
}

// ============================================
// Hook Implementation
// ============================================

export function useAerialStatus(
  payloads: AerialPayload[],
  wind: { speed: number } | null,
  options: UseAerialStatusOptions = {}
): UseAerialStatusReturn {
  const {
    onDeploy,
    onStatusChange,
    probabilityThreshold = 50,
    thresholdDuration = 30,
    maxWindSpeed = 15,
  } = options;

  const [isDeploying, setIsDeploying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track time above threshold for each sector
  const thresholdTimersRef = useRef<Map<string, { startTime: number; probability: number }>>(
    new Map()
  );

  // Track previous statuses for change detection
  const previousStatusesRef = useRef<Map<string, AerialStatus>>(new Map());

  // Active payload (deploying or active)
  const activePayload = payloads.find(
    (p) => p.status === 'active' || p.status === 'deploying'
  ) || null;

  // Detect status changes
  useEffect(() => {
    payloads.forEach((payload) => {
      const previousStatus = previousStatusesRef.current.get(payload.payloadId);

      if (previousStatus && previousStatus !== payload.status) {
        onStatusChange?.(payload, previousStatus);
      }

      previousStatusesRef.current.set(payload.payloadId, payload.status);
    });
  }, [payloads, onStatusChange]);

  // Check if deployment can occur
  const canDeploy = useCallback(
    (sectorId: string, sector: Sector): AerialDeploymentTrigger => {
      const windSpeed = wind?.speed ?? 0;

      // Check if any aerial is already deployed
      const isAerialDeployed = payloads.some(
        (p) => p.status === 'active' || p.status === 'deploying'
      );

      if (isAerialDeployed) {
        return {
          sectorId,
          probability: sector.currentProbability,
          duration: 0,
          windSpeed,
          canDeploy: false,
          reason: 'Aerial unit already deployed',
        };
      }

      // Check probability threshold
      if (sector.currentProbability < probabilityThreshold) {
        // Reset timer if below threshold
        thresholdTimersRef.current.delete(sectorId);

        return {
          sectorId,
          probability: sector.currentProbability,
          duration: 0,
          windSpeed,
          canDeploy: false,
          reason: `Probability ${sector.currentProbability}% below ${probabilityThreshold}% threshold`,
        };
      }

      // Track time above threshold
      const existingTimer = thresholdTimersRef.current.get(sectorId);
      const now = Date.now();

      if (!existingTimer) {
        thresholdTimersRef.current.set(sectorId, {
          startTime: now,
          probability: sector.currentProbability,
        });

        return {
          sectorId,
          probability: sector.currentProbability,
          duration: 0,
          windSpeed,
          canDeploy: false,
          reason: `Need ${thresholdDuration}s above threshold`,
        };
      }

      const duration = (now - existingTimer.startTime) / 1000;

      if (duration < thresholdDuration) {
        return {
          sectorId,
          probability: sector.currentProbability,
          duration,
          windSpeed,
          canDeploy: false,
          reason: `${Math.ceil(thresholdDuration - duration)}s remaining before deployment`,
        };
      }

      // Check wind speed
      if (windSpeed >= maxWindSpeed) {
        return {
          sectorId,
          probability: sector.currentProbability,
          duration,
          windSpeed,
          canDeploy: false,
          reason: `Wind speed ${windSpeed} m/s exceeds safe launch limit of ${maxWindSpeed} m/s`,
        };
      }

      // All conditions met
      return {
        sectorId,
        probability: sector.currentProbability,
        duration,
        windSpeed,
        canDeploy: true,
        reason: null,
      };
    },
    [payloads, wind, probabilityThreshold, thresholdDuration, maxWindSpeed]
  );

  // Deploy aerial unit
  const deploy = useCallback(
    async (sectorId: string) => {
      try {
        setIsDeploying(true);
        setError(null);

        const response = await fetch('/api/aerial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'deploy', sectorId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to deploy aerial unit');
        }

        onDeploy?.(data.payloadId, sectorId);

        // Clear threshold timer
        thresholdTimersRef.current.delete(sectorId);
      } catch (err) {
        setError((err as Error).message);
        throw err;
      } finally {
        setIsDeploying(false);
      }
    },
    [onDeploy]
  );

  // Recall aerial unit
  const recall = useCallback(async (payloadId: string) => {
    try {
      setIsDeploying(true);
      setError(null);

      const response = await fetch('/api/aerial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'recall', payloadId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to recall aerial unit');
      }
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setIsDeploying(false);
    }
  }, []);

  return {
    payloads,
    activePayload,
    deploy,
    recall,
    canDeploy,
    isDeploying,
    error,
  };
}

export default useAerialStatus;
