import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Loader2, Plus, Calendar, Check, X } from 'lucide-react';
import { fetchLeavesApi, fetchMyLeavesApi, approveLeaveApi, rejectLeaveApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import type { LeaveRecord } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface LeavePageProps {
  onOpenModal?: (type: string) => void;
  refreshTrigger?: number;
  isMyLeavesOnly?: boolean;
}

const PRESET_FILTERS = [
  { key: 'ALL', label: 'All Dates' },
  { key: 'TODAY', label: 'Today' },
  { key: 'THIS_MONTH', label: 'This Month' }
];

export const LeavePage: React.FC<LeavePageProps> = ({
  onOpenModal,
  refreshTrigger,
  isMyLeavesOnly
}) => {
  const { role } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Date Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isAgentOrSuperAdmin = !isMyLeavesOnly && (role === 'SUPER_AGENT' || role === 'AGENT');

  const loadLeaves = () => {
    setIsLoading(true);
    const fetcher = isMyLeavesOnly
      ? fetchMyLeavesApi()
      : isAgentOrSuperAdmin
      ? fetchLeavesApi()
      : fetchMyLeavesApi();

    fetcher
      .then(setLeaves)
      .catch(() => {})
      .finally(() => setIsLoading(false));
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

  const handleSelectPreset = (preset: string) => {
    setActivePreset(preset as any);
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
    if (!isMyLeavesOnly && role === 'SUPER_AGENT' && leave.workerRole && !['AGENT', 'CUSTOMER_SUPPORT'].includes(leave.workerRole)) {
      return false;
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const wName = (leave.workerName || '').toLowerCase();
      const wId = (leave.workerId || '').toLowerCase();
      const reason = (leave.reason || '').toLowerCase();
      const lType = (leave.leaveType || '').toLowerCase();
      if (!wName.includes(term) && !wId.includes(term) && !reason.includes(term) && !lType.includes(term)) {
        return false;
      }
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

  const totalItems = filteredLeaves.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedLeaves = filteredLeaves.slice(startIndex, endIndex);

  const getPageTitle = () => {
    if (isMyLeavesOnly) return 'My Leave Requests';
    if (role === 'SUPER_AGENT') return 'Leave Requests';
    if (role === 'AGENT') return 'Worker Leave Requests';
    return 'Leave Requests';
  };

  const getPageSubtitle = () => {
    if (isMyLeavesOnly) return 'View your submitted leave requests and approval status.';
    if (role === 'SUPER_AGENT') return 'Review and authorize leave applications submitted by Field Agents and Support Staff.';
    if (role === 'AGENT') return 'Review and authorize workforce leave applications submitted across assigned working sites.';
    return 'Directory of workforce leave records and approvals.';
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title={getPageTitle()}
        subtitle={getPageSubtitle()}
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by applicant name, ID, or leave reason..."
        filterOptions={PRESET_FILTERS}
        activeFilter={activePreset}
        onFilterSelect={handleSelectPreset}
        primaryActionLabel={role !== 'SUPER_AGENT' && onOpenModal ? 'Apply Leave' : undefined}
        primaryActionIcon={role !== 'SUPER_AGENT' && onOpenModal ? <Plus size={16} /> : undefined}
        onPrimaryAction={role !== 'SUPER_AGENT' && onOpenModal ? () => onOpenModal('apply_leave') : undefined}
        customFilters={
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600, flexWrap: 'wrap' }}>
            <Calendar size={14} color="#64748B" />
            <span>From:</span>
            <input
              type="date"
              value={filterStartDate}
              onChange={(e) => {
                setFilterStartDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />
            <span>To:</span>
            <input
              type="date"
              value={filterEndDate}
              onChange={(e) => {
                setFilterEndDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12px' }}
            />
          </div>
        }
      />

      {/* Metrics Summary Row */}
      <div className="responsive-metrics-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-box-card border-amber">
          <div className="stat-header">
            <span>Pending Approvals</span>
            <Clock size={18} className="text-amber" />
          </div>
          <span className="stat-number">{pendingCount}</span>
          <span className="stat-sub">{isAgentOrSuperAdmin ? 'Requires Your Action' : 'Awaiting Review'}</span>
        </div>
        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Approved Leaves</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">{approvedCount}</span>
          <span className="stat-sub">Paid Leaves Granted</span>
        </div>
        <div className="stat-box-card border-red">
          <div className="stat-header">
            <span>Rejected Requests</span>
            <XCircle size={18} className="text-red" />
          </div>
          <span className="stat-number">{rejectedCount}</span>
          <span className="stat-sub">Leave Applications Declined</span>
        </div>
      </div>

      {isLoading ? (
        <ListLoadingState message="Loading leave applications..." rows={5} />
      ) : filteredLeaves.length === 0 ? (
        <ListEmptyState
          title={role === 'SUPER_AGENT' ? 'No leave requests submitted yet' : undefined}
          message={
            role === 'SUPER_AGENT'
              ? 'Leave applications submitted by Field Agents and Support Staff will appear here for your review and approval.'
              : undefined
          }
          isSearchOrFilter={Boolean(searchTerm || filterStartDate || filterEndDate)}
          onClearFilters={() => {
            setSearchTerm('');
            setFilterStartDate('');
            setFilterEndDate('');
            setActivePreset('ALL');
          }}
          primaryActionLabel={role !== 'SUPER_AGENT' && onOpenModal ? 'Apply Leave' : undefined}
          onPrimaryAction={role !== 'SUPER_AGENT' && onOpenModal ? () => onOpenModal('apply_leave') : undefined}
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Applicant</th>
                      <th>Leave Type</th>
                      <th>From Date</th>
                      <th>To Date</th>
                      <th>Reason</th>
                      <th>Status</th>
                      {isAgentOrSuperAdmin && <th>Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLeaves.map((leave) => (
                      <tr key={leave.id}>
                        <td>
                          <div className="table-user-cell">
                            <UserAvatar src={leave.avatar} name={leave.workerName} size={32} />
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="user-name-bold">{leave.workerName || 'Worker'}</span>
                                {leave.workerRole === 'AGENT' && (
                                  <span style={{ fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px', backgroundColor: '#F5F3FF', color: '#6D28D9', border: '1px solid #DDD6FE' }}>
                                    AGENT
                                  </span>
                                )}
                              </div>
                              <span className="user-sub-email">ID: {leave.workerId}</span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge badge-casual">{leave.leaveType || 'Casual Leave'}</span>
                        </td>
                        <td>{leave.fromDate}</td>
                        <td>{leave.toDate}</td>
                        <td>{leave.reason || 'Personal leave request'}</td>
                        <td>
                          <StatusBadge status={leave.status} size="sm" />
                        </td>
                        {isAgentOrSuperAdmin && (
                          <td>
                            {leave.status === 'PENDING' ? (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <button
                                  type="button"
                                  className="list-btn touch-target"
                                  style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px', backgroundColor: '#ECFDF5', color: '#047857', border: '1px solid #A7F3D0' }}
                                  disabled={actionLoadingId === leave.id}
                                  onClick={() => handleApprove(leave.id)}
                                >
                                  {actionLoadingId === leave.id ? <Loader2 size={12} className="spinner" /> : <><Check size={12} /> Approve</>}
                                </button>
                                <button
                                  type="button"
                                  className="list-btn touch-target"
                                  style={{ padding: '4px 10px', fontSize: '12px', minHeight: '30px', backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}
                                  disabled={actionLoadingId === leave.id}
                                  onClick={() => handleReject(leave.id)}
                                >
                                  {actionLoadingId === leave.id ? <Loader2 size={12} className="spinner" /> : <><X size={12} /> Reject</>}
                                </button>
                              </div>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Completed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedLeaves.map((leave) => (
              <MobileListCard
                key={leave.id}
                avatarName={leave.workerName}
                title={leave.workerName}
                subtitle={`ID: ${leave.workerId}`}
                status={leave.status}
                metaRows={[
                  {
                    label: 'Leave Type',
                    value: leave.leaveType || 'Casual Leave'
                  },
                  {
                    label: 'Period',
                    value: `${leave.fromDate} → ${leave.toDate}`,
                    icon: <Calendar size={13} color="#64748B" />
                  },
                  {
                    label: 'Reason',
                    value: leave.reason || 'Personal leave'
                  }
                ]}
                primaryAction={
                  isAgentOrSuperAdmin && leave.status === 'PENDING'
                    ? {
                        label: 'Approve Request',
                        icon: <Check size={14} />,
                        onClick: () => handleApprove(leave.id),
                        variant: 'success'
                      }
                    : undefined
                }
                secondaryActions={
                  isAgentOrSuperAdmin && leave.status === 'PENDING'
                    ? [
                        {
                          label: 'Reject Request',
                          icon: <X size={14} />,
                          variant: 'danger',
                          onClick: () => handleReject(leave.id)
                        }
                      ]
                    : undefined
                }
              />
            ))}
          </div>

          {/* Responsive Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  );
};
