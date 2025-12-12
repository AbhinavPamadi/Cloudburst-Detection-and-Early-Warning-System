import { NextResponse } from 'next/server';
import { checkAndUpdateNodeStatus } from '@/utils/nodeStatusMonitor';

/**
 * API route to monitor and update node statuses
 * Can be called periodically (e.g., via cron job) to check if nodes are offline
 * 
 * Query parameters:
 * - timeout: Minutes of inactivity before marking offline (default: 15)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const timeoutMinutes = parseInt(searchParams.get('timeout') || '15', 10);

    const result = await checkAndUpdateNodeStatus(timeoutMinutes);

    return NextResponse.json({
      success: true,
      message: `Checked ${result.checked} nodes, updated ${result.updated} to offline`,
      ...result
    });
  } catch (error) {
    console.error('Error monitoring nodes:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message 
      },
      { status: 500 }
    );
  }
}

