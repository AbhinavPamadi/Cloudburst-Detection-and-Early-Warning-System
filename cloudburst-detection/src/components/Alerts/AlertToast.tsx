'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  AlertTriangle,
  X,
  MapPin,
  Wind,
  Droplets,
  ExternalLink,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { Alert, SectorState } from '@/types/sector.types';
import { getProbabilityColor, getAlertLevelName } from '@/utils/colorScale';

// ============================================
// Types
// ============================================

interface AlertToastProps {
  alert: Alert;
  sector?: SectorState | null;
  onDismiss: (alertId: string) => void;
  onViewDetails?: (alert: Alert) => void;
  autoHideDuration?: number;
  enableSound?: boolean;
}

interface AlertToastContainerProps {
  alerts: Alert[];
  sectors: Map<string, SectorState>;
  onDismiss: (alertId: string) => void;
  onViewDetails?: (alert: Alert) => void;
  maxVisible?: number;
  enableSound?: boolean;
}

// ============================================
// Sound Hook
// ============================================

function useAlertSound(enabled: boolean) {
  const playSound = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    try {
      // Use Web Audio API for alert sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;

      oscillator.start();

      // Create alert pattern: beep-beep
      setTimeout(() => {
        gainNode.gain.value = 0;
      }, 150);
      setTimeout(() => {
        gainNode.gain.value = 0.3;
      }, 200);
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 350);
    } catch (error) {
      console.warn('Could not play alert sound:', error);
    }
  }, [enabled]);

  return playSound;
}

// ============================================
// Single Alert Toast
// ============================================

export function AlertToast({
  alert,
  sector,
  onDismiss,
  onViewDetails,
  autoHideDuration = 10000,
  enableSound = false,
}: AlertToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const playSound = useAlertSound(enableSound);

  // Auto-hide timer
  useEffect(() => {
    if (autoHideDuration <= 0) return;

    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / autoHideDuration) * 100);
      setProgress(remaining);

      if (remaining <= 0) {
        handleDismiss();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [autoHideDuration]);

  // Play sound on mount for critical alerts
  useEffect(() => {
    if (alert.severity === 'critical' || alert.severity === 'high') {
      playSound();
    }
  }, [alert.severity, playSound]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(alert.id), 300);
  }, [alert.id, onDismiss]);

  const probability = sector?.currentProbability ?? 0;
  const alertColor = getProbabilityColor(probability);

  return (
    <div
      className={`
        relative overflow-hidden rounded-lg shadow-lg border-l-4
        bg-white dark:bg-gray-800
        transform transition-all duration-300 ease-out
        ${isExiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'}
      `}
      style={{ borderLeftColor: alertColor }}
      role="alert"
    >
      {/* Progress bar */}
      {autoHideDuration > 0 && (
        <div
          className="absolute top-0 left-0 h-1 bg-gray-200 dark:bg-gray-700 w-full"
        >
          <div
            className="h-full transition-all duration-100 ease-linear"
            style={{
              width: `${progress}%`,
              backgroundColor: alertColor,
            }}
          />
        </div>
      )}

      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle
              className="w-5 h-5 flex-shrink-0"
              style={{ color: alertColor }}
            />
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                {alert.type === 'cloudburst_detected'
                  ? 'Cloudburst Detected!'
                  : alert.type === 'high_probability'
                  ? 'High Probability Alert'
                  : 'Cloudburst Alert'}
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {getAlertLevelName(alert.severity)} severity
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-3 space-y-2">
          {/* Sector Info */}
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-gray-700 dark:text-gray-300">
              {sector?.name || alert.sectorId}
            </span>
            <span
              className="font-bold ml-auto"
              style={{ color: alertColor }}
            >
              {probability.toFixed(0)}%
            </span>
          </div>

          {/* Weather Info */}
          {sector && (
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
              {sector.rainfall && (
                <span className="flex items-center gap-1">
                  <Droplets className="w-3 h-3" />
                  {sector.rainfall.rate.toFixed(1)} mm/hr
                </span>
              )}
              {sector.weather && (
                <span className="flex items-center gap-1">
                  <Wind className="w-3 h-3" />
                  {sector.weather.humidity}% humidity
                </span>
              )}
            </div>
          )}

          {/* Message */}
          <p className="text-xs text-gray-600 dark:text-gray-400">
            {alert.message}
          </p>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={handleDismiss}
            className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400
              bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600
              transition-colors"
          >
            Dismiss
          </button>
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(alert)}
              className="flex-1 px-3 py-1.5 text-xs font-medium text-white rounded
                hover:opacity-90 transition-colors flex items-center justify-center gap-1"
              style={{ backgroundColor: alertColor }}
            >
              <ExternalLink className="w-3 h-3" />
              View Details
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Alert Toast Container
// ============================================

export function AlertToastContainer({
  alerts,
  sectors,
  onDismiss,
  onViewDetails,
  maxVisible = 3,
  enableSound = false,
}: AlertToastContainerProps) {
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  // Only show unacknowledged alerts, most recent first
  const visibleAlerts = alerts
    .filter((a) => !a.acknowledged)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, maxVisible);

  const hiddenCount = alerts.filter((a) => !a.acknowledged).length - maxVisible;

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 space-y-2">
      {/* Sound Toggle */}
      <button
        onClick={() => setSoundEnabled(!soundEnabled)}
        className="absolute -top-10 right-0 p-2 rounded-full bg-white dark:bg-gray-800
          shadow-md hover:shadow-lg transition-shadow"
        aria-label={soundEnabled ? 'Mute alerts' : 'Enable alert sounds'}
      >
        {soundEnabled ? (
          <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        ) : (
          <VolumeX className="w-4 h-4 text-gray-400" />
        )}
      </button>

      {/* Alerts */}
      {visibleAlerts.map((alert) => (
        <AlertToast
          key={alert.id}
          alert={alert}
          sector={sectors.get(alert.sectorId)}
          onDismiss={onDismiss}
          onViewDetails={onViewDetails}
          enableSound={soundEnabled}
        />
      ))}

      {/* Hidden Count */}
      {hiddenCount > 0 && (
        <div className="text-center text-xs text-gray-500 dark:text-gray-400 py-1">
          +{hiddenCount} more alert{hiddenCount > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}

export default AlertToast;
