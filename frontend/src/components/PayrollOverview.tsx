import React from 'react';
import { ArrowRight } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { PayrollData } from '../types';
import './PayrollOverview.css';

interface PayrollOverviewProps {
  data: PayrollData;
  onGoToPayroll?: () => void;
  onViewAll?: () => void;
}

export const PayrollOverview: React.FC<PayrollOverviewProps> = ({
  data,
  onGoToPayroll,
  onViewAll
}) => {
  const chartData = [
    { name: 'Paid', value: data.percentagePaid, color: '#2563EB' },
    { name: 'Remaining', value: 100 - data.percentagePaid, color: '#E2E8F0' }
  ];

  const formatCurrency = (val: number) => {
    return `₹ ${val.toLocaleString('en-IN')}`;
  };

  return (
    <div className="dashboard-card payroll-card">
      <div className="card-header">
        <h3 className="card-title">Payroll Overview</h3>
        <span className="card-action-link" onClick={onViewAll}>View All</span>
      </div>

      <div className="payroll-content">
        <div className="payroll-gauge-wrapper">
          <ResponsiveContainer width={140} height={140}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={62}
                startAngle={220}
                endAngle={-40}
                dataKey="value"
                stroke="none"
                cornerRadius={6}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="gauge-center-label">
            <span className="gauge-percentage">{data.percentagePaid}%</span>
            <span className="gauge-subtext">Paid</span>
          </div>
        </div>

        <div className="payroll-stats">
          <div className="stat-group">
            <span className="stat-label">Total Payroll</span>
            <span className="stat-amount total">{formatCurrency(data.total)}</span>
          </div>
          <div className="stat-group">
            <span className="stat-label">Paid Amount</span>
            <span className="stat-amount paid">{formatCurrency(data.paid)}</span>
          </div>
          <div className="stat-group">
            <span className="stat-label">Pending Amount</span>
            <span className="stat-amount pending">{formatCurrency(data.pending)}</span>
          </div>
        </div>
      </div>

      <div className="payroll-footer-btn" onClick={onGoToPayroll}>
        <span>Go to Payroll</span>
        <ArrowRight size={16} />
      </div>
    </div>
  );
};
