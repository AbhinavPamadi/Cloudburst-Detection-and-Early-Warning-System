import { NextRequest, NextResponse } from 'next/server';
import { ref, get } from 'firebase/database';
import { database } from '@/lib/firebase';
import type {
  SectorPredictionApiResponse,
  WeatherData,
  RainfallData,
  AerialSensorData,
} from '@/types/sector.types';
import {
  calculateFullProbability,
  calculateProbabilityFactors,
} from '@/utils/sectorCalculations';

// ============================================
// GET /api/sectors/[id]/prediction
// Returns prediction breakdown
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sectorId } = await params;

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
    const nodeId = sectorData.nodeId;

    // Get node readings
    const nodeRef = ref(database, `nodes/${nodeId}`);
    const nodeSnapshot = await get(nodeRef);

    let weather: WeatherData | null = null;
    let rainfall: RainfallData | null = null;

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
    }

    // Check for aerial data if aerial is deployed
    let aerialData: AerialSensorData | null = null;

    if (sectorData.aerialDeployed) {
      // Get active aerial payload for this sector
      const aerialRef = ref(database, 'aerial');
      const aerialSnapshot = await get(aerialRef);

      if (aerialSnapshot.exists()) {
        const aerialPayloads = aerialSnapshot.val();

        // Find payload assigned to this sector
        for (const [payloadId, payload] of Object.entries(aerialPayloads)) {
          const p = payload as any;
          if (p.assignedSectorId === sectorId && p.status === 'active') {
            aerialData = {
              altitude: p.readings?.altitude || 0,
              temperature: p.readings?.temperature || 0,
              pressure: p.readings?.pressure || 0,
              humidity: p.readings?.humidity || 0,
              pwv: p.readings?.pwv || 0,
              timestamp: p.readings?.timestamp || new Date().toISOString(),
            };
            break;
          }
        }
      }
    }

    // Calculate prediction
    const prediction = calculateFullProbability(weather, rainfall, aerialData);

    const response: SectorPredictionApiResponse = {
      sectorId,
      groundFactors: prediction.groundFactors,
      aerialFactors: prediction.aerialFactors,
      combinedProbability: prediction.combinedProbability,
      confidence: prediction.confidence,
      source: prediction.source,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error calculating prediction:', error);
    return NextResponse.json(
      { error: 'Failed to calculate prediction', message: (error as Error).message },
      { status: 500 }
    );
  }
}
