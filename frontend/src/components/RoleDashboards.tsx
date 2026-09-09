import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle,
  Building2,
  Clock,
  FilePlus,
  Plus,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Headphones,
  CheckCircle2,
  LogOut,
  QrCode
} from 'lucide-react';
import {
  fetchWorkersApi,
  fetchLeavesApi,
  fetchAttendanceLogsApi,
  fetchSitesApi,
  fetchTodayAttendanceStatusApi,
  checkInApi,
  checkOutApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType, WorkerItem, LeaveRecord } from '../types';
import { UserAvatar } from './UserAvatar';
import { WorkerDetailsModal } from './WorkerDetailsModal';
import { MarkAttendanceModal } from './MarkAttendanceModal';
import { AgentSupportChatDrawer } from './AgentSupportChatDrawer';

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
  const [isSupportChatOpen, setIsSupportChatOpen] = useState<boolean>(false);

  // Roster Pagination & Limit State
  const [rosterPage, setRosterPage] = useState(1);
  const [rosterItemsPerPage, setRosterItemsPerPage] = useState(5);

  // Agent Personal Attendance Widget State
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isAttendingAction, setIsAttendingAction] = useState(false);
  const [liveTimerStr, setLiveTimerStr] = useState<string>('00h 00m 00s');

  const loadTodayAttendance = async () => {
    try {
      const data = await fetchTodayAttendanceStatusApi();
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to load agent today attendance status:', err);
    }
  };

  useEffect(() => {
    loadTodayAttendance();
  }, []);

  useEffect(() => {
    if (!attendanceData?.checkInTime) {
      setLiveTimerStr('00h 00m 00s');
      return;
    }

    if (attendanceData?.checkOutTime) {
      const diffMs = new Date(attendanceData.checkOutTime).getTime() - new Date(attendanceData.checkInTime).getTime();
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setLiveTimerStr(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
      return;
    }

    const updateTimer = () => {
      const checkInMs = new Date(attendanceData.checkInTime).getTime();
      const nowMs = Date.now();
      const diffMs = Math.max(0, nowMs - checkInMs);

      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);

      setLiveTimerStr(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [attendanceData]);

  const handleCheckInAction = async () => {
    setIsAttendingAction(true);
    try {
      const data = await checkInApi();
      setAttendanceData(data);
      loadAgentData();
    } catch (err: any) {
      alert(err?.message || 'Failed to check in');
    } finally {
      setIsAttendingAction(false);
    }
  };

  const handleCheckOutAction = async () => {
    if (!window.confirm('Are you sure you want to Check Out for today?')) return;
    setIsAttendingAction(true);
    try {
      const data = await checkOutApi();
      setAttendanceData(data);
      loadAgentData();
    } catch (err: any) {
      alert(err?.message || 'Failed to check out');
    } finally {
      setIsAttendingAction(false);
    }
  };

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

  // Formatted date string for today
  const todayDateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Pagination Math
  const totalRosterItems = assignedWorkers.length;
  const totalRosterPages = Math.max(1, Math.ceil(totalRosterItems / rosterItemsPerPage));
  const rosterStartIndex = (rosterPage - 1) * rosterItemsPerPage;
  const rosterEndIndex = Math.min(rosterStartIndex + rosterItemsPerPage, totalRosterItems);
  const paginatedRosterWorkers = assignedWorkers.slice(rosterStartIndex, rosterEndIndex);

  return (
    <div className="agent-dashboard animate-fade-in" style={{ padding: '0 4px' }}>
      {/* Agent Welcome & Attendance Status Header */}
      <div
        className="agent-dashboard-header-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 4px 0', letterSpacing: '-0.02em' }}>
            Agent Dashboard
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
            Welcome back, {user?.name || 'Field Agent'}! 👋
          </p>
        </div>

        {/* Attendance Control Widget Pill (Exact Match to User's Image) */}
        <div
          className="agent-attendance-widget-pill"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border-color, #CBD5E1)',
            borderRadius: '24px',
            padding: '4px 14px',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
          }}
        >
          {!attendanceData?.checkInTime ? (
            <>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary, #64748B)' }}>
                Attendance: Not Checked In
              </span>
              <button
                type="button"
                onClick={handleCheckInAction}
                disabled={isAttendingAction}
                style={{
                  backgroundColor: '#10B981',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(16, 185, 129, 0.25)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <Clock size={13} /> {isAttendingAction ? 'Processing...' : 'Check In'}
              </button>
            </>
          ) : !attendanceData?.checkOutTime ? (
            <>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  color: '#059669'
                }}
              >
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10B981',
                    display: 'inline-block',
                    boxShadow: '0 0 0 3px rgba(16,185,129,0.25)'
                  }}
                />
                Working: {liveTimerStr}
              </span>
              <button
                type="button"
                onClick={handleCheckOutAction}
                disabled={isAttendingAction}
                style={{
                  backgroundColor: '#EF4444',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '16px',
                  padding: '5px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 6px rgba(239, 68, 68, 0.25)',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <LogOut size={13} /> {isAttendingAction ? 'Processing...' : 'Check Out'}
              </button>
            </>
          ) : (
            <span
              style={{
                fontSize: '12.5px',
                fontWeight: 700,
                color: 'var(--text-secondary, #64748B)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <CheckCircle2 size={14} color="#10B981" /> Checked Out Today ({liveTimerStr})
            </span>
          )}
        </div>
      </div>

      {/* Top 4 Summary Metric Cards */}
      <div className="agent-metrics-grid">
        <div className="agent-metric-card">
          <div className="agent-metric-header">
            <span className="agent-metric-title">Assigned Workers</span>
            <div className="agent-metric-icon-wrap" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
              <Users size={18} />
            </div>
          </div>
          <div className="agent-metric-value">{activeWorkerCount}</div>
          <span className="agent-metric-comparison text-green">Active workforce roster</span>
        </div>

        <div className="agent-metric-card">
          <div className="agent-metric-header">
            <span className="agent-metric-title">Today Attendance</span>
            <div className="agent-metric-icon-wrap" style={{ backgroundColor: '#ECFDF5', color: '#10B981' }}>
              <CheckCircle size={18} />
            </div>
          </div>
          <div className="agent-metric-value">
            {todayAttendanceCount} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Present</span>
          </div>
          <span className="agent-metric-comparison text-green">{attendanceRate}% attendance rate</span>
        </div>

        <div className="agent-metric-card">
          <div className="agent-metric-header">
            <span className="agent-metric-title">Working Site</span>
            <div className="agent-metric-icon-wrap" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
              <Building2 size={18} />
            </div>
          </div>
          <div className="agent-metric-value site-value" title={workingSiteName}>{workingSiteName}</div>
          <span className="agent-metric-comparison text-secondary">Active Project Location</span>
        </div>

        <div className="agent-metric-card">
          <div className="agent-metric-header">
            <span className="agent-metric-title">Pending Leaves</span>
            <div className="agent-metric-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
              <Clock size={18} />
            </div>
          </div>
          <div className="agent-metric-value">
            {pendingLeaves.length} <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>Requests</span>
          </div>
          <span className="agent-metric-comparison text-amber">Requires agent approval</span>
        </div>
      </div>

      {/* Middle Grid: Left Roster Section & Right Field Agent Actions */}
      <div className="agent-middle-grid">
        
        {/* Left Column: My Assigned Workers Roster */}
        <div className="table-card agent-roster-card" style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <div className="card-header flex-between border-b" style={{ paddingBottom: '14px', marginBottom: '16px' }}>
            <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              My Assigned Workers Roster <span style={{ color: '#EA580C', fontSize: '13px', fontWeight: 700 }}>• {todayDateStr}</span>
            </h3>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className="secondary-btn"
                onClick={() => onNavigateTab('worker_qrs')}
                style={{
                  fontSize: '12px',
                  padding: '6px 12px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  borderColor: '#BFDBFE'
                }}
              >
                <QrCode size={14} />
                <span>Worker QR Cards</span>
              </button>
              <button className="secondary-btn" onClick={() => onNavigateTab('workers')} style={{ fontSize: '12px', padding: '6px 12px' }}>
                View All Workers
              </button>
            </div>
          </div>

          {/* Desktop Data Table View */}
          <div className="agent-roster-desktop-view table-responsive">
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

          {/* Mobile Responsive Cards View */}
          <div className="agent-roster-mobile-view">
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
                <Loader2 size={20} className="spinner" style={{ marginRight: '8px' }} /> Loading assigned workers roster...
              </div>
            ) : paginatedRosterWorkers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {paginatedRosterWorkers.map((w: any) => (
                  <div
                    key={w.id}
                    className="agent-worker-mobile-card"
                    style={{
                      backgroundColor: 'var(--bg-main)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    {/* Header Row: Avatar, Name, Code, Status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', overflow: 'hidden' }}
                        onClick={() => window.open(`/worker-details?id=${w.id}`, '_blank')}
                      >
                        <UserAvatar src={w.avatar || w.profileImage} name={w.name} size={36} />
                        <div style={{ overflow: 'hidden' }}>
                          <span style={{ color: '#2563EB', fontWeight: 700, fontSize: '14px', textDecoration: 'underline', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {w.name}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{w.designation || 'Worker'}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        <span style={{ backgroundColor: 'var(--border-light)', color: 'var(--text-primary)', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
                          {w.employeeCode}
                        </span>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '10.5px',
                            fontWeight: 800,
                            backgroundColor: w.todayStatus === 'PRESENT' ? '#DCFCE7' : w.todayStatus === 'HALF_DAY' ? '#FEF08A' : '#FEE2E2',
                            color: w.todayStatus === 'PRESENT' ? '#15803D' : w.todayStatus === 'HALF_DAY' ? '#A16207' : '#B91C1C'
                          }}
                        >
                          {w.todayStatus || 'ABSENT'}
                        </span>
                      </div>
                    </div>

                    {/* Contact Info */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>✉️ {w.email}</span>
                      <span style={{ color: '#3B82F6', fontWeight: 600 }}>📞 {w.phone || '+91 9811111111'}</span>
                    </div>

                    {/* Action Buttons Row */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginTop: '2px' }}>
                      <button
                        disabled={w.hasCheckedIn}
                        style={{
                          padding: '8px 4px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: w.hasCheckedIn ? '#CBD5E1' : '#059669',
                          color: w.hasCheckedIn ? '#64748B' : '#FFFFFF',
                          cursor: w.hasCheckedIn ? 'not-allowed' : 'pointer',
                          textAlign: 'center'
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

                      <button
                        disabled={!w.hasCheckedIn || w.hasCheckedOut}
                        style={{
                          padding: '8px 4px',
                          fontSize: '11.5px',
                          fontWeight: 800,
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: (!w.hasCheckedIn || w.hasCheckedOut) ? '#CBD5E1' : '#D97706',
                          color: (!w.hasCheckedIn || w.hasCheckedOut) ? '#64748B' : '#FFFFFF',
                          cursor: (!w.hasCheckedIn || w.hasCheckedOut) ? 'not-allowed' : 'pointer',
                          textAlign: 'center'
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

                      <button
                        style={{
                          padding: '8px 4px',
                          fontSize: '11.5px',
                          fontWeight: 700,
                          borderRadius: '8px',
                          backgroundColor: '#EFF6FF',
                          color: '#2563EB',
                          border: '1px solid #BFDBFE',
                          cursor: 'pointer',
                          textAlign: 'center'
                        }}
                        onClick={() => window.open(`/worker-details?id=${w.id}`, '_blank')}
                      >
                        Details ↗
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                No workers assigned to your agent account yet.
              </div>
            )}
          </div>

          {/* Left / Right Pagination & Limit Selector Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--border-color)', marginTop: '14px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
                style={{ opacity: rosterPage === 1 ? 0.5 : 1, cursor: rosterPage === 1 ? 'not-allowed' : 'pointer', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
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
                style={{ opacity: rosterPage >= totalRosterPages ? 0.5 : 1, cursor: rosterPage >= totalRosterPages ? 'not-allowed' : 'pointer', padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Field Agent Actions */}
        <div className="agent-actions-column">
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
                onClick={() => onNavigateTab('worker_qrs')}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--bg-main)', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <QrCode size={18} style={{ color: '#2563EB' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>Worker QR Cards & Roster</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>View assigned QR badges, download & print</div>
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
                onClick={() => setIsSupportChatOpen(true)}
                style={{ padding: '12px 14px', borderRadius: '10px', border: '1.5px solid #BFDBFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#EFF6FF', cursor: 'pointer' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Headphones size={18} style={{ color: '#2563EB' }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', color: '#1D4ED8' }}>Support Desk Chat (CSA)</div>
                    <div style={{ fontSize: '11px', color: '#3B82F6' }}>Direct notes, equipment & emergency tickets</div>
                  </div>
                </div>
                <ChevronRight size={16} style={{ color: '#2563EB' }} />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* Floating Support Chat Trigger Button */}
      <button
        type="button"
        onClick={() => setIsSupportChatOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#2563EB',
          color: '#FFFFFF',
          borderRadius: '30px',
          padding: '12px 20px',
          border: 'none',
          boxShadow: '0 10px 25px rgba(37, 99, 235, 0.35)',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          zIndex: 9000,
          fontWeight: 800,
          fontSize: '13.5px',
          transition: 'all 0.2s ease',
        }}
        title="Open Customer Support (CSA) Chat Drawer"
      >
        <Headphones size={18} />
        <span>Support Chat (CSA)</span>
      </button>

      {/* Support Chat Drawer with Customer Support Agent (CSA) */}
      <AgentSupportChatDrawer
        isOpen={isSupportChatOpen}
        onClose={() => setIsSupportChatOpen(false)}
        user={user}
        workingSiteName={workingSiteName}
      />

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
