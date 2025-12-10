import { NextRequest, NextResponse } from 'next/server';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import type {
  Sector,
  SectorDetailApiResponse,
  WeatherData,
  RainfallData,
  WindData,
  ProbabilityHistoryPoint,
} from '@/types/sector.types';
import { getAlertLevel } from '@/utils/sectorCalculations';

// ============================================
// GET /api/sectors/[id]
// Returns detailed sector data with history
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectorId } = await params;
    const { searchParams } = new URL(request.url);
    const historyMinutes = parseInt(searchParams.get('historyMinutes') || '60', 10);

    // Get sector data
    const sectorRef = ref(database, `sectors/${sectorId}`);
    const sectorSnapshot = await get(sectorRef);

    if (!sectorSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Sector not found' },
        { status: 404 }
      );
    }

    const sectorData = sectorSnapshot.val();
    const sector: Sector = {
      sectorId,
      ...sectorData,
    };

    // Get associated node data
    const nodeId = sector.nodeId;
    const nodeRef = ref(database, `nodes/${nodeId}`);
    const nodeSnapshot = await get(nodeRef);

    let weather: WeatherData | null = null;
    let rainfall: RainfallData | null = null;
    let wind: WindData | null = null;

    if (nodeSnapshot.exists()) {
      const nodeData = nodeSnapshot.val();

      // Get weather readings
      if (nodeData.readings) {
        weather = {
          temperature: nodeData.readings.temperature || 0,
          pressure: nodeData.readings.pressure || 1013,
          humidity: nodeData.readings.humidity || 0,
          timestamp: nodeData.readings.timestamp || new Date().toISOString(),
        };
      }

      // Get rainfall data
      if (nodeData.rainfall) {
        rainfall = {
          rate: nodeData.rainfall.rate || 0,
          cumulative: nodeData.rainfall.cumulative || 0,
          timestamp: nodeData.rainfall.timestamp || new Date().toISOString(),
        };
      }

      // Get wind data
      if (nodeData.wind) {
        wind = {
          speed: nodeData.wind.speed || 0,
          direction: nodeData.wind.direction || 0,
          timestamp: nodeData.wind.timestamp || new Date().toISOString(),
        };
      }
    }

    // Get probability history
    const historyRef = ref(database, `sectors/${sectorId}/history`);
    const historySnapshot = await get(historyRef);

    let history: ProbabilityHistoryPoint[] = [];
    const cutoffTime = Date.now() - historyMinutes * 60 * 1000;

    if (historySnapshot.exists()) {
      const historyData = historySnapshot.val();
      history = Object.values(historyData)
        .map((point: any) => ({
          probability: point.probability || 0,
          timestamp: point.timestamp,
        }))
        .filter((point: ProbabilityHistoryPoint) =>
          new Date(point.timestamp).getTime() >= cutoffTime
        )
        .sort((a: ProbabilityHistoryPoint, b: ProbabilityHistoryPoint) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
    }

    const response: SectorDetailApiResponse = {
      sector,
      weather,
      rainfall,
      wind,
      history,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching sector:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sector', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH /api/sectors/[id]
// Update sector probability/status
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectorId } = await params;
    const body = await request.json();

    // Validate sector exists
    const sectorRef = ref(database, `sectors/${sectorId}`);
    const sectorSnapshot = await get(sectorRef);

    if (!sectorSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Sector not found' },
        { status: 404 }
      );
    }

    const updates: Partial<Sector> = {};
    const historyUpdate: ProbabilityHistoryPoint | null = null;

    // Update probability if provided
    if (typeof body.probability === 'number') {
      const probability = Math.min(100, Math.max(0, body.probability));
      updates.currentProbability = probability;
      updates.alertLevel = getAlertLevel(probability);

      // Add to history
      const historyRef = ref(database, `sectors/${sectorId}/history`);
      const historyKey = Date.now().toString();
      await update(ref(database, `sectors/${sectorId}/history/${historyKey}`), {
        probability,
        timestamp: new Date().toISOString(),
      });
    }

    // Update confidence if provided
    if (typeof body.confidence === 'number') {
      updates.confidence = Math.min(1, Math.max(0, body.confidence));
    }

    // Update prediction source if provided
    if (body.predictionSource) {
      updates.predictionSource = body.predictionSource;
    }

    // Update cloudburst detection if provided
    if (typeof body.cloudburstDetected === 'boolean') {
      updates.cloudburstDetected = body.cloudburstDetected;
      updates.cloudburstConfidence = body.cloudburstConfidence || null;
    }

    // Update aerial deployment status if provided
    if (typeof body.aerialDeployed === 'boolean') {
      updates.aerialDeployed = body.aerialDeployed;
    }

    // Always update lastUpdated
    updates.lastUpdated = new Date().toISOString();

    // Apply updates
    await update(sectorRef, updates);

    // Get updated sector
    const updatedSnapshot = await get(sectorRef);
    const updatedSector: Sector = {
      sectorId,
      ...updatedSnapshot.val(),
    };

    return NextResponse.json({
      success: true,
      sector: updatedSector,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating sector:', error);
    return NextResponse.json(
      { error: 'Failed to update sector', message: (error as Error).message },
      { status: 500 }
    );
  }
}
