'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, Fragment } from 'react';
// Added 'Info' to imports for the description section
import { Thermometer, Gauge, Droplets, Radio, MapPin } from 'lucide-react';

/**
 * Helper to update map bounds for nodes
 */
function MapBoundsUpdater({ nodes }) {
  const map = useMap();

  useEffect(() => {
    const allPoints = [];

    // Add sensor nodes
    if (nodes && nodes.length > 0) {
      nodes.forEach(node => {
        if (node?.metadata?.latitude && node?.metadata?.longitude) {
          allPoints.push([Number(node.metadata.latitude), Number(node.metadata.longitude)]);
        }
      });
    }

    if (allPoints.length > 0) {
      try {
        // Create bounds from all points
        map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 15 });
      } catch (error) {
        console.error('Error updating map bounds:', error);
      }
    }
  }, [nodes, map]);

  return null;
}

export default function DashboardMap({
  nodes = [],
  selectedNode,
  setSelectedNode,
  getNodeStatus,
  formatTimeAgo,
  showLegend = true,
}) {
  const [isMapReady, setIsMapReady] = useState(false);

  const getMarkerIcon = (node) => {
    const status = getNodeStatus(node);
    const isGateway = node?.metadata?.type === 'gateway';
    
    const colors = {
      online: '#10b981',
      offline: '#ef4444',
      warning: '#f59e0b'
    };

    const color = colors[status] || colors.offline;
    const size = isGateway ? 32 : 24;

    return L.divIcon({
      className: 'custom-map-marker',
      html: `
        <div style="
          width: ${size}px;
          height: ${size}px;
          background-color: ${color};
          border: ${isGateway ? '3px solid #3b82f6' : '2px solid white'};
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ${status === 'online' ? 'animation: markerPulse 2s infinite;' : ''}
        "></div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2]
    });
  };

  const defaultCenter = [28.6139, 77.2090];
  
  const validNodes = nodes.filter((node) => 
    node?.metadata?.latitude !== undefined &&
    node?.metadata?.longitude !== undefined
  );

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={defaultCenter}
        zoom={6} 
        className="h-full w-full"
        style={{ zIndex: 0 }}
        whenCreated={() => setIsMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

      {/* Auto-fit bounds for nodes */}
      <MapBoundsUpdater nodes={validNodes} />

      {/* Connection Lines */}
      {validNodes.map((node, nodeIndex) => {
        if (!node?.metadata?.nearbyNodes || node.metadata.nearbyNodes.length === 0) return null;
        const nodeKey = node?.metadata?.nodeId || `node-${nodeIndex}`;
        return (
          <Fragment key={`connections-${nodeKey}`}>
            {node.metadata.nearbyNodes.map((nearbyNodeId, nearbyIndex) => {
              const nearbyNode = validNodes.find(n => n?.metadata?.nodeId === nearbyNodeId);
              if (!nearbyNode) return null;
              return (
                <Polyline
                  key={`${nodeKey}-${nearbyNodeId || `nearby-${nearbyIndex}`}`}
                  positions={[
                    [Number(node.metadata.latitude), Number(node.metadata.longitude)],
                    [Number(nearbyNode.metadata.latitude), Number(nearbyNode.metadata.longitude)]
                  ]}
                  pathOptions={{ color: '#3b82f6', weight: 2, opacity: 0.6, dashArray: '5, 10' }}
                />
              );
            })}
          </Fragment>
        );
      })}

      {/* Sensor Markers */}
      {validNodes.map((node, index) => (
        <Marker
          key={node?.metadata?.nodeId || `marker-${index}`}
          position={[Number(node.metadata.latitude), Number(node.metadata.longitude)]}
          icon={getMarkerIcon(node)}
          eventHandlers={{ click: () => setSelectedNode(node) }}
        >
          <Popup className="custom-popup" minWidth={220}>
            <div className="min-w-[200px]">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${
                    getNodeStatus(node) === 'online' ? 'bg-green-500' : 
                    getNodeStatus(node) === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}
                />
                <h3 className="font-bold text-gray-900">{node.metadata.name}</h3>
              </div>
              <div className="space-y-1.5 text-sm border-t pt-2">
                <div className="flex items-center gap-2">
                  <Thermometer className="w-4 h-4 text-red-500" />
                  <span className="text-gray-700">{node.realtime?.temperature?.toFixed(1) || 'N/A'}°C</span>
                </div>
                <div className="flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-blue-500" />
                  <span className="text-gray-700">{node.realtime?.pressure?.toFixed(1) || 'N/A'} hPa</span>
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-2 border-t pt-1.5">
                Updated: {formatTimeAgo(node.realtime?.lastUpdate ? (typeof node.realtime.lastUpdate === 'string' ? parseInt(node.realtime.lastUpdate) * 1000 : node.realtime.lastUpdate) : null)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
      <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs">
        <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MapPin className="h-4 w-4 text-gray-700" /> Map Legend
        </h3>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs text-gray-700">Active Sensor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-yellow-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs text-gray-700">Warning Sensor</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs text-gray-700">Offline Sensor</span>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}




