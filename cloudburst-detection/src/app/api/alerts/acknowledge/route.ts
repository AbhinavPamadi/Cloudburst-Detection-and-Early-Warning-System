import { NextRequest, NextResponse } from 'next/server';
import { ref, get, update } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { AlertAcknowledgement } from '@/types/sector.types';

// ============================================
// POST /api/alerts/acknowledge
// Mark alert as acknowledged
// ============================================

export async function POST(request: NextRequest) {
  try {
    const body: AlertAcknowledgement = await request.json();
    const { alertId, userId } = body;

    if (!alertId) {
      return NextResponse.json(
        { error: 'alertId is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    // Check if alert exists
    const alertRef = ref(database, `alerts/${alertId}`);
    const alertSnapshot = await get(alertRef);

    if (!alertSnapshot.exists()) {
      return NextResponse.json(
        { error: 'Alert not found' },
        { status: 404 }
      );
    }

    const alertData = alertSnapshot.val();

    // Check if already acknowledged
    if (alertData.acknowledged) {
      return NextResponse.json({
        success: true,
        message: 'Alert was already acknowledged',
        acknowledgedAt: alertData.acknowledgedAt,
        acknowledgedBy: alertData.acknowledgedBy,
      });
    }

    // Update alert
    const acknowledgedAt = new Date().toISOString();
    await update(alertRef, {
      acknowledged: true,
      acknowledgedAt,
      acknowledgedBy: userId,
    });

    return NextResponse.json({
      success: true,
      alertId,
      acknowledgedAt,
      acknowledgedBy: userId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error acknowledging alert:', error);
    return NextResponse.json(
      { error: 'Failed to acknowledge alert', message: (error as Error).message },
      { status: 500 }
    );
  }
}

// ============================================
// GET /api/alerts/acknowledge
// Get acknowledgement status for alerts
// ============================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertIds = searchParams.get('alertIds')?.split(',') || [];
    const unacknowledgedOnly = searchParams.get('unacknowledgedOnly') === 'true';

    const alertsRef = ref(database, 'alerts');
    const alertsSnapshot = await get(alertsRef);

    if (!alertsSnapshot.exists()) {
      return NextResponse.json({
        alerts: [],
        total: 0,
        unacknowledged: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const alertsData = alertsSnapshot.val();
    let alerts = Object.entries(alertsData).map(([alertId, data]: [string, any]) => ({
      alertId,
      sectorId: data.sectorId,
      type: data.type,
      severity: data.severity,
      acknowledged: data.acknowledged || false,
      acknowledgedAt: data.acknowledgedAt || null,
      acknowledgedBy: data.acknowledgedBy || null,
      timestamp: data.timestamp,
    }));

    // Filter by alert IDs if provided
    if (alertIds.length > 0) {
      alerts = alerts.filter((a) => alertIds.includes(a.alertId));
    }

    // Filter unacknowledged only if requested
    if (unacknowledgedOnly) {
      alerts = alerts.filter((a) => !a.acknowledged);
    }

    // Sort by timestamp descending
    alerts.sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length;

    return NextResponse.json({
      alerts,
      total: alerts.length,
      unacknowledged: unacknowledgedCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts', message: (error as Error).message },
      { status: 500 }
    );
  }
}
