'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  WSMessage,
  ProbabilityUpdatePayload,
  WindUpdatePayload,
  AlertTriggeredPayload,
  WindData,
  Alert,
} from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface SectorUpdate {
  sectorId: string;
  probability: number;
  source: string;
  alertLevel: string;
}

interface UseSectorStreamOptions {
  onProbabilityUpdate?: (updates: SectorUpdate[]) => void;
  onWindUpdate?: (wind: WindData) => void;
  onAlertTriggered?: (alert: Alert) => void;
  onAerialStatusChange?: (payload: any) => void;
  onConnectionChange?: (connected: boolean) => void;
  reconnectInterval?: number;
  maxRetries?: number;
}

interface UseSectorStreamReturn {
  isConnected: boolean;
  lastMessage: WSMessage | null;
  reconnect: () => void;
  disconnect: () => void;
  connectionState: 'connecting' | 'connected' | 'disconnected' | 'error';
  retryCount: number;
}

// ============================================
// Hook Implementation
// ============================================

export function useSectorStream(
  options: UseSectorStreamOptions = {}
): UseSectorStreamReturn {
  const {
    onProbabilityUpdate,
    onWindUpdate,
    onAlertTriggered,
    onAerialStatusChange,
    onConnectionChange,
    reconnectInterval = 5000,
    maxRetries = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionState, setConnectionState] = useState<
    'connecting' | 'connected' | 'disconnected' | 'error'
  >('disconnected');
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isManualDisconnectRef = useRef(false);

  // Notify connection changes
  useEffect(() => {
    onConnectionChange?.(isConnected);
  }, [isConnected, onConnectionChange]);

  // Connect to SSE stream
  const connect = useCallback(() => {
    // Don't reconnect if manually disconnected
    if (isManualDisconnectRef.current) return;

    // Clean up existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setConnectionState('connecting');

    const eventSource = new EventSource('/api/sectors/stream');
    eventSourceRef.current = eventSource;

    // Connection opened
    eventSource.onopen = () => {
      setIsConnected(true);
      setConnectionState('connected');
      setRetryCount(0);
    };

    // Connection status events
    eventSource.addEventListener('connection_status', (event) => {
      const message: WSMessage = JSON.parse(event.data);
      setLastMessage(message);
    });

    // Heartbeat events
    eventSource.addEventListener('heartbeat', (event) => {
      const message: WSMessage = JSON.parse(event.data);
      setLastMessage(message);
    });

    // Probability update events
    eventSource.addEventListener('probability_update', (event) => {
      const message: WSMessage<ProbabilityUpdatePayload> = JSON.parse(event.data);
      setLastMessage(message);

      if (onProbabilityUpdate) {
        onProbabilityUpdate([message.payload as SectorUpdate]);
      }
    });

    // Wind update events
    eventSource.addEventListener('wind_update', (event) => {
      const message: WSMessage<WindUpdatePayload> = JSON.parse(event.data);
      setLastMessage(message);

      if (onWindUpdate && message.payload) {
        onWindUpdate((message.payload as WindUpdatePayload).wind);
      }
    });

    // Alert triggered events
    eventSource.addEventListener('alert_triggered', (event) => {
      const message: WSMessage<AlertTriggeredPayload> = JSON.parse(event.data);
      setLastMessage(message);

      if (onAlertTriggered && message.payload) {
        onAlertTriggered((message.payload as AlertTriggeredPayload).alert);
      }
    });

    // Aerial status change events
    eventSource.addEventListener('aerial_status_change', (event) => {
      const message: WSMessage = JSON.parse(event.data);
      setLastMessage(message);

      if (onAerialStatusChange) {
        onAerialStatusChange(message.payload);
      }
    });

    // Error handling
    eventSource.onerror = () => {
      setIsConnected(false);
      setConnectionState('error');
      eventSource.close();

      // Attempt reconnection
      if (!isManualDisconnectRef.current && retryCount < maxRetries) {
        setRetryCount((prev) => prev + 1);

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, reconnectInterval);
      } else if (retryCount >= maxRetries) {
        setConnectionState('disconnected');
      }
    };

    return eventSource;
  }, [
    onProbabilityUpdate,
    onWindUpdate,
    onAlertTriggered,
    onAerialStatusChange,
    reconnectInterval,
    maxRetries,
    retryCount,
  ]);

  // Disconnect from SSE stream
  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    setConnectionState('disconnected');
  }, []);

  // Reconnect manually
  const reconnect = useCallback(() => {
    isManualDisconnectRef.current = false;
    setRetryCount(0);
    connect();
  }, [connect]);

  // Initial connection
  useEffect(() => {
    connect();

    return () => {
      isManualDisconnectRef.current = true;

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    reconnect,
    disconnect,
    connectionState,
    retryCount,
  };
}

export default useSectorStream;
