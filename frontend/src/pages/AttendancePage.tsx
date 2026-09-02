import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Calendar, Eye } from 'lucide-react';
import { fetchAttendanceLogsApi, fetchWorkersApi } from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType } from '../types';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface AttendancePageProps {
  user?: UserType | null;
  onOpenModal: (type: string) => void;
  refreshTrigger?: number;
}

const DATE_PRESETS = [
  { key: 'ALL', label: 'All Dates' },
  { key: 'TODAY', label: 'Today' },
  { key: 'THIS_MONTH', label: 'This Month' }
];

export const AttendancePage: React.FC<AttendancePageProps> = ({
  user,
  onOpenModal,
  refreshTrigger
}) => {
  const [summary, setSummary] = useState({
    todayPresent: 0,
    todayAbsent: 0,
    attendanceRate: 100,
    absenceRate: 0,
    totalOvertime: 0,
    totalSites: 1
  });
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Date Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadAttendanceData = () => {
    setIsLoading(true);
    Promise.all([
      fetchAttendanceLogsApi().catch(() => ({ summary: null, logs: [] })),
      fetchWorkersApi().catch(() => [])
    ]).then(([attendanceRes, workersData]) => {
      const fetchedLogs = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes.logs || []);
      const isAgent = user?.role === 'AGENT' || user?.role === 'SUPER_AGENT';

      let assignedWorkerIds = new Set<string>();
      let assignedWorkerNames = new Set<string>();

      if (isAgent && user?.id) {
        const myWorkers = workersData.filter(
          (w: any) => String(w.assignedAgentId || w.agentId) === String(user.id) || w.agentName === user.name
        );
        assignedWorkerIds = new Set(myWorkers.map((w: any) => String(w.id)));
        assignedWorkerNames = new Set(myWorkers.map((w: any) => (w.name || '').toLowerCase()));
      }

      const filteredLogs = (isAgent && user?.id && assignedWorkerIds.size > 0)
        ? fetchedLogs.filter((log: any) => {
            const wId = String(log.workerId || log.worker?.id || '');
            const wName = (log.worker?.name || log.workerName || '').toLowerCase();
            return assignedWorkerIds.has(wId) || assignedWorkerNames.has(wName);
          })
        : fetchedLogs;

      setAllLogs(filteredLogs);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadAttendanceData();

    const socket = getSocket();
    const handleUpdate = () => {
      loadAttendanceData();
    };

    socket.on('attendance:updated', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('attendance:updated', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, [refreshTrigger, user]);

  useEffect(() => {
    let result = [...allLogs];

    if (filterStartDate) {
      result = result.filter((l: any) => {
        const dStr = l.date ? new Date(l.date).toISOString().split('T')[0] : '';
        return dStr >= filterStartDate;
      });
    }

    if (filterEndDate) {
      result = result.filter((l: any) => {
        const dStr = l.date ? new Date(l.date).toISOString().split('T')[0] : '';
        return dStr <= filterEndDate;
      });
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((l: any) => {
        const wName = (l.worker?.name || l.workerName || '').toLowerCase();
        const wCode = (l.worker?.employeeCode || '').toLowerCase();
        const sName = (l.worker?.site?.siteName || l.siteName || '').toLowerCase();
        return wName.includes(term) || wCode.includes(term) || sName.includes(term);
      });
    }

    setLogs(result);

    const presentCount = result.filter((l: any) => l.status === 'PRESENT' || l.status === 'HALF_DAY').length;
    const absentCount = result.filter((l: any) => l.status === 'ABSENT').length;
    const totalCount = result.length || 1;
    const totalOT = result.reduce((sum: number, l: any) => sum + (l.overtimeHours || 0), 0);
    const uniqueSites = new Set(result.map((l: any) => l.siteId || l.worker?.site?.siteName)).size || 1;

    setSummary({
      todayPresent: presentCount,
      todayAbsent: absentCount,
      attendanceRate: Math.min(100, Math.round((presentCount / totalCount) * 100)),
      absenceRate: Math.min(100, Math.round((absentCount / totalCount) * 100)),
      totalOvertime: totalOT,
      totalSites: uniqueSites
    });
  }, [allLogs, filterStartDate, filterEndDate, searchTerm]);

  const handleSelectPreset = (preset: string) => {
    setActivePreset(preset as any);
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setFilterStartDate(todayISO);
      setFilterEndDate(todayISO);
    } else if (preset === 'THIS_MONTH') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      setFilterStartDate(firstDay);
      setFilterEndDate(todayISO);
    } else {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  const totalItems = logs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedLogs = logs.slice(startIndex, endIndex);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title="Attendance Logs"
        subtitle="Mark daily workforce attendance, track overtime hours, and review deployment logs."
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search by worker name, ID, or site..."
        filterOptions={DATE_PRESETS}
        activeFilter={activePreset}
        onFilterSelect={handleSelectPreset}
        primaryActionLabel="Mark Attendance"
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={() => onOpenModal('mark_attendance')}
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
        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Total Present</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">{summary.todayPresent.toLocaleString()}</span>
          <span className="stat-sub">{summary.attendanceRate}% Attendance Rate</span>
        </div>
        <div className="stat-box-card border-red">
          <div className="stat-header">
            <span>Total Absent</span>
            <XCircle size={18} className="text-red" />
          </div>
          <span className="stat-number">{summary.todayAbsent.toLocaleString()}</span>
          <span className="stat-sub">{summary.absenceRate}% Absence Rate</span>
        </div>
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Overtime Recorded</span>
            <Clock size={18} className="text-blue" />
          </div>
          <span className="stat-number">{summary.totalOvertime} Hrs</span>
          <span className="stat-sub">Across {summary.totalSites} Working Sites</span>
        </div>
      </div>

      {isLoading ? (
        <ListLoadingState message="Loading attendance logs..." rows={6} />
      ) : logs.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm || filterStartDate || filterEndDate)}
          onClearFilters={() => {
            setSearchTerm('');
            setFilterStartDate('');
            setFilterEndDate('');
            setActivePreset('ALL');
          }}
          primaryActionLabel="Mark Attendance"
          onPrimaryAction={() => onOpenModal('mark_attendance')}
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
                      <th>Date</th>
                      <th>Worker</th>
                      <th>Site</th>
                      <th>Marked By</th>
                      <th>Status</th>
                      <th>Overtime</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.map((log: any) => {
                      const workerName = log.worker?.name || log.workerName || `Worker #${log.workerId}`;
                      const workerCode = log.worker?.employeeCode || `WRK-${log.workerId}`;
                      const siteName = log.worker?.site?.siteName || log.siteName || 'Active Site';
                      const markedByName = log.markedBy?.name ? `${log.markedBy.name} (${log.markedBy.role || 'Agent'})` : 'Field Agent';

                      const logDateFormatted = log.date
                        ? new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : log.createdAt
                        ? new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                        : 'Today';

                      return (
                        <tr key={log.id}>
                          <td style={{ fontWeight: 600, color: '#1E293B', fontSize: '13px' }}>
                            {logDateFormatted}
                          </td>
                          <td>
                            <span
                              className="user-name-bold"
                              style={{ color: '#2563EB', cursor: 'pointer', textDecoration: 'underline' }}
                              onClick={() => window.open(`/worker-details?id=${log.workerId || log.worker?.id || 1}`, '_blank')}
                              title="Click to open worker profile"
                            >
                              {workerName}
                            </span>
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                              ({workerCode})
                            </span>
                          </td>
                          <td>{siteName}</td>
                          <td>{markedByName}</td>
                          <td>
                            <StatusBadge status={log.status || 'PRESENT'} size="sm" />
                          </td>
                          <td>{log.overtimeHours || 0} Hours</td>
                          <td>{log.remarks || 'Shift recorded'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedLogs.map((log: any) => {
              const workerName = log.worker?.name || log.workerName || `Worker #${log.workerId}`;
              const workerCode = log.worker?.employeeCode || `WRK-${log.workerId}`;
              const siteName = log.worker?.site?.siteName || log.siteName || 'Active Site';

              const logDateFormatted = log.date
                ? new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                : 'Today';

              return (
                <MobileListCard
                  key={log.id}
                  avatarName={workerName}
                  title={workerName}
                  subtitle={siteName}
                  idBadge={workerCode}
                  status={log.status || 'PRESENT'}
                  metaRows={[
                    {
                      label: 'Date',
                      value: logDateFormatted,
                      icon: <Calendar size={13} color="#64748B" />
                    },
                    {
                      label: 'Overtime',
                      value: `${log.overtimeHours || 0} Hours`,
                      icon: <Clock size={13} color="#2563EB" />
                    },
                    {
                      label: 'Remarks',
                      value: log.remarks || 'Shift recorded'
                    }
                  ]}
                  primaryAction={{
                    label: 'Worker Profile',
                    icon: <Eye size={14} />,
                    onClick: () => window.open(`/worker-details?id=${log.workerId || log.worker?.id || 1}`, '_blank'),
                    variant: 'outline'
                  }}
                />
              );
            })}
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
