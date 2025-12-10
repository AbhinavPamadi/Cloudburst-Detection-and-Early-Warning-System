'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  Sector,
  WindData,
  PropagationEvent,
  WindPropagationResult,
} from '@/types/sector.types';
import {
  propagateFromSector,
  calculatePropagationCascade,
  applyPropagationEvents,
  getDueEvents,
  getPendingEvents,
} from '@/utils/windPropagation';

// ============================================
// Types
// ============================================

interface UseWindPropagationOptions {
  /**
   * Callback when propagation events are applied to sectors
   */
  onPropagationApplied?: (
    events: PropagationEvent[],
    updatedSectors: Map<string, Sector>
  ) => void;

  /**
   * Callback when new propagation events are scheduled
   */
  onPropagationScheduled?: (events: PropagationEvent[]) => void;

  /**
   * Maximum number of hops for cascade propagation
   */
  maxHops?: number;

  /**
   * Minimum probability threshold to trigger propagation
   */
  propagationThreshold?: number;

  /**
   * Interval in ms to check for due events
   */
  checkInterval?: number;
}

interface UseWindPropagationReturn {
  /**
   * Currently pending propagation events
   */
  pendingEvents: PropagationEvent[];

  /**
   * Trigger propagation from a source sector
   */
  propagate: (
    sourceSector: Sector,
    allSectors: Map<string, Sector>,
    wind: WindData
  ) => WindPropagationResult;

  /**
   * Trigger cascade propagation from a source sector
   */
  propagateCascade: (
    sourceSector: Sector,
    allSectors: Map<string, Sector>,
    wind: WindData
  ) => WindPropagationResult;

  /**
   * Apply all due events and return updated sectors
   */
  applyDueEvents: (sectors: Map<string, Sector>) => Map<string, Sector>;

  /**
   * Clear all pending events
   */
  clearPendingEvents: () => void;

  /**
   * Get count of events targeting a specific sector
   */
  getEventCountForSector: (sectorId: string) => number;

  /**
   * Check if any events are pending for a sector
   */
  hasPendingEvents: (sectorId: string) => boolean;

  /**
   * Get estimated arrival time for next event to a sector (in minutes)
   */
  getEstimatedArrival: (sectorId: string) => number | null;
}

// ============================================
// Hook Implementation
// ============================================

