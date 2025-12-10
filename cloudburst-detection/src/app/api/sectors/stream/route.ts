import { NextRequest } from 'next/server';
import { ref, onValue, off } from 'firebase/database';
import { database } from '@/lib/firebase';
import type {
  WSMessage,
  ProbabilityUpdatePayload,
  WindUpdatePayload,
  AlertTriggeredPayload,
} from '@/types/sector.types';
import { getAlertLevel } from '@/utils/sectorCalculations';

// ============================================
// GET /api/sectors/stream
// Server-Sent Events stream for real-time updates
// ============================================

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  // Track active listeners for cleanup
  const listeners: Array<() => void> = [];

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const connectMessage: WSMessage<{ status: string }> = {
        type: 'connection_status',
        payload: { status: 'connected' },
        timestamp: new Date().toISOString(),
      };
      controller.enqueue(
        encoder.encode(`event: connection_status\ndata: ${JSON.stringify(connectMessage)}\n\n`)
      );

      // Listen for sector updates
      const sectorsRef = ref(database, 'sectors');
      const sectorsUnsubscribe = onValue(sectorsRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const sectorsData = snapshot.val();
        const sectors = Object.entries(sectorsData).map(([sectorId, data]: [string, any]) => ({
          sectorId,
          probability: data.currentProbability || 0,
          source: data.predictionSource || 'ground',
          alertLevel: data.alertLevel || getAlertLevel(data.currentProbability || 0),
        }));

        // Send probability updates for each sector
        for (const sector of sectors) {
          const message: WSMessage<ProbabilityUpdatePayload> = {
            type: 'probability_update',
            payload: {
              sectorId: sector.sectorId,
              probability: sector.probability,
              source: sector.source,
              alertLevel: sector.alertLevel,
            },
            timestamp: new Date().toISOString(),
          };

          try {
            controller.enqueue(
              encoder.encode(`event: probability_update\ndata: ${JSON.stringify(message)}\n\n`)
            );
          } catch (e) {
            // Stream might be closed
          }
        }
      }, (error) => {
        console.error('Sectors listener error:', error);
      });

      listeners.push(() => off(sectorsRef));

      // Listen for wind updates from weather path
      const windRef = ref(database, 'weather/wind');
      const windUnsubscribe = onValue(windRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const windData = snapshot.val();

        // If wind data has a sectorId, send targeted update
        // Otherwise, send general wind update
        const message: WSMessage<WindUpdatePayload> = {
          type: 'wind_update',
          payload: {
            sectorId: windData.sectorId || 'global',
            wind: {
              speed: windData.speed || 0,
              direction: windData.direction || 0,
              timestamp: windData.timestamp || new Date().toISOString(),
            },
          },
          timestamp: new Date().toISOString(),
        };

        try {
          controller.enqueue(
            encoder.encode(`event: wind_update\ndata: ${JSON.stringify(message)}\n\n`)
          );
        } catch (e) {
          // Stream might be closed
        }
      }, (error) => {
        console.error('Wind listener error:', error);
      });

      listeners.push(() => off(windRef));

      // Listen for new alerts
      const alertsRef = ref(database, 'alerts');
      const alertsUnsubscribe = onValue(alertsRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const alertsData = snapshot.val();

        // Find recent unacknowledged alerts (last 60 seconds)
        const recentCutoff = Date.now() - 60000;

        for (const [alertId, data] of Object.entries(alertsData)) {
          const alert = data as any;
          const alertTime = new Date(alert.timestamp).getTime();

          if (alertTime >= recentCutoff && !alert.acknowledged) {
            const message: WSMessage<AlertTriggeredPayload> = {
              type: 'alert_triggered',
              payload: {
                alert: {
                  alertId,
                  sectorId: alert.sectorId,
                  type: alert.type,
                  severity: alert.severity,
                  title: alert.title,
                  message: alert.message,
                  probability: alert.probability,
                  wind: alert.wind,
                  aerialStatus: alert.aerialStatus,
                  timestamp: alert.timestamp,
                  acknowledged: alert.acknowledged || false,
                  acknowledgedAt: alert.acknowledgedAt || null,
                  acknowledgedBy: alert.acknowledgedBy || null,
                },
              },
              timestamp: new Date().toISOString(),
            };

            try {
              controller.enqueue(
                encoder.encode(`event: alert_triggered\ndata: ${JSON.stringify(message)}\n\n`)
              );
            } catch (e) {
              // Stream might be closed
            }
          }
        }
      }, (error) => {
        console.error('Alerts listener error:', error);
      });

      listeners.push(() => off(alertsRef));

      // Listen for aerial status changes
      const aerialRef = ref(database, 'aerial');
      const aerialUnsubscribe = onValue(aerialRef, (snapshot) => {
        if (!snapshot.exists()) return;

        const aerialData = snapshot.val();

        for (const [payloadId, data] of Object.entries(aerialData)) {
          const payload = data as any;

          const message: WSMessage<any> = {
            type: 'aerial_status_change',
            payload: {
              payloadId,
              status: payload.status,
              assignedSectorId: payload.assignedSectorId,
              altitude: payload.readings?.altitude,
            },
            timestamp: new Date().toISOString(),
          };

          try {
            controller.enqueue(
              encoder.encode(`event: aerial_status_change\ndata: ${JSON.stringify(message)}\n\n`)
            );
          } catch (e) {
            // Stream might be closed
          }
        }
      }, (error) => {
        console.error('Aerial listener error:', error);
      });

      listeners.push(() => off(aerialRef));

      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        const heartbeat: WSMessage<{ status: string }> = {
          type: 'connection_status',
          payload: { status: 'heartbeat' },
          timestamp: new Date().toISOString(),
        };

        try {
          controller.enqueue(
            encoder.encode(`event: heartbeat\ndata: ${JSON.stringify(heartbeat)}\n\n`)
          );
        } catch (e) {
          // Stream might be closed, clear interval
          clearInterval(heartbeatInterval);
        }
      }, 30000);

      // Store cleanup function
      listeners.push(() => clearInterval(heartbeatInterval));
    },

    cancel() {
      // Cleanup all listeners when stream is closed
      listeners.forEach((cleanup) => {
        try {
          cleanup();
        } catch (e) {
          console.error('Cleanup error:', e);
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}
