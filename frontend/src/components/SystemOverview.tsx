import React from 'react';
import { Calendar, CreditCard, MessageSquare, Wallet, ArrowRight } from 'lucide-react';
import type { SystemOverviewItem } from '../types';
import './SystemOverview.css';

interface SystemOverviewProps {
  items: SystemOverviewItem[];
  onViewFullReport?: () => void;
}

export const SystemOverview: React.FC<SystemOverviewProps> = ({ items, onViewFullReport }) => {
  const getItemIcon = (iconType: string) => {
    switch (iconType) {
      case 'calendar':
        return <Calendar size={18} />;
      case 'credit-card':
        return <CreditCard size={18} />;
      case 'ticket':
        return <MessageSquare size={18} />;
      case 'wallet':
        return <Wallet size={18} />;
      default:
        return <Calendar size={18} />;
    }
  };

  return (
    <div className="dashboard-card system-overview-card">
      <div className="card-header">
        <h3 className="card-title">System Overview</h3>
      </div>

      <div className="system-overview-list">
        {items.map((item) => (
          <div key={item.id} className={`system-item color-${item.color}`}>
            <div className="system-item-left">
              <div className="system-icon-box">
                {getItemIcon(item.iconType)}
              </div>
              <span className="system-label">{item.label}</span>
            </div>
            <span className={`system-value ${item.isCurrency ? 'currency-val' : ''}`}>
              {item.value}
            </span>
          </div>
        ))}
      </div>

      <div className="system-footer-btn" onClick={onViewFullReport}>
        <span>View Full Report</span>
        <ArrowRight size={16} />
      </div>
    </div>
  );
};
