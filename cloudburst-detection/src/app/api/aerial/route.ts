import { NextRequest, NextResponse } from 'next/server';
import { ref, get, set, update, push } from 'firebase/database';
import { database } from '@/lib/firebase';
import type {
  AerialPayload,
  AerialStatus,
  AerialStatusApiResponse,
} from '@/types/sector.types';

// ============================================
// GET /api/aerial
// Returns current aerial monitoring status
// ============================================

export async function GET(request: NextRequest) {
  try {
    const aerialRef = ref(database, 'aerial');
    const aerialSnapshot = await get(aerialRef);

    const payloads: AerialPayload[] = [];
    let activeCount = 0;

    if (aerialSnapshot.exists()) {
      const aerialData = aerialSnapshot.val();

      for (const [payloadId, data] of Object.entries(aerialData)) {
        const p = data as any;

        const payload: AerialPayload = {
          payloadId,
          status: p.status || 'standby',
          assignedSectorId: p.assignedSectorId || null,
          position: p.position || null,
          readings: p.readings
            ? {
                altitude: p.readings.altitude || 0,
                temperature: p.readings.temperature || 0,
                pressure: p.readings.pressure || 0,
                humidity: p.readings.humidity || 0,
                pwv: p.readings.pwv || 0,
                timestamp: p.readings.timestamp || new Date().toISOString(),
              }
            : null,
          batteryLevel: p.batteryLevel || 100,
          ascentRate: p.ascentRate || 0,
          estimatedMaxAltitudeTime: p.estimatedMaxAltitudeTime || null,
          lastUpdated: p.lastUpdated || new Date().toISOString(),
        };

        payloads.push(payload);

        if (payload.status === 'active' || payload.status === 'deploying') {
          activeCount++;
        }
      }
    }

    const response: AerialStatusApiResponse = {
      payloads,
      activeCount,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching aerial status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch aerial status', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/aerial
// Deploy or recall aerial unit
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, sectorId, payloadId } = body;

    if (!action || !['deploy', 'recall', 'register'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be deploy, recall, or register' },
        { status: 400 }
      );
    }

    const aerialRef = ref(database, 'aerial');

    switch (action) {
      case 'deploy': {
        if (!sectorId) {
          return NextResponse.json(
            { error: 'sectorId required for deploy action' },
            { status: 400 }
          );
        }

        // Check if sector exists
        const sectorRef = ref(database, `sectors/${sectorId}`);
        const sectorSnapshot = await get(sectorRef);

        if (!sectorSnapshot.exists()) {
          return NextResponse.json(
            { error: 'Sector not found' },
            { status: 404 }
          );
        }

        // Find an available payload
        const aerialSnapshot = await get(aerialRef);
        let availablePayloadId: string | null = null;

        if (aerialSnapshot.exists()) {
          const payloads = aerialSnapshot.val();
          for (const [id, data] of Object.entries(payloads)) {
            const p = data as any;
            if (p.status === 'standby') {
              availablePayloadId = id;
              break;
            }
          }
        }

        if (!availablePayloadId) {
          return NextResponse.json(
            { error: 'No available aerial units for deployment' },
            { status: 409 }
          );
        }

        // Get sector centroid for initial position
        const sectorData = sectorSnapshot.val();
        const position = sectorData.centroid;

        // Update payload status
        await update(ref(database, `aerial/${availablePayloadId}`), {
          status: 'deploying',
          assignedSectorId: sectorId,
          position,
          ascentRate: 0,
          lastUpdated: new Date().toISOString(),
        });

        // Update sector
        await update(sectorRef, {
          aerialDeployed: true,
          lastUpdated: new Date().toISOString(),
        });

        // Create deployment alert
        const alertRef = push(ref(database, 'alerts'));
        await set(alertRef, {
          sectorId,
          type: 'aerial_deployed',
          severity: 'info',
          title: 'Aerial Unit Deploying',
          message: `Aerial monitoring unit ${availablePayloadId} deploying to sector ${sectorId}`,
          probability: sectorData.currentProbability || 0,
          wind: null,
          aerialStatus: 'deploying',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });

        // Simulate deployment completion after 30 seconds
        // In a real system, this would be triggered by the aerial unit
        setTimeout(async () => {
          try {
            await update(ref(database, `aerial/${availablePayloadId}`), {
              status: 'active',
              ascentRate: 5, // m/s
              lastUpdated: new Date().toISOString(),
            });
          } catch (e) {
            console.error('Error updating aerial status:', e);
          }
        }, 30000);

        return NextResponse.json({
          success: true,
          action: 'deploy',
          payloadId: availablePayloadId,
          sectorId,
          message: `Aerial unit ${availablePayloadId} deploying to sector ${sectorId}`,
          timestamp: new Date().toISOString(),
        });
      }

      case 'recall': {
        if (!payloadId) {
          return NextResponse.json(
            { error: 'payloadId required for recall action' },
            { status: 400 }
          );
        }

        const payloadRef = ref(database, `aerial/${payloadId}`);
        const payloadSnapshot = await get(payloadRef);

        if (!payloadSnapshot.exists()) {
          return NextResponse.json(
            { error: 'Aerial payload not found' },
            { status: 404 }
          );
        }

        const payloadData = payloadSnapshot.val();
        const assignedSector = payloadData.assignedSectorId;

        // Update payload status
        await update(payloadRef, {
          status: 'descending',
          ascentRate: -3, // m/s descent
          lastUpdated: new Date().toISOString(),
        });

        // Update sector if assigned
        if (assignedSector) {
          await update(ref(database, `sectors/${assignedSector}`), {
            aerialDeployed: false,
            predictionSource: 'ground',
            lastUpdated: new Date().toISOString(),
          });
        }

        // Create recall alert
        const alertRef = push(ref(database, 'alerts'));
        await set(alertRef, {
          sectorId: assignedSector,
          type: 'aerial_recalled',
          severity: 'info',
          title: 'Aerial Unit Recalled',
          message: `Aerial monitoring unit ${payloadId} returning to base`,
          probability: null,
          wind: null,
          aerialStatus: 'descending',
          timestamp: new Date().toISOString(),
          acknowledged: false,
        });

        // Simulate landing after 60 seconds
        setTimeout(async () => {
          try {
            await update(payloadRef, {
              status: 'standby',
              assignedSectorId: null,
              position: null,
              ascentRate: 0,
              readings: null,
              lastUpdated: new Date().toISOString(),
            });
          } catch (e) {
            console.error('Error updating aerial status:', e);
          }
        }, 60000);

        return NextResponse.json({
          success: true,
          action: 'recall',
          payloadId,
          message: `Aerial unit ${payloadId} recalled`,
          timestamp: new Date().toISOString(),
        });
      }

      case 'register': {
        // Register a new aerial payload
        const newPayloadRef = push(aerialRef);
        const newPayloadId = newPayloadRef.key;

        const newPayload: Omit<AerialPayload, 'payloadId'> = {
          status: 'standby',
          assignedSectorId: null,
          position: null,
          readings: null,
          batteryLevel: 100,
          ascentRate: 0,
          estimatedMaxAltitudeTime: null,
          lastUpdated: new Date().toISOString(),
        };

        await set(newPayloadRef, newPayload);

        return NextResponse.json({
          success: true,
          action: 'register',
          payloadId: newPayloadId,
          message: `New aerial unit ${newPayloadId} registered`,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Error processing aerial action:', error);
    return NextResponse.json(
      { error: 'Failed to process aerial action', message: (error as Error).message },
      { status: 500 }
    );
  }
}
