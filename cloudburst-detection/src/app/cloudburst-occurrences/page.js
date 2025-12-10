"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import {
  CloudRain,
  MapPin,
  Calendar,
  Info,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  X,
  MapPinned,
} from "lucide-react";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";
import classNames from "@/utils/classNames";

// Dynamically import map component
const CloudburstOccurrencesMap = dynamic(
  () => import("@/components/CloudburstOccurrencesMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center bg-gray-800">
        <div className="text-center">
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-b-4 border-blue-500" />
          <p className="text-sm font-medium text-gray-300">Loading map…</p>
        </div>
      </div>
    ),
  }
);

// Historical cloudburst occurrences data
const HISTORICAL_POINTS = [
  {
    id: 1,
    lat: 31.5,
    lng: 76.72,
    date: "2022-07-07",
    rainfall: "13mm",
    location: "Kullu District, Himachal Pradesh",
    event_description:
      "Flash floods and cloudbursts triggered by heavy rain caused damage to the Malana power project and a bridge at Manikaran, leading to several fatalities.",
  },
  {
    id: 2,
    lat: 31.46,
    lng: 77.42,
    date: "2022-08-11",
    rainfall: "17.5mm",
    location: "Near Rohru, Himachal Pradesh",
    event_description:
      "Heavy rainfall in the general region caused flash floods, severe waterlogging, and house collapses, leading to families being evacuated.",
  },
  {
    id: 3,
    lat: 32.45,
    lng: 76.54,
    date: "2022-08-11",
    rainfall: "11mm",
    location: "Near Chamba/Dharamshala, Himachal Pradesh",
    event_description:
      "Flash floods in the region, particularly in the Ramban district of J&K (nearby area), resulted in three deaths and a woman and child going missing.",
  },
  {
    id: 4,
    lat: 32.43,
    lng: 76.01,
    date: "2022-08-19",
    rainfall: "13mm",
    location: "Near Pathankot, Punjab",
    event_description:
      "Moderate rainfall occurred in the area as the India Meteorological Department forecasted heavy rain for the wider Himachal Pradesh and J&K regions over the weekend.",
  },
  {
    id: 5,
    lat: 32.55,
    lng: 75.94,
    date: "2022-08-19",
    rainfall: "5.7mm",
    location: "Jammu City, Jammu & Kashmir",
    event_description:
      "The area experienced general rainfall; the previous week had seen much heavier, flood-causing rains. No major event reported on this specific date besides general weather.",
  },
  {
    id: 6,
    lat: 29.39,
    lng: 79.3,
    date: "2023-08-01",
    rainfall: "1.2mm",
    location: "Near Nainital, Uttarakhand",
    event_description:
      "Heavy rains in the wider Uttarakhand region around this date caused extensive damage to roads and houses in districts like Uttarkashi.",
  },
  {
    id: 7,
    lat: 30.43,
    lng: 78.24,
    date: "2023-08-08",
    rainfall: "2.5mm",
    location: "Near Dehradun, Uttarakhand",
    event_description:
      "Incessant rain triggered multiple landslides and waterlogging across Uttarakhand; a yellow alert for heavy rainfall was in effect for the district.",
  },
  {
    id: 8,
    lat: 29.75,
    lng: 78.52,
    date: "2023-08-08",
    rainfall: "5.8mm",
    location: "Near Rishikesh, Uttarakhand",
    event_description:
      "The region was part of a widespread heavy rainfall event across Uttarakhand that led to landslides and infrastructure collapse, including a hotel in nearby Rudraprayag.",
  },
  {
    id: 9,
    lat: 33.1,
    lng: 75.0,
    date: "2022-07-25",
    rainfall: "160mm",
    location: "Doda",
    event_description: null,
  },
  {
    id: 10,
    lat: 32.5,
    lng: 75.3,
    date: "2023-08-14",
    rainfall: "90mm",
    location: "Kathua",
    event_description: null,
  },
  {
    id: 11,
    lat: 34.4,
    lng: 74.3,
    date: "2020-09-05",
    rainfall: "115mm",
    location: "Kupwara",
    event_description: null,
  },
  {
    id: 12,
    lat: 33.6,
    lng: 75.0,
    date: "2021-07-11",
    rainfall: "125mm",
    location: "Shopian",
    event_description: null,
  },
  {
    id: 13,
    lat: 32.9,
    lng: 75.1,
    date: "2022-06-30",
    rainfall: "140mm",
    location: "Udhampur",
    event_description: null,
  },
  {
    id: 14,
    lat: 33.8,
    lng: 74.8,
    date: "2019-07-19",
    rainfall: "175mm",
    location: "Pulwama",
    event_description: null,
  },
];

