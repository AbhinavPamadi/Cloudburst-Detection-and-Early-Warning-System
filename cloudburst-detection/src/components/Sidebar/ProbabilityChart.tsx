'use client';

import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { TrendingUp, Clock } from 'lucide-react';
import type { SectorState } from '@/types/sector.types';
import { PROBABILITY_COLORS } from '@/utils/colorScale';

// ============================================
// Types
// ============================================

interface ProbabilityChartProps {
  sector: SectorState;
  height?: number;
}

interface ChartDataPoint {
  time: string;
  timestamp: number;
  probability: number;
  color: string;
}

// ============================================
// Helper Functions
// ============================================

function getColorForProbability(probability: number): string {
  if (probability >= 75) return PROBABILITY_COLORS.red;
  if (probability >= 50) return PROBABILITY_COLORS.orange;
  if (probability >= 25) return PROBABILITY_COLORS.yellow;
  return PROBABILITY_COLORS.green;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ============================================
// Custom Tooltip
// ============================================

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as ChartDataPoint;

  return (
    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400">{data.time}</div>
      <div className="flex items-center gap-2 mt-1">
        <div
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {data.probability.toFixed(1)}%
        </span>
      </div>
    </div>
  );
}

// ============================================
// Component
// ============================================

export function ProbabilityChart({ sector, height = 150 }: ProbabilityChartProps) {
  const chartData = useMemo<ChartDataPoint[]>(() => {
    if (!sector.historicalProbability?.length) {
      // Generate placeholder data if no history
      const now = Date.now();
      return Array.from({ length: 12 }, (_, i) => ({
        time: formatTime(now - (11 - i) * 5 * 60 * 1000),
        timestamp: now - (11 - i) * 5 * 60 * 1000,
        probability: sector.currentProbability,
        color: getColorForProbability(sector.currentProbability),
      }));
    }

    return sector.historicalProbability.map((point) => {
      const ts = typeof point.timestamp === 'string'
        ? new Date(point.timestamp).getTime()
        : point.timestamp;
      return {
        time: formatTime(ts),
        timestamp: ts,
        probability: point.probability,
        color: getColorForProbability(point.probability),
      };
    });
  }, [sector.historicalProbability, sector.currentProbability]);

  const trend = useMemo(() => {
    if (chartData.length < 2) return 0;
    const recent = chartData.slice(-3);
    const older = chartData.slice(0, 3);
    const recentAvg = recent.reduce((sum, p) => sum + p.probability, 0) / recent.length;
    const olderAvg = older.reduce((sum, p) => sum + p.probability, 0) / older.length;
    return recentAvg - olderAvg;
  }, [chartData]);

  const maxProbability = useMemo(() => {
    return Math.max(...chartData.map((d) => d.probability), 100);
  }, [chartData]);

  return (
    <section className="p-4 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Probability Trend
        </h3>
        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
          <Clock className="w-3 h-3" />
          <span>Last 1 hour</span>
        </div>
      </div>

      {/* Trend Indicator */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">Trend:</span>
        <span
          className={`text-xs font-medium ${
            trend > 5
              ? 'text-red-500'
              : trend < -5
              ? 'text-green-500'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {trend > 5 ? '↑ Increasing' : trend < -5 ? '↓ Decreasing' : '→ Stable'}
        </span>
      </div>

      {/* Chart */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <ComposedChart
            data={chartData}
            margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="probabilityGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={PROBABILITY_COLORS.orange} stopOpacity={0.3} />
                <stop offset="95%" stopColor={PROBABILITY_COLORS.orange} stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#e5e7eb"
              className="dark:stroke-gray-700"
              vertical={false}
            />

            <XAxis
              dataKey="time"
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
              className="text-gray-500 dark:text-gray-400"
            />

            <YAxis
              domain={[0, Math.ceil(maxProbability / 25) * 25]}
              tick={{ fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `${value}%`}
              className="text-gray-500 dark:text-gray-400"
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Threshold lines */}
            <ReferenceLine
              y={75}
              stroke={PROBABILITY_COLORS.red}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={50}
              stroke={PROBABILITY_COLORS.orange}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />
            <ReferenceLine
              y={25}
              stroke={PROBABILITY_COLORS.yellow}
              strokeDasharray="3 3"
              strokeOpacity={0.5}
            />

            {/* Area fill */}
            <Area
              type="monotone"
              dataKey="probability"
              fill="url(#probabilityGradient)"
              stroke="none"
            />

            {/* Main line */}
            <Line
              type="monotone"
              dataKey="probability"
              stroke={getColorForProbability(sector.currentProbability)}
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 4,
                fill: getColorForProbability(sector.currentProbability),
                stroke: '#fff',
                strokeWidth: 2,
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROBABILITY_COLORS.green }} />
          <span className="text-xs text-gray-500 dark:text-gray-400">0-25%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROBABILITY_COLORS.yellow }} />
          <span className="text-xs text-gray-500 dark:text-gray-400">26-50%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROBABILITY_COLORS.orange }} />
          <span className="text-xs text-gray-500 dark:text-gray-400">51-75%</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PROBABILITY_COLORS.red }} />
          <span className="text-xs text-gray-500 dark:text-gray-400">76-100%</span>
        </div>
      </div>
    </section>
  );
}

export default ProbabilityChart;
