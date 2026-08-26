import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Building2,
  Clock,
  FileText,
  FilePlus,
  Plus,
  Loader2,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';
import {
  fetchWorkersApi,
  fetchLeavesApi,
  fetchAttendanceLogsApi,
  fetchSitesApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType, WorkerItem, LeaveRecord } from '../types';
import { UserAvatar } from './UserAvatar';
import { WorkerDetailsModal } from './WorkerDetailsModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';

interface AgentDashboardProps {
  user: UserType | null;
  onOpenModal: (type: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const AgentDashboardView: React.FC<AgentDashboardProps> = ({
  user,
  onOpenModal,
  onNavigateTab
}) => {
  const [assignedWorkers, setAssignedWorkers] = useState<WorkerItem[]>([]);
  const [pendingLeaves, setPendingLeaves] = useState<LeaveRecord[]>([]);
  const [todayAttendanceCount, setTodayAttendanceCount] = useState<number>(0);
  const [workingSiteName, setWorkingSiteName] = useState<string>('Loading site...');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState<WorkerItem | null>(null);
  const [selectedWorkerForAttendance, setSelectedWorkerForAttendance] = useState<WorkerItem | null>(null);
  const [attendanceModalMode, setAttendanceModalMode] = useState<'CHECK_IN' | 'CHECK_OUT' | 'FULL'>('CHECK_IN');
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState<boolean>(false);

  // Attendance Calendar Month Navigation State
  const [calMonth, setCalMonth] = useState<Date>(new Date());
  const [selectedCalDay, setSelectedCalDay] = useState<number>(new Date().getDate());
  const [allAttendanceLogs, setAllAttendanceLogs] = useState<any[]>([]);

  const loadAgentData = () => {
    setIsLoading(true);
    Promise.all([
      fetchWorkersApi().catch(() => []),
      fetchLeavesApi().catch(() => []),
      fetchAttendanceLogsApi().catch(() => ({ logs: [] })),
      fetchSitesApi().catch(() => [])
    ]).then(([workersData, leavesData, attendanceRes, sitesData]) => {
      // 1. Filter workers assigned strictly to this logged-in agent (if agent account)
      const isAgentRole = user?.role === 'AGENT';
      const agentWorkerList = (isAgentRole && user?.id)
        ? workersData.filter((w: any) => Number(w.assignedAgentId || w.agentId || w.assignedAgent?.id) === Number(user.id))
        : workersData;
      
      const activeRoster = isAgentRole ? agentWorkerList : workersData;

      // Create Sets of worker IDs and worker names assigned to this agent
      const myWorkerIds = new Set(activeRoster.map((w) => String(w.id)));
      const myWorkerNames = new Set(activeRoster.map((w) => w.name.toLowerCase()));

      // 2. Filter pending leaves strictly for this agent's assigned workers
      const pending = leavesData.filter((l: any) => {
        if (l.status !== 'PENDING') return false;
        if (activeRoster.length === 0) return false;
        return myWorkerIds.has(String(l.workerId)) || myWorkerNames.has((l.workerName || '').toLowerCase());
      });
      setPendingLeaves(pending);

      // 3. Filter attendance records strictly for this agent's assigned workers for TODAY
      const logs = Array.isArray(attendanceRes) ? attendanceRes : (attendanceRes.logs || []);
      setAllAttendanceLogs(logs);

      const todayStr = new Date().toISOString().split('T')[0];
      
      const todayLogMap = new Map<string, any>();
      logs.forEach((log: any) => {
        const logDateStr = log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0]) : '';
        if (logDateStr === todayStr || !log.date) {
          if (log.workerId) todayLogMap.set(String(log.workerId), log);
          if (log.workerName) todayLogMap.set(log.workerName.toLowerCase(), log);
        }
      });

      // Map today check-in and check-out state onto each assigned worker
      const enrichedRoster = activeRoster.map((w: any) => {
        const log = todayLogMap.get(String(w.id)) || todayLogMap.get((w.name || '').toLowerCase());
        const hasCheckedIn = Boolean(log && (log.checkInTime || log.signInTime || log.status === 'PRESENT' || log.status === 'HALF_DAY'));
        const hasCheckedOut = Boolean(log && (log.checkOutTime || log.signOutTime));
        const todayStatus = hasCheckedIn ? (log.status || 'PRESENT') : 'ABSENT';
        return {
          ...w,
          todayStatus,
          hasCheckedIn,
          hasCheckedOut,
          attendanceLog: log
        };
      });

      setAssignedWorkers(enrichedRoster as any);

      const presentCount = enrichedRoster.filter((w: any) => w.hasCheckedIn).length;
      setTodayAttendanceCount(presentCount);

      // 4. Working Site
      if ((user as any)?.assignedSite) {
        setWorkingSiteName((user as any).assignedSite);
      } else if (sitesData.length > 0) {
        const found = sitesData.find((s: any) => String(s.id) === String((user as any)?.siteId));
        setWorkingSiteName(found ? found.siteName : sitesData[0].siteName);
      } else {
        setWorkingSiteName('Unassigned Working Site');
      }

      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadAgentData();

    const socket = getSocket();
    const handleLiveRefresh = () => {
      loadAgentData();
    };

    socket.on('attendance:updated', handleLiveRefresh);
    socket.on('leave:updated', handleLiveRefresh);
    socket.on('user:registered', handleLiveRefresh);
    socket.on('user:updated', handleLiveRefresh);
    socket.on('site:assigned', handleLiveRefresh);
    socket.on('notification', handleLiveRefresh);

    return () => {
      socket.off('attendance:updated', handleLiveRefresh);
      socket.off('leave:updated', handleLiveRefresh);
      socket.off('user:registered', handleLiveRefresh);
      socket.off('user:updated', handleLiveRefresh);
      socket.off('site:assigned', handleLiveRefresh);
      socket.off('notification', handleLiveRefresh);
    };
  }, [user?.id]);

  const activeWorkerCount = assignedWorkers.length;
  const attendanceRate = activeWorkerCount > 0 ? Math.min(100, Math.round((todayAttendanceCount / activeWorkerCount) * 100)) : 100;

  // Calendar Math & Selected Date Calculation
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const calMonthName = calMonth.toLocaleString('default', { month: 'long' });
  const calHeaderStr = `${calMonthName} ${calYear}`;

  const firstDayOfWeek = new Date(calYear, calMonthIdx, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const prevMonthTotalDays = new Date(calYear, calMonthIdx, 0).getDate();

  const selectedDateStr = `${calYear}-${String(calMonthIdx + 1).padStart(2, '0')}-${String(selectedCalDay).padStart(2, '0')}`;
  const selectedDateObj = new Date(calYear, calMonthIdx, selectedCalDay);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Map selected calendar date attendance logs onto assigned workers for real-time table sync
  const selectedDateLogMap = new Map<string, any>();
  allAttendanceLogs.forEach((log: any) => {
    const logDateStr = log.date ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0]) : '';
    if (logDateStr === selectedDateStr) {
      if (log.workerId) selectedDateLogMap.set(String(log.workerId), log);
      if (log.workerName) selectedDateLogMap.set(log.workerName.toLowerCase(), log);
    }
  });

