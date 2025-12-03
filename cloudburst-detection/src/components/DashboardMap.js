'use client';

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState, Fragment } from 'react';
// Added 'Info' to imports for the description section
import { Thermometer, Gauge, Droplets, Radio, MapPin, Calendar, CloudRain, Info } from 'lucide-react';

// 1. DATA: List of 14 specific locations for Cloudburst History
const HISTORICAL_POINTS = [
  { id: 1, lat: 31.5, lng: 76.72, date: '2022-07-07', rainfall: '13mm', location: 'Kullu District, Himachal Pradesh', event_description: 'Flash floods and cloudbursts triggered by heavy rain caused damage to the Malana power project and a bridge at Manikaran, leading to several fatalities.' },
  { id: 2, lat: 31.46, lng: 77.42, date: '2022-08-11', rainfall: '17.5mm', location: 'Near Rohru, Himachal Pradesh', event_description: 'Heavy rainfall in the general region caused flash floods, severe waterlogging, and house collapses, leading to families being evacuated.' },
  { id: 3, lat: 32.45, lng: 76.54, date: '2022-08-11', rainfall: '11mm', location: 'Near Chamba/Dharamshala, Himachal Pradesh', event_description: 'Flash floods in the region, particularly in the Ramban district of J&K (nearby area), resulted in three deaths and a woman and child going missing.' },
  { id: 4, lat: 32.43, lng: 76.01, date: '2022-08-19', rainfall: '13mm', location: 'Near Pathankot, Punjab', event_description: 'Moderate rainfall occurred in the area as the India Meteorological Department forecasted heavy rain for the wider Himachal Pradesh and J&K regions over the weekend.' },
  { id: 5, lat: 32.55, lng: 75.94, date: '2022-08-19', rainfall: '5.7mm', location: 'Jammu City, Jammu & Kashmir', event_description: 'The area experienced general rainfall; the previous week had seen much heavier, flood-causing rains. No major event reported on this specific date besides general weather.' },
  { id: 6, lat: 29.39, lng: 79.30, date: '2023-08-01', rainfall: '1.2mm', location: 'Near Nainital, Uttarakhand', event_description: 'Heavy rains in the wider Uttarakhand region around this date caused extensive damage to roads and houses in districts like Uttarkashi.' },
  { id: 7, lat: 30.43, lng: 78.24, date: '2023-08-08', rainfall: '2.5mm', location: 'Near Dehradun, Uttarakhand', event_description: 'Incessant rain triggered multiple landslides and waterlogging across Uttarakhand; a yellow alert for heavy rainfall was in effect for the district.' },
  { id: 8, lat: 29.75, lng: 78.52, date: '2023-08-08', rainfall: '5.8mm', location: 'Near Rishikesh, Uttarakhand', event_description: 'The region was part of a widespread heavy rainfall event across Uttarakhand that led to landslides and infrastructure collapse, including a hotel in nearby Rudraprayag.' },
  { id: 9, lat: 33.100, lng: 75.000, date: '2022-07-25', rainfall: '160mm', location: 'Doda' },
  { id: 10, lat: 32.500, lng: 75.300, date: '2023-08-14', rainfall: '90mm', location: 'Kathua' },
  { id: 11, lat: 34.400, lng: 74.300, date: '2020-09-05', rainfall: '115mm', location: 'Kupwara' },
  { id: 12, lat: 33.600, lng: 75.000, date: '2021-07-11', rainfall: '125mm', location: 'Shopian' },
  { id: 13, lat: 32.900, lng: 75.100, date: '2022-06-30', rainfall: '140mm', location: 'Udhampur' },
  { id: 14, lat: 33.800, lng: 74.800, date: '2019-07-19', rainfall: '175mm', location: 'Pulwama' },
];

/**
 * Helper to update map bounds including historical points
 */
function MapBoundsUpdater({ nodes, historicalPoints }) {
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

    // Add historical X points
    historicalPoints.forEach(p => {
      allPoints.push([p.lat, p.lng]);
    });

    if (allPoints.length > 0) {
      try {
        // Create bounds from all points
        map.fitBounds(allPoints, { padding: [50, 50], maxZoom: 15 });
      } catch (error) {
        console.error('Error updating map bounds:', error);
      }
    }
  }, [nodes, historicalPoints, map]);

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

  // 2. ICON: Custom X Icon Definition
  const xMarkIcon = L.divIcon({
    className: 'custom-x-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #7f1d1d; /* Dark Red */
        color: white;
        font-weight: bold;
        font-family: sans-serif;
        font-size: 16px;
        border: 2px solid white;
        border-radius: 4px; /* Slightly rounded square */
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      ">
        ✕
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

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

      {/* Auto-fit bounds including X markers */}
      <MapBoundsUpdater nodes={validNodes} historicalPoints={HISTORICAL_POINTS} />

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

      {/* 3. NEW: Render the Historical "X" Markers */}
      {HISTORICAL_POINTS.map((point) => (
        <Marker
          key={`history-${point.id}`}
          position={[point.lat, point.lng]}
          icon={xMarkIcon}
        >
          {/* Increased minWidth to accommodate text */}
          <Popup className="custom-popup" minWidth={250} maxWidth={300}>
            <div className="p-1">
              {/* Header */}
              <div className="flex items-center gap-2 mb-3 border-b pb-2">
                <div className="flex items-center justify-center w-6 h-6 bg-red-800 text-white rounded text-xs font-bold shrink-0">✕</div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Flood History</h3>
                  <p className="text-xs text-gray-500">{point.location}</p>
                </div>
              </div>

              {/* NEW: Event Description Section */}
              {point.event_description && (
                <div className="mb-3 p-2 bg-gray-50 border border-gray-100 rounded-md">
                    <div className="flex items-center gap-1.5 mb-1">
                        <Info size={14} className="text-blue-600" />
                        <span className="text-xs font-semibold text-gray-700">Event Report</span>
                    </div>
                    <p className="text-xs text-gray-600 leading-snug">
                        {point.event_description}
                    </p>
                </div>
              )}

              {/* Details List */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin size={14} /> Lat:
                  </span>
                  <span className="font-mono font-medium">{point.lat.toFixed(4)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <MapPin size={14} /> Long:
                  </span>
                  <span className="font-mono font-medium">{point.lng.toFixed(4)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-gray-500 flex items-center gap-1">
                    <Calendar size={14} /> Date:
                  </span>
                  <span className="font-medium text-gray-900">{point.date}</span>
                </div>

                <div className="flex justify-between items-center bg-blue-50 p-1.5 rounded">
                  <span className="text-blue-700 flex items-center gap-1 font-medium">
                    <CloudRain size={14} /> Rainfall:
                  </span>
                  <span className="font-bold text-blue-800">{point.rainfall}</span>
                </div>
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Existing Sensor Markers */}
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
        
        <div className="space-y-2 mb-3 pb-3 border-b border-gray-100">
           <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-5 h-5 bg-red-900 text-white rounded text-[10px] font-bold border border-white shadow-sm">✕</div>
            <span className="text-xs text-gray-700">Historical Cloudburst</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow-sm"></div>
            <span className="text-xs text-gray-700">Active Sensor</span>
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