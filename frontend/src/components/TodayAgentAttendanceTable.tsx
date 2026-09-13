import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Headset,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  CalendarCheck,
  Users,
  Palmtree,
  Calendar
} from 'lucide-react';
import { fetchTodayAttendanceOverviewApi } from '../services/api';
import { getSocket } from '../services/socket';
import { UserAvatar } from './UserAvatar';
import './TodayAgentAttendanceTable.css';

export interface PresentStaffRecord {
  id: string | number;
  userId: string | number;
  name: string;
  employeeCode: string;
  avatar?: string | null;
  category: 'FIELD_AGENT' | 'SUPPORT_AGENT';
  role?: string;
  designation?: string;
  phone?: string | null;
  email?: string | null;
  assignedSite: string;
  department: string;
  activeTicketsCount?: number;
  status: 'PRESENT' | 'ON_LEAVE' | 'COMPLETED' | 'NOT_CHECKED_IN' | 'ABSENT';
  checkInTime: string | null;
  checkOutTime: string | null;
  duration: string;
  leaveType?: string | null;
  leaveReason?: string | null;
  isOnline: boolean;
}

interface TodayAgentAttendanceTableProps {
  onViewAllAgents?: () => void;
}

export const TodayAgentAttendanceTable: React.FC<TodayAgentAttendanceTableProps> = ({
  onViewAllAgents
}) => {
  const [activeTab, setActiveTab] = useState<'ALL' | 'FIELD_AGENT' | 'SUPPORT_AGENT' | 'LEAVE'>('ALL');
  const [presentStaff, setPresentStaff] = useState<PresentStaffRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  const format12Hour = (isoStr?: string | null): string => {
    if (!isoStr) return '—';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return isoStr;
    }
  };

  const computeLiveDuration = (checkInTime: string | null, checkOutTime: string | null, fallbackDuration: string): string => {
    if (!checkInTime) return fallbackDuration || '—';
    try {
      const cIn = new Date(checkInTime).getTime();
      const end = checkOutTime ? new Date(checkOutTime).getTime() : currentTime;
      const diffMs = Math.max(0, end - cIn);
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      return `${h}h ${m}m`;
    } catch {
      return fallbackDuration || '—';
    }
  };

  const loadAttendance = async () => {
    try {
      const res = await fetchTodayAttendanceOverviewApi();
      if (res) {
        setPresentStaff(res.staff || []);
        setSummary(res.summary || null);
      }
    } catch (err) {
      console.error('Failed to load today agent attendance overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Initial Load and Socket Subscription
  useEffect(() => {
    loadAttendance();

    const socket = getSocket();
    const handleUpdate = () => {
      loadAttendance();
    };

    socket.on('attendance:updated', handleUpdate);
    socket.on('attendance:marked', handleUpdate);
    socket.on('attendance:check-in', handleUpdate);
    socket.on('attendance:check-out', handleUpdate);
    socket.on('leave:updated', handleUpdate);
    socket.on('user:status:changed', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('attendance:updated', handleUpdate);
      socket.off('attendance:marked', handleUpdate);
      socket.off('attendance:check-in', handleUpdate);
      socket.off('attendance:check-out', handleUpdate);
      socket.off('leave:updated', handleUpdate);
      socket.off('user:status:changed', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, []);

  // 2. Interval Timer for live duration increments
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 30000); // update every 30 seconds
    return () => clearInterval(timer);
  }, []);

  const allCount = summary?.totalStaff ?? presentStaff.length;
  const fieldAgentsCount = summary?.fieldAgentsCount ?? presentStaff.filter((s) => s.category === 'FIELD_AGENT').length;
  const supportAgentsCount = summary?.supportAgentsCount ?? presentStaff.filter((s) => s.category === 'SUPPORT_AGENT').length;
  const todayLeavesCount = summary?.onLeaveCount ?? presentStaff.filter((s) => s.status === 'ON_LEAVE').length;

  const filteredStaff = presentStaff.filter((s) => {
    if (activeTab === 'FIELD_AGENT') return s.category === 'FIELD_AGENT';
    if (activeTab === 'SUPPORT_AGENT') return s.category === 'SUPPORT_AGENT';
    if (activeTab === 'LEAVE') return s.status === 'ON_LEAVE';
    return true;
  });

  const renderStatusPill = (status: PresentStaffRecord['status']) => {
    switch (status) {
      case 'PRESENT':
        return (
          <span className="status-pill-present">
            <span className="status-dot-green" />
            <span>Present</span>
          </span>
        );
      case 'COMPLETED':
        return (
          <span className="status-pill-completed">
            <span className="status-dot-blue" />
            <span>Completed</span>
          </span>
        );
      case 'ON_LEAVE':
        return (
          <span className="status-pill-leave">
            <span className="status-dot-amber" />
            <span>On Leave</span>
          </span>
        );
      case 'ABSENT':
        return (
          <span className="status-pill-absent">
            <span className="status-dot-red" />
            <span>Absent</span>
          </span>
        );
      case 'NOT_CHECKED_IN':
      default:
        return (
          <span className="status-pill-not-checked-in">
            <span className="status-dot-slate" />
            <span>Not Checked In</span>
          </span>
        );
    }
  };

  return (
    <div className="today-attendance-card animate-fade-in">
      {/* Header & Filter Tabs */}
      <div className="today-attendance-header">
        <div className="today-attendance-title-wrap">
          <div className="today-attendance-icon-box">
            <CalendarCheck size={20} />
          </div>
          <div>
            <h3 className="today-attendance-title">Today's Active Attendance</h3>
            <p className="today-attendance-subtext">
              Real-time check-in and shift activity for Field Agents and Customer Support staff.
            </p>
          </div>
        </div>

        {/* Tab Filters */}
        <div className="today-attendance-tabs">
          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setActiveTab('ALL')}
          >
            <span>All Staff</span>
            <span className="today-att-count-badge">{allCount}</span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'FIELD_AGENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('FIELD_AGENT')}
          >
            <span>👔 Field Agents</span>
            <span className="today-att-count-badge">{fieldAgentsCount}</span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'SUPPORT_AGENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('SUPPORT_AGENT')}
          >
            <span>🎧 Support Staff</span>
            <span className="today-att-count-badge">{supportAgentsCount}</span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'LEAVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('LEAVE')}
          >
            <span>🏖️ Today's Leave</span>
            <span
              className="today-att-count-badge"
              style={{
                backgroundColor: activeTab === 'LEAVE' ? '#D97706' : '#FEF3C7',
                color: activeTab === 'LEAVE' ? '#FFF' : '#B45309'
              }}
            >
              {todayLeavesCount}
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          <Loader2 size={24} className="spinner" style={{ margin: '0 auto 8px', color: '#2563EB' }} />
          <span>Loading today's staff attendance...</span>
        </div>
      ) : filteredStaff.length === 0 ? (
        <div className="today-att-empty">
          <Users size={36} style={{ opacity: 0.5 }} />
          <h4>No Staff Records Found</h4>
          <p>No active Field Agents or Support Staff matched for this filter today.</p>
        </div>
      ) : (
        <>
          {/* DESKTOP & TABLET VIEW (Table layout ≥ 768px) */}
          <div className="today-att-desktop-view">
            <div className="table-responsive">
              <table className="today-att-table">
                <thead>
                  <tr>
                    <th>Staff Member</th>
                    <th>Role Category</th>
                    <th>Check-In Time</th>
                    <th>Working Duration</th>
                    <th>Assigned Site / Queue</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((staff) => {
                    const isOnLeave = staff.status === 'ON_LEAVE';
                    const isPresent = staff.status === 'PRESENT';
                    const isCompleted = staff.status === 'COMPLETED';
                    const liveDuration = isPresent
                      ? computeLiveDuration(staff.checkInTime, null, staff.duration)
                      : isCompleted
                      ? computeLiveDuration(staff.checkInTime, staff.checkOutTime, staff.duration)
                      : staff.duration;

                    return (
                      <tr key={staff.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ position: 'relative' }}>
                              <UserAvatar src={staff.avatar} name={staff.name} size={34} />
                              {isPresent && (
                                <span
                                  style={{
                                    position: 'absolute',
                                    bottom: 0,
                                    right: 0,
                                    width: '9px',
                                    height: '9px',
                                    borderRadius: '50%',
                                    backgroundColor: '#10B981',
                                    border: '2px solid #FFFFFF'
                                  }}
                                  title="Active / Present Now"
                                />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{staff.name}</div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{staff.employeeCode}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          {staff.category === 'SUPPORT_AGENT' ? (
                            <span className="role-pill-support">
                              <Headset size={12} /> Support Agent
                            </span>
                          ) : (
                            <span className="role-pill-agent">
                              <UserCheck size={12} /> Field Agent
                            </span>
                          )}
                        </td>

                        <td>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontWeight: 600,
                              color: isOnLeave ? '#B45309' : isPresent ? '#047857' : 'var(--text-primary)'
                            }}
                          >
                            {isOnLeave ? (
                              <>
                                <Palmtree size={13} color="#D97706" />
                                <span>On Leave</span>
                              </>
                            ) : staff.checkInTime ? (
                              <>
                                <Clock size={13} color="#64748B" />
                                <span>{format12Hour(staff.checkInTime)}</span>
                              </>
                            ) : (
                              <span style={{ color: '#94A3B8' }}>—</span>
                            )}
                          </div>
                        </td>

                        <td>
                          {isOnLeave ? (
                            <span className="duration-tag leave">
                              <Calendar size={11} />
                              <span>{staff.leaveReason || staff.leaveType || 'Approved Leave'}</span>
                            </span>
                          ) : staff.checkInTime ? (
                            <span className={`duration-tag ${isCompleted ? 'completed' : ''}`}>
                              <Clock size={11} />
                              <span>{liveDuration}</span>
                            </span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>

                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                            {staff.category === 'SUPPORT_AGENT' ? (
                              <>
                                <Headset size={13} color="#D97706" />
                                <span>{staff.department}</span>
                              </>
                            ) : (
                              <>
                                <MapPin size={13} color="#4F46E5" />
                                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{staff.assignedSite}</span>
                              </>
                            )}
                          </div>
                        </td>

                        <td>{renderStatusPill(staff.status)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW (Card layout < 768px) */}
          <div className="today-att-mobile-list">
            {filteredStaff.map((staff) => {
              const isOnLeave = staff.status === 'ON_LEAVE';
              const isPresent = staff.status === 'PRESENT';
              const isCompleted = staff.status === 'COMPLETED';
              const liveDuration = isPresent
                ? computeLiveDuration(staff.checkInTime, null, staff.duration)
                : isCompleted
                ? computeLiveDuration(staff.checkInTime, staff.checkOutTime, staff.duration)
                : staff.duration;

              return (
                <div key={staff.id} className="today-att-mobile-card">
                  <div className="today-att-mobile-header">
                    <div className="today-att-mobile-user">
                      <div style={{ position: 'relative' }}>
                        <UserAvatar src={staff.avatar} name={staff.name} size={36} />
                        {isPresent && (
                          <span
                            style={{
                              position: 'absolute',
                              bottom: 0,
                              right: 0,
                              width: '9px',
                              height: '9px',
                              borderRadius: '50%',
                              backgroundColor: '#10B981',
                              border: '2px solid #FFFFFF'
                            }}
                          />
                        )}
                      </div>
                      <div>
                        <h4 className="today-att-mobile-name">{staff.name}</h4>
                        <span className="today-att-mobile-code">{staff.employeeCode}</span>
                      </div>
                    </div>

                    {staff.category === 'SUPPORT_AGENT' ? (
                      <span className="role-pill-support">
                        <Headset size={11} /> Support
                      </span>
                    ) : (
                      <span className="role-pill-agent">
                        <UserCheck size={11} /> Agent
                      </span>
                    )}
                  </div>

                  <div className="today-att-mobile-body">
                    <div className="today-att-mobile-row">
                      <span className="today-att-mobile-label">
                        {isOnLeave ? <Palmtree size={13} /> : <Clock size={13} />} {isOnLeave ? 'Shift Status:' : 'Check-In:'}
                      </span>
                      <span
                        className="today-att-mobile-val"
                        style={{ color: isOnLeave ? '#B45309' : isPresent ? '#047857' : undefined, fontWeight: 700 }}
                      >
                        {isOnLeave ? 'On Leave' : staff.checkInTime ? format12Hour(staff.checkInTime) : '—'}
                      </span>
                    </div>

                    <div className="today-att-mobile-row">
                      <span className="today-att-mobile-label">
                        <CalendarCheck size={13} /> Duration / Type:
                      </span>
                      <span className={`duration-tag ${isOnLeave ? 'leave' : ''}`}>
                        {isOnLeave ? staff.leaveReason || 'Approved Leave' : liveDuration}
                      </span>
                    </div>

                    <div className="today-att-mobile-row">
                      <span className="today-att-mobile-label">
                        {staff.category === 'SUPPORT_AGENT' ? <Headset size={13} /> : <MapPin size={13} />} Location:
                      </span>
                      <span className="today-att-mobile-val" style={{ maxWidth: '60%', textAlign: 'right' }}>
                        {staff.department}
                      </span>
                    </div>
                  </div>

                  <div className="today-att-mobile-footer">
                    {renderStatusPill(staff.status)}

                    {onViewAllAgents && (
                      <button
                        type="button"
                        onClick={onViewAllAgents}
                        className="list-btn list-btn-outline touch-target"
                        style={{ padding: '6px 12px', fontSize: '12px', minHeight: '36px' }}
                      >
                        <ExternalLink size={12} />
                        <span>Details</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