  const displayedWorkers = assignedWorkers.map((w: any) => {
    const log = selectedDateLogMap.get(String(w.id)) || selectedDateLogMap.get((w.name || '').toLowerCase());
    const hasCheckedIn = Boolean(log && (log.checkInTime || log.signInTime || log.status === 'PRESENT' || log.status === 'HALF_DAY'));
    const hasCheckedOut = Boolean(log && (log.checkOutTime || log.signOutTime));
    const todayStatus = log ? (log.status || 'PRESENT') : 'ABSENT';
    return {
      ...w,
      todayStatus,
      hasCheckedIn,
      hasCheckedOut,
      attendanceLog: log
    };
  });

  // Roster Pagination & Limit State
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterItemsPerPage, setRosterItemsPerPage] = useState(5);

  useEffect(() => {
    setRosterPage(1);
  }, [selectedCalDay, calMonthIdx, calYear, rosterItemsPerPage]);

  const totalRosterItems = displayedWorkers.length;
  const totalRosterPages = Math.max(1, Math.ceil(totalRosterItems / rosterItemsPerPage));
  const rosterStartIndex = (rosterPage - 1) * rosterItemsPerPage;
  const rosterEndIndex = Math.min(rosterStartIndex + rosterItemsPerPage, totalRosterItems);
  const paginatedRosterWorkers = displayedWorkers.slice(rosterStartIndex, rosterEndIndex);

  const getCalendarDayDots = (day: number) => {
    const matchingLogs = allAttendanceLogs.filter((l: any) => {
      if (!l.date) return false;
      const d = new Date(l.date);
      const isDateMatch = d.getDate() === day && d.getMonth() === calMonthIdx && d.getFullYear() === calYear;
      if (!isDateMatch) return false;
      if (assignedWorkers.length > 0) {
        return assignedWorkers.some((w: any) => String(w.id) === String(l.workerId) || w.name.toLowerCase() === (l.workerName || '').toLowerCase());
      }
      return true;
    });

    const hasPresent = matchingLogs.some((l: any) => l.status === 'PRESENT' || l.status === 'FULL_DAY');
    const hasHalfDay = matchingLogs.some((l: any) => l.status === 'HALF_DAY');
    const hasAbsent = matchingLogs.some((l: any) => l.status === 'ABSENT');

    return { hasPresent, hasHalfDay, hasAbsent };
  };

  return (
    <div className="agent-dashboard animate-fade-in" style={{ padding: '0 4px' }}>
      {/* Top 4 Summary Metric Cards */}
      <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', marginBottom: '24px' }}>
        <div className="metric-card card-hover shadow-sm">
          <div className="metric-header">
            <span className="metric-title">Assigned Workers</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              <Users size={20} />
            </div>
          </div>
          <div className="metric-value">{activeWorkerCount}</div>
          <span className="metric-comparison text-green">Active workforce roster</span>
        </div>

        <div className="metric-card card-hover shadow-sm">
          <div className="metric-header">
            <span className="metric-title">Today Attendance</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <CheckCircle size={20} />
            </div>
          </div>
          <div className="metric-value">{todayAttendanceCount} Present</div>
          <span className="metric-comparison text-green">{attendanceRate}% attendance rate</span>
        </div>

        <div className="metric-card card-hover shadow-sm">
          <div className="metric-header">
            <span className="metric-title">Working Site</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
              <Building2 size={20} />
            </div>
          </div>
          <div className="metric-value" style={{ fontSize: '18px' }}>{workingSiteName}</div>
          <span className="metric-comparison text-secondary">Active Project Location</span>
        </div>

        <div className="metric-card card-hover shadow-sm">
          <div className="metric-header">
            <span className="metric-title">Pending Leaves</span>
            <div className="metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <Clock size={20} />
            </div>
          </div>
          <div className="metric-value">{pendingLeaves.length} Requests</div>
          <span className="metric-comparison text-amber">Requires agent approval</span>
        </div>
      </div>

      {/* Middle Grid: Left Roster Table & Right Column Widgets */}
      <div className="middle-grid" style={{ gridTemplateColumns: '2.2fr 1fr', gap: '24px' }}>
        
        {/* Left Column: My Assigned Workers Roster Table */}
        <div className="table-card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <div className="card-header flex-between border-b" style={{ paddingBottom: '14px', marginBottom: '16px' }}>
            <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>
              My Assigned Workers Roster <span style={{ color: '#2563EB', fontSize: '13px', fontWeight: 700 }}>• {formattedSelectedDate}</span>
            </h3>
            <button className="secondary-btn" onClick={() => onNavigateTab('workers')} style={{ fontSize: '12px', padding: '6px 12px' }}>
              View All Workers
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>WORKER NAME</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID CODE</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CONTACT DETAILS</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>DESIGNATION</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>TODAY STATUS</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '32px' }}>
                      <Loader2 size={20} className="spinner" style={{ marginRight: '8px' }} /> Loading assigned workers roster...
                    </td>
                  </tr>
                ) : paginatedRosterWorkers.length > 0 ? (
                  paginatedRosterWorkers.map((w: any) => (
                    <tr key={w.id}>
                      <td>
                        <div
                          className="table-user-cell"
                          onClick={() => window.open(`/worker-details?id=${w.id}`, '_blank')}
                          style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px' }}
                          title="Click to view worker details in a new tab"
                        >
                          <UserAvatar src={w.avatar || w.profileImage} name={w.name} size={32} />
                          <div>
                            <span className="user-name-bold" style={{ color: '#2563EB', fontWeight: 700, fontSize: '13.5px', textDecoration: 'underline' }}>{w.name}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="code-badge" style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-primary)', fontSize: '11.5px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>{w.employeeCode}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                            ✉️ {w.email}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#3B82F6', fontWeight: 600 }}>
                            📞 {w.phone || '+91 9811111111'}
                          </span>
                        </div>
                      </td>
                      <td style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>{w.designation || 'Worker'}</td>
                      <td>
                        <span
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 800,
                            display: 'inline-block',
                            backgroundColor: w.todayStatus === 'PRESENT' ? '#DCFCE7' : w.todayStatus === 'HALF_DAY' ? '#FEF08A' : '#FEE2E2',
                            color: w.todayStatus === 'PRESENT' ? '#15803D' : w.todayStatus === 'HALF_DAY' ? '#A16207' : '#B91C1C'
                          }}
                        >
                          {w.todayStatus || 'ABSENT'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          {/* Check-In Button */}
                          <button
                            disabled={w.hasCheckedIn}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: w.hasCheckedIn ? '#CBD5E1' : '#059669',
                              color: w.hasCheckedIn ? '#64748B' : '#FFFFFF',
                              cursor: w.hasCheckedIn ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => {
                              if (!w.hasCheckedIn) {
                                setSelectedWorkerForAttendance(w);
                                setAttendanceModalMode('CHECK_IN');
                                setIsAttendanceModalOpen(true);
                              }
                            }}
                          >
                            {w.hasCheckedIn ? 'Checked In' : 'Check-In'}
                          </button>

                          {/* Check-Out Button */}
                          <button
                            disabled={!w.hasCheckedIn || w.hasCheckedOut}
                            style={{
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 800,
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: (!w.hasCheckedIn || w.hasCheckedOut) ? '#CBD5E1' : '#D97706',
                              color: (!w.hasCheckedIn || w.hasCheckedOut) ? '#64748B' : '#FFFFFF',
                              cursor: (!w.hasCheckedIn || w.hasCheckedOut) ? 'not-allowed' : 'pointer'
                            }}
                            onClick={() => {
                              if (w.hasCheckedIn && !w.hasCheckedOut) {
                                setSelectedWorkerForAttendance(w);
                                setAttendanceModalMode('CHECK_OUT');
                                setIsAttendanceModalOpen(true);
                              }
                            }}
                          >
                            {w.hasCheckedOut ? 'Checked Out' : 'Check-Out'}
                          </button>

                          {/* Details Button */}
                          <button
                            style={{
                              padding: '4px 8px',
                              fontSize: '11px',
                              fontWeight: 700,
                              borderRadius: '6px',
                              backgroundColor: '#EFF6FF',
                              color: '#2563EB',
                              border: '1px solid #BFDBFE',
                              cursor: 'pointer'
                            }}
                            onClick={() => window.open(`/worker-details?id=${w.id}`, '_blank')}
                          >
                            Details ↗
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                      No workers assigned to your agent account yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Left / Right Pagination & Limit Selector Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginTop: '12px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                Showing {totalRosterItems > 0 ? rosterStartIndex + 1 : 0} to {rosterEndIndex} of {totalRosterItems} workers
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)', fontWeight: 500 }}>Show:</span>
                <select
                  className="select-dropdown"
                  value={rosterItemsPerPage}
                  onChange={(e) => setRosterItemsPerPage(Number(e.target.value))}
                  style={{ padding: '3px 8px', fontSize: '12px', width: 'auto' }}
                >
                  <option value={5}>5 per page</option>
                  <option value={10}>10 per page</option>
                  <option value={20}>20 per page</option>
                  <option value={50}>50 per page</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                className="secondary-btn sm-btn"
                disabled={rosterPage === 1}
                onClick={() => setRosterPage(prev => Math.max(1, prev - 1))}
                style={{ opacity: rosterPage === 1 ? 0.5 : 1, cursor: rosterPage === 1 ? 'not-allowed' : 'pointer', padding: '3px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                <ChevronLeft size={14} />
                <span>Previous</span>
              </button>
              <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-primary)', padding: '0 6px' }}>
                Page {rosterPage} of {totalRosterPages}
              </span>
              <button
                className="secondary-btn sm-btn"
                disabled={rosterPage >= totalRosterPages}
                onClick={() => setRosterPage(prev => Math.min(totalRosterPages, prev + 1))}
                style={{ opacity: rosterPage >= totalRosterPages ? 0.5 : 1, cursor: rosterPage >= totalRosterPages ? 'not-allowed' : 'pointer', padding: '3px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Attendance Calendar & Field Agent Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Top-Right Widget: Attendance Calendar */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>Attendance Calendar</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                >
                  &lt;
                </button>
                <button
                  onClick={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '6px', padding: '3px 8px', cursor: 'pointer' }}
                >
                  &gt;
                </button>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', padding: '0 6px' }}>{calHeaderStr}</span>
                <button
                  onClick={() => { setCalMonth(new Date()); setSelectedCalDay(new Date().getDate()); }}
                  style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Today
                </button>
              </div>
            </div>

            {/* Days of Week Header */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '11px', fontWeight: 800, color: 'var(--text-secondary)', marginBottom: '8px' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>

            {/* Calendar Days Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', textAlign: 'center' }}>
              {/* Offset empty days */}
              {Array.from({ length: (firstDayOfWeek + 6) % 7 }).map((_, idx) => (
                <div key={`offset-${idx}`} style={{ padding: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                  {prevMonthTotalDays - ((firstDayOfWeek + 6) % 7) + idx + 1}
                </div>
              ))}

              {/* Month Days */}
              {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((day) => {
                const isSelected = day === selectedCalDay;
                const dots = getCalendarDayDots(day);

                return (
                  <div
                    key={day}
                    onClick={() => setSelectedCalDay(day)}
                    style={{
                      padding: '6px 2px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#2563EB' : 'transparent',
                      color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: '12.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      position: 'relative'
                    }}
                  >
                    <span>{day}</span>
                    <div style={{ display: 'flex', gap: '2px', marginTop: '2px' }}>
                      {dots.hasPresent && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#FFF' : '#10B981' }}></span>}
                      {dots.hasHalfDay && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#FFF' : '#F59E0B' }}></span>}
                      {dots.hasAbsent && <span style={{ width: '4px', height: '4px', borderRadius: '50%', backgroundColor: isSelected ? '#FFF' : '#EF4444' }}></span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Calendar Legend Bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '14px', paddingTop: '10px', borderTop: '1px solid var(--border-color)', fontSize: '10.5px', color: 'var(--text-secondary)', fontWeight: 700 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981' }}></span> Present</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#F59E0B' }}></span> Half Day</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#EF4444' }}></span> Absent</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span> Selected</span>
            </div>
          </div>

          {/* Bottom-Right Widget: Field Agent Actions */}
          <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '18px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 14px 0' }}>Field Agent Actions</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                className="quick-action-item"
                onClick={() => {
                  if (assignedWorkers.length > 0) {
                    setSelectedWorkerForAttendance(assignedWorkers[0]);
                    setAttendanceModalMode('CHECK_IN');
                    setIsAttendanceModalOpen(true);
                  } else {
                    onOpenModal('mark_attendance');
                  }
                }}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <CheckCircle size={18} className="text-blue" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Mark Daily Attendance</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Log photos, check-in/out, status (1/2), and site</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>

              <button
                className="quick-action-item"
                onClick={() => onOpenModal('add_worker')}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Plus size={18} className="text-green" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Register New Worker</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Add worker under your agent ID</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>

              <button
                className="quick-action-item"
                onClick={() => onOpenModal('apply_agent_leave')}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FilePlus size={18} className="text-purple" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Apply My Leave Request</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Submit personal leave application</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>

              <button
                className="quick-action-item"
                onClick={() => onNavigateTab('leaves')}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={18} className="text-orange" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Review Leave Applications</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Approve or reject worker leaves</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: 'var(--text-secondary)' }} />
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Worker Detailed Profile Modal */}
      <WorkerDetailsModal
        isOpen={!!selectedWorkerForDetails}
        onClose={() => setSelectedWorkerForDetails(null)}
        worker={selectedWorkerForDetails}
      />

      {/* Live Attendance Marking Modal */}
      <MarkAttendanceModal
        isOpen={isAttendanceModalOpen}
        onClose={() => {
          setIsAttendanceModalOpen(false);
          setSelectedWorkerForAttendance(null);
        }}
        worker={selectedWorkerForAttendance}
        mode={attendanceModalMode}
        onSuccess={loadAgentData}
      />
    </div>
  );
};

export { WorkerDashboardView } from './WorkerDashboardView';
