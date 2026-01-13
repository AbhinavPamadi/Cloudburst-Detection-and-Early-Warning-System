// Utility to monitor node status and update to offline when hardware is off
import { database, ref, update, get } from '@/lib/firebase';

/**
 * Checks all nodes and updates status to "offline" if they haven't sent data recently
 * @param {number} timeoutMinutes - Minutes of inactivity before marking as offline (default: 15)
 */
export async function checkAndUpdateNodeStatus(timeoutMinutes = 15) {
  try {
    const nodesSnapshot = await get(ref(database, 'nodes'));
    const nodes = nodesSnapshot.val();

    if (!nodes) {
      return { updated: 0, checked: 0 };
    }

    const now = Date.now();
    const timeoutMs = timeoutMinutes * 60 * 1000;
    let updatedCount = 0;
    let checkedCount = 0;

    for (const [nodeId, nodeData] of Object.entries(nodes)) {
      if (!nodeData.realtime) {
        continue;
      }

      checkedCount++;

      const lastUpdate = nodeData.realtime.lastUpdate;
      const currentStatus = nodeData.realtime.status;

      // Skip if already offline
      if (currentStatus === 'offline' || currentStatus === 'inactive') {
        continue;
      }

      // Check if node hasn't sent data recently
      if (!lastUpdate) {
        // No lastUpdate means node never sent data - mark as offline
        await update(ref(database, `nodes/${nodeId}/realtime`), {
          status: 'offline'
        });
        updatedCount++;
        console.log(`📴 Marked ${nodeId} as offline (no lastUpdate)`);
        continue;
      }

      // Convert timestamp to milliseconds
      const lastUpdateMs =
        typeof lastUpdate === 'string'
          ? parseInt(lastUpdate, 10) * 1000
          : lastUpdate;

      if (isNaN(lastUpdateMs) || lastUpdateMs <= 0) {
        // Invalid timestamp - mark as offline
        await update(ref(database, `nodes/${nodeId}/realtime`), {
          status: 'offline'
        });
        updatedCount++;
        console.log(`📴 Marked ${nodeId} as offline (invalid timestamp)`);
        continue;
      }

      const timeSinceUpdate = now - lastUpdateMs;

      // If node hasn't updated in the timeout period, mark as offline
      if (timeSinceUpdate > timeoutMs) {
        await update(ref(database, `nodes/${nodeId}/realtime`), {
          status: 'offline'
        });
        updatedCount++;
        console.log(`📴 Marked ${nodeId} as offline (no update for ${Math.floor(timeSinceUpdate / 60000)} minutes)`);
      }
    }

    return { updated: updatedCount, checked: checkedCount };
  } catch (error) {
    console.error('Error checking node status:', error);
    throw error;
  }
}

/**
 * Starts automatic monitoring of node status
 * @param {number} intervalMinutes - How often to check (default: 5 minutes)
 * @param {number} timeoutMinutes - Minutes of inactivity before marking offline (default: 15)
 */
export function startNodeStatusMonitoring(intervalMinutes = 5, timeoutMinutes = 15) {
  // Run immediately
  checkAndUpdateNodeStatus(timeoutMinutes);

  // Then run at intervals
  const intervalMs = intervalMinutes * 60 * 1000;
  const intervalId = setInterval(() => {
    checkAndUpdateNodeStatus(timeoutMinutes);
  }, intervalMs);

  console.log(`🔍 Started node status monitoring (check every ${intervalMinutes}min, timeout: ${timeoutMinutes}min)`);
  
  return () => {
    clearInterval(intervalId);
    console.log('⏹️ Stopped node status monitoring');
  };
}

