import React, { useState, useEffect, useRef } from 'react';
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
  Calendar,
  UserX,
  CheckCheck,
} from 'lucide-react';
import { fetchTodayStaffAttendanceApi } from '../services/api';
import { getSocket } from '../services/socket';
import { UserAvatar } from './UserAvatar';
import './TodayAgentAttendanceTable.css';

type AttendanceStatus = 'PRESENT' | 'COMPLETED' | 'ON_LEAVE' | 'ABSENT' | 'NOT_CHECKED_IN';

interface StaffRecord {
  userId: number;
  name: string;
  employeeCode: string;
  role: string;
  category: 'FIELD_AGENT' | 'SUPPORT_AGENT';
  designation: string;
  siteName: string | null;
  profileImage: string | null;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  leaveReason: string | null;
  leaveType: string | null;
}

interface TodayAgentAttendanceTableProps {
  onViewAllAgents?: () => void;
}

/** Format ISO timestamp → "08:30 AM" */
const formatTime = (iso: string | null): string => {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
};

/** Compute elapsed or total duration from check-in/out timestamps */
const computeDuration = (checkInISO: string | null, checkOutISO: string | null): string => {
  if (!checkInISO) return '—';
  const start = new Date(checkInISO).getTime();
  const end = checkOutISO ? new Date(checkOutISO).getTime() : Date.now();
  const diffMs = Math.max(0, end - start);
  const hours = Math.floor(diffMs / 3_600_000);
  const mins = Math.floor((diffMs % 3_600_000) / 60_000);
  return `${hours}h ${mins}m`;
};

