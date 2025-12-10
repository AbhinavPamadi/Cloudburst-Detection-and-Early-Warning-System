import type { AlertLevel } from '@/types/sector.types';

// ============================================
// Color Constants
// ============================================

/**
 * Exact hex colors for probability ranges as specified
 */
export const PROBABILITY_COLORS = {
  green: '#22c55e',   // 0-25% (Tailwind green-500)
  yellow: '#eab308',  // 26-50% (Tailwind yellow-500)
  orange: '#f97316',  // 51-75% (Tailwind orange-500)
  red: '#ef4444',     // 76-100% (Tailwind red-500)
} as const;

/**
 * Alert level to color mapping
 */
export const ALERT_LEVEL_COLORS: Record<AlertLevel, string> = {
  normal: PROBABILITY_COLORS.green,
  elevated: PROBABILITY_COLORS.yellow,
  high: PROBABILITY_COLORS.orange,
  critical: PROBABILITY_COLORS.red,
} as const;

/**
 * Tailwind CSS class names for alert levels
 */
export const ALERT_LEVEL_CLASSES: Record<AlertLevel, string> = {
  normal: 'bg-green-500',
  elevated: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
} as const;

/**
 * Text color classes for alert levels (for contrast)
 */
export const ALERT_LEVEL_TEXT_CLASSES: Record<AlertLevel, string> = {
  normal: 'text-green-700 dark:text-green-300',
  elevated: 'text-yellow-700 dark:text-yellow-300',
  high: 'text-orange-700 dark:text-orange-300',
  critical: 'text-red-700 dark:text-red-300',
} as const;

/**
 * Background color classes for alert levels (lighter)
 */
export const ALERT_LEVEL_BG_CLASSES: Record<AlertLevel, string> = {
  normal: 'bg-green-100 dark:bg-green-900/30',
  elevated: 'bg-yellow-100 dark:bg-yellow-900/30',
  high: 'bg-orange-100 dark:bg-orange-900/30',
  critical: 'bg-red-100 dark:bg-red-900/30',
} as const;

/**
 * Border color classes for alert levels
 */
export const ALERT_LEVEL_BORDER_CLASSES: Record<AlertLevel, string> = {
  normal: 'border-green-500',
  elevated: 'border-yellow-500',
  high: 'border-orange-500',
  critical: 'border-red-500',
} as const;

// ============================================
// Probability to Color Functions
// ============================================

/**
 * Get hex color for a probability value
 * @param probability 0-100
 */
export function getProbabilityColor(probability: number): string {
  if (probability < 0) probability = 0;
  if (probability > 100) probability = 100;

  if (probability <= 25) return PROBABILITY_COLORS.green;
  if (probability <= 50) return PROBABILITY_COLORS.yellow;
  if (probability <= 75) return PROBABILITY_COLORS.orange;
  return PROBABILITY_COLORS.red;
}

/**
 * Get fill opacity based on probability
 * Higher probability = more opaque
 * Range: 0.4 (min) to 0.7 (max)
 */
export function getProbabilityOpacity(probability: number): number {
  const BASE_OPACITY = 0.4;
  const MAX_ADDITIONAL = 0.3;

  const normalized = Math.min(100, Math.max(0, probability)) / 100;
  return BASE_OPACITY + normalized * MAX_ADDITIONAL;
}

/**
 * Get border weight based on probability
 * Higher probability = thicker border
 */
export function getProbabilityBorderWeight(probability: number): number {
  if (probability >= 75) return 3;
  if (probability >= 50) return 2;
  return 1;
}

/**
 * Get Leaflet path options for a sector based on probability
 */
export function getSectorPathOptions(probability: number) {
  return {
    fillColor: getProbabilityColor(probability),
    fillOpacity: getProbabilityOpacity(probability),
    color: probability >= 75 ? PROBABILITY_COLORS.red : '#ffffff',
    weight: getProbabilityBorderWeight(probability),
    opacity: 0.8,
  };
}

/**
 * Get hover path options (increased opacity)
 */
