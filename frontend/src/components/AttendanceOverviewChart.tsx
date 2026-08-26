import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import type { AttendanceDataPoint } from '../types';
import './AttendanceOverviewChart.css';

interface AttendanceOverviewChartProps {
  data: AttendanceDataPoint[];
}

export const AttendanceOverviewChart: React.FC<AttendanceOverviewChartProps> = ({ data }) => {
  const [timeRange, setTimeRange] = useState('7days');

  const formatYAxis = (tick: number) => {
    if (tick === 0) return '0';
    if (tick >= 1000) return `${tick / 1000}K`;
    return `${tick}`;
  };

  return (
    <div className="dashboard-card attendance-card">
      <div className="card-header">
        <h3 className="card-title">Attendance Overview</h3>
        <select
          className="select-dropdown"
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
        >
          <option value="7days">Last 7 Days</option>
          <option value="14days">Last 14 Days</option>
          <option value="30days">Last 30 Days</option>
        </select>
      </div>

      <div className="chart-legend-row">
        <div className="legend-item">
          <span className="legend-indicator present"></span>
          <span className="legend-label">Present</span>
        </div>
        <div className="legend-item">
          <span className="legend-indicator absent"></span>
          <span className="legend-label">Absent</span>
        </div>
      </div>

      <div className="attendance-chart-container">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="presentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94A3B8' }}
              dy={10}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94A3B8' }}
              tickFormatter={formatYAxis}
              domain={[0, 1500]}
              ticks={[0, 300, 600, 900, 1200, 1500]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1E293B',
                border: 'none',
                borderRadius: '8px',
                color: '#FFF',
                fontSize: '12px'
              }}
              itemStyle={{ color: '#FFF' }}
            />
            <Area
              type="monotone"
              dataKey="present"
              stroke="#3B82F6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#presentGradient)"
              dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#FFF' }}
              activeDot={{ r: 6, fill: '#2563EB', strokeWidth: 2, stroke: '#FFF' }}
            />
            <Line
              type="monotone"
              dataKey="absent"
              stroke="#F87171"
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#F87171', strokeWidth: 2, stroke: '#FFF' }}
              activeDot={{ r: 6, fill: '#EF4444', strokeWidth: 2, stroke: '#FFF' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
