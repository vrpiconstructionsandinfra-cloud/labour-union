import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, RotateCw, Plus, Calendar } from 'lucide-react';
import { fetchLeavesApi, fetchMyLeavesApi, approveLeaveApi, rejectLeaveApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import type { LeaveRecord } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import './Pages.css';

interface LeavePageProps {
  onOpenModal?: (type: string) => void;
  refreshTrigger?: number;
  isMyLeavesOnly?: boolean;
}

export const LeavePage: React.FC<LeavePageProps> = ({ onOpenModal, refreshTrigger, isMyLeavesOnly }) => {
  const { role } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Date Navigation & Range Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');

  const isAgentOrSuperAdmin = !isMyLeavesOnly && (role === 'SUPER_AGENT' || role === 'AGENT');

  const loadLeaves = () => {
    if (isMyLeavesOnly) {
      fetchMyLeavesApi().then(setLeaves).catch(() => {});
    } else if (isAgentOrSuperAdmin) {
      fetchLeavesApi().then(setLeaves).catch(() => {});
    } else {
      fetchMyLeavesApi().then(setLeaves).catch(() => {});
    }
  };

  useEffect(() => {
    loadLeaves();

    const socket = getSocket();
    const handleLeaveUpdated = () => {
      loadLeaves();
    };

    socket.on('leave:updated', handleLeaveUpdated);
    socket.on('notification', handleLeaveUpdated);

    return () => {
      socket.off('leave:updated', handleLeaveUpdated);
      socket.off('notification', handleLeaveUpdated);
    };
  }, [refreshTrigger, role, isMyLeavesOnly]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    loadLeaves();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleSelectPreset = (preset: 'ALL' | 'TODAY' | 'THIS_MONTH') => {
    setActivePreset(preset);
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    if (preset === 'ALL') {
      setFilterStartDate('');
      setFilterEndDate('');
    } else if (preset === 'TODAY') {
      setFilterStartDate(todayStr);
      setFilterEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const year = now.getFullYear();
      const month = now.getMonth();
      const firstDay = new Date(year, month, 1).toISOString().split('T')[0];
      const lastDay = new Date(year, month + 1, 0).getDate();
      const lastDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      setFilterStartDate(firstDay);
      setFilterEndDate(lastDayStr);
    }
  };

  const handleApprove = async (leaveId: string) => {
    setActionLoadingId(leaveId);
    try {
      await approveLeaveApi(leaveId);
      loadLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to approve leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leaveId: string) => {
    setActionLoadingId(leaveId);
    try {
      await rejectLeaveApi(leaveId);
      loadLeaves();
    } catch (err: any) {
      alert(err.message || 'Failed to reject leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredLeaves = leaves.filter((leave) => {
    // Super Agents manage Field Agent & Customer Support Agent leave applications
    if (!isMyLeavesOnly && role === 'SUPER_AGENT' && leave.workerRole && !['AGENT', 'CUSTOMER_SUPPORT'].includes(leave.workerRole)) {
      return false;
    }

    if (!filterStartDate && !filterEndDate) return true;

    try {
      const leaveFrom = leave.fromDate ? new Date(leave.fromDate).toISOString().split('T')[0] : '';
      const leaveTo = leave.toDate ? new Date(leave.toDate).toISOString().split('T')[0] : leaveFrom;

      if (filterStartDate && leaveTo < filterStartDate) return false;
      if (filterEndDate && leaveFrom > filterEndDate) return false;
    } catch {
      return true;
    }

    return true;
  });

  const pendingCount = filteredLeaves.filter((l) => l.status === 'PENDING').length;
  const approvedCount = filteredLeaves.filter((l) => l.status === 'APPROVED').length;
  const rejectedCount = filteredLeaves.filter((l) => l.status === 'REJECTED').length;

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>{isMyLeavesOnly ? 'My Leave Applications' : 'Leave Management'}</h2>
          <p>
            {isMyLeavesOnly
              ? 'View your submitted leave requests and application status.'
              : role === 'SUPER_AGENT'
              ? 'Review and approve/reject leave requests submitted by Agents & Support Staff.'
              : role === 'AGENT'
              ? 'Review and approve/reject all worker leave requests across system sites.'
              : 'View your applied leaves and application status.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {onOpenModal && (
            <button
              className="primary-btn"
              onClick={() => onOpenModal('apply_leave')}
            >
              <Plus size={16} />
              <span>Apply Leave</span>
            </button>
          )}
          <button
            className="secondary-btn"
            title="Refresh Data"
            aria-label="Refresh Data"
            disabled={isRefreshing}
            onClick={handleManualRefresh}
            style={{ padding: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <RotateCw size={16} className={isRefreshing ? 'spinner' : ''} />
          </button>
        </div>
      </div>

      <div className="stats-row-3">
        <div className="stat-box-card border-amber">
          <div className="stat-header">
            <span>Pending Approvals</span>
            <Clock size={18} className="text-amber" />
          </div>
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-sub">{isAgentOrSuperAdmin ? 'Requires Agent Action' : 'Awaiting Review'}</span>
        </div>
        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Approved Leaves</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">{approvedCount}</span>
          <span className="stat-sub">Paid Leave Granted</span>
        </div>
        <div className="stat-box-card border-red">
          <div className="stat-header">
            <span>Rejected Requests</span>
            <XCircle size={18} className="text-red" />
          </div>
          <span className="stat-number">{rejectedCount}</span>
          <span className="stat-sub">Leave Rejected</span>
        </div>
      </div>

      <div className="table-card mt-24">
        <div className="card-header border-b" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', padding: '16px 20px' }}>
          <h3 className="card-title" style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
            {role === 'AGENT'
              ? 'Leave Applications for Assigned Workers'
              : role === 'SUPER_AGENT'
              ? 'Agent Leave Applications'
              : 'My Leave Applications'}
          </h3>

          {/* Date Navigation & Range Filter Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', backgroundColor: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'ALL' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'ALL' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'ALL' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                All Dates
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('TODAY')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'TODAY' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'TODAY' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'TODAY' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => handleSelectPreset('THIS_MONTH')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '11.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'THIS_MONTH' ? '#FFFFFF' : 'transparent',
                  color: activePreset === 'THIS_MONTH' ? '#2563EB' : '#64748B',
                  boxShadow: activePreset === 'THIS_MONTH' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                This Month
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#FFFFFF', padding: '4px 8px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <Calendar size={14} color="#64748B" />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B' }}>From:</span>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value);
                  setActivePreset('CUSTOM');
                }}
                style={{ border: 'none', outline: 'none', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', marginLeft: '4px' }}>To:</span>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value);
                  setActivePreset('CUSTOM');
                }}
                style={{ border: 'none', outline: 'none', fontSize: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}
              />
            </div>

            {(filterStartDate || filterEndDate) && (
              <button
                type="button"
                onClick={() => handleSelectPreset('ALL')}
                style={{
                  backgroundColor: '#FEF2F2',
                  color: '#EF4444',
                  border: '1px solid #FCA5A5',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '11px',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Clear Filter
              </button>
            )}
          </div>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Leave Type</th>
                <th>From Date</th>
                <th>To Date</th>
                <th>Reason</th>
                <th>Status</th>
                {isAgentOrSuperAdmin && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredLeaves.length > 0 ? (
                filteredLeaves.map((leave) => (
                  <tr key={leave.id}>
                    <td>
                      <div className="table-user-cell">
                        <UserAvatar src={leave.avatar} name={leave.workerName} />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="user-name-bold">{leave.workerName || 'Worker'}</span>
                            {leave.workerRole === 'AGENT' && (
                              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(124, 58, 237, 0.15)', color: '#7C3AED' }}>
                                AGENT
                              </span>
                            )}
                          </div>
                          <span className="user-sub-email">ID: {leave.workerId}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-casual">{leave.leaveType || 'Casual Leave'}</span></td>
                    <td>{leave.fromDate}</td>
                    <td>{leave.toDate}</td>
                    <td>{leave.reason || 'Family leave request'}</td>
                    <td>
                      <span className={`badge ${
                        leave.status === 'APPROVED' ? 'badge-approved' : leave.status === 'REJECTED' ? 'badge-rejected' : 'badge-pending'
                      }`}>
                        {leave.status}
                      </span>
                    </td>
                    {isAgentOrSuperAdmin && (
                      <td>
                        {leave.status === 'PENDING' ? (
                          <div className="action-buttons-group">
                            <button
                              className="sm-btn btn-success"
                              disabled={actionLoadingId === leave.id}
                              onClick={() => handleApprove(leave.id)}
                            >
                              {actionLoadingId === leave.id ? <Loader2 size={12} className="spinner" /> : 'Approve'}
                            </button>
                            <button
                              className="sm-btn btn-danger"
                              disabled={actionLoadingId === leave.id}
                              onClick={() => handleReject(leave.id)}
                            >
                              {actionLoadingId === leave.id ? <Loader2 size={12} className="spinner" /> : 'Reject'}
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            Action Taken
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={isAgentOrSuperAdmin ? 7 : 6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 24px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                      <Clock size={32} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                      <span style={{ fontSize: '15px', fontWeight: 500 }}>
                        {isAgentOrSuperAdmin
                          ? 'No leave applications found in the system.'
                          : 'No leave applications submitted yet.'}
                      </span>
                      {!isAgentOrSuperAdmin && onOpenModal && (
                        <button
                          className="primary-btn sm-btn"
                          style={{ marginTop: '4px' }}
                          onClick={() => onOpenModal('apply_leave')}
                        >
                          <Plus size={14} />
                          <span>Apply For Leave</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
