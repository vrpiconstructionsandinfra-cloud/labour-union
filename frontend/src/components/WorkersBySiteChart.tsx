import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import type { SiteWorkerDistribution } from '../types';
import './WorkersBySiteChart.css';

interface WorkersBySiteChartProps {
  data: SiteWorkerDistribution[];
  onViewAll?: () => void;
}

export const WorkersBySiteChart: React.FC<WorkersBySiteChartProps> = ({ data, onViewAll }) => {
  const totalWorkers = (data || []).reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="dashboard-card site-workers-card">
      <div className="card-header">
        <h3 className="card-title">Workers By Site</h3>
        <span className="card-action-link" onClick={onViewAll}>View All</span>
      </div>

      <div className="site-chart-content">
        <div className="donut-wrapper">
          <ResponsiveContainer width={170} height={170}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                paddingAngle={3}
                dataKey="count"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any, _name: any, props: any) => [
                  `${value.toLocaleString()} (${props.payload.percentage}%)`,
                  props.payload.name
                ]}
                contentStyle={{
                  backgroundColor: '#1E293B',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#FFF',
                  fontSize: '12px'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="donut-center-label">
            <span className="center-number">{totalWorkers.toLocaleString()}</span>
            <span className="center-text">Total</span>
          </div>
        </div>

        <div className="site-legend-list">
          {data.map((item, index) => (
            <div className="site-legend-item" key={index}>
              <div className="legend-name-group">
                <span className="color-dot" style={{ backgroundColor: item.color }}></span>
                <span className="site-name">{item.name}</span>
              </div>
              <div className="site-count-group">
                <span className="site-count">{item.count.toLocaleString()}</span>
                <span className="site-percentage">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
