import React from 'react';
import type { LeaveRecord } from '../types';
import { UserAvatar } from './UserAvatar';
import './RecentLeavesTable.css';

interface RecentLeavesTableProps {
  leaves: LeaveRecord[];
  onViewAll?: () => void;
}

export const RecentLeavesTable: React.FC<RecentLeavesTableProps> = ({ leaves, onViewAll }) => {
  const getLeaveTypeBadgeClass = (type: string) => {
    switch (type) {
      case 'Casual Leave':
        return 'badge-casual';
      case 'Sick Leave':
        return 'badge-sick';
      case 'Earned Leave':
        return 'badge-earned';
      default:
        return 'badge-casual';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'badge-pending';
      case 'APPROVED':
        return 'badge-approved';
      case 'REJECTED':
        return 'badge-rejected';
      default:
        return 'badge-pending';
    }
  };

  return (
    <div className="dashboard-card recent-leaves-card">
      <div className="card-header">
        <h3 className="card-title">Recent Leaves</h3>
        <span className="card-action-link" onClick={onViewAll}>View All</span>
      </div>

      <div className="table-responsive">
        <table className="leaves-table">
          <thead>
            <tr>
              <th>Worker</th>
              <th>Leave Type</th>
              <th>From - To</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {leaves.map((leave) => (
              <tr key={leave.id}>
                <td>
                  <div className="worker-cell">
                    <UserAvatar src={leave.avatar} name={leave.workerName} />
                    <div className="worker-info">
                      <span className="worker-name">{leave.workerName}</span>
                      <span className="worker-id">Worker ID: {leave.workerId}</span>
                    </div>
                  </div>
                </td>
                <td>
                  <span className={`badge ${getLeaveTypeBadgeClass(leave.leaveType)}`}>
                    {leave.leaveType}
                  </span>
                </td>
                <td>
                  <span className="date-range-text">
                    {leave.fromDate} - {leave.toDate}
                  </span>
                </td>
                <td>
                  <span className={`badge ${getStatusBadgeClass(leave.status)}`}>
                    {leave.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
