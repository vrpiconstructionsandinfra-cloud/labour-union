import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Calendar as CalendarIcon,
  Building2,
  Wallet,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  MessageSquare,
  LogOut,
  Settings
} from 'lucide-react';
import {
  fetchAttendanceLogsApi,
  fetchMyLeavesApi,
  fetchWalletsApi,
  fetchSitesApi,
  fetchAgentsApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType, LeaveRecord } from '../types';
import { UserAvatar } from './UserAvatar';
import './WorkerDashboard.css';

interface WorkerDashboardProps {
  user: UserType | null;
  onOpenModal?: (type: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const WorkerDashboardView: React.FC<WorkerDashboardProps> = ({
  user,
  onOpenModal,
  onNavigateTab
}) => {
  const { logout } = useAuth();

  // Calendar Month Navigation State (Default to current live date)
  const today = new Date();
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Profile Dropdown Menu State
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Backend Data States
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [myLeaves, setMyLeaves] = useState<LeaveRecord[]>([]);
  const [, setWalletData] = useState<any>(null);
  const [assignedAgent, setAssignedAgent] = useState<any>(null);
  const [assignedSite, setAssignedSite] = useState<any>(null);

  const dailyWageRate = (user as any)?.dailyWage || ((user as any)?.salary ? Math.round((user as any).salary / 30) : 750);

  const loadData = async () => {
    try {
      const [attRes, leavesData, walletsRes, agentsRes, sitesRes] = await Promise.all([
        fetchAttendanceLogsApi().catch(() => ({ logs: [] })),
        fetchMyLeavesApi().catch(() => []),
        fetchWalletsApi().catch(() => []),
        fetchAgentsApi().catch(() => []),
        fetchSitesApi().catch(() => [])
      ]);

      const logs = Array.isArray(attRes) ? attRes : (attRes?.logs || []);
      setAttendanceLogs(logs);
      setMyLeaves(leavesData);

      // Assigned Agent
      const agent = agentsRes.find(
        (a: any) => String(a.id) === String((user as any)?.assignedAgentId) || a.name === (user as any)?.assignedAgentName
      ) || agentsRes[0] || null;
      setAssignedAgent(agent);

      // Working Site
      const site = sitesRes.find(
        (s: any) => String(s.id) === String((user as any)?.siteId) || s.siteName === (user as any)?.assignedSite
      ) || sitesRes[0] || null;
      setAssignedSite(site);

      // Wallet
      const w = walletsRes.find(
        (item: any) => String(item.rawWorkerId || item.workerId) === String(user?.id)
      );
      setWalletData(w);
    } finally {
      // Data loaded
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const refresh = () => loadData();

    socket.on('attendance:updated', refresh);
    socket.on('leave:updated', refresh);
    socket.on('notification', refresh);

    return () => {
      socket.off('attendance:updated', refresh);
      socket.off('leave:updated', refresh);
      socket.off('notification', refresh);
    };
  }, [user?.id]);

  // Click outside to close profile dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handleToday = () => {
    setViewDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  // Calendar Math for currently selected viewDate
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth(); // 0-indexed
  const monthName = viewDate.toLocaleString('default', { month: 'long' });
  const currentMonthYearStr = `${monthName} ${viewYear}`;

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const prevMonthTotalDays = new Date(viewYear, viewMonth, 0).getDate();

  // Flexible multi-identifier worker matcher helper
  const isUserMatch = (log: any) => {
    if (!user) return false;
    const userIdStr = String(user.id || '');
    const userNumId = Number(userIdStr.replace(/\D/g, ''));
    const userCode = (user as any).employeeCode || (user as any).code;
    const userName = (user.name || '').trim().toLowerCase();

    const logWorkerId = String(log.workerId || log.worker?.id || log.rawWorkerId || '');
    const logWorkerNum = Number(logWorkerId.replace(/\D/g, ''));
    const logWorkerCode = log.worker?.employeeCode || log.employeeCode;
    const logWorkerName = (log.workerName || log.worker?.name || '').trim().toLowerCase();

    return (
      (logWorkerId !== '' && logWorkerId === userIdStr) ||
      (userNumId > 0 && logWorkerNum === userNumId) ||
      (userCode && logWorkerCode && userCode === logWorkerCode) ||
      (userName !== '' && logWorkerName !== '' && (userName === logWorkerName || userName.includes(logWorkerName) || logWorkerName.includes(userName)))
    );
  };

  // Direct YYYY-MM-DD ISO string date matcher eliminating timezone offset shifts
  const isDateMatch = (logDate: any, year: number, month: number, day: number) => {
    if (!logDate) return false;

    // 1. Direct YYYY-MM-DD string extraction
    let dateStr = '';
    if (typeof logDate === 'string') {
      dateStr = logDate.split('T')[0];
    } else if (logDate instanceof Date) {
      dateStr = logDate.toISOString().split('T')[0];
    }

    if (dateStr) {
      const parts = dateStr.split('-').map(Number);
      if (parts.length === 3) {
        if (parts[0] === year && (parts[1] - 1) === month && parts[2] === day) {
          return true;
        }
      }
    }

    // 2. Fallback Date object UTC and Local date checks
    const d = new Date(logDate);
    if (!isNaN(d.getTime())) {
      const isUtc = d.getUTCDate() === day && d.getUTCMonth() === month && d.getUTCFullYear() === year;
      const isLocal = d.getDate() === day && d.getMonth() === month && d.getFullYear() === year;
      return isUtc || isLocal;
    }

    return false;
  };

  // Filter attendance for matching worker, month, and year strictly from backend database
  const getDayAttendanceInfo = (day: number) => {
    const matchingLog = attendanceLogs.find((l: any) => {
      return isUserMatch(l) && isDateMatch(l.date, viewYear, viewMonth, day);
    });

    if (matchingLog) {
      const status = (matchingLog.status || '').toUpperCase();
      let earnedWage = matchingLog.dailyPay ?? 0;
      if (matchingLog.dailyPay === undefined || matchingLog.dailyPay === null) {
        if (status === 'PRESENT' || status === 'FULL_DAY') earnedWage = dailyWageRate;
        else if (status === 'HALF_DAY') earnedWage = Math.round(dailyWageRate / 2);
      }

      const statusCode = matchingLog.statusCode ?? (status === 'HALF_DAY' ? 1 : status === 'ABSENT' ? 0 : 2);

      return {
        status: status,
        type: (status === 'PRESENT' || status === 'FULL_DAY') ? 'FULL_DAY' : status === 'HALF_DAY' ? 'HALF_DAY' : 'ABSENT',
        statusCode: statusCode,
        checkIn: matchingLog.checkInTime ? (typeof matchingLog.checkInTime === 'string' && !matchingLog.checkInTime.includes('T') ? matchingLog.checkInTime : new Date(matchingLog.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })) : (matchingLog.signInTime || '09:05 AM'),
        checkOut: matchingLog.checkOutTime ? (typeof matchingLog.checkOutTime === 'string' && !matchingLog.checkOutTime.includes('T') ? matchingLog.checkOutTime : new Date(matchingLog.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })) : (matchingLog.signOutTime || '06:12 PM'),
        checkInPhoto: matchingLog.checkInPhoto || matchingLog.signInPhoto || null,
        checkOutPhoto: matchingLog.checkOutPhoto || matchingLog.signOutPhoto || null,
        siteName: matchingLog.site?.siteName || matchingLog.siteName || assignedSite?.siteName || (user as any)?.site?.siteName || 'Unassigned Working Site',
        updatedBy: matchingLog.markedBy?.name || matchingLog.updatedBy || `Agent ${assignedAgent?.name || 'Field Supervisor'}`,
        updatedAt: matchingLog.createdAt ? new Date(matchingLog.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : '10:15 AM',
        earnedWage: Number(earnedWage)
      };
    }

    // STRICT BACKEND RULE: If no log exists in database for this day, return NOT_MARKED
    return {
      status: 'NOT_MARKED',
      type: 'NOT_MARKED',
      statusCode: 0,
      checkIn: '—',
      checkOut: '—',
      checkInPhoto: null,
      checkOutPhoto: null,
      siteName: assignedSite?.siteName || (user as any)?.site?.siteName || 'Unassigned Working Site',
      updatedBy: '—',
      updatedAt: '—',
      earnedWage: 0
    };
  };

  const selectedDayInfo = getDayAttendanceInfo(selectedDay);

  // Month Attendance Counters for Legend
  let monthFullDayCount = 0;
  let monthHalfDayCount = 0;
  let monthAbsentCount = 0;

  for (let d = 1; d <= totalDaysInMonth; d++) {
    const info = getDayAttendanceInfo(d);
    if (info.type === 'FULL_DAY') monthFullDayCount++;
    else if (info.type === 'HALF_DAY') monthHalfDayCount++;
    else if (info.type === 'ABSENT') monthAbsentCount++;
  }

  // Today Log
  const todayNow = new Date();
  const todayLog = attendanceLogs.find((l: any) => {
    return isUserMatch(l) && isDateMatch(l.date, todayNow.getFullYear(), todayNow.getMonth(), todayNow.getDate());
  });

  // Leave Counts
  const pendingLeaves = myLeaves.filter((l) => l.status === 'PENDING');
  const approvedLeaves = myLeaves.filter((l) => l.status === 'APPROVED');
  const rejectedLeaves = myLeaves.filter((l) => l.status === 'REJECTED');

  return (
    <div className="worker-dashboard-container animate-fade-in">
      {/* Top Welcome Header Bar */}
      <div className="worker-top-header">
        <div className="welcome-title-box">
          <h1>Good Morning, {user?.name || 'Rajesh'} 👋</h1>
          <p>Stay safe and have a productive day!</p>
        </div>

        <div className="header-actions-right">
          <div className="header-date-badge" onClick={handleToday} title="Click to view today" style={{ cursor: 'pointer' }}>
            <CalendarIcon size={16} />
            <span>{today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>

          <div className="live-status-pill">
            <span className="green-dot-pulse"></span>
            <span>Live Updates On</span>
          </div>

          {/* Top-Right Interactive Profile Pill */}
          <div className="profile-wrapper-dropdown" ref={profileMenuRef}>
            <div
              className="header-worker-profile clickable"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            >
              <UserAvatar
                src={(user as any)?.profileImage || user?.avatar}
                name={user?.name || 'Rajesh'}
                size={36}
              />
              <div className="profile-text-box">
                <span className="w-name">{user?.name || 'Rajesh'}</span>
                <span className="w-id">Worker ID: {(user as any)?.employeeCode || `WRK-007`}</span>
              </div>
            </div>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="header-profile-menu animate-fade-in">
                <div className="menu-header">
                  <span className="menu-user-name">{user?.name || 'Rajesh'}</span>
                  <span className="menu-user-email">{user?.email || 'rajesh@laborunion.com'}</span>
                  <span className="menu-user-role">Worker • {(user as any)?.employeeCode || 'WRK-007'}</span>
                </div>

                <div className="menu-divider"></div>

                <button
                  className="menu-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    if (onOpenModal) onOpenModal('settings');
                  }}
                >
                  <Settings size={16} />
                  <span>Profile Settings</span>
                </button>

                <button
                  className="menu-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    onNavigateTab('tickets');
                  }}
                >
                  <MessageSquare size={16} />
                  <span>Customer Support Portal</span>
                </button>

                <div className="menu-divider"></div>

                <button
                  className="menu-item logout-item"
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut size={16} />
                  <span>Log Out / Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="worker-layout-body">
        {/* Center Main Dashboard Content */}
        <div className="worker-main-content-column">
          {/* Top 4 Summary Metric Cards */}
          <div className="worker-metrics-grid">
            {/* Card 1: Today's Attendance */}
            <div className="w-metric-card">
              <div className="card-icon-box green">
                <CalendarIcon size={22} color="#10B981" />
              </div>
              <div className="card-info">
                <span className="card-lbl">Today's Attendance</span>
                <h3 className="card-val green-text">
                  {todayLog ? (todayLog.status === 'HALF_DAY' ? 'Present (Half Day)' : todayLog.status === 'ABSENT' ? 'Absent' : 'Present (Full Day)') : 'Not Marked'} <CheckCircle2 size={16} className="inline-icon" />
                </h3>
                <span className="card-sub">
                  Checked In: {todayLog?.checkInTime ? (typeof todayLog.checkInTime === 'string' && !todayLog.checkInTime.includes('T') ? todayLog.checkInTime : new Date(todayLog.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })) : (todayLog?.signInTime || 'Not Checked In')}
                </span>
              </div>
            </div>

            {/* Card 2: Working Site */}
            <div className="w-metric-card">
              <div className="card-icon-box blue">
                <Building2 size={22} color="#2563EB" />
              </div>
              <div className="card-info">
                <span className="card-lbl">Working Site</span>
                <h3 className="card-val">{todayLog?.site?.siteName || assignedSite?.siteName || (user as any)?.site?.siteName || 'Industrial Area Site'}</h3>
                <span className="card-sub">{assignedSite?.city ? `${assignedSite.city}, ${assignedSite.state}` : (user as any)?.site?.city ? `${(user as any).site.city}, ${(user as any).site.state}` : 'Main Site Unit'}</span>
              </div>
            </div>

            {/* Card 3: Today's Wage */}
            <div className="w-metric-card">
              <div className="card-icon-box purple">
                <Wallet size={22} color="#9333EA" />
              </div>
              <div className="card-info">
                <span className="card-lbl">Today's Wage</span>
                <h3 className="card-val">
                  ₹{(todayLog ? (todayLog.dailyPay ?? (todayLog.status === 'HALF_DAY' ? Math.round(dailyWageRate / 2) : todayLog.status === 'PRESENT' ? dailyWageRate : 0)) : 0).toFixed(2)}
                </h3>
                <span className="card-sub">Daily Wage Rate</span>
              </div>
            </div>

            {/* Card 4: This Month Earnings */}
            {(() => {
              const currentMonthEarnings = attendanceLogs
                .filter((l: any) => {
                  if (!l.date) return false;
                  if (!isUserMatch(l)) return false;
                  const d = new Date(l.date);
                  const isMonth = (d.getUTCMonth() === viewMonth && d.getUTCFullYear() === viewYear) || (d.getMonth() === viewMonth && d.getFullYear() === viewYear);
                  const status = (l.status || '').toUpperCase();
                  return isMonth && (status === 'PRESENT' || status === 'FULL_DAY' || status === 'HALF_DAY');
                })
                .reduce((sum: number, l: any) => {
                  const pay = l.dailyPay !== undefined && l.dailyPay !== null ? Number(l.dailyPay) : ((l.status || '').toUpperCase() === 'HALF_DAY' ? Math.round(dailyWageRate / 2) : dailyWageRate);
                  return sum + pay;
                }, 0);

              return (
                <div className="w-metric-card">
                  <div className="card-icon-box orange">
                    <Wallet size={22} color="#D97706" />
                  </div>
                  <div className="card-info">
                    <span className="card-lbl">This Month Earnings</span>
                    <h3 className="card-val">₹{currentMonthEarnings.toLocaleString('en-IN')}.00</h3>
                    <span className="card-sub">{monthName} 1 – {monthName} {totalDaysInMonth}, {viewYear}</span>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Middle Row: Attendance Calendar + Today's Details + Leave Requests */}
          <div className="worker-middle-widgets-row">
            {/* Widget 1: Attendance Calendar with Interactive Month Switching */}
            <div className="w-widget-card calendar-widget">
              <div className="widget-header flex-between">
                <h3>Attendance Calendar - <span className="highlight-month">{currentMonthYearStr}</span></h3>
                
                {/* Month Switching Controls */}
                <div className="month-switcher-controls">
                  <button className="month-nav-btn" onClick={handlePrevMonth} title="Previous Month">
                    <ChevronLeft size={16} />
                  </button>
                  <button className="today-btn-small" onClick={handleToday} title="Go to Today">
                    Today
                  </button>
                  <button className="month-nav-btn" onClick={handleNextMonth} title="Next Month">
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>

              {/* Status Legend Bar */}
              <div className="calendar-legend-bar">
                <span className="legend-item"><span className="badge-circle green">F</span> Full Day ({monthFullDayCount})</span>
                <span className="legend-item"><span className="badge-circle orange">H</span> Half Day ({monthHalfDayCount})</span>
                <span className="legend-item"><span className="badge-circle red">A</span> Absent ({monthAbsentCount})</span>
                <span className="legend-item"><span className="badge-dot grey"></span> Not Marked</span>
              </div>

              {/* 7 Day Headers */}
              <div className="calendar-days-bar">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              {/* Dynamic Calendar Grid */}
              <div className="calendar-grid">
                {/* Leading Offset Days from previous month */}
                {Array.from({ length: firstDayOfWeek }).map((_, idx) => {
                  const prevNum = prevMonthTotalDays - firstDayOfWeek + idx + 1;
                  return (
                    <div key={`prev-${idx}`} className="day-cell muted">
                      <span className="num">{prevNum}</span>
                    </div>
                  );
                })}

                {/* Days of Current Selected Month */}
                {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((day) => {
                  const info = getDayAttendanceInfo(day);
                  const isSelected = day === selectedDay;

                  return (
                    <div
                      key={day}
                      className={`day-cell ${isSelected ? 'selected' : ''}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <span className="num">{day}</span>
                      {/* STRICT BACKEND RULE: Show status badges ONLY if explicit backend log exists */}
                      {info.type === 'FULL_DAY' && <span className="status-badge-icon green">F</span>}
                      {info.type === 'HALF_DAY' && <span className="status-badge-icon orange">H</span>}
                      {info.type === 'ABSENT' && <span className="status-badge-icon red">A</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Widget 2: Attendance Details for Selected Date */}
            <div className="w-widget-card details-widget">
              <div className="widget-header">
                <h3>Attendance Details</h3>
              </div>

              {/* Live Photos Display Row (if captured) */}
              {(selectedDayInfo.checkInPhoto || selectedDayInfo.checkOutPhoto) && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', padding: '10px', backgroundColor: 'var(--bg-main)', borderRadius: '10px', marginBottom: '12px', border: '1px solid var(--border-color)' }}>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase' }}>Check-In Photo</span>
                    {selectedDayInfo.checkInPhoto ? (
                      <img src={selectedDayInfo.checkInPhoto} alt="Check In" style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--border-color)' }} />
                    ) : (
                      <div style={{ height: '70px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', border: '1px solid var(--border-color)' }}>No Photo</div>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '10px', fontWeight: 700, color: '#D97706', textTransform: 'uppercase' }}>Check-Out Photo</span>
                    {selectedDayInfo.checkOutPhoto ? (
                      <img src={selectedDayInfo.checkOutPhoto} alt="Check Out" style={{ width: '100%', height: '70px', objectFit: 'cover', borderRadius: '6px', marginTop: '4px', border: '1px solid var(--border-color)' }} />
                    ) : (
                      <div style={{ height: '70px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'var(--text-secondary)', marginTop: '4px', border: '1px solid var(--border-color)' }}>No Photo</div>
                    )}
                  </div>
                </div>
              )}

              <div className="attendance-details-list">
                <div className="detail-row">
                  <span className="lbl">Date</span>
                  <span className="val bold">{monthName} {selectedDay}, {viewYear}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Status & Code</span>
                  <span className={`val bold ${selectedDayInfo.type === 'ABSENT' ? 'red-text' : selectedDayInfo.type === 'NOT_MARKED' ? 'muted-text' : 'green-text'}`}>
                    {selectedDayInfo.type === 'FULL_DAY' ? 'Present (Code 2 / Full Day)' : selectedDayInfo.type === 'HALF_DAY' ? 'Present (Code 1 / Half Day)' : selectedDayInfo.type === 'ABSENT' ? 'Absent (Code 0)' : 'Not Marked'}
                  </span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Assigned Site</span>
                  <span className="val bold" style={{ color: '#2563EB' }}>{selectedDayInfo.siteName}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Check In Time</span>
                  <span className="val green-text bold">{selectedDayInfo.checkIn}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Check Out Time</span>
                  <span className="val green-text bold">{selectedDayInfo.checkOut}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">That Day Pay</span>
                  <span className="val purple-text bold" style={{ fontSize: '16px' }}>₹{selectedDayInfo.earnedWage.toFixed(2)}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Logged By Agent</span>
                  <span className="val">{selectedDayInfo.updatedBy}</span>
                </div>

                <div className="detail-row">
                  <span className="lbl">Logged At</span>
                  <span className="val">{selectedDayInfo.updatedAt}</span>
                </div>
              </div>

              <div className="realtime-banner-pill">
                <span>Attendance synced live with Agent Dashboard</span>
              </div>
            </div>

            {/* Widget 3: Leave Request */}
            <div className="w-widget-card leave-widget">
              <div className="widget-header flex-between">
                <h3>Leave Request</h3>
                <button
                  className="apply-leave-btn"
                  onClick={() => onOpenModal ? onOpenModal('apply_agent_leave') : onNavigateTab('leaves')}
                >
                  Apply Leave
                </button>
              </div>

              {/* 3 Status Summary Stat Cards */}
              <div className="leave-status-summary-grid">
                <div className="leave-stat-box orange">
                  <span className="stat-num">{pendingLeaves.length}</span>
                  <span className="stat-lbl">Pending</span>
                </div>
                <div className="leave-stat-box green">
                  <span className="stat-num">{approvedLeaves.length}</span>
                  <span className="stat-lbl">Approved</span>
                </div>
                <div className="leave-stat-box red">
                  <span className="stat-num">{rejectedLeaves.length}</span>
                  <span className="stat-lbl">Rejected</span>
                </div>
              </div>

              {/* Your Leave Requests List */}
              <div className="leave-requests-list">
                <span className="list-title">Your Leave Requests</span>

                {myLeaves.length > 0 ? (
                  myLeaves.map((leave: any) => (
                    <div key={leave.id} className="leave-request-item" onClick={() => onNavigateTab('leaves')}>
                      <div className="item-header-row">
                        <span className={`status-badge ${leave.status === 'APPROVED' ? 'green' : leave.status === 'REJECTED' ? 'red' : 'orange'}`}>
                          {leave.status}
                        </span>
                        <ChevronRight size={16} className="arrow-icon" />
                      </div>
                      <h4 className="leave-dates">{leave.fromDate} – {leave.toDate}</h4>
                      <span className="leave-reason">{leave.reason || leave.leaveType || 'Leave Application'}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: '20px 12px', textAlign: 'center', color: '#64748B', fontSize: '13px', backgroundColor: '#F8FAFC', borderRadius: '8px', border: '1px dashed #CBD5E1', marginTop: '10px' }}>
                    <p style={{ margin: '0 0 6px', fontWeight: 600 }}>No leave applications yet.</p>
                    <button
                      type="button"
                      onClick={() => onOpenModal ? onOpenModal('apply_agent_leave') : onNavigateTab('leaves')}
                      style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 700, cursor: 'pointer' }}
                    >
                      + Apply Leave
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
