'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { SectorProvider, useSectorContext } from '@/contexts/SectorContext';
import { aerialPayloadToUnit } from '@/types/sector.types';
import { SectorPanel } from '@/components/Sidebar/SectorPanel';
import { AlertToastContainer, StackedBanners } from '@/components/Alerts';
import { BottomDrawer, SectorModal } from '@/components/Mobile';
import ProtectedPage from '@/features/auth/ProtectedPage';
import { Roles } from '@/features/auth/authService';
import { AlertCircle, Layers, Map, List, Menu, X } from 'lucide-react';
import { OccurrencesPanel } from '@/components/Occurrences';
import type { SectorViewTab } from '@/types/sector.types';

// Dynamic import for map to avoid SSR issues with Leaflet
const SectorMap = dynamic(
  () => import('@/components/Map/SectorMap').then((mod) => mod.SectorMap),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-4 border-blue-500" />
          <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
            Loading map…
          </p>
        </div>
      </div>
    ),
  }
);

// ============================================
// Inner Dashboard Component (uses context)
// ============================================

function SectorDashboardInner() {
  const {
    sectors,
    nodes,
    clouds,
    alertHistory,
    wind,
    aerialPayloads,
    alerts,
    selectedSector,
    selectSector,
    selectNode,
    selectCloud,
    isConnected,
    lastSync,
    acknowledgeAlert,
  } = useSectorContext();

  // Get the first/primary aerial payload and convert to AerialUnit format
  const aerial = aerialPayloads.length > 0 ? aerialPayloadToUnit(aerialPayloads[0]) : null;

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<SectorViewTab>('maps');

  // Check for mobile screen size
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle sector selection
  const handleSectorSelect = useCallback(
    (sector: typeof selectedSector) => {
      selectSector(sector);
      if (isMobile && sector) {
        setMobileModalOpen(true);
      }
    },
    [selectSector, isMobile]
  );

  // Handle alert click
  const handleAlertClick = useCallback(
    (alert: (typeof alerts)[0]) => {
      const sector = sectors.get(alert.sectorId);
      if (sector) {
        handleSectorSelect(sector);
      }
    },
    [sectors, handleSectorSelect]
  );

  // Handle alert dismiss
  const handleAlertDismiss = useCallback(
    (alertId: string) => {
      acknowledgeAlert(alertId);
    },
    [acknowledgeAlert]
  );

  // Calculate metrics for mobile drawer
  const alertCounts = useMemo(() => {
    const counts = { normal: 0, elevated: 0, high: 0, critical: 0 };
    sectors.forEach((sector) => {
      counts[sector.alertLevel]++;
    });
    return counts;
  }, [sectors]);

  const cloudburstSectors = useMemo(
    () => Array.from(sectors.values()).filter((s) => s.cloudburstDetected),
    [sectors]
  );

  const highestRiskSector = useMemo(() => {
    let highest: typeof selectedSector = null;
    let maxProb = -1;
    sectors.forEach((sector) => {
      if (sector.currentProbability > maxProb) {
        maxProb = sector.currentProbability;
        highest = sector;
      }
    });
    return highest;
  }, [sectors]);

  // Handle view on map from occurrences
  const handleViewOnMap = useCallback(
    (sectorId: string) => {
      const sector = sectors.get(sectorId);
      if (sector) {
        handleSectorSelect(sector);
        setActiveTab('maps');
      }
    },
    [sectors, handleSectorSelect]
  );

  // Loading state
  if (sectors.size === 0 && !isConnected) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-4 border-blue-600 dark:border-blue-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Connecting to sensors…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-[calc(100vh-64px)] overflow-hidden">
      {/* Alert Banners */}
      <StackedBanners
        aerial={aerial}
        cloudburstSectors={cloudburstSectors}
        highRiskSector={highestRiskSector}
        onViewSector={handleSectorSelect}
      />

      {/* Alert Toasts */}
      <AlertToastContainer
        alerts={alerts}
        sectors={sectors}
        onDismiss={handleAlertDismiss}
        onViewDetails={handleAlertClick}
      />

      {/* Tab Navigation */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex bg-white dark:bg-gray-800 rounded-lg shadow-lg p-1">
        <button
          onClick={() => setActiveTab('maps')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'maps'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Map className="w-4 h-4" />
          Maps
        </button>
        <button
          onClick={() => setActiveTab('occurrences')}
          className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'occurrences'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <List className="w-4 h-4" />
          Occurrences
          {alertHistory.filter(a => a.status === 'active').length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-500 text-white rounded-full">
              {alertHistory.filter(a => a.status === 'active').length}
            </span>
          )}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="absolute top-4 left-4 z-30 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg
            md:hidden"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {sidebarOpen ? (
            <X className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Maps Tab Content */}
        {activeTab === 'maps' && (
          <>
            {/* Sector Map */}
            <SectorMap
              sectors={sectors}
              nodes={nodes}
              clouds={clouds}
              wind={wind}
              aerialPayloads={aerialPayloads}
              selectedSectorId={selectedSector?.sectorId || null}
              onSectorSelect={handleSectorSelect}
              onNodeClick={selectNode}
              onCloudClick={selectCloud}
              showWindIndicators
              showAerialMarkers
              showNodeMarkers
              showCloudMarkers
              showCloudTrajectories
              showLegend
              className="h-full w-full"
            />

            {/* Connection Status Indicator */}
            <div
              className={`absolute bottom-4 left-4 z-20 px-3 py-1.5 rounded-full text-xs font-medium
                flex items-center gap-2 shadow-lg
                ${
                  isConnected
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </>
        )}

        {/* Occurrences Tab Content */}
        {activeTab === 'occurrences' && (
          <div className="h-full bg-gray-50 dark:bg-gray-900">
            <OccurrencesPanel
              alertHistory={alertHistory}
              sectors={sectors}
              onViewOnMap={handleViewOnMap}
              onAcknowledge={acknowledgeAlert}
              className="h-full"
            />
          </div>
        )}
      </main>

      {/* Desktop Sidebar */}
      <aside
        className={`
          hidden md:flex w-96 flex-shrink-0 transition-all duration-300
          ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <SectorPanel
          sectors={sectors}
          selectedSector={selectedSector}
          wind={wind}
          aerial={aerial}
          alerts={alerts}
          isConnected={isConnected}
          lastDataSync={lastSync}
          onSectorSelect={selectSector}
          onAlertClick={handleAlertClick}
          className="w-full"
        />
      </aside>

      {/* Mobile Bottom Drawer */}
      {isMobile && (
        <BottomDrawer
          sectorCount={sectors.size}
          alertCounts={alertCounts}
          hasCloudbursts={cloudburstSectors.length > 0}
        >
          <SectorPanel
            sectors={sectors}
            selectedSector={selectedSector}
            wind={wind}
            aerial={aerial}
            alerts={alerts}
            isConnected={isConnected}
            lastDataSync={lastSync}
            onSectorSelect={handleSectorSelect}
            onAlertClick={handleAlertClick}
          />
        </BottomDrawer>
      )}

      {/* Mobile Sector Modal */}
      <SectorModal
        sector={selectedSector}
        wind={wind}
        isOpen={mobileModalOpen}
        onClose={() => setMobileModalOpen(false)}
        onViewOnMap={(sector) => {
          setMobileModalOpen(false);
          // Map will auto-center to sector
        }}
      />
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function SectorDashboardPage() {
  const [error, setError] = useState<string | null>(null);

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h2 className="mb-2 text-xl font-bold text-gray-900 dark:text-gray-100">
            Error Loading Sectors
          </h2>
          <p className="mb-4 text-sm text-gray-600 dark:text-gray-300">{error}</p>
          <button
            onClick={() => {
              setError(null);
              window.location.reload();
            }}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    // Temporarily disabled auth for testing - REMOVE THIS COMMENT WHEN DONE
    // <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.USER]} fallbackRoute="/login">
      <SectorProvider>
        <SectorDashboardInner />
      </SectorProvider>
    // </ProtectedPage>
  );
}
