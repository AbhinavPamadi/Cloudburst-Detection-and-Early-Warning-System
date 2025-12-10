'use client';

import { useMemo } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { AerialPayload, AerialStatus } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface AerialMarkerProps {
  payload: AerialPayload;
  onClick?: (payload: AerialPayload) => void;
}

// ============================================
// Constants
// ============================================

const STATUS_COLORS: Record<AerialStatus, string> = {
  standby: '#6b7280',    // gray
  deploying: '#eab308',  // yellow
  active: '#22c55e',     // green
  descending: '#f97316', // orange
};

const STATUS_LABELS: Record<AerialStatus, string> = {
  standby: 'Standby',
  deploying: 'Deploying',
  active: 'Active',
  descending: 'Descending',
};

// ============================================
// Helper Functions
// ============================================

function createAerialIcon(status: AerialStatus, altitude: number): L.DivIcon {
  const color = STATUS_COLORS[status];
  const isAnimated = status === 'deploying' || status === 'active';
  const animationClass = isAnimated ? 'aerial-marker-pulse' : '';

  // Balloon/drone SVG icon
  const svgIcon = `
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="${color}"
      xmlns="http://www.w3.org/2000/svg"
      class="${animationClass}"
    >
      <!-- Balloon body -->
      <ellipse cx="12" cy="9" rx="6" ry="7" fill="${color}" opacity="0.9"/>
      <!-- Gondola -->
      <rect x="9" y="16" width="6" height="3" rx="1" fill="${color}"/>
      <!-- Strings -->
      <line x1="9" y1="16" x2="10" y2="14" stroke="${color}" stroke-width="0.5"/>
      <line x1="15" y1="16" x2="14" y2="14" stroke="${color}" stroke-width="0.5"/>
      <!-- Highlight -->
      <ellipse cx="9" cy="7" rx="2" ry="2.5" fill="white" opacity="0.3"/>
    </svg>
  `;

  // Altitude indicator
  const altitudeDisplay = altitude > 0 ? `${Math.round(altitude)}m` : '';

  return L.divIcon({
    className: 'aerial-marker-container',
    html: `
      <div class="aerial-marker ${animationClass}" style="
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
      ">
        ${svgIcon}
        ${altitudeDisplay ? `
          <div style="
            background: ${color};
            color: white;
            font-size: 10px;
            font-weight: 600;
            padding: 1px 4px;
            border-radius: 4px;
            margin-top: 2px;
            white-space: nowrap;
          ">
            ${altitudeDisplay}
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [32, altitude > 0 ? 52 : 32],
    iconAnchor: [16, altitude > 0 ? 52 : 32],
  });
}

// ============================================
// Component
// ============================================

export function AerialMarker({ payload, onClick }: AerialMarkerProps) {
  const altitude = payload.readings?.altitude || 0;

  // Memoize icon creation (must be before any conditional returns)
  const icon = useMemo(
    () => createAerialIcon(payload.status, altitude),
    [payload.status, altitude]
  );

  const handleClick = () => {
    onClick?.(payload);
  };

  // Don't render if no position or standby
  if (!payload.position || payload.status === 'standby') {
    return null;
  }

  return (
    <Marker
      position={[payload.position.lat, payload.position.lng]}
      icon={icon}
      zIndexOffset={2000}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Tooltip direction="right" offset={[20, 0]} permanent={false}>
        <div className="text-xs">
          <div className="font-semibold flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[payload.status] }}
            />
            {STATUS_LABELS[payload.status]}
          </div>
          {payload.readings && (
            <>
              <div className="mt-1">
                <span className="text-gray-500">Alt:</span>{' '}
                <span className="font-medium">{Math.round(payload.readings.altitude)}m</span>
              </div>
              {payload.ascentRate !== 0 && (
                <div>
                  <span className="text-gray-500">
                    {payload.ascentRate > 0 ? 'Ascent:' : 'Descent:'}
                  </span>{' '}
                  <span className="font-medium">
                    {Math.abs(payload.ascentRate).toFixed(1)} m/s
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-500">PWV:</span>{' '}
                <span className="font-medium">{payload.readings.pwv.toFixed(1)}mm</span>
              </div>
            </>
          )}
          <div className="mt-1">
            <span className="text-gray-500">Battery:</span>{' '}
            <span
              className={`font-medium ${
                payload.batteryLevel < 20
                  ? 'text-red-600'
                  : payload.batteryLevel < 50
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`}
            >
              {payload.batteryLevel}%
            </span>
          </div>
        </div>
      </Tooltip>

      <Popup>
        <div className="p-2 min-w-48">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS[payload.status] }}
            />
            Aerial Unit {payload.payloadId.slice(0, 8)}
          </h3>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className="font-medium">{STATUS_LABELS[payload.status]}</span>
            </div>

            {payload.assignedSectorId && (
              <div className="flex justify-between">
                <span className="text-gray-500">Assigned To</span>
                <span className="font-medium">{payload.assignedSectorId}</span>
              </div>
            )}

            {payload.readings && (
              <>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Altitude</span>
                  <span className="font-medium">
                    {Math.round(payload.readings.altitude)}m
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature</span>
                  <span className="font-medium">
                    {payload.readings.temperature.toFixed(1)}°C
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pressure</span>
                  <span className="font-medium">
                    {payload.readings.pressure.toFixed(0)} hPa
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Humidity</span>
                  <span className="font-medium">{payload.readings.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">PWV</span>
                  <span className="font-medium">{payload.readings.pwv.toFixed(1)}mm</span>
                </div>
              </>
            )}

            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-gray-500">Battery</span>
              <span
                className={`font-medium ${
                  payload.batteryLevel < 20
                    ? 'text-red-600'
                    : payload.batteryLevel < 50
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}
              >
                {payload.batteryLevel}%
              </span>
            </div>
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================
// Multiple Aerial Markers Component
// ============================================

interface AerialMarkersProps {
  payloads: AerialPayload[];
  onPayloadClick?: (payload: AerialPayload) => void;
}

export function AerialMarkers({ payloads, onPayloadClick }: AerialMarkersProps) {
  // Filter to only show active/deploying/descending payloads with positions
  const visiblePayloads = payloads.filter(
    (p) => p.position && p.status !== 'standby'
  );

  return (
    <>
      {visiblePayloads.map((payload) => (
        <AerialMarker
          key={payload.payloadId}
          payload={payload}
          onClick={onPayloadClick}
        />
      ))}
    </>
  );
}

export default AerialMarker;
