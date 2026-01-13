/**
 * Cloudburst Prediction Model
 * 
 * Calculates the probability of a cloudburst occurring based on
 * meteorological parameters from sensor data.
 * 
 * Factors considered:
 * - Humidity: High humidity (>80%) increases risk
 * - Pressure: Sudden drops indicate storm formation
 * - Wind Speed: High wind speeds can indicate severe weather
 * - Temperature: Temperature changes indicate atmospheric instability
 * - Rainfall: Current rainfall intensity
 */

/**
 * Calculate cloudburst prediction probability
 * @param {Object} currentData - Current sensor readings
 * @param {number} currentData.temperature - Temperature in Celsius
 * @param {number} currentData.pressure - Atmospheric pressure in hPa
 * @param {number} currentData.humidity - Humidity percentage (0-100)
 * @param {number} currentData.windSpeed - Wind speed in km/h
 * @param {number} currentData.rainfall - Rainfall in mm/hr (optional)
 * @param {Array} historicalData - Array of historical data points (optional, for trend analysis)
 * @returns {Object} Prediction result with probability and risk level
 */
export function calculateCloudburstProbability(currentData, historicalData = []) {
  // Default values if data is missing
  const temp = currentData.temperature ?? 25;
  const pressure = currentData.pressure ?? 1013.25;
  const humidity = currentData.humidity ?? 50;
  const windSpeed = currentData.windSpeed ?? 0;
  const rainfall = currentData.rainfall ?? 0;

  let score = 0;
  const factors = {};

  // Factor 1: Humidity (0-30 points)
  // High humidity (>80%) significantly increases cloudburst risk
  if (humidity >= 90) {
    factors.humidity = 30;
  } else if (humidity >= 80) {
    factors.humidity = 25;
  } else if (humidity >= 70) {
    factors.humidity = 15;
  } else if (humidity >= 60) {
    factors.humidity = 8;
  } else {
    factors.humidity = Math.max(0, (humidity - 40) * 0.2);
  }
  score += factors.humidity;

  // Factor 2: Pressure Drop (0-25 points)
  // Low pressure (<1000 hPa) or rapid pressure drop indicates storm
  let pressureScore = 0;
  if (pressure < 990) {
    pressureScore = 25;
  } else if (pressure < 1000) {
    pressureScore = 20;
  } else if (pressure < 1010) {
    pressureScore = 10;
  } else {
    // Check for pressure drop trend if historical data available
    if (historicalData.length >= 2) {
      const recent = historicalData.slice(-5); // Last 5 data points
      const pressures = recent
        .map(d => d.pressure)
        .filter(p => p !== undefined && p !== null);
      
      if (pressures.length >= 2) {
        const avgRecent = pressures.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, pressures.length);
        const avgEarlier = pressures.slice(0, -3).reduce((a, b) => a + b, 0) / Math.max(1, pressures.length - 3);
        const drop = avgEarlier - avgRecent;
        
        if (drop > 10) {
          pressureScore = 20; // Rapid drop
        } else if (drop > 5) {
          pressureScore = 12; // Moderate drop
        } else if (drop > 2) {
          pressureScore = 5; // Slight drop
        }
      }
    }
    
    // Base pressure score
    if (pressure < 1013) {
      pressureScore = Math.max(pressureScore, 5);
    }
  }
  factors.pressure = pressureScore;
  score += pressureScore;

  // Factor 3: Wind Speed (0-20 points)
  // High wind speeds can indicate severe weather conditions
  if (windSpeed >= 25) {
    factors.windSpeed = 20;
  } else if (windSpeed >= 20) {
    factors.windSpeed = 15;
  } else if (windSpeed >= 15) {
    factors.windSpeed = 10;
  } else if (windSpeed >= 10) {
    factors.windSpeed = 5;
  } else {
    factors.windSpeed = windSpeed * 0.3;
  }
  score += factors.windSpeed;

  // Factor 4: Temperature Instability (0-15 points)
  // Temperature changes indicate atmospheric instability
  let tempScore = 0;
  if (historicalData.length >= 2) {
    const recent = historicalData.slice(-5);
    const temps = recent
      .map(d => d.temperature)
      .filter(t => t !== undefined && t !== null);
    
    if (temps.length >= 2) {
      const tempVariance = calculateVariance(temps);
      if (tempVariance > 5) {
        tempScore = 15; // High variance
      } else if (tempVariance > 3) {
        tempScore = 10; // Moderate variance
      } else if (tempVariance > 1.5) {
        tempScore = 5; // Low variance
      }
    }
  }
  
  // Also consider current temperature (very high temps can indicate instability)
  if (temp > 35) {
    tempScore = Math.max(tempScore, 8);
  } else if (temp > 30) {
    tempScore = Math.max(tempScore, 5);
  }
  factors.temperature = tempScore;
  score += tempScore;

  // Factor 5: Rainfall (0-10 points)
  // Current rainfall intensity
  if (rainfall > 50) {
    factors.rainfall = 10;
  } else if (rainfall > 30) {
    factors.rainfall = 7;
  } else if (rainfall > 15) {
    factors.rainfall = 4;
  } else if (rainfall > 5) {
    factors.rainfall = 2;
  } else {
    factors.rainfall = 0;
  }
  score += factors.rainfall;

  // Normalize score to 0-100% probability
  // Maximum possible score is 100 (30+25+20+15+10)
  const probability = Math.min(100, Math.max(0, score));

  // Determine risk level
  let riskLevel = 'low';
  let riskColor = 'green';
  if (probability >= 70) {
    riskLevel = 'critical';
    riskColor = 'red';
  } else if (probability >= 50) {
    riskLevel = 'high';
    riskColor = 'orange';
  } else if (probability >= 30) {
    riskLevel = 'moderate';
    riskColor = 'yellow';
  }

  return {
    probability: Math.round(probability * 10) / 10, // Round to 1 decimal
    riskLevel,
    riskColor,
    factors,
    willOccur: probability >= 50, // Threshold for cloudburst occurrence
  };
}

/**
 * Calculate variance of an array of numbers
 */
function calculateVariance(values) {
  if (values.length === 0) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const squaredDiffs = values.map(value => Math.pow(value - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(variance); // Return standard deviation
}

/**
 * Get risk level description
 */
export function getRiskDescription(riskLevel) {
  const descriptions = {
    low: 'Low Risk',
    moderate: 'Moderate Risk',
    high: 'High Risk',
    critical: 'Critical Risk',
  };
  return descriptions[riskLevel] || 'Unknown';
}

