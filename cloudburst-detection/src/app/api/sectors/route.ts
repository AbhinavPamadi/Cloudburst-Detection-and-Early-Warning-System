import { NextRequest, NextResponse } from 'next/server';
import { ref, get, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { Sector, SectorsApiResponse, SensorNode } from '@/types/sector.types';
import { generateVoronoiSectors, createSectorsFromVoronoi } from '@/utils/voronoiGenerator';

// ============================================
// GET /api/sectors
// Returns all sectors with current state
// ============================================

export async function GET(request: NextRequest) {
  try {
    // First, try to get existing sectors from Firebase
    const sectorsRef = ref(database, 'sectors');
    const sectorsSnapshot = await get(sectorsRef);

    let sectors: Sector[] = [];

    if (sectorsSnapshot.exists()) {
      // Use existing sectors
      const sectorsData = sectorsSnapshot.val();
      sectors = Object.entries(sectorsData).map(([sectorId, data]) => ({
        sectorId,
        ...(data as Omit<Sector, 'sectorId'>),
      }));
    } else {
      // Generate sectors from nodes if none exist
      const nodesRef = ref(database, 'nodes');
      const nodesSnapshot = await get(nodesRef);

      if (nodesSnapshot.exists()) {
        const nodesData = nodesSnapshot.val();
        const sensorNodes: SensorNode[] = Object.entries(nodesData)
          .filter(([, node]: [string, any]) =>
            node.metadata?.latitude && node.metadata?.longitude
          )
          .map(([nodeId, node]: [string, any]) => ({
            nodeId,
            name: node.metadata?.name || `Node ${nodeId}`,
            latitude: Number(node.metadata.latitude),
            longitude: Number(node.metadata.longitude),
            sectorId: `sector_${nodeId}`,
            status: node.realtime?.status === 'online' ? 'active' : 'inactive',
            type: node.metadata?.type === 'gateway' ? 'gateway' : 'sensor',
            lastSeen: node.realtime?.lastUpdate || new Date().toISOString(),
          }));

        if (sensorNodes.length > 0) {
          // Generate Voronoi sectors
          const voronoiResult = generateVoronoiSectors(sensorNodes);
          const sectorsMap = createSectorsFromVoronoi(voronoiResult, sensorNodes);

          // Save to Firebase
          const sectorsObject: Record<string, Omit<Sector, 'sectorId'>> = {};
          sectorsMap.forEach((sector, sectorId) => {
            const { sectorId: _, ...rest } = sector;
            sectorsObject[sectorId] = rest;
          });

          await set(sectorsRef, sectorsObject);

          sectors = Array.from(sectorsMap.values());
        }
      }
    }

    const response: SectorsApiResponse = {
      sectors,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching sectors:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sectors', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// POST /api/sectors
// Regenerate sectors from current nodes
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { force = false } = body;

    // Get nodes
    const nodesRef = ref(database, 'nodes');
    const nodesSnapshot = await get(nodesRef);

    if (!nodesSnapshot.exists()) {
      return NextResponse.json(
        { error: 'No nodes found to generate sectors' },
        { status: 400 }
      );
    }

    const nodesData = nodesSnapshot.val();
    const sensorNodes: SensorNode[] = Object.entries(nodesData)
      .filter(([, node]: [string, any]) =>
        node.metadata?.latitude && node.metadata?.longitude
      )
      .map(([nodeId, node]: [string, any]) => ({
        nodeId,
        name: node.metadata?.name || `Node ${nodeId}`,
        latitude: Number(node.metadata.latitude),
        longitude: Number(node.metadata.longitude),
        sectorId: `sector_${nodeId}`,
        status: node.realtime?.status === 'online' ? 'active' : 'inactive',
        type: node.metadata?.type === 'gateway' ? 'gateway' : 'sensor',
        lastSeen: node.realtime?.lastUpdate || new Date().toISOString(),
      }));

    if (sensorNodes.length === 0) {
      return NextResponse.json(
        { error: 'No valid nodes with coordinates found' },
        { status: 400 }
      );
    }

    // Generate Voronoi sectors
    const voronoiResult = generateVoronoiSectors(sensorNodes);
    const sectorsMap = createSectorsFromVoronoi(voronoiResult, sensorNodes);

    // Save to Firebase
    const sectorsRef = ref(database, 'sectors');
    const sectorsObject: Record<string, Omit<Sector, 'sectorId'>> = {};
    sectorsMap.forEach((sector, sectorId) => {
      const { sectorId: _, ...rest } = sector;
      sectorsObject[sectorId] = rest;
    });

    await set(sectorsRef, sectorsObject);

    const sectors = Array.from(sectorsMap.values());

    return NextResponse.json({
      success: true,
      message: `Generated ${sectors.length} sectors`,
      sectors,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating sectors:', error);
    return NextResponse.json(
      { error: 'Failed to generate sectors', message: (error as Error).message },
      { status: 500 }
    );
  }
}