export function getSectorHoverPathOptions(probability: number) {
  return {
    ...getSectorPathOptions(probability),
    fillOpacity: 0.6,
    weight: 3,
  };
}

// ============================================
// Alert Level Functions
// ============================================

/**
 * Get alert level from probability
 */
export function getAlertLevelFromProbability(probability: number): AlertLevel {
  if (probability < 25) return 'normal';
  if (probability < 50) return 'elevated';
  if (probability < 75) return 'high';
  return 'critical';
}

/**
 * Get color for alert level
 */
export function getAlertLevelColor(level: AlertLevel): string {
  return ALERT_LEVEL_COLORS[level];
}

/**
 * Get display name for alert level
 */
export function getAlertLevelName(level: AlertLevel): string {
  switch (level) {
    case 'normal':
      return 'Normal';
    case 'elevated':
      return 'Elevated';
    case 'high':
      return 'High';
    case 'critical':
      return 'Critical';
  }
}

/**
 * Check if alert level requires attention
 */
export function requiresAttention(level: AlertLevel): boolean {
  return level === 'high' || level === 'critical';
}

// ============================================
// Gradient & Animation
// ============================================

/**
 * Generate CSS gradient for probability scale legend
 */
export function getProbabilityGradient(): string {
  return `linear-gradient(to right,
    ${PROBABILITY_COLORS.green} 0%,
    ${PROBABILITY_COLORS.green} 25%,
    ${PROBABILITY_COLORS.yellow} 25%,
    ${PROBABILITY_COLORS.yellow} 50%,
    ${PROBABILITY_COLORS.orange} 50%,
    ${PROBABILITY_COLORS.orange} 75%,
    ${PROBABILITY_COLORS.red} 75%,
    ${PROBABILITY_COLORS.red} 100%
  )`;
}

/**
 * Get pulse animation class based on alert level
 */
export function getPulseAnimationClass(level: AlertLevel): string {
  switch (level) {
    case 'critical':
      return 'animate-pulse-fast';
    case 'high':
      return 'animate-pulse';
    default:
      return '';
  }
}

/**
 * Get border animation style for sector polygons
 */
export function getSectorBorderAnimation(level: AlertLevel): string {
  if (level === 'critical') {
    return 'sector-border-pulse-red';
  }
  if (level === 'high') {
    return 'sector-border-pulse-orange';
  }
  return '';
}

// ============================================
// RGBA Conversions
// ============================================

/**
 * Convert hex color to RGB components
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

/**
 * Get RGBA color string from hex and opacity
 */
export function getRgbaColor(hex: string, opacity: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
}

/**
 * Get RGBA color for probability
 */
export function getProbabilityRgbaColor(probability: number, opacity?: number): string {
  const hex = getProbabilityColor(probability);
  const finalOpacity = opacity ?? getProbabilityOpacity(probability);
  return getRgbaColor(hex, finalOpacity);
}

// ============================================
// Legend Data
// ============================================

export interface LegendItem {
  label: string;
  color: string;
  range: string;
}

/**
 * Get legend items for probability scale
 */
export function getProbabilityLegendItems(): LegendItem[] {
  return [
    { label: 'Low Risk', color: PROBABILITY_COLORS.green, range: '0-25%' },
    { label: 'Elevated', color: PROBABILITY_COLORS.yellow, range: '26-50%' },
    { label: 'High Risk', color: PROBABILITY_COLORS.orange, range: '51-75%' },
    { label: 'Critical', color: PROBABILITY_COLORS.red, range: '76-100%' },
  ];
}

// ============================================
// Contrast & Accessibility
// ============================================

/**
 * Get appropriate text color for a background color (for WCAG AA compliance)
 */
export function getContrastTextColor(backgroundColor: string): string {
  const rgb = hexToRgb(backgroundColor);
  if (!rgb) return '#000000';

  // Calculate luminance
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;

  // Return black or white based on luminance
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

/**
 * Get accessible text color class for alert level
 */
export function getAccessibleTextClass(level: AlertLevel): string {
  // All our colors work better with white text for the filled versions
  return 'text-white';
}
