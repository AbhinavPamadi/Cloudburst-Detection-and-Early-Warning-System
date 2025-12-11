# Manual Prediction Model Integration Guide

## Overview

The manual prediction feature allows users to input weather parameters and get a cloudburst prediction. Currently, it uses a rule-based placeholder prediction. This guide explains how to integrate your actual XGBoost model.

## Current Implementation

The API endpoint is located at: `src/app/api/predict/manual/route.js`

Currently, it uses a simple rule-based prediction as a placeholder. You need to replace this with your actual model.

## Model Integration Steps

### Option 1: Using Python via API (Recommended)

Since XGBoost models are typically Python-based, you can create a Python service:

1. **Create a Python prediction service** (`predict_service.py`):

```python
import pickle
import numpy as np
from pathlib import Path

# Load your model
model_path = Path(__file__).parent / 'cloudburst_xgb_model.pkl'
with open(model_path, 'rb') as f:
    model = pickle.load(f)

def predict_cloudburst(params):
    """
    Predict cloudburst probability from weather parameters
    
    Args:
        params: dict with keys:
            - temperature (float): Temperature in °C
            - humidity (float): Humidity in %
            - precipitationRate (float): Precipitation rate in mm/hr
            - tcwv (float): Total Column Water Vapor in kg/m²
            - cape (float): CAPE in J/kg
            - pressure (float): Atmospheric pressure in hPa
            - windSpeed (float): Wind speed in km/h
            - windDirection (float): Wind direction in degrees
    
    Returns:
        dict with:
            - probability (float): Cloudburst probability (0-1)
            - isCloudburst (bool): True if probability >= 0.5
            - confidence (float): Model confidence
    """
    # Prepare feature array (adjust order based on your model's training)
    features = np.array([[
        params['temperature'],
        params['humidity'],
        params['precipitationRate'],
        params['tcwv'],
        params['cape'],
        params['pressure'],
        params['windSpeed'],
        params['windDirection'],
    ]])
    
    # Make prediction
    probability = model.predict_proba(features)[0][1]  # Probability of class 1 (cloudburst)
    
    # Calculate confidence (distance from 0.5)
    confidence = abs(probability - 0.5) * 2
    
    return {
        'probability': float(probability),
        'isCloudburst': probability >= 0.5,
        'confidence': float(confidence)
    }
```

2. **Create a Flask/FastAPI service** or use `python-shell` in Node.js:

```javascript
// In route.js
import { PythonShell } from 'python-shell';

export async function POST(request) {
  const params = await request.json();
  
  // Call Python script
  const options = {
    mode: 'json',
    pythonPath: 'python3', // or 'python'
    scriptPath: path.join(process.cwd(), 'scripts'),
    args: [JSON.stringify(params)]
  };
  
  const results = await PythonShell.run('predict.py', options);
  const prediction = results[0];
  
  return NextResponse.json({
    success: true,
    ...prediction,
    timestamp: new Date().toISOString(),
    parameters: params,
  });
}
```

### Option 2: Convert Model to JavaScript

Use libraries like:
- `@tensorflow/tfjs` - If you convert to TensorFlow.js
- `ml-xgboost` - JavaScript XGBoost implementation (may have limitations)

### Option 3: Use a Separate Prediction Service

Deploy your model as a separate microservice (Flask/FastAPI) and call it from the Next.js API:

```javascript
export async function POST(request) {
  const params = await request.json();
  
  const response = await fetch('http://your-prediction-service:5000/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  
  const prediction = await response.json();
  return NextResponse.json(prediction);
}
```

## Expected Input Format

The API expects these parameters:

```json
{
  "temperature": 25.5,        // °C
  "humidity": 75.0,           // %
  "precipitationRate": 15.5,   // mm/hr
  "tcwv": 45.2,               // kg/m²
  "cape": 2500.0,             // J/kg
  "pressure": 1013.25,         // hPa
  "windSpeed": 25.5,           // km/h
  "windDirection": 180.0       // degrees (0=N, 90=E, 180=S, 270=W)
}
```

## Expected Output Format

The API should return:

```json
{
  "success": true,
  "isCloudburst": false,
  "probability": 0.35,
  "confidence": 0.7,
  "timestamp": "2025-12-10T12:00:00.000Z",
  "parameters": { /* input parameters */ }
}
```

## Feature Mapping

If your model was trained with different feature names, map them accordingly:

| Input Parameter | Possible Model Feature Names |
|----------------|------------------------------|
| temperature | `temp`, `temperature`, `temp_avg` |
| humidity | `humidity`, `humidity_avg`, `rh` |
| precipitationRate | `rainfall`, `precipitation`, `precip_rate` |
| tcwv | `tcwv`, `total_column_water_vapor` |
| cape | `cape`, `convective_available_potential_energy` |
| pressure | `pressure`, `pressure_avg`, `atmospheric_pressure` |
| windSpeed | `wind_speed`, `wind_gust_speed` |
| windDirection | `wind_direction`, `wind_dir` |

## Testing

After integration, test with various inputs:

1. **High risk scenario**: High precipitation, high CAPE, high humidity
2. **Low risk scenario**: Low precipitation, low CAPE, normal conditions
3. **Edge cases**: Extreme values, boundary conditions

## Notes

- The current placeholder uses simple rules and should be replaced
- Ensure your model handles all input ranges appropriately
- Consider adding input validation and normalization if your model requires it
- Add error handling for model loading failures
- Consider caching model predictions for identical inputs

## Security Considerations

- Validate all inputs before passing to model
- Sanitize inputs to prevent injection attacks
- Rate limit the prediction endpoint
- Consider authentication for production use

