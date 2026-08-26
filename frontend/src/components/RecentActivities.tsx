import React from 'react';
import { UserPlus, CalendarCheck, FileCheck, CreditCard, ShieldCheck, Wallet } from 'lucide-react';
import type { ActivityItem } from '../types';
import './RecentActivities.css';

interface RecentActivitiesProps {
  activities: ActivityItem[];
}

export const RecentActivities: React.FC<RecentActivitiesProps> = ({ activities }) => {
  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'worker_joined':
        return <UserPlus size={16} />;
      case 'attendance_marked':
        return <CalendarCheck size={16} />;
      case 'leave_approved':
        return <FileCheck size={16} />;
      case 'payroll_generated':
        return <CreditCard size={16} />;
      case 'insurance_added':
        return <ShieldCheck size={16} />;
      case 'wallet_updated':
        return <Wallet size={16} />;
      default:
        return <UserPlus size={16} />;
    }
  };

  return (
    <div className="dashboard-card recent-activities-card">
      <div className="card-header">
        <h3 className="card-title">Recent Activities</h3>
        <span className="activity-badge-count">{activities.length} New</span>
      </div>

      <div className="activities-stream">
        {activities.map((item) => (
          <div key={item.id} className="activity-stream-item">
            <div
              className="activity-icon-wrap"
              style={{ backgroundColor: `${item.iconColor}15`, color: item.iconColor }}
            >
              {getActivityIcon(item.type)}
            </div>
            <div className="activity-details">
              <div className="activity-title-row">
                <span className="activity-title">{item.title}</span>
                <span className="activity-time">{item.timestamp}</span>
              </div>
              <p className="activity-desc">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
