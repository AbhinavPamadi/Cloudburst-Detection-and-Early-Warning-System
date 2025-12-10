'use client';

import { useMemo } from 'react';
import { Marker, Tooltip, Popup } from 'react-leaflet';
import L from 'leaflet';
import type { NodeData } from '@/types/sector.types';

// ============================================
// Types
// ============================================

interface NodeMarkerProps {
  node: NodeData;
  onClick?: (node: NodeData) => void;
}

// ============================================
// Constants
// ============================================

const NODE_STATUS_COLORS = {
  online: '#22c55e',   // green-500
  offline: '#ef4444',  // red-500
} as const;

// ============================================
// Helper Functions
// ============================================

function createNodeIcon(status: 'online' | 'offline'): L.DivIcon {
  const color = NODE_STATUS_COLORS[status];
  const isOnline = status === 'online';
  const pulseClass = isOnline ? 'node-marker-pulse' : '';

  return L.divIcon({
    className: 'node-marker-container',
    html: `
      <div class="node-marker ${pulseClass}" style="
        position: relative;
        width: 12px;
        height: 12px;
      ">
        ${isOnline ? `
          <div style="
            position: absolute;
            width: 24px;
            height: 24px;
            top: -6px;
            left: -6px;
            background: ${color};
            border-radius: 50%;
            opacity: 0.3;
            animation: nodePulse 2s ease-out infinite;
          "></div>
        ` : ''}
        <div style="
          position: absolute;
          width: 12px;
          height: 12px;
          background: ${color};
          border: 2px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        "></div>
      </div>
    `,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
  });
}

function formatTimeSince(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ============================================
// Component
// ============================================

export function NodeMarker({ node, onClick }: NodeMarkerProps) {
  // Memoize icon creation
  const icon = useMemo(
    () => createNodeIcon(node.status),
    [node.status]
  );

  const handleClick = () => {
    onClick?.(node);
  };

  return (
    <Marker
      position={[node.position.lat, node.position.lng]}
      icon={icon}
      zIndexOffset={1500}
      eventHandlers={{
        click: handleClick,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]} permanent={false}>
        <div className="text-xs">
          <div className="font-semibold flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: NODE_STATUS_COLORS[node.status] }}
            />
            {node.name}
          </div>
          <div className="mt-1 text-gray-500">
            {node.status === 'online' ? 'Online' : 'Offline'} - {formatTimeSince(node.lastSeen)}
          </div>
          {node.readings && node.status === 'online' && (
            <div className="mt-1">
              <span className="text-gray-500">Temp:</span>{' '}
              <span className="font-medium">{node.readings.temperature.toFixed(1)}°C</span>
            </div>
          )}
        </div>
      </Tooltip>

      <Popup>
        <div className="p-2 min-w-48">
          <h3 className="font-semibold text-sm mb-2 flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: NODE_STATUS_COLORS[node.status] }}
            />
            {node.name}
          </h3>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Node ID</span>
              <span className="font-mono text-xs">{node.nodeId.slice(0, 12)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Status</span>
              <span className={`font-medium ${node.status === 'online' ? 'text-green-600' : 'text-red-600'}`}>
                {node.status === 'online' ? 'Online' : 'Offline'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Last Seen</span>
              <span className="font-medium">{formatTimeSince(node.lastSeen)}</span>
            </div>

            <hr className="my-2" />

            <div className="flex justify-between">
              <span className="text-gray-500">Latitude</span>
              <span className="font-medium">{node.position.lat.toFixed(4)}°</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Longitude</span>
              <span className="font-medium">{node.position.lng.toFixed(4)}°</span>
            </div>

            {node.readings && (
              <>
                <hr className="my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature</span>
                  <span className="font-medium">{node.readings.temperature.toFixed(1)}°C</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pressure</span>
                  <span className="font-medium">{node.readings.pressure.toFixed(0)} hPa</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Humidity</span>
                  <span className="font-medium">{node.readings.humidity}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Signal (RSSI)</span>
                  <span className={`font-medium ${
                    node.readings.rssi > -60 ? 'text-green-600' :
                    node.readings.rssi > -80 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {node.readings.rssi} dBm
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

// ============================================
// Multiple Node Markers Component
// ============================================

interface NodeMarkersProps {
  nodes: NodeData[];
  onNodeClick?: (node: NodeData) => void;
}

export function NodeMarkers({ nodes, onNodeClick }: NodeMarkersProps) {
  return (
    <>
      {nodes.map((node) => (
        <NodeMarker
          key={node.nodeId}
          node={node}
          onClick={onNodeClick}
        />
      ))}
    </>
  );
}

export default NodeMarker;
