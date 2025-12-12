"use client";

import { useState, useEffect } from "react";
import { ref, update, set, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { Wind, Check, X } from "lucide-react";
import { useTranslations } from "next-intl";

export default function WindSpeedInput({ nodeId, onSuccess, onError }) {
  const t = useTranslations("windSpeed");
  const [windSpeed, setWindSpeed] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Load current wind speed from Firebase if available, default to 0
  useEffect(() => {
    if (!nodeId) {
      setWindSpeed(0);
      return;
    }

    const loadCurrentWindSpeed = async () => {
      try {
        const realtimeRef = ref(database, `nodes/${nodeId}/realtime`);
        const snapshot = await get(realtimeRef);
        if (snapshot.exists()) {
          const data = snapshot.val();
          if (data.windSpeed !== undefined && data.windSpeed !== null) {
            setWindSpeed(parseFloat(data.windSpeed) || 0);
          } else {
            setWindSpeed(0);
          }
        } else {
          setWindSpeed(0);
        }
      } catch (error) {
        console.error("Error loading wind speed:", error);
        setWindSpeed(0);
      }
    };

    loadCurrentWindSpeed();
  }, [nodeId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nodeId) {
      setMessage({ type: "error", text: "No node selected" });
      return;
    }

    setIsSubmitting(true);
    setMessage({ type: "", text: "" });

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString(); // Unix timestamp in seconds

      // Update realtime data
      const realtimeRef = ref(database, `nodes/${nodeId}/realtime`);
      await update(realtimeRef, {
        windSpeed: parseFloat(windSpeed),
        lastUpdate: timestamp,
      });

      // Store in history - append new entry with wind speed
      // Get the latest history entry to preserve other fields (temperature, pressure, etc.)
      const historySnapshot = await get(ref(database, `nodes/${nodeId}/history`));
      let baseHistoryData = {};
      
      if (historySnapshot.exists()) {
        const historyEntries = historySnapshot.val();
        const entriesArray = Object.entries(historyEntries);
        if (entriesArray.length > 0) {
          // Get the most recent entry
          const latestEntry = entriesArray[entriesArray.length - 1][1];
          if (latestEntry) {
            baseHistoryData = { ...latestEntry };
          }
        }
      }

      // Ensure windSpeed is always present (default to 0 if not in base data)
      if (baseHistoryData.windSpeed === undefined || baseHistoryData.windSpeed === null) {
        baseHistoryData.windSpeed = 0;
      }

      // Create new history entry with wind speed (preserving other fields from latest entry)
      const historyKey = Date.now();
      const historyRef = ref(database, `nodes/${nodeId}/history/${historyKey}`);
      
      await set(historyRef, {
        ...baseHistoryData,
        windSpeed: parseFloat(windSpeed),
        timestamp: timestamp,
      });

      setMessage({
        type: "success",
        text: `Wind speed ${windSpeed} km/h saved successfully!`,
      });

      if (onSuccess) onSuccess(windSpeed);

      // Clear message after 3 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 3000);
    } catch (error) {
      console.error("Error saving wind speed:", error);
      setMessage({
        type: "error",
        text: "Failed to save wind speed. Please try again.",
      });
      if (onError) onError(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-4 shadow-md dark:bg-gray-800">
      <div className="mb-4 flex items-center gap-2">
        <Wind className="h-5 w-5 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("title")}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="windSpeed"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t("label")}
            </label>
            <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
              {windSpeed} {t("unit")}
            </span>
          </div>
          <input
            type="range"
            id="windSpeed"
            min="0"
            max="30"
            step="0.1"
            value={windSpeed}
            onChange={(e) => setWindSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"

          />
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>0</span>
            <span>10</span>
            <span>30</span>
          </div>
        </div>

        {message.text && (
          <div
            className={`rounded-md p-3 text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting || !nodeId}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {t("submitting")}
            </>
          ) : (
            <>
              <Check className="h-4 w-4" />
              {t("submit")}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