export const TodayAgentAttendanceTable: React.FC<TodayAgentAttendanceTableProps> = ({
  onViewAllAgents,
}) => {
  type FilterTab = 'ALL' | 'FIELD_AGENT' | 'SUPPORT_AGENT' | 'LEAVE' | 'ABSENT';
  const [activeTab, setActiveTab] = useState<FilterTab>('ALL');
  const [staffList, setStaffList] = useState<StaffRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Tick counter to force re-render of live duration timers every 60s
  const [tick, setTick] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAttendance = async () => {
    try {
      const data = await fetchTodayStaffAttendanceApi();
      setStaffList(data);
    } catch (err) {
      console.error('Failed to load today staff attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();

    const socket = getSocket();
    const handleRefresh = () => loadAttendance();

    // Listen for real-time attendance & leave changes
    socket.on('attendance:staff:updated', handleRefresh);
    socket.on('attendance:updated', handleRefresh);
    socket.on('leave:staff:updated', handleRefresh);
    socket.on('leave:updated', handleRefresh);

    // Live tick every 60s to update "Present" durations
    timerRef.current = setInterval(() => setTick((t) => t + 1), 60_000);

    return () => {
      socket.off('attendance:staff:updated', handleRefresh);
      socket.off('attendance:updated', handleRefresh);
      socket.off('leave:staff:updated', handleRefresh);
      socket.off('leave:updated', handleRefresh);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Tab counts
  const allCount = staffList.length;
  const fieldAgentCount = staffList.filter((s) => s.category === 'FIELD_AGENT' && s.status !== 'ON_LEAVE').length;
  const supportCount = staffList.filter((s) => s.category === 'SUPPORT_AGENT' && s.status !== 'ON_LEAVE').length;
  const leaveCount = staffList.filter((s) => s.status === 'ON_LEAVE').length;
  const absentCount = staffList.filter((s) => s.status === 'ABSENT' || s.status === 'NOT_CHECKED_IN').length;

  const filteredStaff = staffList.filter((s) => {
    if (activeTab === 'FIELD_AGENT') return s.category === 'FIELD_AGENT' && s.status !== 'ON_LEAVE';
    if (activeTab === 'SUPPORT_AGENT') return s.category === 'SUPPORT_AGENT' && s.status !== 'ON_LEAVE';
    if (activeTab === 'LEAVE') return s.status === 'ON_LEAVE';
    if (activeTab === 'ABSENT') return s.status === 'ABSENT' || s.status === 'NOT_CHECKED_IN';
    return true;
  });

  const StatusBadge: React.FC<{ status: AttendanceStatus }> = ({ status }) => {
    if (status === 'PRESENT') {
      return (
        <span className="status-pill-present">
          <span className="status-dot-green" />
          <span>Present</span>
        </span>
      );
    }
    if (status === 'COMPLETED') {
      return (
        <span className="status-pill-completed">
          <CheckCheck size={12} />
          <span>Completed</span>
        </span>
      );
    }
    if (status === 'ON_LEAVE') {
      return (
        <span className="status-pill-leave">
          <span className="status-dot-amber" />
          <span>On Leave</span>
        </span>
      );
    }
    if (status === 'ABSENT') {
      return (
        <span className="status-pill-absent">
          <span className="status-dot-red" />
          <span>Absent</span>
        </span>
      );
    }
    return (
      <span className="status-pill-not-checked-in">
        <span className="status-dot-gray" />
        <span>Not Checked In</span>
      </span>
    );
  };

  const CheckInCell: React.FC<{ staff: StaffRecord }> = ({ staff }) => {
    if (staff.status === 'ON_LEAVE') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#B45309', fontWeight: 600 }}>
          <Palmtree size={13} color="#D97706" />
          <span>On Leave</span>
        </div>
      );
    }
    if (staff.status === 'ABSENT') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#DC2626', fontWeight: 600 }}>
          <UserX size={13} />
          <span>—</span>
        </div>
      );
    }
    if (staff.status === 'NOT_CHECKED_IN') {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#94A3B8', fontWeight: 600 }}>
          <Clock size={13} />
          <span>Pending</span>
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600, color: 'var(--text-primary)' }}>
        <Clock size={13} color="#64748B" />
        <span>{formatTime(staff.checkInTime)}</span>
      </div>
    );
  };

  const DurationCell: React.FC<{ staff: StaffRecord }> = ({ staff }) => {
    if (staff.status === 'ON_LEAVE') {
      return (
        <span className="duration-tag leave">
          <Calendar size={11} />
          <span>{staff.leaveType || 'Approved Leave'}</span>
        </span>
      );
    }
    if (staff.status === 'ABSENT' || staff.status === 'NOT_CHECKED_IN') {
      return <span style={{ color: '#94A3B8', fontSize: '13px' }}>—</span>;
    }
    if (staff.status === 'COMPLETED') {
      return (
        <span className="duration-tag completed">
          <CheckCheck size={11} />
          <span>{computeDuration(staff.checkInTime, staff.checkOutTime)}</span>
        </span>
      );
    }
    // PRESENT — live (tick forces recompute every 60s)
    return (
      <span className="duration-tag">
        <span data-tick={tick}>{computeDuration(staff.checkInTime, null)}</span>
      </span>
    );
  };

  return (
    <div className="today-attendance-card animate-fade-in">
      {/* Header & Tab Filters */}
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
            <span className="today-att-count-badge">{fieldAgentCount}</span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'SUPPORT_AGENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('SUPPORT_AGENT')}
          >
            <span>🎧 Support Staff</span>
            <span className="today-att-count-badge">{supportCount}</span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'LEAVE' ? 'active' : ''}`}
            onClick={() => setActiveTab('LEAVE')}
          >
            <span>🏖️ On Leave</span>
            <span
              className="today-att-count-badge"
              style={{
                backgroundColor: activeTab === 'LEAVE' ? '#D97706' : '#FEF3C7',
                color: activeTab === 'LEAVE' ? '#FFF' : '#B45309',
              }}
            >
              {leaveCount}
            </span>
          </button>

          <button
            type="button"
            className={`today-att-tab-btn ${activeTab === 'ABSENT' ? 'active' : ''}`}
            onClick={() => setActiveTab('ABSENT')}
          >
            <span>🔴 Absent</span>
            <span
              className="today-att-count-badge"
              style={{
                backgroundColor: activeTab === 'ABSENT' ? '#DC2626' : '#FEF2F2',
                color: activeTab === 'ABSENT' ? '#FFF' : '#DC2626',
              }}
            >
              {absentCount}
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
          {/* DESKTOP & TABLET VIEW */}
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
                  {filteredStaff.map((staff) => (
                    <tr key={staff.userId}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <UserAvatar src={staff.profileImage || undefined} name={staff.name} size={34} />
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

                      <td><CheckInCell staff={staff} /></td>
                      <td><DurationCell staff={staff} /></td>

                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                          {staff.category === 'SUPPORT_AGENT' ? (
                            <>
                              <Headset size={13} color="#D97706" />
                              <span>{staff.siteName || 'HQ Support Center'}</span>
                            </>
                          ) : (
                            <>
                              <MapPin size={13} color="#4F46E5" />
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                {staff.siteName || '—'}
                              </span>
                            </>
                          )}
                        </div>
                      </td>

                      <td><StatusBadge status={staff.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE VIEW */}
          <div className="today-att-mobile-list">
            {filteredStaff.map((staff) => (
              <div key={staff.userId} className="today-att-mobile-card">
                <div className="today-att-mobile-header">
                  <div className="today-att-mobile-user">
                    <UserAvatar src={staff.profileImage || undefined} name={staff.name} size={36} />
                    <div>
                      <h4 className="today-att-mobile-name">{staff.name}</h4>
                      <span className="today-att-mobile-code">{staff.employeeCode}</span>
                    </div>
                  </div>
                  {staff.category === 'SUPPORT_AGENT' ? (
                    <span className="role-pill-support"><Headset size={11} /> Support</span>
                  ) : (
                    <span className="role-pill-agent"><UserCheck size={11} /> Agent</span>
                  )}
                </div>

                <div className="today-att-mobile-body">
                  <div className="today-att-mobile-row">
                    <span className="today-att-mobile-label"><Clock size={13} /> Check-In:</span>
                    <span className="today-att-mobile-val" style={{ fontWeight: 700 }}>
                      {staff.status === 'ON_LEAVE' ? 'On Leave'
                        : staff.status === 'ABSENT' || staff.status === 'NOT_CHECKED_IN' ? '—'
                        : formatTime(staff.checkInTime)}
                    </span>
                  </div>

                  <div className="today-att-mobile-row">
                    <span className="today-att-mobile-label"><CalendarCheck size={13} /> Duration:</span>
                    <DurationCell staff={staff} />
                  </div>

                  <div className="today-att-mobile-row">
                    <span className="today-att-mobile-label">
                      {staff.category === 'SUPPORT_AGENT' ? <Headset size={13} /> : <MapPin size={13} />} Site:
                    </span>
                    <span className="today-att-mobile-val" style={{ maxWidth: '60%', textAlign: 'right' }}>
                      {staff.category === 'SUPPORT_AGENT' ? (staff.siteName || 'HQ Support Center') : (staff.siteName || '—')}
                    </span>
                  </div>
                </div>

                <div className="today-att-mobile-footer">
                  <StatusBadge status={staff.status} />
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
            ))}
          </div>
        </>
      )}
    </div>
  );
};

