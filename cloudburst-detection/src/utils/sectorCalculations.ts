import type {
  WeatherData,
  RainfallData,
  WindData,
  ProbabilityFactors,
  ProbabilityCalculation,
  CloudburstDetection,
  AlertLevel,
  PredictionSource,
  AerialSensorData,
} from '@/types/sector.types';

// ============================================
// Constants
// ============================================

const STANDARD_PRESSURE_HPA = 1013;
const CLOUDBURST_RAINFALL_THRESHOLD = 100; // mm/hr
const PRESSURE_DROP_HIGH_CONFIDENCE = 3;   // hPa/hour

// Probability formula weights
const WEIGHTS = {
  rainfall: 0.5,
  pressure: 0.3,
  humidity: 0.2,
} as const;

// Combined prediction weights
const COMBINED_WEIGHTS = {
  ground: 0.4,
  aerial: 0.6,
} as const;

// ============================================
// Individual Factor Calculations
// ============================================

/**
 * Calculate rainfall factor for probability formula
 * rainfall_factor = min(rainfall_rate / 100, 1.0) * 100
 */
export function calculateRainfallFactor(rainfallRate: number): number {
  const normalizedRate = Math.min(rainfallRate / 100, 1.0);
  return normalizedRate * 100;
}

/**
 * Calculate pressure factor for probability formula
 * pressure_factor = max(0, (1013 - current_pressure) / 50) * 100
 * Lower pressure indicates storm formation
 */
export function calculatePressureFactor(currentPressure: number): number {
  const pressureDrop = STANDARD_PRESSURE_HPA - currentPressure;
  const normalizedDrop = Math.max(0, pressureDrop / 50);
  return normalizedDrop * 100;
}

/**
 * Calculate humidity factor for probability formula
 * humidity_factor = (current_humidity / 100) * 100
 */
export function calculateHumidityFactor(humidity: number): number {
  return (humidity / 100) * 100;
}

/**
 * Calculate all probability factors from weather data
 */
export function calculateProbabilityFactors(
  weather: WeatherData | null,
  rainfall: RainfallData | null
): ProbabilityFactors {
  return {
    rainfallFactor: rainfall ? calculateRainfallFactor(rainfall.rate) : 0,
    pressureFactor: weather ? calculatePressureFactor(weather.pressure) : 0,
    humidityFactor: weather ? calculateHumidityFactor(weather.humidity) : 0,
  };
}

// ============================================
// Base Probability Calculation
// ============================================

/**
 * Calculate base probability from sensor data
 * P_base = (rainfall_factor * 0.5) + (pressure_factor * 0.3) + (humidity_factor * 0.2)
 */
export function calculateBaseProbability(factors: ProbabilityFactors): number {
  const probability =
    factors.rainfallFactor * WEIGHTS.rainfall +
    factors.pressureFactor * WEIGHTS.pressure +
    factors.humidityFactor * WEIGHTS.humidity;

  return Math.min(100, Math.max(0, probability));
}

/**
 * Calculate probability from weather and rainfall data
 */
export function calculateProbabilityFromData(
  weather: WeatherData | null,
  rainfall: RainfallData | null
): { probability: number; factors: ProbabilityFactors } {
  const factors = calculateProbabilityFactors(weather, rainfall);
  const probability = calculateBaseProbability(factors);
  return { probability, factors };
}

// ============================================
// Combined Prediction (Ground + Aerial)
// ============================================

/**
 * Combine ground and aerial predictions
 * P_final = (W_ground * P_ground) + (W_aerial * P_aerial)
 * Confidence_combined = sqrt((C_ground^2 + C_aerial^2) / 2)
 */
export function combinePredictions(
  groundProbability: number,
  groundConfidence: number,
  aerialProbability: number,
  aerialConfidence: number
): { probability: number; confidence: number } {
  const combinedProbability =
    COMBINED_WEIGHTS.ground * groundProbability +
    COMBINED_WEIGHTS.aerial * aerialProbability;

  const combinedConfidence = Math.sqrt(
    (Math.pow(groundConfidence, 2) + Math.pow(aerialConfidence, 2)) / 2
  );

  return {
    probability: Math.min(100, Math.max(0, combinedProbability)),
    confidence: Math.min(1, Math.max(0, combinedConfidence)),
  };
}

/**
 * Calculate full probability with optional aerial data
 */
export function calculateFullProbability(
  groundWeather: WeatherData | null,
  groundRainfall: RainfallData | null,
  aerialData: AerialSensorData | null
): ProbabilityCalculation {
  // Calculate ground factors
  const groundFactors = calculateProbabilityFactors(groundWeather, groundRainfall);
  const groundProbability = calculateBaseProbability(groundFactors);
  const groundConfidence = calculateGroundConfidence(groundWeather, groundRainfall);

  // If no aerial data, return ground-only prediction
  if (!aerialData) {
    return {
      baseProbability: groundProbability,
      groundFactors,
      aerialFactors: null,
      combinedProbability: groundProbability,
      confidence: groundConfidence,
      source: groundWeather || groundRainfall ? 'ground' : 'unavailable',
    };
  }

  // Calculate aerial factors (using altitude-adjusted thresholds)
  const aerialFactors = calculateAerialProbabilityFactors(aerialData);
  const aerialProbability = calculateBaseProbability(aerialFactors);
  const aerialConfidence = 0.85; // Aerial typically has higher confidence

  // Combine predictions
  const { probability, confidence } = combinePredictions(
    groundProbability,
    groundConfidence,
    aerialProbability,
    aerialConfidence
  );

  return {
    baseProbability: groundProbability,
    groundFactors,
    aerialFactors,
    combinedProbability: probability,
    confidence,
    source: 'ground+aerial',
  };
}

