"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Calendar, TrendingUp, AlertCircle, Clock, Play, Pause, RotateCcw } from "lucide-react";
import ProtectedPage from "@/features/auth/ProtectedPage";
import { Roles } from "@/features/auth/authService";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
} from "recharts";

export default function EventsTimelinePage() {
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Simulation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [simulationProgress, setSimulationProgress] = useState(0);
  const [simulationSpeed, setSimulationSpeed] = useState(1); // 1x, 2x, 4x, etc.
  const simulationIntervalRef = useRef(null);
  const [visibleEvents, setVisibleEvents] = useState([]);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events-csv");
      if (!response.ok) {
        throw new Error("Failed to fetch CSV data");
      }
      const csvText = await response.text();
      const parsed = parseCSV(csvText);
      const grouped = groupIntoEvents(parsed);
      setEvents(grouped);
      if (grouped.length > 0) {
        setSelectedEvent(grouped[0].id);
      }
    } catch (err) {
      console.error("Error loading events:", err);
      setError("Failed to load events data");
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (csvText) => {
    const lines = csvText.split("\n");
    const headers = lines[0].split(",");
    const dateIndex = headers.indexOf("date");
    const timeLocalIndex = headers.indexOf("time_local");
    const labelIndex = headers.indexOf("new_label");

    const data = [];
    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      
      const values = parseCSVLine(lines[i]);
      if (values.length > Math.max(dateIndex, labelIndex, timeLocalIndex)) {
        const timeLocal = values[timeLocalIndex] || values[dateIndex];
        const label = parseInt(values[labelIndex]);
        
        if (timeLocal && !isNaN(label) && (label === 1 || label === 2)) {
          // Parse time_local which has full timestamp with hours
          let timestamp;
          let dateObj;
          
          try {
            // time_local format: "2022-07-01 05:30:00+05:30"
            dateObj = new Date(timeLocal);
            timestamp = dateObj.getTime();
            
            // Validate the date
            if (isNaN(timestamp)) {
              // Fallback to date column
              const date = values[dateIndex];
              dateObj = new Date(date);
              timestamp = dateObj.getTime();
            }
          } catch {
            // Fallback to date column
            const date = values[dateIndex];
            dateObj = new Date(date);
            timestamp = dateObj.getTime();
          }
          
          if (!isNaN(timestamp)) {
            data.push({
              date: dateObj,
              label: label,
              timestamp: timestamp,
              hour: dateObj.getHours(),
              dateTime: dateObj,
            });
          }
        }
      }
    }
    
    return data.sort((a, b) => a.timestamp - b.timestamp);
  };

  const parseCSVLine = (line) => {
    const values = [];
    let current = "";
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    return values;
  };

  const groupIntoEvents = (data) => {
    const events = [];
    let currentEvent = null;
    let eventId = 1;

    for (let i = 0; i < data.length; i++) {
      const item = data[i];
      
      if (!currentEvent) {
        // Start new event
        currentEvent = {
          id: eventId++,
          startDate: item.date,
          endDate: item.date,
          predictions: [],
          actuals: [],
          allDays: [item],
        };
        
        if (item.label === 1) {
          currentEvent.predictions.push(item);
        } else if (item.label === 2) {
          currentEvent.actuals.push(item);
        }
      } else {
        // Check if this entry is consecutive (within 48 hours of previous)
        const hoursDiff = (item.timestamp - currentEvent.endDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff <= 48) {
          // Continue current event
          currentEvent.endDate = item.date;
          currentEvent.allDays.push(item);
          
          if (item.label === 1) {
            currentEvent.predictions.push(item);
          } else if (item.label === 2) {
            currentEvent.actuals.push(item);
          }
        } else {
          // End current event and start new one
          if (currentEvent.predictions.length > 0 || currentEvent.actuals.length > 0) {
            events.push(currentEvent);
          }
          
          currentEvent = {
            id: eventId++,
            startDate: item.date,
            endDate: item.date,
            predictions: [],
            actuals: [],
            allDays: [item],
          };
          
          if (item.label === 1) {
            currentEvent.predictions.push(item);
          } else if (item.label === 2) {
            currentEvent.actuals.push(item);
          }
        }
      }
    }
    
    // Add last event
    if (currentEvent && (currentEvent.predictions.length > 0 || currentEvent.actuals.length > 0)) {
      events.push(currentEvent);
    }
    
    return events;
  };

  const formatDate = (date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateTime = (date) => {
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const formatHour = (date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const getEventDisplayName = (event) => {
    return `Event ${event.id} (${formatDate(event.startDate)} - ${formatDate(event.endDate)})`;
  };

  const selectedEventData = events.find((e) => e.id === selectedEvent);

  // Reset simulation when event changes
  useEffect(() => {
    if (selectedEventData) {
      setSimulationProgress(0);
      setIsPlaying(false);
      setVisibleEvents([]);
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    }
  }, [selectedEvent]);

  // Simulation logic
  useEffect(() => {
    if (!selectedEventData || !isPlaying) {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      return;
    }

    const sortedEvents = [...selectedEventData.allDays].sort((a, b) => a.timestamp - b.timestamp);
    const totalDuration = sortedEvents.length > 0 
      ? sortedEvents[sortedEvents.length - 1].timestamp - sortedEvents[0].timestamp
      : 0;
    
    const stepDuration = Math.max(100, 1000 / simulationSpeed); // Adjust speed
    const progressStep = 100 / sortedEvents.length;

    simulationIntervalRef.current = setInterval(() => {
      setSimulationProgress((prev) => {
        const newProgress = prev + progressStep;
        
        if (newProgress >= 100) {
          setIsPlaying(false);
          setVisibleEvents(sortedEvents);
          return 100;
        }

        // Calculate which events should be visible
        const currentIndex = Math.floor((newProgress / 100) * sortedEvents.length);
        setVisibleEvents(sortedEvents.slice(0, currentIndex + 1));
        
        return newProgress;
      });
    }, stepDuration);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isPlaying, selectedEventData, simulationSpeed]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (simulationProgress >= 100) {
        // Restart from beginning
        setSimulationProgress(0);
        setVisibleEvents([]);
      }
      setIsPlaying(true);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setSimulationProgress(0);
    setVisibleEvents([]);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
  };

  const handleSpeedChange = (speed) => {
    setSimulationSpeed(speed);
  };

  // Prepare chart data for visualization
  const chartData = useMemo(() => {
    if (!selectedEventData) return [];

    // Use visible events if simulation is active, otherwise show all
    const dataToUse = visibleEvents.length > 0 && isPlaying 
      ? visibleEvents 
      : selectedEventData.allDays;
    
    // Create data points for each entry (hourly)
    const sortedData = [...dataToUse].sort((a, b) => a.timestamp - b.timestamp);
    
    return sortedData.map((item, index) => {
      const date = item.date;
      const hour = date.getHours();
      const minutes = date.getMinutes();
      
      return {
        index,
        time: formatDateTime(date),
        hourLabel: `${formatDate(date)} ${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`,
        timestamp: item.timestamp,
        predictions: item.label === 1 ? 1 : 0,
        actuals: item.label === 2 ? 1 : 0,
        hour: hour,
      };
    });
  }, [selectedEventData, visibleEvents, isPlaying]);

  return (
    <ProtectedPage allowedRoles={[Roles.ADMIN, Roles.SUPER_ADMIN, Roles.USER]}>
      <div className="px-4 pb-6 pt-4 md:px-6">
        <header className="mb-6 flex items-center gap-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cloudburst Events Timeline
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Compare model predictions vs actual cloudburst occurrences
            </p>
          </div>
        </header>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading events...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="space-y-6">
            {/* Event Selector */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
                Select Event
              </label>
              <select
                value={selectedEvent || ""}
                onChange={(e) => setSelectedEvent(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {getEventDisplayName(event)}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline Visualization */}
            {selectedEventData && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  {getEventDisplayName(selectedEventData)}
                </h2>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Model Predictions
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {selectedEventData.predictions.length} hours
                    </p>
                  </div>

                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Actual Cloudbursts
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {selectedEventData.actuals.length} hours
                    </p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Event Duration
                      </h3>
                    </div>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {Math.ceil(
                        (selectedEventData.endDate.getTime() -
                          selectedEventData.startDate.getTime()) /
                          (1000 * 60 * 60 * 24)
                      ) + 1}{" "}
                      days
                    </p>
                  </div>
                </div>

                {/* Simulation Controls */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow-md p-4 mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                        Timeline Simulation
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Watch events unfold chronologically
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleReset}
                        className="p-2 rounded-lg bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        title="Reset"
                      >
                        <RotateCcw className="h-5 w-5" />
                      </button>
                      <button
                        onClick={handlePlayPause}
                        className="p-3 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        {isPlaying ? (
                          <>
                            <Pause className="h-5 w-5" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-5 w-5" />
                            <span>Play</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Progress
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {Math.round(simulationProgress)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-300 ease-out"
                        style={{ width: `${simulationProgress}%` }}
                      />
                    </div>
                  </div>

                  {/* Speed Controls */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Speed:
                    </span>
                    {[1, 2, 4, 8].map((speed) => (
                      <button
                        key={speed}
                        onClick={() => handleSpeedChange(speed)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          simulationSpeed === speed
                            ? "bg-blue-600 text-white"
                            : "bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                        }`}
                      >
                        {speed}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Visual Timeline Chart */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Hour-by-Hour Timeline Visualization
                    {isPlaying && (
                      <span className="ml-2 text-sm font-normal text-blue-600 dark:text-blue-400 animate-pulse">
                        ● Simulating...
                      </span>
                    )}
                  </h3>
                  
                  {chartData.length > 0 && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4">
                      <ResponsiveContainer width="100%" height={400}>
                        <ComposedChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                          <XAxis
                            dataKey="index"
                            tickFormatter={(value) => {
                              const item = chartData[value];
                              if (!item) return "";
                              // Show every Nth label to avoid crowding
                              const showEvery = Math.max(1, Math.floor(chartData.length / 12));
                              if (value % showEvery === 0 || value === 0 || value === chartData.length - 1) {
                                const date = new Date(item.timestamp);
                                return `${formatDate(date)} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                              }
                              return "";
                            }}
                            label={{ value: "Time (Hours)", position: "insideBottom", offset: -5 }}
                            className="text-gray-600 dark:text-gray-400"
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            label={{ value: "Count", angle: -90, position: "insideLeft" }}
                            className="text-gray-600 dark:text-gray-400"
                          />
                          <Tooltip
                            formatter={(value, name) => [value, name === "predictions" ? "Model Predictions" : "Actual Cloudbursts"]}
                            labelFormatter={(value) => {
                              const item = chartData[value];
                              return item ? formatDateTime(new Date(item.timestamp)) : "";
                            }}
                            contentStyle={{
                              backgroundColor: "rgba(255, 255, 255, 0.95)",
                              border: "1px solid #e5e7eb",
                              borderRadius: "8px",
                            }}
                          />
                          <Legend
                            formatter={(value) => value === "predictions" ? "Model Predictions" : "Actual Cloudbursts"}
                          />
                          <Bar
                            dataKey="predictions"
                            fill="#3b82f6"
                            name="predictions"
                            radius={[4, 4, 0, 0]}
                            opacity={0.8}
                          />
                          <Bar
                            dataKey="actuals"
                            fill="#ef4444"
                            name="actuals"
                            radius={[4, 4, 0, 0]}
                            opacity={0.8}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Model Performance Metrics */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Model Performance Metrics
                  </h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* ROC Curve */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        ROC Curve
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Receiver Operating Characteristic curve showing the trade-off between True Positive Rate and False Positive Rate
                      </p>
                      <div className="w-full h-auto rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                        <img
                          src="/ROC_curve.png"
                          alt="ROC Curve"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>

                    {/* Precision-Recall Curve */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        Precision-Recall Curve
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Precision vs Recall curve showing model performance across different thresholds
                      </p>
                      <div className="w-full h-auto rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                        <img
                          src="/Precision_Recall.png"
                          alt="Precision Recall Curve"
                          className="w-full h-auto object-contain"
                        />
                      </div>
                    </div>

                    {/* Probability Distribution */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 lg:col-span-2">
                      <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                        Probability Distribution
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Distribution of predicted probabilities showing how the model assigns confidence scores
                      </p>
                      <div className="w-full h-auto rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-900">
                        <img
                          src="/prob_distribution.png"
                          alt="Probability Distribution"
                          className="w-full h-auto object-contain max-h-96"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Detailed Timeline List */}
                <div className="relative">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    Detailed Hour-by-Hour Timeline
                  </h3>
                  
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {selectedEventData.allDays
                      .sort((a, b) => a.timestamp - b.timestamp)
                      .map((day, index) => {
                        const isVisible = visibleEvents.length === 0 || 
                          visibleEvents.some(e => e.timestamp === day.timestamp) || 
                          !isPlaying;
                        const isPrediction = day.label === 1;
                        const isActual = day.label === 2;
                        
                        return (
                          <div
                            key={index}
                            className={`flex items-center gap-4 p-3 rounded-lg border-2 transition-all duration-300 ${
                              !isVisible
                                ? "opacity-30"
                                : isActual
                                ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                                : isPrediction
                                ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"
                                : "bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600"
                            }`}
                            style={{
                              opacity: isVisible ? 1 : 0.3,
                              transition: "opacity 0.3s ease-in",
                            }}
                          >
                            <div className="flex-shrink-0 w-48">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {formatDateTime(day.date)}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex-1 flex items-center gap-2">
                              {isPrediction && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded">
                                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                                    Model Predicted
                                  </span>
                                </div>
                              )}
                              
                              {isActual && (
                                <div className="flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 rounded">
                                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                                  <span className="text-sm font-medium text-red-700 dark:text-red-300">
                                    Cloudburst Occurred
                                  </span>
                                </div>
                              )}
                              
                              {!isPrediction && !isActual && (
                                <span className="text-sm text-gray-500 dark:text-gray-400">
                                  Normal
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && events.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No events found in the dataset.
            </p>
          </div>
        )}
      </div>
    </ProtectedPage>
  );
}

