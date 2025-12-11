// src/app/api/predict/manual/route.js
import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      temperature,
      humidity,
      precipitationRate,
      tcwv,
      cape,
      pressure,
      windSpeed,
      windDirection,
    } = body;

    // Validate required fields
    if (
      temperature === undefined ||
      humidity === undefined ||
      precipitationRate === undefined ||
      tcwv === undefined ||
      cape === undefined ||
      pressure === undefined ||
      windSpeed === undefined ||
      windDirection === undefined
    ) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    // Convert to numbers
    const params = {
      temperature: parseFloat(temperature),
      humidity: parseFloat(humidity),
      precipitationRate: parseFloat(precipitationRate),
      tcwv: parseFloat(tcwv),
      cape: parseFloat(cape),
      pressure: parseFloat(pressure),
      windSpeed: parseFloat(windSpeed),
      windDirection: parseFloat(windDirection),
    };

    // Validate numeric values
    if (
      Object.values(params).some(
        (val) => isNaN(val) || val < 0 || (val === params.humidity && val > 100) || (val === params.windDirection && val > 360)
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid parameter values' },
        { status: 400 }
      );
    }

    // TODO: Load and use your actual XGBoost model here
    // For now, we'll use a rule-based prediction as a placeholder
    // Replace this section with your actual model prediction
    
    // Example: Load model (uncomment when you have the model ready)
    /*
    const modelPath = path.join(process.cwd(), 'cloudburst_xgb_model.pkl');
    let model;
    try {
      // Load your model here using appropriate library (e.g., python-shell, or convert to JS)
      // This is a placeholder - you'll need to implement actual model loading
      model = await loadModel(modelPath);
    } catch (err) {
      console.error('Model loading error:', err);
      return NextResponse.json(
        { error: 'Model not available. Please ensure the model file is present.' },
        { status: 500 }
      );
    }

    // Prepare features for model (adjust based on your model's expected input)
    const features = [
      params.temperature,
      params.humidity,
      params.precipitationRate,
      params.tcwv,
      params.cape,
      params.pressure,
      params.windSpeed,
      params.windDirection,
    ];

    // Make prediction
    const prediction = model.predict([features]);
    const probability = prediction[0]; // Adjust based on your model output
    */

    // Placeholder prediction logic (replace with actual model)
    // This uses a simple rule-based approach for demonstration
    let probability = 0;
    
    // High precipitation rate increases probability
    if (params.precipitationRate > 50) {
      probability += 0.3;
    } else if (params.precipitationRate > 20) {
      probability += 0.15;
    }

    // High CAPE (convective energy) increases probability
    if (params.cape > 2000) {
      probability += 0.25;
    } else if (params.cape > 1000) {
      probability += 0.1;
    }

    // High TCWV (moisture) increases probability
    if (params.tcwv > 50) {
      probability += 0.2;
    } else if (params.tcwv > 30) {
      probability += 0.1;
    }

    // High humidity increases probability
    if (params.humidity > 80) {
      probability += 0.15;
    } else if (params.humidity > 60) {
      probability += 0.05;
    }

    // Low pressure (storm conditions) increases probability
    if (params.pressure < 1000) {
      probability += 0.1;
    } else if (params.pressure < 1010) {
      probability += 0.05;
    }

    // Normalize probability to 0-1 range
    probability = Math.min(probability, 1.0);
    probability = Math.max(probability, 0.0);

    // Add some randomness for demonstration (remove when using actual model)
    probability = probability + (Math.random() * 0.1 - 0.05);
    probability = Math.min(Math.max(probability, 0), 1);

    // Determine if cloudburst (threshold at 0.5)
    const isCloudburst = probability >= 0.5;

    // Calculate confidence (higher when probability is more extreme)
    const confidence = Math.abs(probability - 0.5) * 2;

    return NextResponse.json({
      success: true,
      isCloudburst,
      probability,
      confidence,
      timestamp: new Date().toISOString(),
      parameters: params,
    });
  } catch (error) {
    console.error('Manual prediction error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate prediction',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

