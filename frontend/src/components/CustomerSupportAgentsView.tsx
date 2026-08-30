import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  MoreVertical,
  ChevronRight,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Edit2,
  Trash2,
  ExternalLink,
  X
} from 'lucide-react';
import { fetchAgentsApi, fetchUsersApi, fetchSupportTicketsApi, fetchAttendanceLogsApi, deleteUserApi } from '../services/api';
import { getSocket } from '../services/socket';
import { UserAvatar } from './UserAvatar';
import { SupportAgentModal } from './SupportAgentModal';

interface CustomerSupportAgentsViewProps {
  onNavigateTab: (tab: string) => void;
}

export const CustomerSupportAgentsView: React.FC<CustomerSupportAgentsViewProps> = ({ onNavigateTab }) => {
  const detailsSectionRef = useRef<HTMLDivElement>(null);

  // Support Agents State
  const [supportAgents, setSupportAgents] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<any | null>(null);

  // Real DB Data States
  const [allDbTickets, setAllDbTickets] = useState<any[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState<any | null>(null);
  const [actionMenuAgentId, setActionMenuAgentId] = useState<string | number | null>(null);

  // Ticket Status Filter State for Agent Detail View
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'RESOLVED'>('ALL');

  // Work History Calendar State (Defaulting to Today's Date)
  const todayDateObj = new Date();
  const [calMonth, setCalMonth] = useState<Date>(todayDateObj);
  const [selectedCalDay, setSelectedCalDay] = useState<number>(todayDateObj.getDate());
  const [filterByCalendarDate, setFilterByCalendarDate] = useState<boolean>(false);

  const handleSelectAgent = (agent: any) => {
    setSelectedAgent(agent);
    setTimeout(() => {
      detailsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const loadData = async () => {
    try {
      const [usersData, agentsData, ticketsData, attendanceData] = await Promise.all([
        fetchUsersApi().catch(() => []),
        fetchAgentsApi().catch(() => []),
        fetchSupportTicketsApi().catch(() => []),
        fetchAttendanceLogsApi().catch(() => ({ logs: [] }))
      ]);

      setAllDbTickets(ticketsData || []);
      setAttendanceLogs(attendanceData?.logs || (Array.isArray(attendanceData) ? attendanceData : []));

      // Map REAL backend users directly from PostgreSQL database
      const realSupportAgents: any[] = [];
      const combinedUsers = [...usersData, ...agentsData];

      combinedUsers.forEach((a: any) => {
        if (!a || !a.id) return;
        const code = (a.employeeCode || '').toUpperCase();
        const des = (a.designation || '').toLowerCase();
        const role = (a.role || '').toUpperCase();
        const aEmail = a.email ? String(a.email).trim().toLowerCase() : '';

        const isSupportAgent = (
          code.startsWith('CSA') ||
          des.includes('support') ||
          role === 'CUSTOMER_SUPPORT' ||
          role === 'SUPPORT_AGENT'
        ) && role !== 'SUPER_AGENT' && role !== 'WORKER' && !code.startsWith('SA-') && !code.startsWith('WRK');

        if (isSupportAgent) {
          const exists = realSupportAgents.some(m => {
            const mId = String(m.id);
            const mEmail = m.email ? String(m.email).trim().toLowerCase() : '';
            return mId === String(a.id) || (aEmail !== '' && mEmail !== '' && mEmail === aEmail);
          });

          if (!exists) {
            realSupportAgents.push({
              id: String(a.id),
              numericId: a.id,
              name: a.name || 'Support Agent',
              employeeCode: a.employeeCode || `CSA-${a.id}`,
              email: a.email || `${(a.name || 'agent').toLowerCase().replace(/\s+/g, '.')}@union.com`,
              phone: a.phone || '+91 98765 43210',
              joinedDate: a.joiningDate ? new Date(a.joiningDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '01 Jan, 2024',
              status: a.status || (a.active !== false ? 'Active' : 'Inactive'),
              avatar: a.avatar || a.profileImage || ''
            });
          }
        }
      });

      setSupportAgents(realSupportAgents);
      setSelectedAgent((prev: any) => {
        if (prev) {
          const prevEmail = prev.email ? String(prev.email).trim().toLowerCase() : '';
          const match = realSupportAgents.find((m: any) => {
            const mId = String(m.id);
            const mEmail = m.email ? String(m.email).trim().toLowerCase() : '';
            return mId === String(prev.id) || (prevEmail !== '' && mEmail !== '' && mEmail === prevEmail);
          });
          if (match) return match;
        }
        return realSupportAgents.length > 0 ? realSupportAgents[0] : null;
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleSocketUpdate = () => {
      loadData();
    };

    socket.on('ticket:created', handleSocketUpdate);
    socket.on('ticket:updated', handleSocketUpdate);
    socket.on('ticket:assigned', handleSocketUpdate);
    socket.on('attendance:updated', handleSocketUpdate);
    socket.on('attendance:marked', handleSocketUpdate);
    socket.on('attendance:check-in', handleSocketUpdate);
    socket.on('attendance:check-out', handleSocketUpdate);

    const interval = setInterval(loadData, 10000);
    return () => {
      socket.off('ticket:created', handleSocketUpdate);
      socket.off('ticket:updated', handleSocketUpdate);
      socket.off('ticket:assigned', handleSocketUpdate);
      socket.off('attendance:updated', handleSocketUpdate);
      socket.off('attendance:marked', handleSocketUpdate);
      socket.off('attendance:check-in', handleSocketUpdate);
      socket.off('attendance:check-out', handleSocketUpdate);
      clearInterval(interval);
    };
  }, []);

  const isTicketAssignedToAgent = (t: any, agent: any) => {
    if (!agent) return false;
    const agentIdStr = String(agent.id || agent.numericId || '');
    const agentNumId = Number(agent.numericId || agent.id || 0);
    const agentName = (agent.name || '').trim().toLowerCase();

    const hId = t.handledById !== undefined && t.handledById !== null ? String(t.handledById) : '';
    const hByObj = t.handledBy;
    const hByName = typeof hByObj === 'object' && hByObj !== null ? (hByObj.name || '').trim().toLowerCase() : (typeof hByObj === 'string' ? hByObj.trim().toLowerCase() : '');

    if (hId !== '' && (hId === agentIdStr || Number(hId) === agentNumId)) return true;
    if (hByName !== '' && agentName !== '' && (hByName === agentName || hByName.includes(agentName) || agentName.includes(hByName))) return true;
    return false;
  };

  const handleDeleteAgent = async (agentId: string | number, agentName: string) => {
    if (window.confirm(`Are you sure you want to delete Support Agent ${agentName}?`)) {
      try {
        const targetNumId = Number(String(agentId).replace(/\D/g, ''));
        await deleteUserApi(targetNumId || agentId);
        await loadData();
        alert(`Support Agent ${agentName} has been deleted.`);
      } catch (err: any) {
        alert(err?.message || 'Failed to delete agent');
      }
    }
  };

  // Calendar calculations
  const calYear = calMonth.getFullYear();
  const calMonthIdx = calMonth.getMonth();
  const monthName = calMonth.toLocaleString('default', { month: 'long' });
  const totalDaysInMonth = new Date(calYear, calMonthIdx + 1, 0).getDate();
  const firstDayOfWeek = new Date(calYear, calMonthIdx, 1).getDay(); // 0 = Sun

  const selectedDateFormatted = `${monthName} ${selectedCalDay}, ${calYear} (${new Date(calYear, calMonthIdx, selectedCalDay).toLocaleDateString('en-US', { weekday: 'long' })})`;

  // Calculate real DB tickets assigned to current selected agent
  const rawAgentDbTickets = selectedAgent ? allDbTickets.filter((t) => isTicketAssignedToAgent(t, selectedAgent)) : [];

  const agentTicketsList = rawAgentDbTickets.map((t) => {
    const createdDateObj = t.createdAt ? new Date(t.createdAt) : new Date();
    return {
      id: t.ticketId || `#TKT-${t.id}`,
      numericId: t.id,
      subject: t.subject || '—',
      createdBy: t.worker?.name ? `${t.worker.name} (Worker)` : 'Worker',
      priority: t.priority?.toUpperCase() === 'HIGH' ? 'High' : t.priority?.toUpperCase() === 'LOW' ? 'Low' : 'Medium',
      status: t.status === 'IN_PROGRESS' ? 'In Progress' : t.status === 'RESOLVED' || t.status === 'CLOSED' ? 'Resolved' : 'Open',
      rawStatus: t.status,
      date: createdDateObj.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      rawDate: createdDateObj
    };
  });

  // Dynamic ticket counts for selected agent
  const dynamicTotalTickets = agentTicketsList.length;
  const dynamicOpenTickets = agentTicketsList.filter((t) => t.status === 'Open' || t.rawStatus === 'OPEN').length;
  const dynamicInProgressTickets = agentTicketsList.filter((t) => t.status === 'In Progress' || t.rawStatus === 'IN_PROGRESS').length;
  const dynamicResolvedTickets = agentTicketsList.filter((t) => t.status === 'Resolved' || t.rawStatus === 'RESOLVED' || t.rawStatus === 'CLOSED').length;
  // Dynamic Date-Specific Attendance and Work Details Synchronization
  const targetCalDate = new Date(calYear, calMonthIdx, selectedCalDay);
  const isSelectedDateSunday = targetCalDate.getDay() === 0;

  const matchedAttendanceLog = attendanceLogs.find((log: any) => {
    const logUserId = String(log.workerId || log.userId || log.worker?.id || log.user?.id || '');
    const logWorkerName = (log.worker?.name || log.user?.name || '').trim().toLowerCase();
    const logWorkerCode = (log.worker?.employeeCode || log.user?.employeeCode || '').trim().toLowerCase();

    const targetAgentId = String(selectedAgent?.id || selectedAgent?.numericId || '');
    const targetAgentNumId = String(selectedAgent?.numericId || selectedAgent?.id || '');
    const targetAgentName = (selectedAgent?.name || '').trim().toLowerCase();
    const targetAgentCode = (selectedAgent?.employeeCode || '').trim().toLowerCase();

    const isAgentMatch =
      (logUserId !== '' && (logUserId === targetAgentId || logUserId === targetAgentNumId)) ||
      (logWorkerName !== '' && targetAgentName !== '' && (logWorkerName === targetAgentName || logWorkerName.includes(targetAgentName) || targetAgentName.includes(logWorkerName))) ||
      (logWorkerCode !== '' && targetAgentCode !== '' && logWorkerCode === targetAgentCode);

    if (!isAgentMatch) return false;

    // Compare local date components
    const checkInDate = log.checkInTime ? new Date(log.checkInTime) : (log.date ? new Date(log.date) : null);
    if (!checkInDate || isNaN(checkInDate.getTime())) return false;

    return (
      checkInDate.getFullYear() === calYear &&
      checkInDate.getMonth() === calMonthIdx &&
      checkInDate.getDate() === selectedCalDay
    );
  });

  let dailyCheckInStr = 'Not Checked In';
  let dailyCheckOutStr = 'Not Checked Out';
  let dailyDurationStr = '0h 0m';
  let dailyStatusBadgeStr = isSelectedDateSunday ? '● Weekly Off' : '● Absent';
  let dailyStatusBg = isSelectedDateSunday ? '#F1F5F9' : '#FEE2E2';
  let dailyStatusColor = isSelectedDateSunday ? '#64748B' : '#DC2626';

  if (matchedAttendanceLog && matchedAttendanceLog.checkInTime) {
    const cIn = new Date(matchedAttendanceLog.checkInTime);
    dailyCheckInStr = cIn.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    dailyStatusBadgeStr = '● Present';
    dailyStatusBg = '#DCFCE7';
    dailyStatusColor = '#15803D';

    if (matchedAttendanceLog.checkOutTime) {
      const cOut = new Date(matchedAttendanceLog.checkOutTime);
      dailyCheckOutStr = cOut.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      const diffMs = cOut.getTime() - cIn.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      dailyDurationStr = `${hours}h ${mins}m`;
    } else {
      dailyCheckOutStr = 'Working';
      const diffMs = new Date().getTime() - cIn.getTime();
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      dailyDurationStr = `${hours}h ${mins}m`;
    }
  }

  const ticketsOnSelectedDate = agentTicketsList.filter((t) => {
    if (!t.rawDate) return false;
    const d = new Date(t.rawDate);
    return d.getFullYear() === calYear && d.getMonth() === calMonthIdx && d.getDate() === selectedCalDay;
  });

  const dailyAssignedCount = filterByCalendarDate ? ticketsOnSelectedDate.length : dynamicTotalTickets;
  const dailyInProgressCount = filterByCalendarDate ? ticketsOnSelectedDate.filter(t => t.status === 'In Progress' || t.rawStatus === 'IN_PROGRESS').length : dynamicInProgressTickets;
  const dailyResolvedCount = filterByCalendarDate ? ticketsOnSelectedDate.filter(t => t.status === 'Resolved' || t.rawStatus === 'RESOLVED' || t.rawStatus === 'CLOSED').length : dynamicResolvedTickets;
  const dailyOpenCount = filterByCalendarDate ? ticketsOnSelectedDate.filter(t => t.status === 'Open' || t.rawStatus === 'OPEN').length : dynamicOpenTickets;

  const filteredTickets = agentTicketsList.filter((t) => {
    // Calendar Date filter
    if (filterByCalendarDate && t.rawDate) {
      const d = new Date(t.rawDate);
      if (d.getFullYear() !== calYear || d.getMonth() !== calMonthIdx || d.getDate() !== selectedCalDay) {
        return false;
      }
    }

    if (ticketFilter === 'OPEN') return t.status === 'Open' || t.rawStatus === 'OPEN';
    if (ticketFilter === 'IN_PROGRESS') return t.status === 'In Progress' || t.rawStatus === 'IN_PROGRESS';
    if (ticketFilter === 'RESOLVED') return t.status === 'Resolved' || t.rawStatus === 'RESOLVED' || t.rawStatus === 'CLOSED';
    return true;
  });

  return (
    <div className="customer-support-agents-container animate-fade-in" style={{ padding: '4px' }}>
      
      {/* Top View: Support Agents List & Analytics */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '28px' }}>
        
        {/* Breadcrumb Header */}
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>Dashboard</span>
          <ChevronRight size={14} />
          <span>Customer Support</span>
          <ChevronRight size={14} />
          <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>Support Agents</span>
        </div>

        {/* Overall Summary 4 Stat Cards (Dynamic Live Backend Data) */}
        {(() => {
          const overallTotal = allDbTickets.length;
          const overallOpen = allDbTickets.filter((t: any) => {
            const s = String(t.status || t.rawStatus || '').toUpperCase().trim();
            return s === 'OPEN' || s === 'UNASSIGNED';
          }).length;
          const overallInProgress = allDbTickets.filter((t: any) => {
            const s = String(t.status || t.rawStatus || '').toUpperCase().trim();
            return s === 'IN_PROGRESS' || s === 'IN PROGRESS';
          }).length;
          const overallResolved = allDbTickets.filter((t: any) => {
            const s = String(t.status || t.rawStatus || '').toUpperCase().trim();
            return s === 'RESOLVED' || s === 'CLOSED';
          }).length;

          return (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Tickets</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)' }}>{overallTotal}</h3>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>↑ System Live Sync</span>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Open Tickets</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#D97706' }}>{overallOpen}</h3>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>↑ System Live Sync</span>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>In Progress</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#9333EA' }}>{overallInProgress}</h3>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>↑ System Live Sync</span>
              </div>

              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 700 }}>Resolved</span>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '22px', fontWeight: 800, color: '#10B981' }}>{overallResolved}</h3>
                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700 }}>↑ System Live Sync</span>
              </div>
            </div>
          );
        })()}

        {/* Support Agents Table Card (Full Width) */}
        <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Customer Support Agents</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Total {supportAgents.length} support agents</span>
            </div>
            <button
              onClick={() => { setAgentToEdit(null); setIsModalOpen(true); }}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 14px',
                fontSize: '12.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Plus size={16} />
              <span>Add Support Agent</span>
            </button>
          </div>

          <div className="table-responsive">
            <table className="custom-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Agent Details</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Total Tickets</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ fontSize: '11px', textTransform: 'uppercase' }}></th>
                </tr>
              </thead>
              <tbody>
                {supportAgents.map((agent) => {
                  const agentAssignedTickets = allDbTickets.filter((t) => isTicketAssignedToAgent(t, agent));
                  const realTotalTicketsCount = agentAssignedTickets.length;
                  return (
                    <tr
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent)}
                      style={{
                        cursor: 'pointer',
                        backgroundColor: selectedAgent?.id === agent.id ? 'var(--color-workers-bg)' : 'transparent'
                      }}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <UserAvatar src={agent.avatar} name={agent.name} size={34} />
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{agent.name}</div>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{agent.employeeCode}</span>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{agent.email}</td>
                      <td>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>{realTotalTicketsCount}</div>
                        <span style={{ fontSize: '10.5px', color: '#059669', fontWeight: 700 }}>{realTotalTicketsCount > 0 ? `↑ ${realTotalTicketsCount} active` : '0 active'}</span>
                      </td>
                      <td>
                        <span style={{ backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px' }}>
                          {agent.status}
                        </span>
                      </td>
                    <td style={{ position: 'relative' }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActionMenuAgentId(actionMenuAgentId === agent.id ? null : agent.id);
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
                      >
                        <MoreVertical size={16} />
                      </button>

                      {actionMenuAgentId === agent.id && (
                        <div style={{
                          position: 'absolute',
                          right: 0,
                          top: '30px',
                          backgroundColor: 'var(--bg-card)',
                          color: 'var(--text-primary)',
                          borderRadius: '8px',
                          border: '1px solid var(--border-color)',
                          boxShadow: '0 10px 15px -3px rgba(0,0,0,0.2)',
                          zIndex: 100,
                          width: '130px',
                          overflow: 'hidden'
                        }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectAgent(agent);
                              setActionMenuAgentId(null);
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <ExternalLink size={13} /> View Profile
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setAgentToEdit(agent);
                              setIsModalOpen(true);
                              setActionMenuAgentId(null);
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: '12px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Edit2 size={13} /> Edit Agent
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteAgent(agent.id, agent.name);
                              setActionMenuAgentId(null);
                            }}
                            style={{ width: '100%', padding: '8px 12px', border: 'none', background: 'none', textAlign: 'left', fontSize: '12px', color: '#EF4444', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Trash2 size={13} /> Delete Agent
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Bottom View: Selected Support Agent Detail & Work History Calendar */}
      {selectedAgent && (
        <div ref={detailsSectionRef} style={{ borderTop: '2px solid var(--border-color)', paddingTop: '24px' }}>
          
          {/* Breadcrumb Header */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '16px' }}>
            <span>Dashboard</span>
            <ChevronRight size={14} />
            <span>Customer Support</span>
            <ChevronRight size={14} />
            <span>Support Agents</span>
            <ChevronRight size={14} />
            <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{selectedAgent.name}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2.2fr 1.3fr', gap: '20px' }}>
            
            {/* Column 1: Left Agent Profile Card */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 0, right: 0, backgroundColor: '#DCFCE7', color: '#15803D', fontSize: '10px', fontWeight: 800, padding: '2px 8px', borderRadius: '10px' }}>
                  {selectedAgent.status}
                </span>
                <UserAvatar src={selectedAgent.avatar} name={selectedAgent.name} size={64} />
                <h3 style={{ margin: '8px 0 2px 0', fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedAgent.name}</h3>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB' }}>{selectedAgent.employeeCode}</span>
                <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Customer Support Agent</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', padding: '12px 0', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Mail size={14} className="text-muted" />
                  <span>{selectedAgent.email}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Phone size={14} className="text-muted" />
                  <span>{selectedAgent.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <CalendarIcon size={14} className="text-muted" />
                  <span>Joined on {selectedAgent.joinedDate}</span>
                </div>
              {/* 4 Stat Boxes (Synchronized with Calendar Date) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Total Tickets</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#2563EB' }}>{dailyAssignedCount}</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Resolved</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#10B981' }}>{dailyResolvedCount}</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>In Progress</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#9333EA' }}>{dailyInProgressCount}</div>
                </div>
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '8px', borderRadius: '8px', textAlign: 'center', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>Open</span>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#D97706' }}>{dailyOpenCount}</div>
                </div>
              </div>

              {/* Sub-nav Links */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                {['Overview', 'Assigned Tickets', 'Work History', 'Performance', 'Settings'].map((nav, idx) => (
                  <button
                    key={nav}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: 'none',
                      textAlign: 'left',
                      fontSize: '12.5px',
                      fontWeight: idx === 0 ? 800 : 500,
                      backgroundColor: idx === 0 ? 'var(--color-workers-bg)' : 'transparent',
                      color: idx === 0 ? '#2563EB' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    {nav}
                  </button>
                ))}
              </div>
            </div>

            {/* Column 2: Center Assigned Tickets Table */}
            <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)' }}>Assigned Tickets</h3>
                  {filterByCalendarDate && (
                    <button
                      onClick={() => setFilterByCalendarDate(false)}
                      style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', padding: '2px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <X size={12} /> Filtered: {monthName} {selectedCalDay} (Click to Clear)
                    </button>
                  )}
                </div>
                <button
                  onClick={() => onNavigateTab('tickets')}
                  style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', backgroundColor: 'var(--color-workers-bg)', border: '1px solid #BFDBFE', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer' }}
                >
                  View All Tickets
                </button>
              </div>

              {/* Ticket Status Filter Tabs */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                <button
                  onClick={() => setTicketFilter('ALL')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: ticketFilter === 'ALL' ? '#2563EB' : 'var(--bg-main)', color: ticketFilter === 'ALL' ? '#FFF' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  All ({dynamicTotalTickets})
                </button>
                <button
                  onClick={() => setTicketFilter('OPEN')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: ticketFilter === 'OPEN' ? '#2563EB' : 'var(--bg-main)', color: ticketFilter === 'OPEN' ? '#FFF' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Open ({dynamicOpenTickets})
                </button>
                <button
                  onClick={() => setTicketFilter('IN_PROGRESS')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: ticketFilter === 'IN_PROGRESS' ? '#2563EB' : 'var(--bg-main)', color: ticketFilter === 'IN_PROGRESS' ? '#FFF' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  In Progress ({dynamicInProgressTickets})
                </button>
                <button
                  onClick={() => setTicketFilter('RESOLVED')}
                  style={{ padding: '6px 12px', borderRadius: '6px', border: 'none', fontSize: '12px', fontWeight: 700, backgroundColor: ticketFilter === 'RESOLVED' ? '#2563EB' : 'var(--bg-main)', color: ticketFilter === 'RESOLVED' ? '#FFF' : 'var(--text-secondary)', cursor: 'pointer' }}
                >
                  Resolved ({dynamicResolvedTickets})
                </button>
              </div>      </div>

              {/* Tickets Table */}
              <div className="table-responsive">
                <table className="custom-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Ticket ID</th>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Subject</th>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Created By</th>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Priority</th>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Status</th>
                      <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>Created On</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTickets.map((t) => (
                      <tr key={t.id}>
                        <td>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#2563EB', cursor: 'pointer' }} onClick={() => onNavigateTab('tickets')}>
                            {t.id}
                          </span>
                        </td>
                        <td style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.subject}</td>
                        <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{t.createdBy}</td>
                        <td>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: t.priority === 'High' ? '#FEE2E2' : t.priority === 'Medium' ? '#FEF08A' : '#DCFCE7',
                            color: t.priority === 'High' ? '#B91C1C' : t.priority === 'Medium' ? '#A16207' : '#15803D'
                          }}>
                            {t.priority}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: t.status === 'In Progress' ? '#F3E8FF' : t.status === 'Open' ? '#EFF6FF' : '#DCFCE7',
                            color: t.status === 'In Progress' ? '#7E22CE' : t.status === 'Open' ? '#1D4ED8' : '#15803D'
                          }}>
                            {t.status}
                          </span>
                        </td>
                        <td style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{t.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Column 3: Right Work History Calendar & Work Details Panel */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Work History Calendar Widget */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Work History</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      onClick={() => setCalMonth(new Date(calYear, calMonthIdx - 1, 1))}
                      style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                      &lt;
                    </button>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{monthName} {calYear}</span>
                    <button
                      onClick={() => setCalMonth(new Date(calYear, calMonthIdx + 1, 1))}
                      style={{ border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 6px', cursor: 'pointer' }}
                    >
                      &gt;
                    </button>
                  </div>
                </div>

                {/* Weekday headers */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', textAlign: 'center', fontSize: '10.5px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
                </div>

                {/* Calendar Days */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center' }}>
                  {/* Offset empty days */}
                  {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                    <div key={`empty-${idx}`} style={{ padding: '6px', color: 'var(--text-secondary)', opacity: 0.5, fontSize: '11px' }}>
                      {30 - firstDayOfWeek + idx + 1}
                    </div>
                  ))}

                  {/* Month days */}
                  {Array.from({ length: totalDaysInMonth }, (_, i) => i + 1).map((day) => {
                    const isSelected = day === selectedCalDay;

                    return (
                      <div
                        key={day}
                        onClick={() => {
                          setSelectedCalDay(day);
                          setFilterByCalendarDate(true);
                        }}
                        style={{
                          padding: '4px 2px',
                          borderRadius: '50%',
                          width: '26px',
                          height: '26px',
                          margin: '0 auto',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          backgroundColor: isSelected ? '#2563EB' : 'transparent',
                          color: isSelected ? '#FFFFFF' : 'var(--text-primary)',
                          fontWeight: isSelected ? 800 : 500,
                          fontSize: '11.5px'
                        }}
                      >
                        {day}
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border-light)', fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <span><span style={{ color: '#10B981' }}>●</span> Present</span>
                  <span><span style={{ color: '#EF4444' }}>●</span> Absent</span>
                  <span><span style={{ color: '#94A3B8' }}>●</span> Weekly Off</span>
                </div>
              </div>

              {/* Work Details for Selected Date */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 800, color: 'var(--text-primary)' }}>{selectedDateFormatted}</span>
                  <span style={{ backgroundColor: dailyStatusBg, color: dailyStatusColor, fontSize: '10.5px', fontWeight: 800, padding: '2px 8px', borderRadius: '6px' }}>
                    Status: {dailyStatusBadgeStr}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                  <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '11.5px' }}>Work Details</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Check In</span><strong>{dailyCheckInStr}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Check Out</span><strong>{dailyCheckOutStr}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="text-muted">Total Duration</span><strong>{dailyDurationStr}</strong></div>

                  <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '6px', paddingTop: '8px', fontWeight: 800, color: 'var(--text-primary)', fontSize: '11.5px' }}>Ticket Summary</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', textAlign: 'center', marginTop: '2px' }}>
                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Assigned</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#2563EB' }}>{dailyAssignedCount}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>In Progress</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#9333EA' }}>{dailyInProgressCount}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Resolved</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#10B981' }}>{dailyResolvedCount}</div>
                    </div>
                    <div style={{ backgroundColor: 'var(--bg-main)', padding: '6px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>Open</span>
                      <div style={{ fontWeight: 800, fontSize: '13px', color: '#D97706' }}>{dailyOpenCount}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Performance (This Month) */}
              <div style={{ backgroundColor: 'var(--bg-card)', borderRadius: '14px', border: '1px solid var(--border-color)', padding: '16px' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)' }}>Performance (This Month)</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span className="text-muted">Resolution Rate</span>
                      <strong>90.2%</strong>
                    </div>
                    <div style={{ height: '6px', backgroundColor: 'var(--border-light)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: '90.2%', height: '100%', backgroundColor: '#2563EB', borderRadius: '3px' }}></div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                    <span className="text-muted">Average Response Time</span>
                    <strong>1h 25m</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #F1F5F9', paddingTop: '6px' }}>
                    <span className="text-muted">Customer Satisfaction</span>
                    <strong style={{ color: '#059669' }}>4.6 / 5 ⭐</strong>
                  </div>
                </div>
              </div>

            </div>

          </div>

        </div>
      )}

      {/* Support Agent Create/Edit Modal */}
      <SupportAgentModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setAgentToEdit(null); }}
        agentToEdit={agentToEdit}
        onSuccess={loadData}
      />
    </div>
  );
};
