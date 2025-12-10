'use client';

import { PROBABILITY_COLORS, getProbabilityLegendItems } from '@/utils/colorScale';

// ============================================
// Types
// ============================================

interface SectorLegendProps {
  position?: 'topright' | 'topleft' | 'bottomright' | 'bottomleft';
  showAerialStatus?: boolean;
  aerialActive?: boolean;
}

// ============================================
// Component
// ============================================

export function SectorLegend({
  position = 'bottomright',
  showAerialStatus = true,
  aerialActive = false,
}: SectorLegendProps) {
  const legendItems = getProbabilityLegendItems();

  const positionClasses: Record<string, string> = {
    topright: 'top-4 right-4',
    topleft: 'top-4 left-4',
    bottomright: 'bottom-4 right-4',
    bottomleft: 'bottom-4 left-4',
  };

  return (
    <div
      className={`absolute ${positionClasses[position]} z-[1000] bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-40`}
    >
      <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2">
        Cloudburst Probability
      </h4>

      <div className="space-y-1.5">
        {legendItems.map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: item.color, opacity: 0.7 }}
            />
            <span className="text-xs text-gray-600 dark:text-gray-300 flex-1">
              {item.label}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {item.range}
            </span>
          </div>
        ))}
      </div>

      {/* Additional legend items */}
      <div className="mt-3 pt-2 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
        {/* Wind indicator */}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 flex items-center justify-center">
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#1e40af"
              strokeWidth="3"
            >
              <path d="M12 4L12 20M12 4L6 10M12 4L18 10" />
            </svg>
          </div>
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Wind Direction
          </span>
        </div>

        {/* Cloudburst detection */}
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded border-2"
            style={{ borderColor: PROBABILITY_COLORS.red }}
          />
          <span className="text-xs text-gray-600 dark:text-gray-300">
            Cloudburst Detected
          </span>
        </div>

        {/* Aerial status */}
        {showAerialStatus && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#22c55e">
                <ellipse cx="12" cy="9" rx="5" ry="6" />
                <rect x="9" y="15" width="6" height="3" rx="1" />
              </svg>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-300">
              Aerial Monitoring
              {aerialActive && (
                <span className="ml-1 text-green-600 font-medium">(Active)</span>
              )}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SectorLegend;
