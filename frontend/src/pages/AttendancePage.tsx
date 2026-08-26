import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle, XCircle, Clock, Loader2, Calendar } from 'lucide-react';
import { fetchAttendanceLogsApi, fetchWorkersApi } from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType } from '../types';
import './Pages.css';

interface AttendancePageProps {
  user?: UserType | null;
  onOpenModal: (type: string) => void;
  refreshTrigger?: number;
}

export const AttendancePage: React.FC<AttendancePageProps> = ({ user, onOpenModal, refreshTrigger }) => {
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

  // Date Navigation & Range Filter States
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  const [activePreset, setActivePreset] = useState<'ALL' | 'TODAY' | 'THIS_MONTH' | 'CUSTOM'>('ALL');

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

      // Filter logs strictly for assigned workers if logged in as an Agent
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

  // Apply Date Range Filters Dynamically
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

    setLogs(result);

    // Compute dynamic summary metrics
    const presentCount = result.filter((l: any) => l.status === 'PRESENT' || l.status === 'HALF_DAY').length;
    const absentCount = result.filter((l: any) => l.status === 'ABSENT').length;
    const totalCount = result.length || 1;
    const totalOT = result.reduce((sum: number, l: any) => sum + (l.overtimeHours || 0), 0);
    const uniqueSites = new Set(result.map((l: any) => l.siteId || l.worker?.site?.siteName)).size || 1;

    const attRate = Math.min(100, Math.round((presentCount / totalCount) * 100));
    const absRate = Math.min(100, Math.round((absentCount / totalCount) * 100));

    setSummary({
      todayPresent: presentCount,
      todayAbsent: absentCount,
      attendanceRate: attRate,
      absenceRate: absRate,
      totalOvertime: totalOT,
      totalSites: uniqueSites
    });
  }, [allLogs, filterStartDate, filterEndDate]);

  const handleSelectPreset = (preset: 'ALL' | 'TODAY' | 'THIS_MONTH') => {
    setActivePreset(preset);
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

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Attendance Module</h2>
          <p>Mark daily attendance, overtime hours, and review attendance logs across sites.</p>
        </div>
        <button className="primary-btn" onClick={() => onOpenModal('mark_attendance')}>
          <Plus size={16} />
          <span>Mark Attendance</span>
        </button>
      </div>

      <div className="stats-row-3">
        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Today Present</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">{summary.todayPresent.toLocaleString()}</span>
          <span className="stat-sub">{summary.attendanceRate}% Attendance Rate</span>
        </div>
        <div className="stat-box-card border-red">
          <div className="stat-header">
            <span>Today Absent</span>
            <XCircle size={18} className="text-red" />
          </div>
          <span className="stat-number">{summary.todayAbsent.toLocaleString()}</span>
          <span className="stat-sub">{summary.absenceRate}% Absence Rate</span>
        </div>
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Total Overtime Hours</span>
            <Clock size={18} className="text-blue" />
          </div>
          <span className="stat-number">{summary.totalOvertime} Hrs</span>
          <span className="stat-sub">Across {summary.totalSites} Working Sites</span>
        </div>
      </div>

      <div className="table-card mt-24">
        {/* Date Selector Navigation Menu */}
        <div className="card-header border-b" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', padding: '16px 20px' }}>
          <div>
            <h3 className="card-title" style={{ margin: 0, fontSize: '16px', fontWeight: 700 }}>
              {activePreset === 'TODAY'
                ? `Daily Attendance Logs – ${todayFormatted}`
                : activePreset === 'THIS_MONTH'
                ? 'Attendance Logs – This Month'
                : activePreset === 'CUSTOM' && filterStartDate
                ? `Attendance Logs (${filterStartDate} to ${filterEndDate || 'Today'})`
                : 'All System Attendance Logs'}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 500 }}>
              Showing {logs.length} record{logs.length === 1 ? '' : 's'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '6px', background: '#F1F5F9', padding: '4px', borderRadius: '8px' }}>
              <button
                onClick={() => handleSelectPreset('TODAY')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'TODAY' ? '#2563EB' : 'transparent',
                  color: activePreset === 'TODAY' ? '#FFFFFF' : '#475569'
                }}
              >
                Today
              </button>
              <button
                onClick={() => handleSelectPreset('THIS_MONTH')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'THIS_MONTH' ? '#2563EB' : 'transparent',
                  color: activePreset === 'THIS_MONTH' ? '#FFFFFF' : '#475569'
                }}
              >
                This Month
              </button>
              <button
                onClick={() => handleSelectPreset('ALL')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  backgroundColor: activePreset === 'ALL' ? '#2563EB' : 'transparent',
                  color: activePreset === 'ALL' ? '#FFFFFF' : '#475569'
                }}
              >
                All Dates
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#475569', fontWeight: 600 }}>
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
              {(filterStartDate || filterEndDate) && (
                <button
                  onClick={() => handleSelectPreset('ALL')}
                  style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '12px', fontWeight: 700, padding: '2px 6px' }}
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

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
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    <Loader2 size={18} className="spinner" style={{ marginRight: '8px' }} /> Loading attendance logs...
                  </td>
                </tr>
              ) : logs.length > 0 ? (
                logs.map((log: any) => {
                  const workerName = log.worker?.name || log.workerName || `Worker #${log.workerId}`;
                  const workerCode = log.worker?.employeeCode || `WRK-${log.workerId}`;
                  const siteName = log.worker?.site?.siteName || log.siteName || 'Active Site';
                  const markedByName = log.markedBy?.name ? `${log.markedBy.name} (${log.markedBy.role || 'Agent'})` : 'Field Agent';
                  const isPresent = log.status === 'PRESENT' || log.status === 'HALF_DAY';

                  const logDateFormatted = log.date
                    ? new Date(log.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : log.createdAt
                    ? new Date(log.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                    : '14 Aug 2026';

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
                          title="Click to open worker profile details in new tab"
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
                        <span className={`badge ${isPresent ? 'badge-approved' : 'badge-rejected'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td>{log.overtimeHours || 0} Hours</td>
                      <td>{log.remarks || 'Shift recorded'}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    No attendance logs recorded for your assigned workers.
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
