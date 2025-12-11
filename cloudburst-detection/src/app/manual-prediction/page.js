"use client";

import { useState } from "react";
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Cloud,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Sparkles,
} from "lucide-react";

export default function ManualPrediction() {
  const [formData, setFormData] = useState({
    temperature: "",
    humidity: "",
    precipitationRate: "",
    tcwv: "",
    cape: "",
    pressure: "",
    windSpeed: "",
    windDirection: "",
  });

  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear previous prediction when user changes input
    if (prediction) {
      setPrediction(null);
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPrediction(null);

    try {
      const response = await fetch("/api/predict/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get prediction");
      }

      setPrediction(data);
    } catch (err) {
      setError(err.message || "An error occurred while predicting");
      console.error("Prediction error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      temperature: "",
      humidity: "",
      precipitationRate: "",
      tcwv: "",
      cape: "",
      pressure: "",
      windSpeed: "",
      windDirection: "",
    });
    setPrediction(null);
    setError("");
  };

  const getRiskLevel = (probability) => {
    if (probability >= 0.7)
      return {
        level: "High",
        color: "red",
        bgColor: "bg-red-50 dark:bg-red-900/20",
        borderColor: "border-red-500",
        textColor: "text-red-700 dark:text-red-300",
        icon: AlertTriangle,
      };
    if (probability >= 0.4)
      return {
        level: "Medium",
        color: "yellow",
        bgColor: "bg-yellow-50 dark:bg-yellow-900/20",
        borderColor: "border-yellow-500",
        textColor: "text-yellow-700 dark:text-yellow-300",
        icon: AlertTriangle,
      };
    return {
      level: "Low",
      color: "green",
      bgColor: "bg-green-50 dark:bg-green-900/20",
      borderColor: "border-green-500",
      textColor: "text-green-700 dark:text-green-300",
      icon: CheckCircle,
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-lg shadow-lg">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
                Manual Cloudburst Prediction
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Enter weather parameters to predict cloudburst probability
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Input Form */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Temperature */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Thermometer className="h-5 w-5 text-red-500" />
                    Temperature (°C)
                  </label>
                  <input
                    type="number"
                    name="temperature"
                    value={formData.temperature}
                    onChange={handleInputChange}
                    placeholder="e.g., 25.5"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Humidity */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Droplets className="h-5 w-5 text-blue-500" />
                    Humidity (%)
                  </label>
                  <input
                    type="number"
                    name="humidity"
                    value={formData.humidity}
                    onChange={handleInputChange}
                    placeholder="e.g., 75"
                    min="0"
                    max="100"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Precipitation Rate */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Cloud className="h-5 w-5 text-cyan-500" />
                    Precipitation Rate (mm/hr)
                  </label>
                  <input
                    type="number"
                    name="precipitationRate"
                    value={formData.precipitationRate}
                    onChange={handleInputChange}
                    placeholder="e.g., 15.5"
                    min="0"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* TCWV */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Droplets className="h-5 w-5 text-indigo-500" />
                    TCWV - Total Column Water Vapor (kg/m²)
                  </label>
                  <input
                    type="number"
                    name="tcwv"
                    value={formData.tcwv}
                    onChange={handleInputChange}
                    placeholder="e.g., 45.2"
                    min="0"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* CAPE */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Wind className="h-5 w-5 text-purple-500" />
                    CAPE - Convective Available Potential Energy (J/kg)
                  </label>
                  <input
                    type="number"
                    name="cape"
                    value={formData.cape}
                    onChange={handleInputChange}
                    placeholder="e.g., 2500"
                    min="0"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Pressure */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Gauge className="h-5 w-5 text-orange-500" />
                    Atmospheric Pressure (hPa)
                  </label>
                  <input
                    type="number"
                    name="pressure"
                    value={formData.pressure}
                    onChange={handleInputChange}
                    placeholder="e.g., 1013.25"
                    min="0"
                    step="0.01"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Wind Speed */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Wind className="h-5 w-5 text-gray-500" />
                    Wind Speed (km/h)
                  </label>
                  <input
                    type="number"
                    name="windSpeed"
                    value={formData.windSpeed}
                    onChange={handleInputChange}
                    placeholder="e.g., 25.5"
                    min="0"
                    step="0.1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Wind Direction */}
                <div>
                  <label className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-700 dark:text-gray-200">
                    <Wind className="h-5 w-5 text-gray-500" />
                    Wind Direction (degrees)
                  </label>
                  <input
                    type="number"
                    name="windDirection"
                    value={formData.windDirection}
                    onChange={handleInputChange}
                    placeholder="e.g., 180 (0=N, 90=E, 180=S, 270=W)"
                    min="0"
                    max="360"
                    step="1"
                    required
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-800 dark:text-red-200">
                      {error}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-blue-600 dark:bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Predicting...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        Predict Cloudburst
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Prediction Result */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 sticky top-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                Prediction Result
              </h2>

              {!prediction && !loading && (
                <div className="text-center py-12">
                  <Cloud className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    Enter weather parameters and click "Predict Cloudburst" to
                    see results
                  </p>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="h-16 w-16 text-blue-600 dark:text-blue-400 mx-auto mb-4 animate-spin" />
                  <p className="text-gray-600 dark:text-gray-400">
                    Analyzing weather data...
                  </p>
                </div>
              )}

              {prediction && (
                <div className="space-y-6">
                  {/* Main Prediction */}
                  <div
                    className={`rounded-xl p-6 border-l-4 ${
                      getRiskLevel(prediction.probability).borderColor
                    } ${getRiskLevel(prediction.probability).bgColor}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Cloudburst Prediction
                      </h3>
                      {prediction.isCloudburst ? (
                        <XCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
                      ) : (
                        <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
                      )}
                    </div>

                    <div className="text-center mb-4">
                      <div
                        className={`text-5xl font-bold mb-2 ${
                          getRiskLevel(prediction.probability).textColor
                        }`}
                      >
                        {prediction.isCloudburst ? "YES" : "NO"}
                      </div>
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-semibold ${
                            getRiskLevel(prediction.probability).level ===
                            "High"
                              ? "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300"
                              : getRiskLevel(prediction.probability).level ===
                                "Medium"
                              ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300"
                              : "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                          }`}
                        >
                          {getRiskLevel(prediction.probability).level} Risk
                        </span>
                      </div>
                    </div>

                    {/* Probability Bar */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                        <span>Probability</span>
                        <span className="font-semibold">
                          {(prediction.probability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            getRiskLevel(prediction.probability).level ===
                            "High"
                              ? "bg-red-500"
                              : getRiskLevel(prediction.probability).level ===
                                "Medium"
                              ? "bg-yellow-500"
                              : "bg-green-500"
                          }`}
                          style={{
                            width: `${prediction.probability * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>

                    {prediction.confidence && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Model Confidence:</span>{" "}
                        {(prediction.confidence * 100).toFixed(1)}%
                      </div>
                    )}
                  </div>

                  {/* Warning for High Risk */}
                  {getRiskLevel(prediction.probability).level === "High" && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-red-900 dark:text-red-200">
                            High Risk Alert
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                            Cloudburst conditions detected. Take necessary
                            precautions and monitor weather updates closely.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Input Summary */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      Input Summary
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Temp:
                        </span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formData.temperature}°C
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Humidity:
                        </span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formData.humidity}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          Precip:
                        </span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formData.precipitationRate} mm/hr
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">
                          CAPE:
                        </span>{" "}
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formData.cape} J/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

