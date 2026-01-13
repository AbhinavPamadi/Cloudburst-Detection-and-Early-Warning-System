'use client';

import { AlertCircle, Shield, Users, Zap } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            About Cloudburst Detection System
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
            A real-time monitoring and prediction system designed to detect and alert communities about potential cloudbursts and extreme weather events.
          </p>
        </div>

        {/* Mission Statement */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-12">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Mission</h2>
          <p className="text-lg text-gray-700 dark:text-gray-200 leading-relaxed">
            Our mission is to leverage advanced technology and machine learning to provide early warning systems for extreme weather events, particularly cloudbursts. By analyzing real-time meteorological data, we aim to protect lives and property by giving communities crucial time to prepare and respond to potentially dangerous weather conditions.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-12">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-center mb-4">
              <Zap className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Real-Time Monitoring
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Continuous monitoring of weather conditions using distributed sensor nodes and advanced analytics to detect anomalies instantly.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Predictive Analysis
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Machine learning models trained on historical weather data to predict cloudburst events with high accuracy before they occur.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-center mb-4">
              <Users className="h-12 w-12 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3 text-center">
              Community Alerts
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              Instant notifications to registered contacts and authorities to ensure rapid response and community safety during critical events.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