/**
 * Calculate aerial probability factors with altitude-adjusted thresholds
 */
function calculateAerialProbabilityFactors(data: AerialSensorData): ProbabilityFactors {
  // PWV (Precipitable Water Vapor) is a key indicator for aerial data
  // High PWV indicates high moisture content conducive to cloudbursts
  const pwvFactor = Math.min((data.pwv / 50) * 100, 100);

  // At altitude, pressure readings need adjustment
  // Use humidity as primary indicator instead
  const humidityFactor = (data.humidity / 100) * 100;

  // Temperature inversion detection (simplified)
  // Cold temperatures at altitude with high humidity indicate instability
  const tempFactor = data.temperature < 10 && data.humidity > 80 ? 80 : 40;

  return {
    rainfallFactor: pwvFactor,
    pressureFactor: tempFactor,
    humidityFactor,
  };
}

/**
 * Calculate confidence for ground-only predictions
 */
function calculateGroundConfidence(
  weather: WeatherData | null,
  rainfall: RainfallData | null
): number {
  let confidence = 0;
  let dataPoints = 0;

  if (weather) {
    // Check data freshness (within last 5 minutes)
    const weatherAge = Date.now() - new Date(weather.timestamp).getTime();
    if (weatherAge < 5 * 60 * 1000) {
      confidence += 0.4;
    } else if (weatherAge < 15 * 60 * 1000) {
      confidence += 0.2;
    }
    dataPoints++;
  }

  if (rainfall) {
    const rainfallAge = Date.now() - new Date(rainfall.timestamp).getTime();
    if (rainfallAge < 5 * 60 * 1000) {
      confidence += 0.4;
    } else if (rainfallAge < 15 * 60 * 1000) {
      confidence += 0.2;
    }
    dataPoints++;
  }

  // Normalize confidence based on available data
  if (dataPoints === 0) return 0;
  return Math.min(1, confidence + (dataPoints * 0.1));
}

// ============================================
// Cloudburst Detection
// ============================================

/**
 * Detect cloudburst condition
 * Cloudburst: rate > 100 mm/hr
 * Confidence: high if pressure drop > 3 hPa/hour, medium otherwise
 */
export function detectCloudburst(
  rainfall: RainfallData | null,
  pressureDropRate: number // hPa per hour
): CloudburstDetection {
  if (!rainfall || rainfall.rate < CLOUDBURST_RAINFALL_THRESHOLD) {
    return {
      detected: false,
      confidence: 'low',
      rainfallRate: rainfall?.rate ?? 0,
      pressureDropRate,
    };
  }

  const confidence: CloudburstDetection['confidence'] =
    pressureDropRate > PRESSURE_DROP_HIGH_CONFIDENCE ? 'high' : 'medium';

  return {
    detected: true,
    confidence,
    rainfallRate: rainfall.rate,
    pressureDropRate,
  };
}

/**
 * Calculate pressure drop rate from historical data
 * @param pressureHistory Array of pressure readings [oldest, ..., newest]
 * @param timeSpanHours Time span of the history in hours
 */
export function calculatePressureDropRate(
  pressureHistory: number[],
  timeSpanHours: number
): number {
  if (pressureHistory.length < 2 || timeSpanHours <= 0) {
    return 0;
  }

  const oldest = pressureHistory[0];
  const newest = pressureHistory[pressureHistory.length - 1];
  const drop = oldest - newest; // Positive means pressure is dropping

  return drop / timeSpanHours;
}

// ============================================
// Alert Level Determination
// ============================================

/**
 * Determine alert level from probability
 */
export function getAlertLevel(probability: number): AlertLevel {
  if (probability < 25) return 'normal';
  if (probability < 50) return 'elevated';
  if (probability < 75) return 'high';
  return 'critical';
}

/**
 * Check if probability warrants aerial deployment
 * Trigger: probability >= 50% for specified duration
 */
export function shouldDeployAerial(
  probability: number,
  durationAboveThreshold: number, // seconds
  windSpeed: number,
  isAerialAlreadyDeployed: boolean
): { shouldDeploy: boolean; reason: string | null } {
  if (isAerialAlreadyDeployed) {
    return { shouldDeploy: false, reason: 'Aerial already deployed' };
  }

  if (probability < 50) {
    return { shouldDeploy: false, reason: 'Probability below threshold' };
  }

  if (durationAboveThreshold < 30) {
    return {
      shouldDeploy: false,
      reason: `Need ${30 - durationAboveThreshold}s more above threshold`,
    };
  }

  if (windSpeed >= 15) {
    return { shouldDeploy: false, reason: 'Wind speed too high for safe launch' };
  }

  return { shouldDeploy: true, reason: null };
}

// ============================================
// Utility Functions
// ============================================

/**
 * Format probability for display
 */
export function formatProbability(probability: number): string {
  return `${Math.round(probability)}%`;
}

/**
 * Format confidence for display
 */
export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Get prediction source label
 */
export function getPredictionSourceLabel(source: PredictionSource): string {
  switch (source) {
    case 'ground':
      return 'G';
    case 'ground+aerial':
      return 'G+A';
    case 'unavailable':
      return 'N/A';
  }
}

/**
 * Calculate trend from historical data
 * Returns: 'increasing', 'decreasing', 'stable'
 */
export function calculateTrend(
  history: number[],
  threshold: number = 5
): 'increasing' | 'decreasing' | 'stable' {
  if (history.length < 2) return 'stable';

  const recent = history.slice(-3);
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const oldest = history[0];

  const change = avg - oldest;

  if (change > threshold) return 'increasing';
  if (change < -threshold) return 'decreasing';
  return 'stable';
}
