'use client';

import { useMemo } from 'react';
import { X, Layers } from 'lucide-react';
import type { SectorState, WindData, AerialUnit, Alert, AlertLevel } from '@/types/sector.types';
import { SystemStatus } from './SystemStatus';
import { AlertSummary } from './AlertSummary';
import { SectorDetail } from './SectorDetail';
import { AerialStatus } from './AerialStatus';
import { ProbabilityChart } from './ProbabilityChart';

// ============================================
// Types
// ============================================

interface SectorPanelProps {
  sectors: Map<string, SectorState>;
  selectedSector: SectorState | null;
  wind: WindData | null;
  aerial: AerialUnit | null;
  alerts: Alert[];
  isConnected: boolean;
  lastDataSync: Date | null;
  onSectorSelect?: (sector: SectorState | null) => void;
  onAlertClick?: (alert: Alert) => void;
  onClose?: () => void;
  className?: string;
}

// ============================================
// Helper Functions
// ============================================

function calculateSectorsByAlertLevel(
  sectors: Map<string, SectorState>
): Record<AlertLevel, number> {
  const counts: Record<AlertLevel, number> = {
    normal: 0,
    elevated: 0,
    high: 0,
    critical: 0,
  };

  sectors.forEach((sector) => {
    counts[sector.alertLevel]++;
  });

  return counts;
}

function findHighestProbabilitySector(
  sectors: Map<string, SectorState>
): SectorState | null {
  let highest: SectorState | null = null;
  let maxProb = -1;

  sectors.forEach((sector) => {
    if (sector.currentProbability > maxProb) {
      maxProb = sector.currentProbability;
      highest = sector;
    }
  });

  return highest;
}

function findActiveCloudbursts(sectors: Map<string, SectorState>): SectorState[] {
  return Array.from(sectors.values()).filter((sector) => sector.cloudburstDetected);
}

function countActiveNodes(sectors: Map<string, SectorState>): number {
  const nodeIds = new Set<string>();
  sectors.forEach((sector) => {
    if (sector.nodeId) nodeIds.add(sector.nodeId);
  });
  return nodeIds.size;
}

// ============================================
// Component
// ============================================

export function SectorPanel({
  sectors,
  selectedSector,
  wind,
  aerial,
  alerts,
  isConnected,
  lastDataSync,
  onSectorSelect,
  onAlertClick,
  onClose,
  className = '',
}: SectorPanelProps) {
  // Computed values
  const sectorsByAlertLevel = useMemo(
    () => calculateSectorsByAlertLevel(sectors),
    [sectors]
  );

  const highestProbabilitySector = useMemo(
    () => findHighestProbabilitySector(sectors),
    [sectors]
  );

  const activeCloudbursts = useMemo(() => findActiveCloudbursts(sectors), [sectors]);

  const unacknowledgedAlerts = useMemo(
    () => alerts.filter((a) => !a.acknowledged),
    [alerts]
  );

  const activeNodes = useMemo(() => countActiveNodes(sectors), [sectors]);

  // Get target sector name for aerial
  const aerialTargetName = useMemo(() => {
    if (aerial?.targetSectorId) {
      const targetSector = sectors.get(aerial.targetSectorId);
      return targetSector?.name || aerial.targetSectorId;
    }
    return undefined;
  }, [aerial, sectors]);

  return (
    <aside
      className={`bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700
        flex flex-col h-full overflow-hidden ${className}`}
    >
      {/* Header */}
      <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Sector Monitor
          </h1>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close panel"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </header>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* System Status */}
        <SystemStatus
          totalNodes={sectors.size}
          activeNodes={activeNodes}
          sectorsMonitored={sectors.size}
          aerialStatus={aerial?.status || 'standby'}
          lastDataSync={lastDataSync}
          isConnected={isConnected}
        />

        {/* Alert Summary */}
        <AlertSummary
          sectorsByAlertLevel={sectorsByAlertLevel}
          highestProbabilitySector={highestProbabilitySector}
          activeCloudbursts={activeCloudbursts}
          unacknowledgedAlerts={unacknowledgedAlerts}
          onSectorClick={onSectorSelect}
          onAlertClick={onAlertClick}
        />

        {/* Selected Sector Detail */}
        {selectedSector && (
          <>
            <SectorDetail
              sector={selectedSector}
              wind={wind}
              onClose={() => onSectorSelect?.(null)}
            />

            {/* Probability Chart for selected sector */}
            <ProbabilityChart sector={selectedSector} />
          </>
        )}

        {/* Aerial Status */}
        {(aerial || activeCloudbursts.length > 0 || (highestProbabilitySector && highestProbabilitySector.currentProbability >= 50)) && (
          <AerialStatus aerial={aerial} targetSectorName={aerialTargetName} />
        )}

        {/* No Selection Prompt */}
        {!selectedSector && (
          <div className="p-4 text-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">Click on a sector to view details</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>
            {sectors.size} sectors • {activeNodes} nodes
          </span>
          <span className={isConnected ? 'text-green-500' : 'text-red-500'}>
            {isConnected ? '● Connected' : '○ Disconnected'}
          </span>
        </div>
      </footer>
    </aside>
  );
}

export default SectorPanel;