export function useWindPropagation(
  options: UseWindPropagationOptions = {}
): UseWindPropagationReturn {
  const {
    onPropagationApplied,
    onPropagationScheduled,
    maxHops = 4,
    propagationThreshold = 30,
    checkInterval = 5000, // Check every 5 seconds
  } = options;

  const [pendingEvents, setPendingEvents] = useState<PropagationEvent[]>([]);
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Schedule individual event timers
  const scheduleEvent = useCallback(
    (event: PropagationEvent) => {
      const existingTimer = timersRef.current.get(event.targetSectorId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      const delay = Math.max(0, event.scheduledTime - Date.now());

      const timerId = setTimeout(() => {
        // Event is now due - it will be processed in the interval check
        timersRef.current.delete(event.targetSectorId);
      }, delay);

      timersRef.current.set(event.targetSectorId, timerId);
    },
    []
  );

  // Propagate from a single source sector (single hop)
  const propagate = useCallback(
    (
      sourceSector: Sector,
      allSectors: Map<string, Sector>,
      wind: WindData
    ): WindPropagationResult => {
      // Only propagate if above threshold
      if (sourceSector.currentProbability < propagationThreshold) {
        return { events: [], affectedSectors: [] };
      }

      const events = propagateFromSector(sourceSector, allSectors, wind);

      if (events.length > 0) {
        // Add to pending events
        setPendingEvents((prev) => {
          // Merge with existing events, keeping the higher probability for same targets
          const eventMap = new Map<string, PropagationEvent>();

          for (const e of prev) {
            eventMap.set(e.targetSectorId, e);
          }

          for (const e of events) {
            const existing = eventMap.get(e.targetSectorId);
            if (!existing || e.probability > existing.probability) {
              eventMap.set(e.targetSectorId, e);
            }
          }

          return Array.from(eventMap.values());
        });

        // Schedule timers for new events
        events.forEach(scheduleEvent);

        // Notify callback
        onPropagationScheduled?.(events);
      }

      return {
        events,
        affectedSectors: events.map((e) => e.targetSectorId),
      };
    },
    [propagationThreshold, scheduleEvent, onPropagationScheduled]
  );

  // Propagate cascade (multi-hop)
  const propagateCascade = useCallback(
    (
      sourceSector: Sector,
      allSectors: Map<string, Sector>,
      wind: WindData
    ): WindPropagationResult => {
      // Only propagate if above threshold
      if (sourceSector.currentProbability < propagationThreshold) {
        return { events: [], affectedSectors: [] };
      }

      const result = calculatePropagationCascade(
        sourceSector,
        allSectors,
        wind,
        maxHops
      );

      if (result.events.length > 0) {
        // Add to pending events
        setPendingEvents((prev) => {
          const eventMap = new Map<string, PropagationEvent>();

          for (const e of prev) {
            eventMap.set(e.targetSectorId, e);
          }

          for (const e of result.events) {
            const existing = eventMap.get(e.targetSectorId);
            if (!existing || e.probability > existing.probability) {
              eventMap.set(e.targetSectorId, e);
            }
          }

          return Array.from(eventMap.values());
        });

        // Schedule timers
        result.events.forEach(scheduleEvent);

        // Notify callback
        onPropagationScheduled?.(result.events);
      }

      return result;
    },
    [propagationThreshold, maxHops, scheduleEvent, onPropagationScheduled]
  );

  // Apply all due events
  const applyDueEvents = useCallback(
    (sectors: Map<string, Sector>): Map<string, Sector> => {
      const dueEvents = getDueEvents(pendingEvents);

      if (dueEvents.length === 0) {
        return sectors;
      }

      const updatedSectors = applyPropagationEvents(sectors, dueEvents);

      // Remove applied events from pending
      const remaining = getPendingEvents(pendingEvents);
      setPendingEvents(remaining);

      // Notify callback
      onPropagationApplied?.(dueEvents, updatedSectors);

      return updatedSectors;
    },
    [pendingEvents, onPropagationApplied]
  );

  // Clear all pending events
  const clearPendingEvents = useCallback(() => {
    // Clear all timers
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    setPendingEvents([]);
  }, []);

  // Get event count for a sector
  const getEventCountForSector = useCallback(
    (sectorId: string): number => {
      return pendingEvents.filter((e) => e.targetSectorId === sectorId).length;
    },
    [pendingEvents]
  );

  // Check if sector has pending events
  const hasPendingEvents = useCallback(
    (sectorId: string): boolean => {
      return pendingEvents.some((e) => e.targetSectorId === sectorId);
    },
    [pendingEvents]
  );

  // Get estimated arrival time
  const getEstimatedArrival = useCallback(
    (sectorId: string): number | null => {
      const event = pendingEvents.find((e) => e.targetSectorId === sectorId);
      if (!event) return null;

      const remaining = event.scheduledTime - Date.now();
      return remaining > 0 ? Math.ceil(remaining / 60000) : 0;
    },
    [pendingEvents]
  );

  // Set up interval to check for due events
  useEffect(() => {
    checkIntervalRef.current = setInterval(() => {
      const dueEvents = getDueEvents(pendingEvents);
      if (dueEvents.length > 0) {
        // Events are due - they will be applied when applyDueEvents is called
        // This interval just keeps the pending events list updated
        const remaining = getPendingEvents(pendingEvents);
        if (remaining.length !== pendingEvents.length) {
          setPendingEvents(remaining);
        }
      }
    }, checkInterval);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [pendingEvents, checkInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current.clear();

      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  return {
    pendingEvents,
    propagate,
    propagateCascade,
    applyDueEvents,
    clearPendingEvents,
    getEventCountForSector,
    hasPendingEvents,
    getEstimatedArrival,
  };
}

export default useWindPropagation;
