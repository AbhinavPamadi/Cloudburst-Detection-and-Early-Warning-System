'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useEffect, useState } from 'react';
import { MapPin, Calendar, CloudRain, Info } from 'lucide-react';

/**
 * Helper to update map bounds for historical points
 */
function MapBoundsUpdater({ historicalPoints }) {
  const map = useMap();

  useEffect(() => {
    const allPoints = [];

    // Add historical points
    if (historicalPoints && historicalPoints.length > 0) {
      historicalPoints.forEach(point => {
        if (point.lat !== undefined && point.lng !== undefined) {
          allPoints.push([Number(point.lat), Number(point.lng)]);
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
  }, [historicalPoints, map]);

  return null;
}

export default function CloudburstOccurrencesMap({
  historicalPoints = [],
  showLegend = true,
}) {
  const [isMapReady, setIsMapReady] = useState(false);

  // Custom X Icon for historical cloudburst markers
  const xMarkIcon = L.divIcon({
    className: 'custom-x-marker',
    html: `
      <div style="
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #7f1d1d;
        color: white;
        font-weight: bold;
        font-family: sans-serif;
        font-size: 16px;
        border: 2px solid white;
        border-radius: 4px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      ">
        ✕
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12]
  });

  const defaultCenter = [28.6139, 77.2090];

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

        {/* Auto-fit bounds for historical points */}
        <MapBoundsUpdater historicalPoints={historicalPoints} />

        {/* Historical Cloudburst Markers */}
        {historicalPoints.map((point) => (
          <Marker
            key={`history-${point.id}`}
            position={[point.lat, point.lng]}
            icon={xMarkIcon}
          >
            <Popup className="custom-popup" minWidth={250} maxWidth={300}>
              <div className="p-1">
                {/* Header */}
                <div className="flex items-center gap-2 mb-3 border-b pb-2">
                  <div className="flex items-center justify-center w-6 h-6 bg-red-800 text-white rounded text-xs font-bold shrink-0">
                    ✕
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Flood History</h3>
                    <p className="text-xs text-gray-500">{point.location}</p>
                  </div>
                </div>

                {/* Event Description Section */}
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
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-6 left-6 bg-white rounded-lg shadow-lg p-4 z-[1000] max-w-xs dark:bg-gray-800">
          <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-700 dark:text-gray-300" /> Map Legend
          </h3>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-5 h-5 bg-red-900 text-white rounded text-[10px] font-bold border border-white shadow-sm">
                ✕
              </div>
              <span className="text-xs text-gray-700 dark:text-gray-300">Historical Cloudburst</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}








