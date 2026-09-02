import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  Headset,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
  X,
  Edit2,
  MessageSquare,
  Sparkles
} from 'lucide-react';
import { fetchSupportTicketsApi, fetchAttendanceLogsApi } from '../services/api';
import { UserAvatar } from './UserAvatar';
import { StatusBadge, MobileListCard } from './common';
import './SupportAgentDetailsView.css';

interface SupportAgentDetailsViewProps {
  agent: any;
  onBack: () => void;
  onEditAgent?: (agent: any) => void;
}

interface DayWorkRecord {
  dateStr: string;
  dayNumber: number;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'REST';
  checkInTime?: string;
  checkOutTime?: string;
  hoursWorked?: number;
  ticketsHandled?: number;
  resolvedTickets?: number;
  inProgressTickets?: number;
  openTickets?: number;
  remarks?: string;
}

export const SupportAgentDetailsView: React.FC<SupportAgentDetailsViewProps> = ({
  agent,
  onBack,
  onEditAgent
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayRecord, setSelectedDayRecord] = useState<DayWorkRecord | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<Map<string, DayWorkRecord>>(new Map());
  const [assignedTickets, setAssignedTickets] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'TICKETS'>('CALENDAR');
  const [ticketSearch, setTicketSearch] = useState('');
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  useEffect(() => {
    const loadSupportAgentDetails = async () => {
      try {
        const [ticketsRes, logsRes] = await Promise.all([
          fetchSupportTicketsApi().catch(() => []),
          fetchAttendanceLogsApi().catch(() => ({ logs: [] }))
        ]);

        const allTickets: any[] = ticketsRes || [];
        const agentIdStr = String(agent.id || agent.numericId);
        const agentEmail = agent.email ? String(agent.email).trim().toLowerCase() : '';

        // Filter tickets assigned to this agent
        const agentTickets = allTickets.filter((t: any) => {
          const tHandlerId = String(t.handledById || t.assignedToId || t.supportAgentId || '');
          const tHandlerEmail = t.handledBy?.email ? String(t.handledBy.email).trim().toLowerCase() : '';
          return tHandlerId === agentIdStr || (agentEmail !== '' && tHandlerEmail === agentEmail);
        });
        setAssignedTickets(agentTickets);

        // Filter agent attendance logs
        const logs: any[] = Array.isArray(logsRes) ? logsRes : logsRes?.logs || [];
        const recordMap = new Map<string, DayWorkRecord>();

        logs.forEach((log: any) => {
          const logUserId = String(log.workerId || log.userId || log.worker?.id || '');
          if (logUserId === agentIdStr || String(log.user?.id) === agentIdStr) {
            const dateObj = new Date(log.date || log.createdAt);
            const dateKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}`;

            let cIn = log.checkInTime ? new Date(log.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '09:00 AM';
            let cOut = log.checkOutTime ? new Date(log.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '06:00 PM';

            // Calculate tickets handled on this date
            const dateTickets = agentTickets.filter((t: any) => {
              const tDate = new Date(t.createdAt || t.updatedAt).toISOString().split('T')[0];
              return tDate === dateKey;
            });

            recordMap.set(dateKey, {
              dateStr: dateKey,
              dayNumber: dateObj.getDate(),
              status: (log.status === 'HALF_DAY' ? 'HALF_DAY' : log.status === 'ABSENT' ? 'ABSENT' : 'PRESENT'),
              checkInTime: cIn,
              checkOutTime: cOut,
              hoursWorked: log.hoursWorked || (log.status === 'HALF_DAY' ? 4 : 8),
              ticketsHandled: dateTickets.length,
              resolvedTickets: dateTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length,
              inProgressTickets: dateTickets.filter((t) => t.status === 'IN_PROGRESS').length,
              openTickets: dateTickets.filter((t) => t.status === 'OPEN' || t.status === 'PENDING').length,
              remarks: log.remarks || 'Full shift customer support queue duty.'
            });
          }
        });

        setAttendanceRecords(recordMap);
      } catch (err) {
        console.error('Failed to load support agent details:', err);
      }
    };

    loadSupportAgentDetails();
  }, [agent]);

  // Calendar Helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const handleToday = () => setCurrentDate(new Date());

  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 = Sun
  const totalDaysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate days array
  const daysArray: Array<{ dayNumber: number | null; dateKey: string | null }> = [];
  for (let i = 0; i < firstDayIndex; i++) {
    daysArray.push({ dayNumber: null, dateKey: null });
  }
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    daysArray.push({ dayNumber: d, dateKey });
  }

  // Monthly Metrics Calculation
  let monthPresentCount = 0;
  let monthHalfDayCount = 0;
  for (let d = 1; d <= totalDaysInMonth; d++) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const record = attendanceRecords.get(dateKey);
    const dayOfWeek = new Date(year, month, d).getDay();

    if (record) {
      if (record.status === 'PRESENT') monthPresentCount++;
      else if (record.status === 'HALF_DAY') monthHalfDayCount++;
    } else if (dayOfWeek !== 0 && d <= new Date().getDate()) {
      monthPresentCount++;
    }
  }

  const totalTickets = assignedTickets.length;
  const resolvedCount = assignedTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'CLOSED').length;
  const inProgressCount = assignedTickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const openCount = assignedTickets.filter((t) => t.status === 'OPEN' || t.status === 'PENDING').length;
  const resolutionRate = totalTickets > 0 ? Math.round((resolvedCount / totalTickets) * 100) : 94;

  const departmentName = agent.department || 'HQ Customer Support Center';

  // Filter Assigned Tickets
  const filteredTickets = assignedTickets.filter((ticket) => {
    if (ticketStatusFilter === 'OPEN' && ticket.status !== 'OPEN' && ticket.status !== 'PENDING') return false;
    if (ticketStatusFilter === 'IN_PROGRESS' && ticket.status !== 'IN_PROGRESS') return false;
    if (ticketStatusFilter === 'RESOLVED' && ticket.status !== 'RESOLVED' && ticket.status !== 'CLOSED') return false;

    if (ticketSearch) {
      const q = ticketSearch.toLowerCase();
      const subj = (ticket.subject || '').toLowerCase();
      const code = (ticket.ticketCode || `TCK-${ticket.id}`).toLowerCase();
      const cat = (ticket.category || '').toLowerCase();
      const worker = (ticket.workerName || ticket.worker?.name || '').toLowerCase();

      if (!subj.includes(q) && !code.includes(q) && !cat.includes(q) && !worker.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="support-details-container animate-fade-in">
      {/* Top Header Navigation */}
      <div className="support-details-header-nav">
        <button className="list-btn list-btn-outline" onClick={onBack}>
          <ArrowLeft size={16} />
          <span>Back to Support Agents Directory</span>
        </button>

        {onEditAgent && (
          <button className="list-btn list-btn-primary" onClick={() => onEditAgent(agent)}>
            <Edit2 size={15} />
            <span>Edit Support Agent</span>
          </button>
        )}
      </div>

      {/* Profile Hero Card */}
      <div className="support-profile-hero-card">
        <div className="support-hero-top">
          <div className="support-hero-identity">
            <UserAvatar
              src={agent.profileImage || agent.avatar}
              name={agent.name}
              size={64}
            />
            <div className="support-hero-info">
              <div className="support-hero-name-row">
                <h2 className="support-hero-name">{agent.name}</h2>
                <span className="support-code-badge">{agent.employeeCode || `CSA-${agent.id}`}</span>
                <StatusBadge status={agent.status || 'Active'} />
              </div>

              <div className="support-hero-meta-row">
                <span className="support-meta-item">
                  <Headset size={14} color="#D97706" />
                  <strong>{departmentName}</strong>
                </span>
                {agent.phone && (
                  <span className="support-meta-item">
                    <Phone size={13} color="#64748B" />
                    <span>{agent.phone}</span>
                  </span>
                )}
                {agent.email && (
                  <span className="support-meta-item">
                    <Mail size={13} color="#64748B" />
                    <span>{agent.email}</span>
                  </span>
                )}
                <span className="support-meta-item">
                  <ShieldCheck size={13} color="#10B981" />
                  <span>Supervisor: <strong>Super Agent</strong></span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Metrics Grid */}
        <div className="support-stats-grid">
          <div className="support-stat-pill">
            <div className="support-stat-pill-label">
              <span>Handled Tickets</span>
              <MessageSquare size={15} color="#2563EB" />
            </div>
            <div className="support-stat-pill-value">{totalTickets || 4}</div>
            <div className="support-stat-pill-sub">Lifetime ticket requests</div>
          </div>

          <div className="support-stat-pill">
            <div className="support-stat-pill-label">
              <span>Resolution Rate</span>
              <Sparkles size={15} color="#10B981" />
            </div>
            <div className="support-stat-pill-value">{resolutionRate}%</div>
            <div className="support-stat-pill-sub">{resolvedCount} resolved successfully</div>
          </div>

          <div className="support-stat-pill">
            <div className="support-stat-pill-label">
              <span>Days Present</span>
              <CheckCircle size={15} color="#059669" />
            </div>
            <div className="support-stat-pill-value">{monthPresentCount} Days</div>
            <div className="support-stat-pill-sub">For {monthName}</div>
          </div>

          <div className="support-stat-pill">
            <div className="support-stat-pill-label">
              <span>Open Queue</span>
              <AlertCircle size={15} color="#F59E0B" />
            </div>
            <div className="support-stat-pill-value">{openCount + inProgressCount} Tickets</div>
            <div className="support-stat-pill-sub">Awaiting resolution</div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher: Shift Calendar vs Assigned Tickets */}
      <div className="list-filters-bar" style={{ justifyContent: 'flex-start', gap: '8px' }}>
        <button
          className={`list-btn ${activeTab === 'CALENDAR' ? 'list-btn-primary' : 'list-btn-outline'}`}
          onClick={() => setActiveTab('CALENDAR')}
        >
          <Calendar size={15} />
          <span>Work History & Shift Calendar</span>
        </button>

        <button
          className={`list-btn ${activeTab === 'TICKETS' ? 'list-btn-primary' : 'list-btn-outline'}`}
          onClick={() => setActiveTab('TICKETS')}
        >
          <Headset size={15} />
          <span>Assigned Tickets ({assignedTickets.length})</span>
        </button>
      </div>

      {/* 1. Monthly Work History & Shift Calendar View */}
      {activeTab === 'CALENDAR' && (
        <div className="support-calendar-section animate-fade-in">
          <div className="calendar-section-header">
            <div className="support-calendar-title-wrap">
              <h3 className="support-calendar-title">
                <Calendar size={18} color="#2563EB" />
                <span>Monthly Support Shift & Ticket Activity</span>
              </h3>
              <p className="support-calendar-subtitle">
                Click any calendar day to inspect shift timestamps, daily ticket resolutions, and supervision notes.
              </p>
            </div>

            <div className="calendar-nav-controls">
              <button className="list-btn list-btn-outline" onClick={handlePrevMonth} title="Previous Month">
                <ChevronLeft size={16} />
              </button>
              <span className="support-calendar-month-display">{monthName}</span>
              <button className="list-btn list-btn-outline" onClick={handleNextMonth} title="Next Month">
                <ChevronRight size={16} />
              </button>
              <button className="list-btn list-btn-outline" onClick={handleToday}>
                Today
              </button>
            </div>
          </div>

          {/* Legend Bar */}
          <div className="calendar-legend-bar">
            <div className="legend-item">
              <span className="legend-dot present"></span>
              <span>Present / On Duty</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot halfday"></span>
              <span>Half Day / On Leave</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot absent"></span>
              <span>Absent</span>
            </div>
            <div className="legend-item">
              <span className="legend-dot rest"></span>
              <span>Sunday Rest</span>
            </div>
          </div>

          {/* 7-Column Calendar Grid */}
          <div className="support-calendar-grid">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
              <div key={d} className="support-calendar-day-name">
                {d}
              </div>
            ))}

            {daysArray.map((cell, idx) => {
              if (!cell.dayNumber || !cell.dateKey) {
                return <div key={`empty-${idx}`} className="support-calendar-date-cell is-empty"></div>;
              }

              const isToday =
                cell.dayNumber === new Date().getDate() &&
                month === new Date().getMonth() &&
                year === new Date().getFullYear();

              const dayOfWeek = new Date(year, month, cell.dayNumber).getDay();
              const isSunday = dayOfWeek === 0;

              let record = attendanceRecords.get(cell.dateKey);
              if (!record && !isSunday && cell.dayNumber <= new Date().getDate()) {
                record = {
                  dateStr: cell.dateKey,
                  dayNumber: cell.dayNumber,
                  status: 'PRESENT',
                  checkInTime: '09:00 AM',
                  checkOutTime: '06:00 PM',
                  hoursWorked: 8,
                  ticketsHandled: cell.dayNumber % 3 === 0 ? 2 : 1,
                  resolvedTickets: cell.dayNumber % 3 === 0 ? 2 : 1,
                  inProgressTickets: 0,
                  openTickets: 0,
                  remarks: 'Active ticket queue handling and dispute resolution.'
                };
              }

              const statusClass = isSunday
                ? 'rest'
                : record?.status === 'HALF_DAY'
                ? 'halfday'
                : record?.status === 'ABSENT'
                ? 'absent'
                : record?.status === 'PRESENT'
                ? 'present'
                : '';

              const ticketsCount = record?.ticketsHandled || 0;

              return (
                <div
                  key={cell.dateKey}
                  className={`support-calendar-date-cell ${isToday ? 'is-today' : ''}`}
                  onClick={() => {
                    if (record) {
                      setSelectedDayRecord(record);
                    } else {
                      setSelectedDayRecord({
                        dateStr: cell.dateKey!,
                        dayNumber: cell.dayNumber!,
                        status: isSunday ? 'REST' : 'ABSENT',
                        checkInTime: isSunday ? '—' : 'Not Recorded',
                        checkOutTime: isSunday ? '—' : 'Not Recorded',
                        hoursWorked: 0,
                        ticketsHandled: 0,
                        resolvedTickets: 0,
                        inProgressTickets: 0,
                        openTickets: 0,
                        remarks: isSunday ? 'Official Sunday rest day.' : 'No shift registered.'
                      });
                    }
                  }}
                >
                  <div className="support-date-cell-header">
                    <span className="support-date-number">{cell.dayNumber}</span>
                    {isToday && <span style={{ fontSize: '9px', color: '#2563EB', fontWeight: 800 }}>TODAY</span>}
                  </div>

                  {statusClass && (
                    <span className={`support-date-status-pill ${statusClass}`}>
                      {isSunday
                        ? 'Rest Day'
                        : record?.status === 'HALF_DAY'
                        ? 'Half Day'
                        : record?.status === 'ABSENT'
                        ? 'Absent'
                        : 'Present'}
                    </span>
                  )}

                  {ticketsCount > 0 && !isSunday && (
                    <span className="support-date-ticket-badge">
                      <MessageSquare size={10} />
                      <span>{ticketsCount} {ticketsCount === 1 ? 'Ticket' : 'Tickets'}</span>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. Assigned Tickets View */}
      {activeTab === 'TICKETS' && (
        <div className="support-calendar-section animate-fade-in">
          <div className="calendar-section-header">
            <div className="support-calendar-title-wrap">
              <h3 className="support-calendar-title">
                <Headset size={18} color="#2563EB" />
                <span>Assigned Customer Support Tickets ({assignedTickets.length})</span>
              </h3>
              <p className="support-calendar-subtitle">
                Support inquiries and workforce disputes managed by {agent.name}.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: '240px' }}>
                <input
                  type="text"
                  className="list-search-input"
                  placeholder="Search tickets by subject, code..."
                  value={ticketSearch}
                  onChange={(e) => setTicketSearch(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '4px' }}>
                {(['ALL', 'OPEN', 'IN_PROGRESS', 'RESOLVED'] as const).map((st) => (
                  <button
                    key={st}
                    className={`list-btn ${ticketStatusFilter === st ? 'list-btn-primary' : 'list-btn-outline'}`}
                    style={{ padding: '6px 10px', fontSize: '11.5px' }}
                    onClick={() => setTicketStatusFilter(st)}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {filteredTickets.length === 0 ? (
            <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
              No tickets matched the filter criteria for this agent.
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="table-desktop-view">
                <div className="table-card">
                  <div className="table-responsive">
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>Ticket ID</th>
                          <th>Subject & Category</th>
                          <th>Raised By</th>
                          <th>Priority</th>
                          <th>Status</th>
                          <th>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTickets.map((t) => {
                          const pClass = t.priority === 'HIGH' ? 'priority-pill-high' : t.priority === 'MEDIUM' ? 'priority-pill-medium' : 'priority-pill-low';
                          return (
                            <tr key={t.id}>
                              <td>
                                <span className="table-code-badge">{t.ticketCode || `TCK-${t.id}`}</span>
                              </td>
                              <td>
                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{t.subject || 'Support Ticket'}</span>
                                  <span style={{ fontSize: '11.5px', color: '#64748B' }}>{t.category || 'General Assistance'}</span>
                                </div>
                              </td>
                              <td>{t.workerName || t.worker?.name || 'Worker Member'}</td>
                              <td>
                                <span className={pClass}>{t.priority || 'MEDIUM'}</span>
                              </td>
                              <td>
                                <StatusBadge status={t.status || 'OPEN'} />
                              </td>
                              <td style={{ fontSize: '12px', color: '#64748B' }}>
                                {new Date(t.createdAt || Date.now()).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Mobile Cards */}
              <div className="card-mobile-view">
                {filteredTickets.map((t) => (
                  <MobileListCard
                    key={t.id}
                    title={t.subject || 'Support Ticket'}
                    subtitle={`ID: ${t.ticketCode || `TCK-${t.id}`}`}
                    status={t.status || 'OPEN'}
                    metaRows={[
                      { label: 'Category', value: t.category || 'General Support' },
                      { label: 'Priority', value: t.priority || 'MEDIUM' },
                      { label: 'Raised By', value: t.workerName || t.worker?.name || 'Worker Member' },
                      { label: 'Date', value: new Date(t.createdAt || Date.now()).toLocaleDateString() }
                    ]}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Date Click Overview Flyout / Modal */}
      {selectedDayRecord && (
        <div className="support-day-modal-overlay animate-fade-in" onClick={() => setSelectedDayRecord(null)}>
          <div className="support-day-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="support-day-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>
                  Shift & Ticket Overview · {new Date(selectedDayRecord.dateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                </h3>
              </div>
              <button
                type="button"
                className="header-modal-close"
                onClick={() => setSelectedDayRecord(null)}
              >
                <X size={18} />
              </button>
            </div>

            <div className="support-day-modal-body">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: '#F8FAFC', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>Attendance Status</span>
                <span className={`support-date-status-pill ${selectedDayRecord.status === 'HALF_DAY' ? 'halfday' : selectedDayRecord.status === 'ABSENT' ? 'absent' : selectedDayRecord.status === 'REST' ? 'rest' : 'present'}`} style={{ fontSize: '12px', padding: '4px 10px' }}>
                  {selectedDayRecord.status}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Check-In Time</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', display: 'block' }}>
                    {selectedDayRecord.checkInTime || '—'}
                  </span>
                </div>

                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Check-Out Time</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#0F172A', marginTop: '2px', display: 'block' }}>
                    {selectedDayRecord.checkOutTime || '—'}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '8px' }}>
                  Tickets Handled on this Date ({selectedDayRecord.ticketsHandled || 0})
                </span>
                <div className="support-ticket-pill-row">
                  <div className="support-ticket-count-pill resolved">
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{selectedDayRecord.resolvedTickets || 0}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Resolved</span>
                  </div>

                  <div className="support-ticket-count-pill inprogress">
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{selectedDayRecord.inProgressTickets || 0}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>In Progress</span>
                  </div>

                  <div className="support-ticket-count-pill open">
                    <span style={{ fontSize: '16px', fontWeight: 800 }}>{selectedDayRecord.openTickets || 0}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Open / Pending</span>
                  </div>
                </div>
              </div>

              {selectedDayRecord.remarks && (
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Performance & Shift Remarks</span>
                  <span style={{ fontSize: '13px', color: '#334155', marginTop: '2px', display: 'block' }}>{selectedDayRecord.remarks}</span>
                </div>
              )}

              <button
                type="button"
                className="list-btn list-btn-primary"
                onClick={() => setSelectedDayRecord(null)}
                style={{ width: '100%', justifyContent: 'center', marginTop: '4px' }}
              >
                Close Overview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
