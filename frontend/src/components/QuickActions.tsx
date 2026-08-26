import React from 'react';
import { Home, UserPlus, Users, CalendarCheck, BarChart3, ChevronRight } from 'lucide-react';
import type { QuickActionItem } from '../types';
import './QuickActions.css';

interface QuickActionsProps {
  actions: QuickActionItem[];
  onActionClick: (actionKey: string) => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({ actions, onActionClick }) => {
  const getActionIcon = (iconType: string) => {
    switch (iconType) {
      case 'site':
        return <Home size={18} />;
      case 'agent':
        return <UserPlus size={18} />;
      case 'worker':
        return <Users size={18} />;
      case 'attendance':
        return <CalendarCheck size={18} />;
      case 'report':
        return <BarChart3 size={18} />;
      default:
        return <Home size={18} />;
    }
  };

  return (
    <div className="dashboard-card quick-actions-card">
      <div className="card-header">
        <h3 className="card-title">Quick Actions</h3>
      </div>

      <div className="quick-actions-list">
        {actions.map((action) => (
          <button
            key={action.id}
            className={`action-row-btn action-${action.iconType}`}
            onClick={() => onActionClick(action.actionKey)}
          >
            <div className="action-row-left">
              <div className="action-icon-circle">
                {getActionIcon(action.iconType)}
              </div>
              <div className="action-text-group">
                <span className="action-title-text">{action.title}</span>
                <span className="action-desc-text">{action.description}</span>
              </div>
            </div>
            <ChevronRight size={16} className="action-chevron" />
          </button>
        ))}
      </div>
    </div>
  );
};