export default function CloudburstOccurrencesPage() {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [fullscreenItem, setFullscreenItem] = useState(null);
  const [mapExpanded, setMapExpanded] = useState(false);

  const toggleExpand = (id) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const openFullscreen = (item) => {
    setFullscreenItem(item);
  };

  const closeFullscreen = () => {
    setFullscreenItem(null);
  };

  // Sort by date (newest first)
  const sortedOccurrences = [...HISTORICAL_POINTS].sort((a, b) => {
    return new Date(b.date) - new Date(a.date);
  });

  return (
    <ProtectedPage
      allowedRoles={[Roles.ADMIN, Roles.USER, Roles.NODE_REGISTRAR]}
    >
      <div className="pt-4 pb-6">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Cloudburst Occurrences
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Historical records of cloudburst events and their impact
            </p>
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {sortedOccurrences.length} total occurrence
            {sortedOccurrences.length !== 1 ? "s" : ""}
          </div>
        </header>

        {/* Map Panel */}
        <div className="mb-6 relative flex flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-red-600 to-orange-600 shadow-lg ring-1 ring-black/10 dark:from-slate-800 dark:to-slate-900">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/10 text-white">
                <MapPinned className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Cloudburst Occurrences Map
                </h3>
                <p className="text-xs text-red-100/80">
                  Historical cloudburst event locations
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setMapExpanded(true)}
              className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs font-medium text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
              aria-label="Expand map"
            >
              <ArrowUpRight className="h-4 w-4" />
              <span>Expand</span>
            </button>
          </div>

          <div className="h-80 md:h-[420px]">
            <CloudburstOccurrencesMap
              historicalPoints={HISTORICAL_POINTS}
              showLegend={false}
            />
          </div>

          <div className="absolute bottom-4 left-4 rounded-md bg-white/10 px-3 py-1 text-xs text-white">
            {HISTORICAL_POINTS.length} occurrence
            {HISTORICAL_POINTS.length === 1 ? "" : "s"}
          </div>
        </div>

        {/* Occurrences List */}
        <div className="space-y-4">
          {sortedOccurrences.map((occurrence) => {
            const isExpanded = expandedItems.has(occurrence.id);
            const rainfallValue = parseFloat(occurrence.rainfall);

            return (
              <div
                key={occurrence.id}
                className="rounded-2xl bg-white shadow-lg ring-1 ring-black/5 dark:bg-gray-800/60 dark:ring-black/10 overflow-hidden"
              >
                {/* Header - Always visible */}
                <div className="px-5 py-4 border-b border-gray-200 dark:border-white/6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-8 h-8 bg-red-800 text-white rounded-md text-sm font-bold shrink-0">
                          ✕
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                            {occurrence.location}
                          </h3>
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{occurrence.date}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openFullscreen(occurrence)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                        aria-label="Expand details"
                      >
                        <ArrowUpRight className="h-3.5 w-3.5" />
                        <span>Expand</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/40 border-t border-gray-200 dark:border-white/6">
                    <div className="space-y-4">
                      {/* Event Description */}
                      {occurrence.event_description && (
                        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                              Event Report
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                            {occurrence.event_description}
                          </p>
                        </div>
                      )}

                      {/* Location Details */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <MapPin className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                              Coordinates
                            </span>
                          </div>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                              Lat: {occurrence.lat.toFixed(4)}
                            </p>
                            <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                              Lng: {occurrence.lng.toFixed(4)}
                            </p>
                          </div>
                        </div>

                        
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Fullscreen Modal */}
        {fullscreenItem && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            aria-modal="true"
            role="dialog"
            onClick={closeFullscreen}
          >
            <div
              className="flex h-full w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 dark:border-white/6">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-10 h-10 bg-red-800 text-white rounded-md text-lg font-bold">
                    ✕
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {fullscreenItem.location}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {fullscreenItem.date}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeFullscreen}
                  className="rounded-md p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/6 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {/* Event Description */}
                  {fullscreenItem.event_description && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <span className="text-base font-semibold text-gray-700 dark:text-gray-300">
                          Event Report
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {fullscreenItem.event_description}
                      </p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Location Details
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Location
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {fullscreenItem.location}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Coordinates
                          </p>
                          <p className="text-sm font-mono text-gray-900 dark:text-gray-100">
                            {fullscreenItem.lat.toFixed(4)},{" "}
                            {fullscreenItem.lng.toFixed(4)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                      <div className="flex items-center gap-2 mb-3">
                        <Calendar className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                          Event Information
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            Date
                          </p>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {fullscreenItem.date}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Map Fullscreen Modal */}
        {mapExpanded && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
            aria-modal="true"
            role="dialog"
          >
            <div className="flex h-full w-full max-w-6xl flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900">
              <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-white/6">
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-red-600/10 text-red-700 dark:bg-white/10 dark:text-white">
                    <MapPinned className="h-4 w-4" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Cloudburst Occurrences Map – Fullscreen
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMapExpanded(false)}
                  className="rounded-md px-3 py-1 text-xs font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-white/6"
                >
                  Close
                </button>
              </div>
              <div className="flex-1">
                <CloudburstOccurrencesMap
                  historicalPoints={HISTORICAL_POINTS}
                  showLegend={true}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

