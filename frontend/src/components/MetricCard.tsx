import React from 'react';
import { Users, UserCheck, Building2, User, CalendarCheck, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { MetricData } from '../types';
import './MetricCard.css';

interface MetricCardProps {
  data: MetricData;
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({ data, onClick }) => {
  const getIcon = () => {
    switch (data.type) {
      case 'workers':
        return <Users size={22} />;
      case 'agents':
        return <UserCheck size={22} />;
      case 'sites':
        return <Building2 size={22} />;
      case 'active':
        return <User size={22} />;
      case 'attendance':
        return <CalendarCheck size={22} />;
      default:
        return <Users size={22} />;
    }
  };

  return (
    <div
      className={`metric-card metric-card-${data.type}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      title={onClick ? `Click to view ${data.title} page` : undefined}
    >
      <div className="metric-icon-box">
        {getIcon()}
      </div>
      <div className="metric-details">
        <span className="metric-value">{data.value}</span>
        <span className="metric-title">{data.title}</span>
        <div className={`metric-change ${data.isPositive ? 'positive' : 'negative'}`}>
          {data.isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          <span>{data.change}</span>
          <span className="comparison-text">{data.comparisonPeriod}</span>
        </div>
      </div>
    </div>
  );
};
