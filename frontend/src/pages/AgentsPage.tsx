import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  ArrowLeft,
  User,
  Calendar,
  X,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import {
  fetchAgentsApi,
  fetchWorkersApi,
  fetchSitesApi,
  fetchAttendanceLogsApi,
  deleteUserApi,
  updateUserApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { AgentItem, WorkerItem, SiteItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import './Pages.css';
import './AgentsDashboardPage.css';

interface AgentsPageProps {
  onOpenModal: (type: string) => void;
  onOpenAssignModal?: (agentId: string, agentName: string) => void;
  refreshTrigger?: number;
}

export const AgentsPage: React.FC<AgentsPageProps> = ({
  onOpenModal,
  refreshTrigger
}) => {

  // Core Data States
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<{ src: string; title: string; workerName: string; time: string; siteName: string } | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Selected Agent State
  const [selectedAgentId, setSelectedAgentId] = useState<string | number | null>(null);
  const [activeMobileView, setActiveMobileView] = useState<'DIRECTORY' | 'DETAILS'>('DIRECTORY');

  // Interactive Dynamic Calendar State (Default Today's Current Date)
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number>(new Date().getDate());

  // Action Menu & Modals State
  const [actionMenuAgentId, setActionMenuAgentId] = useState<string | number | null>(null);
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<any | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    siteId: '',
    status: 'Active'
  });
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleOpenEditModal = (agent: any) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      siteId: agent.siteId ? String(agent.siteId) : '',
      status: agent.status || 'Active'
    });
    setActionMenuAgentId(null);
  };

  const handleSaveEditAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;
    setIsSubmittingEdit(true);
    try {
      await updateUserApi(editingAgent.id, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone: editFormData.phone.trim(),
        siteId: editFormData.siteId ? Number(editFormData.siteId) : null,
        status: editFormData.status
      });
      setToastMessage(`Agent "${editFormData.name}" updated successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
      setEditingAgent(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update agent details.');
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleDeleteAgentConfirm = async () => {
    if (!deletingAgent) return;
    setIsSubmittingDelete(true);
    try {
      await deleteUserApi(deletingAgent.id);
      setToastMessage(`Agent "${deletingAgent.name}" deleted. All assigned workers have been set to Unassigned.`);
      setTimeout(() => setToastMessage(null), 4000);
      if (String(selectedAgentId) === String(deletingAgent.id)) {
        setSelectedAgentId(null);
      }
      setDeletingAgent(null);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [agentsData, workersData, sitesData, attendanceRes] = await Promise.all([
        fetchAgentsApi().catch(() => []),
        fetchWorkersApi().catch(() => []),
        fetchSitesApi().catch(() => []),
        fetchAttendanceLogsApi().catch(() => ({ logs: [] }))
      ]);

      // Filter Field Agents ONLY (Exclude Customer Support Agents with CSA- codes or support designations)
      const fieldAgentsOnly = (agentsData || []).filter((a: any) => {
        const code = (a.employeeCode || '').toUpperCase();
        const des = (a.designation || '').toLowerCase();
        const role = (a.role || '').toUpperCase();

        const isCustomerSupportAgent = code.startsWith('CSA') || des.includes('support') || role.includes('SUPPORT');
        return !isCustomerSupportAgent;
      });

      setAgents(fieldAgentsOnly);
      setWorkers(workersData || []);
      setSites(sitesData || []);
      setAttendanceLogs(attendanceRes.logs || []);

      if (fieldAgentsOnly.length > 0 && !selectedAgentId) {
        setSelectedAgentId(fieldAgentsOnly[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleLiveRefresh = () => {
      loadData();
    };

    window.addEventListener('refresh-data', handleLiveRefresh);
    socket.on('attendance:updated', handleLiveRefresh);
    socket.on('leave:updated', handleLiveRefresh);
    socket.on('user:registered', handleLiveRefresh);
    socket.on('user:updated', handleLiveRefresh);
    socket.on('site:assigned', handleLiveRefresh);
    socket.on('notification', handleLiveRefresh);

    return () => {
      window.removeEventListener('refresh-data', handleLiveRefresh);
      socket.off('attendance:updated', handleLiveRefresh);
      socket.off('leave:updated', handleLiveRefresh);
      socket.off('user:registered', handleLiveRefresh);
      socket.off('user:updated', handleLiveRefresh);
      socket.off('site:assigned', handleLiveRefresh);
      socket.off('notification', handleLiveRefresh);
    };
  }, [refreshTrigger]);

  const selectedAgent = agents.find((a: any) => String(a.id) === String(selectedAgentId)) || agents[0] || null;

  // Filtered Agents List
  const filteredAgents = agents.filter((a) => {
    if (siteFilter !== 'ALL' && a.assignedSite !== siteFilter) return false;
    if (statusFilter !== 'ALL' && (a as any).status !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = (a.name || '').toLowerCase().includes(q);
      const matchCode = (a.employeeCode || '').toLowerCase().includes(q);
      const matchSite = (a.assignedSite || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchSite) return false;
    }
    return true;
  });

  // Filtered assigned workers for selected agent
  const selectedAgentWorkers = selectedAgent
    ? workers.filter((w) => String(w.assignedAgentId) === String(selectedAgent.id) || ((selectedAgent as any).workers || []).some((aw: any) => String(aw.id) === String(w.id)))
    : [];

  const getLocalTodayDateStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getLogLocalDateStr = (rawDate: any) => {
    if (!rawDate) return '';
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTimeOnly = (rawTime: any) => {
    if (!rawTime || rawTime === '—') return '—';
    if (typeof rawTime === 'string' && /^(0?[1-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i.test(rawTime.trim())) {
      return rawTime.trim();
    }
    const d = new Date(rawTime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return String(rawTime);
  };

  const getWorkerTodayAttendance = (workerId: string | number, workerName?: string) => {
    const todayLocalStr = getLocalTodayDateStr();
    const targetName = (workerName || '').toLowerCase().trim();

    return attendanceLogs.find((l: any) => {
      const logWorkerId = String(l.workerId || l.userId || l.worker?.id || l.user?.id || '');
      const logWorkerName = (l.workerName || l.worker?.name || l.user?.name || '').toLowerCase().trim();

      const isWorkerMatch = (logWorkerId && logWorkerId === String(workerId)) || (targetName && logWorkerName && logWorkerName === targetName);
      if (!isWorkerMatch) return false;

      const rawLogDate = l.date || l.createdAt || l.checkInTime || l.signInTime;
      if (!rawLogDate) return false;

      return getLogLocalDateStr(rawLogDate) === todayLocalStr;
    });
  };

  const presentWorkersCount = selectedAgentWorkers.filter((w) => {
    const att = getWorkerTodayAttendance(w.id, w.name);
    return att ? (att.status === 'PRESENT' || att.status === 'HALF_DAY' || att.status === 'Present' || Boolean(att.signInTime || att.checkInTime || att.checkIn)) : false;
  }).length;

  const absentWorkersCount = Math.max(0, selectedAgentWorkers.length - presentWorkersCount);

  // Calendar Calculation Helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const monthNameYear = calendarDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0 = Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handlePrevMonth = () => {
    setCalendarDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCalendarDate(new Date(year, month + 1, 1));
  };

  const handleTodayMonth = () => {
    const now = new Date();
    setCalendarDate(now);
    setSelectedCalendarDay(now.getDate());
  };

  // Calendar Selected Date String & Formatting
  const selectedDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(selectedCalendarDay).padStart(2, '0')}`;
  const selectedDateObj = new Date(year, month, selectedCalendarDay);
  const formattedSelectedDate = selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  // Map selected date attendance logs onto assigned workers for full roster synchronization
  const selectedDateLogMap = new Map<string, any>();
  attendanceLogs.forEach((log: any) => {
    if (!log.date && !log.createdAt) return;
    const logDateStr = log.date
      ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0])
      : new Date(log.createdAt).toISOString().split('T')[0];

    if (logDateStr === selectedDateStr) {
      const wId = String(log.workerId || log.userId || log.worker?.id || log.user?.id || '');
      const wName = (log.workerName || log.worker?.name || log.user?.name || '').toLowerCase().trim();
      if (wId) selectedDateLogMap.set(wId, log);
      if (wName) selectedDateLogMap.set(wName, log);
    }
  });

  const selectedDateWorkerRoster = selectedAgentWorkers.map((w: any) => {
    const log = selectedDateLogMap.get(String(w.id)) || selectedDateLogMap.get((w.name || '').toLowerCase().trim());
    const isPresent = Boolean(log && (log.status === 'PRESENT' || log.status === 'HALF_DAY' || log.status === 'Present' || Boolean(log.signInTime || log.checkInTime || log.checkIn)));
    const isHalfDay = Boolean(log && log.status === 'HALF_DAY');
    const isAbsent = log ? (log.status === 'ABSENT' || log.status === 'Absent' || log.status === 'OFF') : !isPresent;
    const isCheckedOut = Boolean(log && (log.signOutTime || log.checkOutTime || log.checkOut));

    const rawCheckIn = log?.signInTime || log?.checkInTime || log?.checkIn;
    const rawCheckOut = log?.signOutTime || log?.checkOutTime || log?.checkOut;

    const checkInDisplay = isAbsent ? '—' : (rawCheckIn ? formatTimeOnly(rawCheckIn) : (isPresent ? 'Checked In' : '—'));
    const checkOutDisplay = isAbsent ? '—' : (rawCheckOut ? formatTimeOnly(rawCheckOut) : (isCheckedOut ? 'Checked Out' : '—'));
    const workStatusDisplay = isAbsent ? 'Absent' : isCheckedOut ? 'Completed' : isPresent ? 'In Progress' : 'Pending';
    const attendanceStatusDisplay = log ? (log.status || (isPresent ? 'PRESENT' : 'ABSENT')) : 'ABSENT';

    return {
      ...w,
      attendanceLog: log,
      isPresent,
      isHalfDay,
      isAbsent,
      checkInDisplay,
      checkOutDisplay,
      workStatusDisplay,
      attendanceStatusDisplay
    };
  });

  // Multi-colored status dots indicator per day (Present=green, HalfDay=orange, Absent=red)
  const getCalendarDotsForDay = (dayNumber: number) => {
    const formattedDayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`;

    const matchingLogs = attendanceLogs.filter((log: any) => {
      if (!log.date && !log.createdAt) return false;
      const logDateStr = log.date
        ? (typeof log.date === 'string' ? log.date.split('T')[0] : new Date(log.date).toISOString().split('T')[0])
        : new Date(log.createdAt).toISOString().split('T')[0];

      if (logDateStr !== formattedDayStr) return false;

      if (selectedAgentWorkers.length > 0) {
        const wId = String(log.workerId || log.userId || log.worker?.id || log.user?.id || '');
        const wName = (log.workerName || log.worker?.name || log.user?.name || '').toLowerCase().trim();
        return selectedAgentWorkers.some((w) => String(w.id) === wId || w.name.toLowerCase().trim() === wName);
      }
      return true;
    });

    if (matchingLogs.length === 0) return null;

    const hasPresent = matchingLogs.some((l: any) => l.status === 'PRESENT' || l.status === 'Present' || l.status === 'FULL_DAY');
    const hasHalfDay = matchingLogs.some((l: any) => l.status === 'HALF_DAY');
    const hasAbsent = matchingLogs.some((l: any) => l.status === 'ABSENT' || l.status === 'Absent');

    return { hasPresent, hasHalfDay, hasAbsent };
  };

  return (
    <div className="agents-dashboard-container animate-fade-in">
      {/* Top Header */}
      <div className="agents-header-bar">
        <div>
          <h1 className="agents-page-title">Agents</h1>
          <p className="agents-page-subtitle">View and manage all agents across all sites</p>
        </div>

        <button className="primary-add-agent-btn" onClick={() => onOpenModal('add_agent')}>
          <Plus size={18} />
          <span>Add Agent</span>
        </button>
      </div>

      {/* Mobile & Tablet Panel View Switcher Bar (Visible on <= 1024px) */}
      <div className="mobile-view-switcher-bar">
        <button
          type="button"
          className={`mobile-view-tab-btn ${activeMobileView === 'DIRECTORY' ? 'active' : ''}`}
          onClick={() => setActiveMobileView('DIRECTORY')}
        >
          <User size={15} />
          <span>Agents Directory ({filteredAgents.length})</span>
        </button>
        <button
          type="button"
          className={`mobile-view-tab-btn ${activeMobileView === 'DETAILS' ? 'active' : ''}`}
          onClick={() => setActiveMobileView('DETAILS')}
        >
          <Calendar size={15} />
          <span>Agent Details & Calendar</span>
        </button>
      </div>

      {/* Main Dual-Panel Grid Layout */}
      <div className="agents-dual-panel-grid">
        {/* LEFT COLUMN: Agents Directory & Daily Tables */}
        <div className={`left-panel-column ${activeMobileView === 'DIRECTORY' ? 'mobile-show' : 'mobile-hide'}`}>
          {/* Search & Filter Bar */}
          <div className="agents-filter-bar">
            <div className="search-box-wrapper">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="filter-dropdowns-group">
              <select
                className="filter-select-input"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
              >
                <option value="ALL">All Sites</option>
                {sites.map((s) => (
                  <option key={s.id} value={s.siteName}>{s.siteName}</option>
                ))}
              </select>

              <select
                className="filter-select-input"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="ALL">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>

          {/* Agents Table */}
          <div className="agents-table-card">
            <div className="table-responsive">
              <table className="agents-data-table">
                <thead>
                  <tr>
                    <th>Agent ID</th>
                    <th>Agent Name</th>
                    <th>Site</th>
                    <th>Today Status</th>
                    <th>Present Workers</th>
                    <th>Absent Workers</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                        Loading agents database...
                      </td>
                    </tr>
                  ) : filteredAgents.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                        No agents found in backend database.
                      </td>
                    </tr>
                  ) : (
                    filteredAgents.map((agent) => {
                      const isSelected = selectedAgent && String(selectedAgent.id) === String(agent.id);
                      const agentWorkers = workers.filter((w) => String(w.assignedAgentId) === String(agent.id) || ((agent as any).workers || []).some((aw: any) => String(aw.id) === String(w.id)));

                      // Real-time present and absent worker counts for today from PostgreSQL attendance logs
                      const pWorkers = agentWorkers.filter((w) => {
                        const att = getWorkerTodayAttendance(w.id);
                        return att ? (
                          att.status === 'PRESENT' ||
                          att.status === 'HALF_DAY' ||
                          att.status === 'Present' ||
                          Boolean(att.signInTime || att.checkIn)
                        ) : false;
                      }).length;

                      const aWorkers = Math.max(0, agentWorkers.length - pWorkers);

                      // Real today attendance check for the agent himself
                      const agentAttendance = attendanceLogs.find((l: any) => {
                        const matchId = String(l.workerId || l.userId || l.worker?.id || l.user?.id || '');
                        if (matchId !== String(agent.id)) return false;
                        const rawDate = l.date || l.createdAt || l.checkInTime || l.signInTime;
                        if (!rawDate) return false;
                        return getLogLocalDateStr(rawDate) === getLocalTodayDateStr();
                      });

                      const isPresentToday = agentAttendance ? (
                        agentAttendance.status === 'PRESENT' ||
                        agentAttendance.status === 'HALF_DAY' ||
                        agentAttendance.status === 'Present' ||
                        Boolean(agentAttendance.signInTime || agentAttendance.checkIn)
                      ) : true;

                      return (
                        <tr
                          key={agent.id}
                          className={`agent-row ${isSelected ? 'row-selected' : ''}`}
                          onClick={() => {
                            setSelectedAgentId(agent.id);
                            setActiveMobileView('DETAILS');
                          }}
                        >
                          <td className="agent-id-code">
                            {agent.employeeCode || `AGT-${1000 + Number(agent.id)}`}
                          </td>
                          <td>
                            <div className="agent-user-cell">
                              <UserAvatar src={agent.avatar || agent.profileImage} name={agent.name} size={32} />
                              <div>
                                <span className="agent-name-text">{agent.name}</span>
                                <span className="agent-phone-text">{agent.phone || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="agent-site-text">{agent.assignedSite || '—'}</td>
                          <td>
                            <span className={`today-status-badge ${isPresentToday ? 'present' : 'absent'}`}>
                              <span className={`status-dot ${isPresentToday ? 'green' : 'red'}`}></span>
                              {isPresentToday ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="workers-count-num present">{pWorkers}</td>
                          <td className="workers-count-num absent">{aWorkers}</td>
                          <td style={{ textAlign: 'right', position: 'relative' }}>
                            <button
                              type="button"
                              className="action-view-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActionMenuAgentId(actionMenuAgentId === agent.id ? null : agent.id);
                              }}
                              title="Actions Menu"
                            >
                              <MoreVertical size={16} />
                            </button>

                            {actionMenuAgentId === agent.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  right: 0,
                                  top: '36px',
                                  backgroundColor: 'var(--bg-card)',
                                  color: 'var(--text-primary)',
                                  borderRadius: '10px',
                                  border: '1px solid var(--border-color)',
                                  boxShadow: '0 10px 25px -5px rgba(0,0,0,0.25)',
                                  zIndex: 100,
                                  width: '140px',
                                  overflow: 'hidden'
                                }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAgentId(agent.id);
                                    setActionMenuAgentId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <Eye size={14} color="#2563EB" /> View Profile
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(agent)}
                                  style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <Edit2 size={14} color="#D97706" /> Edit Agent
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setDeletingAgent(agent);
                                    setActionMenuAgentId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '9px 12px',
                                    border: 'none',
                                    background: 'none',
                                    textAlign: 'left',
                                    fontSize: '12.5px',
                                    fontWeight: 600,
                                    color: '#EF4444',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                  }}
                                >
                                  <Trash2 size={14} color="#EF4444" /> Delete Agent
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="table-pagination">
              <span className="pagination-info-text">
                Showing 1 to {filteredAgents.length} of {agents.length} agents
              </span>
              <div className="pagination-btn-group">
                <button className="page-nav-btn">&lt;</button>
                <button className="page-num-btn active">1</button>
                <button className="page-num-btn">2</button>
                <button className="page-num-btn">3</button>
                <button className="page-num-btn">4</button>
                <button className="page-nav-btn">&gt;</button>
              </div>
            </div>
          </div>

          {/* Assigned Workers - Today */}
          <div className="section-card-widget">
            <div className="widget-header-row">
              <h3>Assigned Workers - Today ({new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})</h3>
              <div className="header-status-pill-group">
                <span className="status-pill green">
                  <strong>{presentWorkersCount}</strong> Present
                </span>
                <span className="status-pill red">
                  <strong>{absentWorkersCount}</strong> Absent
                </span>
              </div>
            </div>

            <div className="table-responsive">
              <table className="sub-data-table">
                <thead>
                  <tr>
                    <th>Worker ID</th>
                    <th>Worker Name</th>
                    <th>Site</th>
                    <th>Status</th>
                    <th>Check-in</th>
                    <th>Work Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedAgentWorkers.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '16px', color: '#94A3B8' }}>
                        No assigned workers found for selected agent in database.
                      </td>
                    </tr>
                  ) : (
                    selectedAgentWorkers.map((w, idx) => {
                      const workerAttendance = getWorkerTodayAttendance(w.id, w.name);
                      const isPresent = workerAttendance ? (
                        workerAttendance.status === 'PRESENT' ||
                        workerAttendance.status === 'HALF_DAY' ||
                        workerAttendance.status === 'Present' ||
                        Boolean(workerAttendance.signInTime || workerAttendance.checkInTime || workerAttendance.checkIn)
                      ) : false;

                      const isCheckedOut = Boolean(workerAttendance?.signOutTime || workerAttendance?.checkOutTime || workerAttendance?.checkOut);
                      const rawCheckIn = workerAttendance?.signInTime || workerAttendance?.checkInTime || workerAttendance?.checkIn;
                      const checkInTime = isPresent ? (rawCheckIn ? formatTimeOnly(rawCheckIn) : 'Checked In') : '—';
                      const workStatus = !workerAttendance ? 'Pending' : isCheckedOut ? 'Completed' : isPresent ? 'In Progress' : 'Pending';

                      const checkInPhotoSrc = workerAttendance?.signInPhoto || workerAttendance?.checkInPhoto || workerAttendance?.checkInPhotoUrl;
                      const checkOutPhotoSrc = workerAttendance?.signOutPhoto || workerAttendance?.checkOutPhoto || workerAttendance?.checkOutPhotoUrl;

                      return (
                        <tr key={w.id || idx}>
                          <td className="worker-id-code">{w.employeeCode || `WRK-${w.id}`}</td>
                          <td>
                            <div className="worker-user-cell">
                              <UserAvatar src={w.avatar || (w as any).profileImage} name={w.name} size={26} />
                              <div>
                                <span className="worker-name-text">{w.name}</span>
                                <span className="worker-phone-text">{w.phone || '—'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="worker-site-text">{w.siteName || (w as any).assignedSite || selectedAgent?.assignedSite || '—'}</td>
                          <td>
                            <span className={`status-pill-badge ${isPresent ? 'present' : 'absent'}`}>
                              <span className={`dot ${isPresent ? 'green' : 'red'}`}></span>
                              {isPresent ? 'Present' : 'Absent'}
                            </span>
                          </td>
                          <td className="checkin-time-text">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span>{checkInTime}</span>
                              {checkInPhotoSrc && (
                                <img
                                  src={checkInPhotoSrc}
                                  alt="Live Check-In"
                                  title="Click to view live Check-In photo"
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #059669', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => setPreviewPhoto({ src: checkInPhotoSrc, title: 'Live Check-In Photo', workerName: w.name, time: checkInTime, siteName: w.siteName || selectedAgent?.assignedSite || 'Industrial Area' })}
                                />
                              )}
                              {checkOutPhotoSrc && (
                                <img
                                  src={checkOutPhotoSrc}
                                  alt="Live Check-Out"
                                  title="Click to view live Check-Out photo"
                                  style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2px solid #2563EB', objectFit: 'cover', cursor: 'pointer' }}
                                  onClick={() => setPreviewPhoto({ src: checkOutPhotoSrc, title: 'Live Check-Out Photo', workerName: w.name, time: formatTimeOnly(workerAttendance?.signOutTime || workerAttendance?.checkOutTime), siteName: w.siteName || selectedAgent?.assignedSite || 'Industrial Area' })}
                                />
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`work-status-tag ${workStatus === 'Completed' ? 'completed' : workStatus === 'In Progress' ? 'in-progress' : 'pending'}`}>
                              {workStatus}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="action-icon-small"
                              title="View Worker Details"
                              onClick={() => window.open(`/worker-details?id=${w.id}`, '_blank')}
                            >
                              <Eye size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="widget-footer-link">
              <a href="#view-all-workers">View All Workers →</a>
            </div>
          </div>

          {/* Site Assignment Summary - Today */}
          <div className="section-card-widget">
            <div className="widget-header-row">
              <h3>Site Assignment Summary - Today</h3>
            </div>

            <div className="table-responsive">
              <table className="sub-data-table">
                <thead>
                  <tr>
                    <th>Site</th>
                    <th>Total Workers</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Work Status</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '16px', color: '#94A3B8' }}>
                        No site summaries available in database.
                      </td>
                    </tr>
                  ) : (
                    sites.map((site) => {
                      const siteWorkers = workers.filter(w => w.siteName === site.siteName || (w as any).assignedSite === site.siteName);
                      const totalW = siteWorkers.length || site.totalWorkers || 0;

                      // Calculate actual present workers from database attendance logs
                      const presW = siteWorkers.filter((w) => {
                        const att = getWorkerTodayAttendance(w.id, w.name);
                        return att ? (
                          att.status === 'PRESENT' ||
                          att.status === 'HALF_DAY' ||
                          att.status === 'Present' ||
                          Boolean(att.signInTime || att.checkInTime || att.checkIn)
                        ) : false;
                      }).length;

                      const absW = Math.max(0, totalW - presW);

                      // Synchronize status directly with PostgreSQL database site status
                      const rawStatus = (site.status || 'IN_PROGRESS').toUpperCase();
                      let badgeBg = '#2563EB';
                      let displayStatus = 'IN PROGRESS';

                      if (rawStatus === 'COMPLETED') {
                        badgeBg = '#059669';
                        displayStatus = 'COMPLETED';
                      } else if (rawStatus === 'ACTIVE') {
                        badgeBg = '#10B981';
                        displayStatus = 'ACTIVE';
                      } else if (rawStatus === 'ON_HOLD' || rawStatus === 'ON HOLD') {
                        badgeBg = '#D97706';
                        displayStatus = 'ON HOLD';
                      } else if (rawStatus === 'IN_PROGRESS' || rawStatus === 'IN PROGRESS') {
                        badgeBg = '#2563EB';
                        displayStatus = 'IN PROGRESS';
                      }

                      return (
                        <tr key={site.id}>
                          <td className="site-name-bold">{site.siteName}</td>
                          <td>{totalW}</td>
                          <td className="present-val">{presW}</td>
                          <td className="absent-val">{absW}</td>
                          <td>
                            <span
                              style={{
                                backgroundColor: badgeBg,
                                color: '#FFFFFF',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                letterSpacing: '0.4px',
                                textTransform: 'uppercase',
                                display: 'inline-block'
                              }}
                            >
                              {displayStatus}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Agent Detail & Work History Calendar Panel */}
        <div className={`right-panel-column ${activeMobileView === 'DETAILS' ? 'mobile-show' : 'mobile-hide'}`}>
          {selectedAgent ? (
            <>
              {/* Breadcrumb & Navigation Bar */}
              <div className="agent-detail-breadcrumb">
                <div className="breadcrumb-links">
                  <span>Agents</span>
                  <span>&gt;</span>
                  <span className="active-breadcrumb">{selectedAgent.name}</span>
                </div>

                <button
                  className="back-to-agents-btn"
                  onClick={() => {
                    setActiveMobileView('DIRECTORY');
                    if (agents.length > 0) setSelectedAgentId(agents[0].id);
                  }}
                >
                  <ArrowLeft size={14} />
                  <span>Back to Directory</span>
                </button>
              </div>

              {/* Agent Profile Header Card (1st Image Fix: Reflect Joined On from backend database) */}
              <div className="agent-profile-header-card">
                <div className="agent-card-main-info">
                  <div className="agent-large-avatar">
                    <UserAvatar src={selectedAgent.avatar || selectedAgent.profileImage} name={selectedAgent.name} size={64} />
                  </div>

                  <div className="agent-title-details">
                    <div className="name-status-row">
                      <h2>{selectedAgent.name}</h2>
                      <span className="agent-active-badge">Active</span>
                    </div>

                    <div className="agent-code-text">{selectedAgent.employeeCode || `AGT-${selectedAgent.id}`}</div>
                    <div className="agent-contact-line">{selectedAgent.phone || '—'}</div>
                    <div className="agent-email-line">{selectedAgent.email || '—'}</div>
                  </div>
                </div>

                <div className="agent-card-meta-grid">
                  <div className="meta-col">
                    <div className="meta-item">
                      <span className="meta-label">Site</span>
                      <span className="meta-val">{selectedAgent.assignedSite || '—'}</span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Joined On</span>
                      <span className="meta-val">
                        {selectedAgent.joiningDate && selectedAgent.joiningDate !== '—'
                          ? selectedAgent.joiningDate
                          : selectedAgent.createdAt
                          ? new Date(selectedAgent.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '15 Feb 2024'}
                      </span>
                    </div>
                    <div className="meta-item">
                      <span className="meta-label">Reporting To</span>
                      <span className="meta-val">Super Agent</span>
                    </div>
                  </div>

                  <div className="meta-stats-col">
                    <div className="stat-pill-box">
                      <span className="stat-lbl">Total Workers</span>
                      <span className="stat-num green-text">{selectedAgentWorkers.length}</span>
                    </div>
                    <div className="stat-pill-box">
                      <span className="stat-lbl">Today Present</span>
                      <span className="stat-num green-text">{presentWorkersCount}</span>
                    </div>
                    <div className="stat-pill-box">
                      <span className="stat-lbl">Today Absent</span>
                      <span className="stat-num red-text">{absentWorkersCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Overview Content */}
              <div className="tab-content-overview animate-fade-in">
                  {/* 4 Stat Cards */}
                  <div className="agent-overview-stats-grid">
                    <div className="overview-card">
                      <span className="card-lbl">Total Workers</span>
                      <h3 className="card-num">{selectedAgentWorkers.length}</h3>
                      <span className="card-sub-lbl">Active Workers</span>
                    </div>

                    <div className="overview-card">
                      <span className="card-lbl">Today Present</span>
                      <h3 className="card-num">{presentWorkersCount}</h3>
                      <span className="card-sub-lbl green-text">
                        {selectedAgentWorkers.length > 0 ? Math.round((presentWorkersCount / selectedAgentWorkers.length) * 100) : 0}% Present
                      </span>
                    </div>

                    <div className="overview-card">
                      <span className="card-lbl">Today Absent</span>
                      <h3 className="card-num">{absentWorkersCount}</h3>
                      <span className="card-sub-lbl red-text">
                        {selectedAgentWorkers.length > 0 ? Math.round((absentWorkersCount / selectedAgentWorkers.length) * 100) : 0}% Absent
                      </span>
                    </div>

                    <div className="overview-card">
                      <span className="card-lbl">This Week Attendance</span>
                      <h3 className="card-num">87.5%</h3>
                      <span className="card-sub-lbl">Average</span>
                    </div>
                  </div>

                  {/* Work History Calendar Card (2nd Image Fix: Fully Interactive Month Switching Controls) */}
                  <div className="work-history-calendar-card">
                    <div className="calendar-card-header">
                      <h3>Work History Calendar</h3>
                    </div>

                    {/* Status Legend Bar */}
                    <div className="site-color-legend-row" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap' }}>
                      <span className="legend-chip" style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ backgroundColor: '#10b981', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span> Present
                      </span>
                      <span className="legend-chip" style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ backgroundColor: '#f59e0b', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span> Half Day
                      </span>
                      <span className="legend-chip" style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ backgroundColor: '#ef4444', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span> Absent
                      </span>
                      <span className="legend-chip" style={{ fontSize: '11.5px', fontWeight: 600, color: '#334155', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <span style={{ backgroundColor: '#2563eb', width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block' }}></span> Selected
                      </span>
                    </div>

                    {/* Calendar Month Controls (Interactive < and > buttons) */}
                    <div className="calendar-month-controls">
                      <button className="month-nav-btn" onClick={handlePrevMonth} title="Previous Month">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="month-title-text">{monthNameYear}</span>
                      <button className="month-nav-btn" onClick={handleNextMonth} title="Next Month">
                        <ChevronRight size={16} />
                      </button>
                      <button className="today-btn" onClick={handleTodayMonth}>Today</button>
                    </div>

                    {/* 7-Column Days Header */}
                    <div className="calendar-days-header">
                      <span>Sun</span>
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                    </div>

                    {/* Dynamic Calendar Grid Layout */}
                    <div className="calendar-grid-cells">
                      {/* Empty cells for starting day offset */}
                      {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                        <div key={`blank-${idx}`} className="calendar-day-cell empty-cell"></div>
                      ))}

                      {/* 1..daysInMonth cells with multi-colored status dots */}
                      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                        const isSelectedDay = day === selectedCalendarDay;
                        const dayDots = getCalendarDotsForDay(day);

                        return (
                          <div
                            key={day}
                            className={`calendar-day-cell ${isSelectedDay ? 'day-selected' : ''}`}
                            onClick={() => setSelectedCalendarDay(day)}
                            style={{
                              cursor: 'pointer',
                              position: 'relative',
                              backgroundColor: isSelectedDay ? '#2563eb' : undefined,
                              color: isSelectedDay ? '#ffffff' : undefined,
                              borderRadius: '8px',
                              padding: '6px 2px'
                            }}
                          >
                            <span className="day-number" style={{ fontWeight: isSelectedDay ? 800 : 600 }}>{day}</span>
                            {dayDots && (
                              <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', marginTop: '3px' }}>
                                {dayDots.hasPresent && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelectedDay ? '#ffffff' : '#10b981' }} />}
                                {dayDots.hasHalfDay && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelectedDay ? '#ffffff' : '#f59e0b' }} />}
                                {dayDots.hasAbsent && <span style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: isSelectedDay ? '#ffffff' : '#ef4444' }} />}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Dynamic Worker Work History & Check-In/Check-Out Log Table for Selected Calendar Date */}
                    <div className="calendar-day-summary-footer" style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                      <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px 0' }}>
                        Worker Work History & Check-In/Check-Out Log ({formattedSelectedDate})
                      </h4>

                      <div className="table-responsive">
                        <table className="sub-data-table" style={{ marginTop: '6px', width: '100%' }}>
                          <thead>
                            <tr>
                              <th>Worker Name</th>
                              <th>Assigned Site</th>
                              <th>Attendance</th>
                              <th>Check-In</th>
                              <th>Check-Out</th>
                              <th>Work Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedDateWorkerRoster.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '16px', color: '#94A3B8' }}>
                                  No assigned workers found for selected agent in database.
                                </td>
                              </tr>
                            ) : (
                              selectedDateWorkerRoster.map((w, idx) => (
                                <tr key={w.id || idx}>
                                  <td style={{ fontWeight: 700, color: '#0F172A' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <UserAvatar src={w.avatar || w.profileImage} name={w.name} size={24} />
                                      <span>{w.name}</span>
                                    </div>
                                  </td>
                                  <td style={{ fontSize: '12px', color: '#475569' }}>
                                    {w.siteName || w.assignedSite || selectedAgent?.assignedSite || 'Industrial Area'}
                                  </td>
                                  <td>
                                    <span
                                      style={{
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        display: 'inline-block',
                                        backgroundColor: w.isPresent ? '#DCFCE7' : w.isHalfDay ? '#FEF08A' : '#FEE2E2',
                                        color: w.isPresent ? '#15803D' : w.isHalfDay ? '#A16207' : '#B91C1C'
                                      }}
                                    >
                                      {w.attendanceStatusDisplay}
                                    </span>
                                  </td>
                                  <td style={{ fontSize: '12px', fontWeight: 600, color: w.isAbsent ? '#94A3B8' : '#059669' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                       <span>{w.checkInDisplay}</span>
                                       {w.attendanceLog?.signInPhoto || w.attendanceLog?.checkInPhoto ? (
                                         <img
                                           src={w.attendanceLog?.signInPhoto || w.attendanceLog?.checkInPhoto}
                                           alt="Check-In Photo"
                                           title="Click to view live Check-In photo"
                                           style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #059669', objectFit: 'cover', cursor: 'pointer' }}
                                           onClick={() => setPreviewPhoto({ src: w.attendanceLog?.signInPhoto || w.attendanceLog?.checkInPhoto, title: 'Live Check-In Photo', workerName: w.name, time: w.checkInDisplay, siteName: w.siteName || selectedAgent?.assignedSite || 'Industrial Area' })}
                                         />
                                       ) : null}
                                     </div>
                                   </td>
                                   <td style={{ fontSize: '12px', fontWeight: 600, color: w.isAbsent ? '#94A3B8' : '#2563EB' }}>
                                     <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                       <span>{w.checkOutDisplay}</span>
                                       {w.attendanceLog?.signOutPhoto || w.attendanceLog?.checkOutPhoto ? (
                                         <img
                                           src={w.attendanceLog?.signOutPhoto || w.attendanceLog?.checkOutPhoto}
                                           alt="Check-Out Photo"
                                           title="Click to view live Check-Out photo"
                                           style={{ width: '22px', height: '22px', borderRadius: '50%', border: '2px solid #2563EB', objectFit: 'cover', cursor: 'pointer' }}
                                           onClick={() => setPreviewPhoto({ src: w.attendanceLog?.signOutPhoto || w.attendanceLog?.checkOutPhoto, title: 'Live Check-Out Photo', workerName: w.name, time: w.checkOutDisplay, siteName: w.siteName || selectedAgent?.assignedSite || 'Industrial Area' })}
                                         />
                                       ) : null}
                                     </div>
                                   </td>
                                  <td>
                                    <span className={`work-status-tag ${w.workStatusDisplay === 'Completed' ? 'completed' : w.workStatusDisplay === 'In Progress' ? 'in-progress' : 'pending'}`}>
                                      {w.workStatusDisplay}
                                    </span>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
            <div className="no-agent-selected-state">
              <User size={40} color="#94A3B8" />
              <p>Select an agent from the left directory to view full profile details and work history calendar.</p>
            </div>
          )}
        </div>

        {/* High-Resolution Live Attendance Photo Preview Modal */}
        {previewPhoto && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setPreviewPhoto(null)}
          >
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                maxWidth: '460px',
                width: '90%',
                padding: '20px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>{previewPhoto.title}</h3>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>{previewPhoto.workerName} • {previewPhoto.siteName}</span>
                </div>
                <button
                  onClick={() => setPreviewPhoto(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: '#64748B' }}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div style={{ backgroundColor: '#0F172A', borderRadius: '12px', overflow: 'hidden', textAlign: 'center', padding: '8px', marginBottom: '14px' }}>
                <img
                  src={previewPhoto.src}
                  alt={previewPhoto.title}
                  style={{ width: '100%', maxHeight: '320px', objectFit: 'contain', borderRadius: '8px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>⏰ Time Recorded:</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>{previewPhoto.time}</span>
              </div>
            </div>
          </div>
        )}
        {/* Toast Notification Popup Banner */}
        {toastMessage && (
          <div
            style={{
              position: 'fixed',
              bottom: '24px',
              right: '24px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid #10B981',
              borderRadius: '12px',
              padding: '12px 18px',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              zIndex: 10000,
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            <CheckCircle2 size={18} color="#10B981" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Edit Agent Modal */}
        {editingAgent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setEditingAgent(null)}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: '16px',
                maxWidth: '480px',
                width: '90%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Edit Agent Details</h3>
                <button
                  onClick={() => setEditingAgent(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditAgent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Email Address *</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Phone Number *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Site Assignment</label>
                  <select
                    value={editFormData.siteId}
                    onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="">No Site / Unassigned</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>{s.siteName}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingAgent(null)}
                    style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingEdit}
                    style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    {isSubmittingEdit ? <Loader2 size={16} className="spinner" /> : null}
                    {isSubmittingEdit ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Agent Confirmation Modal */}
        {deletingAgent && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => setDeletingAgent(null)}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: '16px',
                maxWidth: '440px',
                width: '90%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{ backgroundColor: '#FEE2E2', padding: '10px', borderRadius: '50%', color: '#DC2626' }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: 'var(--text-primary)' }}>Delete Agent</h3>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>This action cannot be undone.</span>
                </div>
              </div>

              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5', margin: '0 0 16px 0' }}>
                Are you sure you want to delete agent <strong style={{ color: 'var(--text-primary)' }}>{deletingAgent.name}</strong> ({deletingAgent.employeeCode || `AGT-${deletingAgent.id}`})?
                <br /><br />
                <span style={{ color: '#D97706', fontWeight: 700 }}>⚠️ Note:</span> Deleting this agent will automatically set all assigned workers to <strong style={{ color: 'var(--text-primary)' }}>Unassigned</strong>.
              </p>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDeletingAgent(null)}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteAgentConfirm}
                  disabled={isSubmittingDelete}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#DC2626', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingDelete ? <Loader2 size={16} className="spinner" /> : null}
                  {isSubmittingDelete ? 'Deleting...' : 'Delete Agent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
