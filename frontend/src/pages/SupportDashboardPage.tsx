import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSupportAnalyticsApi,
  fetchNotificationsApi,
  fetchWorkersApi,
  fetchAgentsApi,
  updateSupportTicketApi,
  checkInApi,
  checkOutApi,
  fetchTodayAttendanceStatusApi,
  updateUserApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  clearAllNotificationsApi,
  deleteNotificationApi
} from '../services/api';
import { getSocket, joinUserRoom } from '../services/socket';
import { TicketDetailModal } from '../components/TicketDetailModal';
import { SupportPage } from './SupportPage';
import { LeavePage } from './LeavePage';
import { AgentMyDetailsView } from '../components/AgentMyDetailsView';
import { ActionModal } from '../components/ActionModal';
import { UserAvatar } from '../components/UserAvatar';
import {
  Headset,
  LayoutDashboard,
  User,
  Lock,
  KeyRound,
  Loader2,
  Ticket,
  BookOpen,
  BarChart3,
  Bell,
  Sun,
  Moon,
  Search,
  Calendar,
  ChevronDown,
  LogOut,
  MoreVertical,
  Clock,
  CheckCircle2,
  AlertCircle,
  Clock3,
  Star,
  ShieldCheck,
  Menu,
  RefreshCw,
  FileText,
  TrendingUp,
  TrendingDown,
  Plus,
  UserCheck,
  Trash2,
  X
} from 'lucide-react';
import './SupportDashboardPage.css';

export const SupportDashboardPage: React.FC = () => {
  const { user, role, logout } = useAuth();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Dark / Light Theme Toggle State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    return (
      document.body.classList.contains('dark-mode') ||
      document.documentElement.getAttribute('data-theme') === 'dark'
    );
  });

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.body.classList.add('dark-mode');
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark-mode');
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  // Change Password Modal States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      await updateUserApi(user.id, {
        currentPassword,
        newPassword
      });

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccess(null);
        setIsChangePasswordOpen(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Date Range Picker State
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const getDateRangeLabel = () => {
    if (dateFrom && dateTo) {
      const from = new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      const to = new Date(dateTo).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      return `${from} — ${to}`;
    }
    if (dateFrom) {
      return `From ${new Date(dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    }
    return 'Select Date Range';
  };

  // Profile Dropdown State
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isNotificationDropdownOpen, setIsNotificationDropdownOpen] = useState(false);

  // Analytics & Backend Data
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Table Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals State
  const [selectedTicketModal, setSelectedTicketModal] = useState<any | null>(null);
  const [isCreateTicketModalOpen, setIsCreateTicketModalOpen] = useState(false);
  const [isApplyLeaveModalOpen, setIsApplyLeaveModalOpen] = useState(false);

  // Standalone tab state data
  const [usersList, setUsersList] = useState<any[]>([]);
  const [notificationsList, setNotificationsList] = useState<any[]>([]);
  const [isLoadingTabContent, setIsLoadingTabContent] = useState(false);

  // Initial load of notifications & room subscription
  useEffect(() => {
    if (user?.id) {
      joinUserRoom(user.id, user.role || 'CUSTOMER_SUPPORT');
    }
    fetchNotificationsApi()
      .then(setNotificationsList)
      .catch(() => setNotificationsList([]));
  }, [user]);

  // Real-time socket listener for notifications
  useEffect(() => {
    const socket = getSocket();
    const handleNotificationEvent = (newNotif: any) => {
      setNotificationsList((prev) => [newNotif, ...prev]);
    };
    socket.on('notification', handleNotificationEvent);
    return () => {
      socket.off('notification', handleNotificationEvent);
    };
  }, []);

  const unreadNotifCount = notificationsList.filter((n: any) => !n.isRead).length;

  // Attendance State
  const [attendanceData, setAttendanceData] = useState<any>(null);
  const [isAttendingAction, setIsAttendingAction] = useState(false);
  const [liveTimerStr, setLiveTimerStr] = useState<string>('00h 00m 00s');

  const loadTodayAttendance = async () => {
    try {
      const data = await fetchTodayAttendanceStatusApi();
      setAttendanceData(data);
    } catch (err) {
      console.error('Failed to load today attendance status:', err);
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
    } catch (err: any) {
      alert(err?.message || 'Failed to check out');
    } finally {
      setIsAttendingAction(false);
    }
  };

  const loadAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await fetchSupportAnalyticsApi();
      setAnalyticsData(data);
    } catch (err: any) {
      console.error('Failed to load support analytics:', err);
      setError(err?.message || 'Failed to load support dashboard data from backend database.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const socket = getSocket();
    const handleUpdate = () => {
      loadAnalytics();
    };

    socket.on('ticket:created', handleUpdate);
    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket:assigned', handleUpdate);

    return () => {
      socket.off('ticket:created', handleUpdate);
      socket.off('ticket:updated', handleUpdate);
      socket.off('ticket:assigned', handleUpdate);
    };
  }, []);

  const isTicketAssignedToMe = (t: any) => {
    if (!user) return false;
    const status = (t.status || '').toUpperCase();
    if (status === 'OPEN') return false;

    const userIdStr = String(user.id || '');
    const myName = (user.name || '').trim().toLowerCase();
    const hId = t.handledById !== undefined && t.handledById !== null ? String(t.handledById) : '';
    const hByName = typeof t.handledBy === 'object' && t.handledBy !== null ? (t.handledBy.name || '').trim().toLowerCase() : (typeof t.handledBy === 'string' ? t.handledBy.trim().toLowerCase() : '');

    if (hId !== '' && (hId === userIdStr || Number(hId) === Number(user.id))) return true;
    if (hByName !== '' && myName !== '' && (hByName === myName || hByName.includes(myName) || myName.includes(hByName))) return true;
    return false;
  };

  const isTicketUnassigned = (t: any) => {
    const status = (t.status || '').toUpperCase();
    if (status === 'OPEN') return true;

    const hId = t.handledById;
    const hByName = typeof t.handledBy === 'object' && t.handledBy !== null ? (t.handledBy.name || '').trim() : (typeof t.handledBy === 'string' ? t.handledBy.trim() : '');

    if (hId !== null && hId !== undefined && Number(hId) > 0) return false;
    if (hByName !== '' && hByName !== 'Unassigned' && hByName !== 'Pending Assignment') return false;
    return true;
  };

  const handleAssignToMe = async (ticketId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateSupportTicketApi(ticketId, {
        handledById: user?.id || null,
        handledBy: user?.name || 'Support Agent',
        status: 'IN_PROGRESS'
      } as any);
      loadAnalytics();
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const handleDashboardStatusChange = async (ticketId: string | number, newStatus: string, e?: React.ChangeEvent<HTMLSelectElement>) => {
    if (e) e.stopPropagation();
    try {
      await updateSupportTicketApi(ticketId, { status: newStatus as any });
      loadAnalytics();
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket status');
    }
  };

  const handleUnassignFromMe = async (ticketId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await updateSupportTicketApi(ticketId, {
        unassign: true,
        handledById: null,
        handledBy: '',
        status: 'OPEN'
      } as any);
      loadAnalytics();
    } catch (err) {
      console.error('Failed to unassign ticket:', err);
    }
  };

  // Load data when activeTab changes
  useEffect(() => {
    if (activeTab === 'users') {
      setIsLoadingTabContent(true);
      Promise.all([fetchWorkersApi().catch(() => []), fetchAgentsApi().catch(() => [])])
        .then(([workers, agents]) => {
          const combined = [
            ...agents.map((a: any) => ({ ...a, userRole: 'AGENT' })),
            ...workers.map((w: any) => ({ ...w, userRole: 'WORKER' }))
          ];
          setUsersList(combined);
        })
        .finally(() => setIsLoadingTabContent(false));
    } else if (activeTab === 'notifications') {
      setIsLoadingTabContent(true);
      fetchNotificationsApi()
        .then(setNotificationsList)
        .catch(() => setNotificationsList([]))
        .finally(() => setIsLoadingTabContent(false));
    }
  }, [activeTab]);

  const handleLogoutAction = () => {
    logout();
    window.location.href = '/support/login';
  };

  const stats = analyticsData?.stats || {};
  const ticketsOverview = analyticsData?.ticketsOverview || [];
  const ticketsByPriority = analyticsData?.ticketsByPriority || [];
  const liveTicketFeed = analyticsData?.liveTicketFeed || [];
  const recentTickets = analyticsData?.recentTickets || [];
  const performanceSummary = analyticsData?.performanceSummary || {};

  // Filtered recent tickets
  const filteredRecentTickets = recentTickets.filter((ticket: any) => {
    if (statusFilter !== 'ALL' && ticket.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && ticket.priority?.toUpperCase() !== priorityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubj = ticket.subject?.toLowerCase().includes(q);
      const matchCust = ticket.customerName?.toLowerCase().includes(q);
      const matchNum = ticket.ticketNumber?.toLowerCase().includes(q);
      if (!matchSubj && !matchCust && !matchNum) return false;
    }
    return true;
  });

  const getPriorityBadgeClass = (priority?: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'priority-badge high';
    if (p === 'MEDIUM') return 'priority-badge medium';
    return 'priority-badge low';
  };

  const getStatusBadgeClass = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') return 'status-badge open';
    if (s === 'IN_PROGRESS') return 'status-badge in-progress';
    if (s === 'CLOSED' || s === 'RESOLVED') return 'status-badge resolved';
    return 'status-badge default';
  };

  const getStatusLabel = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') return 'Open';
    if (s === 'IN_PROGRESS') return 'In Progress';
    if (s === 'CLOSED' || s === 'RESOLVED') return 'Resolved';
    return s || '—';
  };

  // Render standalone view based on activeTab
  const renderTabContent = () => {
    if (activeTab === 'my_details') {
      return (
        <div className="tab-standalone-page animate-fade-in" style={{ padding: 0, backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
          <AgentMyDetailsView />
        </div>
      );
    }

    if (activeTab === 'my_leaves') {
      return (
        <div className="tab-standalone-page animate-fade-in" style={{ padding: '0 0 24px 0' }}>
          <LeavePage
            isMyLeavesOnly={true}
            onOpenModal={(modalType) => {
              if (modalType === 'apply_leave') {
                setIsApplyLeaveModalOpen(true);
              }
            }}
            refreshTrigger={1}
          />
        </div>
      );
    }

    if (activeTab === 'tickets' || activeTab === 'my_tickets' || activeTab === 'unassigned') {
      return (
        <SupportPage
          onOpenModal={(modalType) => {
            if (modalType === 'create_ticket') setIsCreateTicketModalOpen(true);
          }}
          onOpenRespondModal={(t) => setSelectedTicketModal(t)}
          onOpenEditModal={(t) => setSelectedTicketModal(t)}
          onOpenCommentModal={(t) => setSelectedTicketModal(t)}
          subTabFilter={activeTab === 'my_tickets' ? 'MY' : activeTab === 'unassigned' ? 'UNASSIGNED' : 'ALL'}
          dateFrom={dateFrom || undefined}
          dateTo={dateTo || undefined}
          refreshTrigger={1}
        />
      );
    }

    if (activeTab === 'knowledge') {
      return (
        <div className="tab-standalone-page animate-fade-in">
          <div className="standalone-header">
            <div>
              <h2>Support Knowledge Base & FAQs</h2>
              <p>Search guides, resolution workflows, and union compliance procedures.</p>
            </div>
            <div className="standalone-search">
              <Search size={16} />
              <input type="text" placeholder="Search articles or keywords..." />
            </div>
          </div>

          <div className="kb-categories-grid">
            <div className="kb-card">
              <BookOpen size={24} color="#2563eb" />
              <h3>Wage & Payroll Queries</h3>
              <p>Step-by-step guides for resolving weekly wage disputes and OT hours calculation.</p>
              <span className="article-count">14 Articles</span>
            </div>
            <div className="kb-card">
              <ShieldCheck size={24} color="#10b981" />
              <h3>Safety & Insurance Policies</h3>
              <p>Procedure for filing ESI medical insurance claims and site equipment grievances.</p>
              <span className="article-count">9 Articles</span>
            </div>
            <div className="kb-card">
              <UserCheck size={24} color="#8b5cf6" />
              <h3>Worker Profile & Designation</h3>
              <p>Updating primary mobile numbers, bank details, and supervisor assignments.</p>
              <span className="article-count">11 Articles</span>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'users') {
      return (
        <div className="tab-standalone-page animate-fade-in">
          <div className="standalone-header">
            <div>
              <h2>Support Portal Users Directory</h2>
              <p>Workers, Supervisors, and Customer Support Agents active in the system.</p>
            </div>
            <div className="standalone-search">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search user name or employee code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="table-responsive-wrapper">
            <table className="tickets-data-table">
              <thead>
                <tr>
                  <th>User Name</th>
                  <th>Role</th>
                  <th>Contact Info</th>
                  <th>Assigned Agent / Site</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingTabContent ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>Loading directory data...</td></tr>
                ) : usersList.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No users found in database.</td></tr>
                ) : (
                  usersList.filter(u => !searchQuery || u.name?.toLowerCase().includes(searchQuery.toLowerCase())).map((u, idx) => (
                    <tr key={idx}>
                      <td>
                        <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748B' }}>{u.employeeCode || u.designation || 'Union Member'}</div>
                      </td>
                      <td>
                        <span className={`status-badge ${u.userRole === 'AGENT' ? 'in-progress' : 'open'}`}>
                          {u.userRole || 'WORKER'}
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '12.5px' }}>{u.phone || '—'}</div>
                        <div style={{ fontSize: '11.5px', color: '#64748B' }}>{u.email || '—'}</div>
                      </td>
                      <td>{u.assignedAgentName || u.siteName || '—'}</td>
                      <td><span className="status-badge resolved">Active</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    }

    if (activeTab === 'reports') {
      return (
        <div className="tab-standalone-page animate-fade-in">
          <div className="standalone-header">
            <div>
              <h2>Support Analytics & Performance Reports</h2>
              <p>Comprehensive ticket resolution times, agent workload, and worker satisfaction.</p>
            </div>
          </div>

          <div className="metrics-grid-container" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            <div className="support-stat-card">
              <span className="card-label">Average Resolution Time</span>
              <h2 className="card-value">{performanceSummary.avgResponseTime || '1h 24m'}</h2>
            </div>
            <div className="support-stat-card">
              <span className="card-label">Overall Resolution Rate</span>
              <h2 className="card-value">{performanceSummary.resolutionRate || '92.4%'}</h2>
            </div>
            <div className="support-stat-card">
              <span className="card-label">Customer Satisfaction Rating</span>
              <h2 className="card-value">{performanceSummary.customerSatisfaction || '4.6 / 5'}</h2>
            </div>
          </div>
        </div>
      );
    }

    if (activeTab === 'notifications') {
      return (
        <div className="tab-standalone-page animate-fade-in">
          <div className="standalone-header">
            <div>
              <h2>Notifications & Alerts Inbox</h2>
              <p>Role-targeted support ticket alerts, replies, and assignment updates.</p>
            </div>
          </div>

          <div className="notifications-inbox-list">
            {notificationsList.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#64748B' }}>
                No notifications in your inbox.
              </div>
            ) : (
              notificationsList.map((n) => (
                <div className="notification-inbox-card" key={n.id}>
                  <Bell size={18} color="#2563eb" />
                  <div>
                    <h4>{n.title}</h4>
                    <p>{n.message}</p>
                    <span className="notif-time">{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      );
    }

    if (activeTab === 'settings') {
      return (
        <div className="tab-standalone-page animate-fade-in">
          <div className="standalone-header">
            <div>
              <h2>Support Portal Settings</h2>
              <p>Manage notification preferences, workflow auto-assignments, and support schedule.</p>
            </div>
          </div>

          <div className="settings-card-box">
            <div className="setting-row">
              <div>
                <h4>Auto Assign Tickets to Field Supervisors</h4>
                <p>Automatically assign new grievances to worker's designated supervisor.</p>
              </div>
              <input type="checkbox" defaultChecked />
            </div>

            <div className="setting-row">
              <div>
                <h4>Real-time Email Alerts for High Priority Tickets</h4>
                <p>Send instant email notifications when urgent tickets are filed.</p>
              </div>
              <input type="checkbox" defaultChecked />
            </div>
          </div>
        </div>
      );
    }

    // Default Dashboard Tab
    return (
      <>
        {/* 5 Metric Summary Cards */}
        <div className="metrics-grid-container">
          {/* Card 1: Total Tickets */}
          <div className="support-stat-card">
            <div className="card-top-row">
              <div className="stat-icon-wrapper blue">
                <Ticket size={20} color="#ffffff" />
              </div>
              <span className="trend-badge positive">
                <TrendingUp size={14} /> 18.7% <small>from last week</small>
              </span>
            </div>
            <div className="card-bottom-row">
              <span className="card-label">Total Tickets</span>
              <h2 className="card-value">{stats.totalTickets !== undefined ? stats.totalTickets : "—"}</h2>
            </div>
          </div>

          {/* Card 2: Open Tickets */}
          <div className="support-stat-card">
            <div className="card-top-row">
              <div className="stat-icon-wrapper orange">
                <Clock3 size={20} color="#ffffff" />
              </div>
              <span className="trend-badge positive">
                <TrendingUp size={14} /> 12.5% <small>from last week</small>
              </span>
            </div>
            <div className="card-bottom-row">
              <span className="card-label">Open Tickets</span>
              <h2 className="card-value">{stats.openTickets !== undefined ? stats.openTickets : "—"}</h2>
            </div>
          </div>

          {/* Card 3: In Progress */}
          <div className="support-stat-card">
            <div className="card-top-row">
              <div className="stat-icon-wrapper purple">
                <Clock size={20} color="#ffffff" />
              </div>
              <span className="trend-badge positive">
                <TrendingUp size={14} /> 5.3% <small>from last week</small>
              </span>
            </div>
            <div className="card-bottom-row">
              <span className="card-label">In Progress</span>
              <h2 className="card-value">{stats.inProgressTickets !== undefined ? stats.inProgressTickets : "—"}</h2>
            </div>
          </div>

          {/* Card 4: Resolved */}
          <div className="support-stat-card">
            <div className="card-top-row">
              <div className="stat-icon-wrapper green">
                <CheckCircle2 size={20} color="#ffffff" />
              </div>
              <span className="trend-badge positive">
                <TrendingUp size={14} /> 22.1% <small>from last week</small>
              </span>
            </div>
            <div className="card-bottom-row">
              <span className="card-label">Resolved</span>
              <h2 className="card-value">{stats.resolvedTickets !== undefined ? stats.resolvedTickets : "—"}</h2>
            </div>
          </div>

          {/* Card 5: Overdue */}
          <div className="support-stat-card">
            <div className="card-top-row">
              <div className="stat-icon-wrapper red">
                <AlertCircle size={20} color="#ffffff" />
              </div>
              <span className="trend-badge negative">
                <TrendingDown size={14} /> 10.2% <small>from last week</small>
              </span>
            </div>
            <div className="card-bottom-row">
              <span className="card-label">Overdue</span>
              <h2 className="card-value">{stats.overdueTickets !== undefined ? stats.overdueTickets : "—"}</h2>
            </div>
          </div>
        </div>

        {/* Charts & Live Feed Section */}
        <div className="charts-feed-row">
          {/* Chart 1: Tickets Overview Line Graph */}
          <div className="dashboard-widget-card line-chart-widget">
            <div className="widget-card-header">
              <h3>Tickets Overview</h3>
              <select className="widget-select-dropdown">
                <option>Last 7 Days</option>
                <option>Last 30 Days</option>
              </select>
            </div>

            <div className="chart-legend-row">
              <span className="legend-item"><span className="dot blue"></span> Opened</span>
              <span className="legend-item"><span className="dot green"></span> Resolved</span>
              <span className="legend-item"><span className="dot red"></span> Overdue</span>
            </div>

            {/* Custom SVG Line Chart */}
            <div className="svg-chart-container">
              <svg viewBox="0 0 500 200" className="trend-line-svg">
                <line x1="0" y1="40" x2="500" y2="40" stroke="#f1f5f9" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="#f1f5f9" strokeDasharray="4 4" />
                <line x1="0" y1="120" x2="500" y2="120" stroke="#f1f5f9" strokeDasharray="4 4" />
                <line x1="0" y1="160" x2="500" y2="160" stroke="#f1f5f9" strokeDasharray="4 4" />

                <path d="M 20 120 Q 90 60, 160 90 T 300 65 T 440 85 T 480 95" fill="none" stroke="#3b82f6" strokeWidth="3" />
                <path d="M 20 150 Q 90 120, 160 140 T 300 120 T 440 130 T 480 140" fill="none" stroke="#10b981" strokeWidth="3" />
                <path d="M 20 180 Q 90 170, 160 175 T 300 165 T 440 170 T 480 175" fill="none" stroke="#ef4444" strokeWidth="3" />

                <circle cx="20" cy="120" r="4" fill="#3b82f6" />
                <circle cx="90" cy="60" r="4" fill="#3b82f6" />
                <circle cx="160" cy="90" r="4" fill="#3b82f6" />
                <circle cx="230" cy="115" r="4" fill="#3b82f6" />
                <circle cx="300" cy="65" r="4" fill="#3b82f6" />
                <circle cx="370" cy="75" r="4" fill="#3b82f6" />
                <circle cx="440" cy="85" r="4" fill="#3b82f6" />
              </svg>

              <div className="chart-x-axis">
                {ticketsOverview.map((item: any, idx: number) => (
                  <span key={idx}>{item.day || `Day ${idx + 1}`}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Chart 2: Tickets by Priority Donut Chart */}
          <div className="dashboard-widget-card donut-chart-widget">
            <div className="widget-card-header">
              <h3>Tickets by Priority</h3>
              <select className="widget-select-dropdown">
                <option>All Priorities</option>
                <option>High Priority</option>
              </select>
            </div>

            <div className="donut-wrapper">
              <svg viewBox="0 0 160 160" className="donut-svg">
                <circle cx="80" cy="80" r="60" fill="none" stroke="#f1f5f9" strokeWidth="20" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#ef4444" strokeWidth="20" strokeDasharray="110 376" strokeDashoffset="0" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#f59e0b" strokeWidth="20" strokeDasharray="180 376" strokeDashoffset="-110" />
                <circle cx="80" cy="80" r="60" fill="none" stroke="#10b981" strokeWidth="20" strokeDasharray="86 376" strokeDashoffset="-290" />
              </svg>
              <div className="donut-center-text">
                <span className="donut-number">{stats.totalTickets !== undefined ? stats.totalTickets : "0"}</span>
                <span className="donut-label">Total</span>
              </div>
            </div>

            <div className="priority-legend-list">
              {ticketsByPriority.map((item: any, idx: number) => {
                const color = item.priority === 'High' ? '#ef4444' : item.priority === 'Medium' ? '#f59e0b' : '#10b981';
                return (
                  <div className="priority-item" key={idx}>
                    <span className="priority-dot" style={{ backgroundColor: color }}></span>
                    <span className="priority-name">{item.priority}</span>
                    <span className="priority-val">{item.count !== undefined ? `${item.count} (${item.percentage || 0}%)` : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Section: Live Ticket Feed */}
          <div className="dashboard-widget-card live-feed-widget">
            <div className="widget-card-header">
              <h3>Live Ticket Feed</h3>
              <span className="live-indicator">
                <span className="green-pulse"></span> Live
              </span>
            </div>

            <div className="live-feed-list">
              {liveTicketFeed.length === 0 ? (
                <div className="feed-empty-state">
                  <span>No recent ticket events in feed</span>
                </div>
              ) : (
                liveTicketFeed.map((item: any, idx: number) => (
                  <div
                    className="feed-item clickable-ticket-row"
                    key={idx}
                    onClick={() => setSelectedTicketModal(item)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="feed-avatar">
                      <img
                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.customerName || idx}`}
                        alt="User"
                      />
                    </div>
                    <div className="feed-details">
                      <p className="feed-action-text">{item.action}</p>
                      <p className="feed-subject">
                        {item.customerName ? <strong>{item.customerName}</strong> : <span className="blank-dash">—</span>}: {item.subject || "—"} <span className="feed-ticket-id">{item.ticketNumber}</span>
                      </p>
                    </div>
                    <span className="feed-time">{item.timeAgo}</span>
                  </div>
                ))
              )}
            </div>

            <div className="feed-footer-link">
              <a href="#view-all-feed" onClick={(e) => { e.preventDefault(); setActiveTab('tickets'); }}>View All Feed →</a>
            </div>
          </div>
        </div>

        {/* Bottom Section: Recent Tickets & Performance Summary */}
        <div className="recent-performance-row">
          {/* Recent Tickets Table Container */}
          <div className="dashboard-widget-card recent-tickets-widget">
            <div className="widget-card-header flex-header">
              <h3>Recent Tickets</h3>
              <div className="table-filter-group">
                <select
                  className="widget-select-dropdown"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL">All Status</option>
                  <option value="OPEN">Open</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="CLOSED">Resolved</option>
                </select>

                <select
                  className="widget-select-dropdown"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                >
                  <option value="ALL">All Priorities</option>
                  <option value="HIGH">High</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="LOW">Low</option>
                </select>

                <a href="#view-all-tickets" className="view-all-link" onClick={(e) => { e.preventDefault(); setActiveTab('tickets'); }}>View All</a>
              </div>
            </div>

            <div className="table-responsive-wrapper">
              <table className="tickets-data-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecentTickets.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                        No support tickets found in backend database matching criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecentTickets.map((t: any) => (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTicketModal(t)}
                        style={{ cursor: 'pointer' }}
                        className="clickable-ticket-row"
                      >
                        <td className="col-ticket-id">
                          <a href={`#ticket-${t.id}`} onClick={(e) => { e.preventDefault(); setSelectedTicketModal(t); }}>
                            {t.ticketNumber || `#TKT-${t.id}`}
                          </a>
                        </td>
                        <td className="col-subject">{t.subject || "—"}</td>
                        <td className="col-customer">
                          {t.customerName ? t.customerName : <span className="blank-dash">—</span>}
                        </td>
                        <td>
                          <span className={getPriorityBadgeClass(t.priority)}>
                            {t.priority ? t.priority : "—"}
                          </span>
                        </td>
                        <td>
                          {isTicketAssignedToMe(t) ? (
                            <select
                              value={(t.status || 'OPEN').toUpperCase()}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleDashboardStatusChange(t.id, e.target.value, e)}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 800,
                                cursor: 'pointer',
                                border: '1px solid #CBD5E1',
                                backgroundColor: (t.status || '').toUpperCase() === 'OPEN' ? '#FEF3C7' : (t.status || '').toUpperCase() === 'IN_PROGRESS' ? '#EFF6FF' : (t.status || '').toUpperCase() === 'RESOLVED' ? '#DCFCE7' : '#F1F5F9',
                                color: (t.status || '').toUpperCase() === 'OPEN' ? '#D97706' : (t.status || '').toUpperCase() === 'IN_PROGRESS' ? '#2563EB' : (t.status || '').toUpperCase() === 'RESOLVED' ? '#15803D' : '#475569'
                              }}
                            >
                              <option value="OPEN">Open</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="RESOLVED">Resolved</option>
                              <option value="CLOSED">Closed</option>
                            </select>
                          ) : (
                            <span className={getStatusBadgeClass(t.status)}>
                              {getStatusLabel(t.status)}
                            </span>
                          )}
                        </td>
                        <td className="col-updated">{t.timeAgo || "—"}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isTicketAssignedToMe(t) ? (
                            <>
                              <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginRight: '6px', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                ✓ Assigned to You
                              </span>
                              <button
                                type="button"
                                onClick={(e) => handleUnassignFromMe(t.id, e)}
                                style={{
                                  backgroundColor: '#FEF2F2',
                                  color: '#DC2626',
                                  border: '1px solid #FCA5A5',
                                  borderRadius: '6px',
                                  padding: '3px 8px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                  marginRight: '6px'
                                }}
                              >
                                <X size={11} /> Unassign
                              </button>
                            </>
                          ) : isTicketUnassigned(t) ? (
                            <button
                              type="button"
                              onClick={(e) => handleAssignToMe(t.id, e)}
                              style={{
                                backgroundColor: '#2563EB',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '4px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                marginRight: '8px'
                              }}
                            >
                              <UserCheck size={13} /> Assign to Me
                            </button>
                          ) : (
                            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginRight: '8px', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px' }}>
                              Assigned: {typeof t.handledBy === 'object' && t.handledBy !== null ? t.handledBy.name : String(t.handledBy || '')}
                            </span>
                          )}
                          <button
                            className="action-dots-btn"
                            onClick={(e) => { e.stopPropagation(); setSelectedTicketModal(t); }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-pagination-footer">
              <span className="pagination-info">
                Showing 1 to {filteredRecentTickets.length} of {stats.totalTickets !== undefined ? stats.totalTickets : filteredRecentTickets.length} tickets
              </span>
              <div className="pagination-pages">
                <button className="page-num active">1</button>
                <button className="page-num">2</button>
                <button className="page-num">3</button>
                <button className="page-num">4</button>
                <button className="page-num">5</button>
                <span className="page-dots">...</span>
                <button className="page-num">50</button>
                <button className="page-num next">&gt;</button>
              </div>
            </div>
          </div>

          {/* Performance Summary Card */}
          <div className="dashboard-widget-card performance-summary-widget">
            <div className="widget-card-header">
              <h3>Performance Summary</h3>
              <select className="widget-select-dropdown">
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>

            <div className="performance-metrics-list">
              <div className="perf-item">
                <div className="perf-icon-circle blue">
                  <Clock size={20} color="#2563eb" />
                </div>
                <div className="perf-details">
                  <span className="perf-label">Avg. Response Time</span>
                  <h4 className="perf-value">{performanceSummary.avgResponseTime || "—"}</h4>
                  <span className="perf-trend positive">↓ 15m from last week</span>
                </div>
              </div>

              <div className="perf-item">
                <div className="perf-icon-circle green">
                  <ShieldCheck size={20} color="#10b981" />
                </div>
                <div className="perf-details">
                  <span className="perf-label">Resolution Rate</span>
                  <h4 className="perf-value">{performanceSummary.resolutionRate || "—"}</h4>
                  <span className="perf-trend positive">↑ 4.2% from last week</span>
                </div>
              </div>

              <div className="perf-item">
                <div className="perf-icon-circle orange">
                  <Star size={20} color="#f59e0b" />
                </div>
                <div className="perf-details">
                  <span className="perf-label">Customer Satisfaction</span>
                  <h4 className="perf-value">{performanceSummary.customerSatisfaction || "—"}</h4>
                  <span className="perf-trend positive">↑ 0.3 from last week</span>
                </div>
              </div>
            </div>

            <div className="feed-footer-link">
              <a href="#full-report" onClick={(e) => { e.preventDefault(); setActiveTab('reports'); }}>View Full Report →</a>
            </div>
          </div>
        </div>
      </>
    );
  };

  return (
    <div className={`support-dashboard-layout ${sidebarCollapsed ? 'sidebar-mini' : ''}`}>
      {/* Sidebar Navigation */}
      <aside className="support-sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon-wrapper">
            <Headset size={24} color="#ffffff" />
          </div>
          {!sidebarCollapsed && (
            <div className="brand-text-block">
              <span className="brand-title">Customer Support</span>
              <span className="brand-sub">Portal</span>
            </div>
          )}
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <LayoutDashboard size={18} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </button>

          <button
            className={`nav-item ${activeTab === 'my_tickets' ? 'active' : ''}`}
            onClick={() => setActiveTab('my_tickets')}
          >
            <UserCheck size={18} />
            {!sidebarCollapsed && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span>My Tickets</span>
                {recentTickets.filter((t: any) => isTicketAssignedToMe(t)).length > 0 && (
                  <span style={{ backgroundColor: '#10b981', color: '#ffffff', fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '10px', marginLeft: 'auto' }}>
                    {recentTickets.filter((t: any) => isTicketAssignedToMe(t)).length}
                  </span>
                )}
              </div>
            )}
          </button>

          <button className={`nav-item ${activeTab === 'my_leaves' ? 'active' : ''}`} onClick={() => setActiveTab('my_leaves')}>
            <FileText size={18} />
            {!sidebarCollapsed && <span>My Leaves</span>}
          </button>

          <button className={`nav-item ${activeTab === 'my_details' ? 'active' : ''}`} onClick={() => setActiveTab('my_details')}>
            <User size={18} />
            {!sidebarCollapsed && <span>My Details</span>}
          </button>

          <button className={`nav-item ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <BarChart3 size={18} />
            {!sidebarCollapsed && <span>Reports</span>}
          </button>

          <button className={`nav-item ${activeTab === 'notifications' ? 'active' : ''}`} onClick={() => setActiveTab('notifications')}>
            <Bell size={18} />
            {!sidebarCollapsed && (
              <>
                <span>Notifications</span>
                <span className="nav-badge red">12</span>
              </>
            )}
          </button>
        </nav>

        {/* Logged in User Profile Footer */}
        <div className="sidebar-profile-footer">
          <div className="profile-avatar-box">
            <img
              src={user?.profileImage || "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80"}
              alt="Support Agent"
              className="profile-avatar"
            />
            <span className="online-dot-badge"></span>
          </div>
          {!sidebarCollapsed && (
            <div className="profile-details">
              <span className="profile-name">{user?.name || "Support Agent"}</span>
              <span className="profile-email">{user?.email || "support@union.com"}</span>
            </div>
          )}
          <button className="logout-icon-btn" onClick={handleLogoutAction} title="Sign Out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {/* Main Main Content Container */}
      <main className="support-main-content">
        {/* Top Navigation Header */}
        <header className="support-top-header">
          <div className="header-left">
            <button
              className="sidebar-toggle-btn"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            >
              <Menu size={20} />
            </button>
            <div className="global-search-bar">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                placeholder="Search tickets, users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="shortcut-kbd">Ctrl + K</span>
            </div>
          </div>

          <div className="header-right">
            {/* Create Ticket Action Button */}
            <button
              className="create-ticket-top-btn"
              onClick={() => setIsCreateTicketModalOpen(true)}
            >
              <Plus size={16} />
              <span>Create Ticket</span>
            </button>

            <button className="icon-notification-btn" title="Refresh Dashboard Data" onClick={loadAnalytics}>
              <RefreshCw size={18} className={loading ? 'spin' : ''} />
            </button>

            <button
              className="icon-notification-btn"
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              onClick={toggleDarkMode}
            >
              {isDarkMode ? <Sun size={18} color="#F59E0B" /> : <Moon size={18} color="#475569" />}
            </button>

            {/* Notifications Dropdown Popup Container */}
            <div className="user-profile-dropdown-container" style={{ position: 'relative' }}>
              <button
                className="icon-notification-btn"
                title="Notifications"
                onClick={() => {
                  setIsNotificationDropdownOpen(!isNotificationDropdownOpen);
                  setProfileDropdownOpen(false);
                }}
                style={{ position: 'relative' }}
              >
                <Bell size={18} />
                {unreadNotifCount > 0 && <span className="red-dot"></span>}
                {unreadNotifCount > 0 && (
                  <span className="badge-count">{unreadNotifCount > 99 ? '99+' : unreadNotifCount}</span>
                )}
              </button>

              {isNotificationDropdownOpen && (
                <div
                  className="user-profile-menu animate-fade-in"
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 12px)',
                    right: 0,
                    width: '380px',
                    maxWidth: '90vw',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '16px',
                    border: '1px solid var(--border-color)',
                    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)',
                    zIndex: 99999,
                    overflow: 'hidden',
                    padding: 0
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Bell size={16} color="#2563EB" />
                      <span style={{ fontSize: '14px', fontWeight: 800, color: 'var(--text-primary)' }}>Notifications</span>
                      {unreadNotifCount > 0 && (
                        <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: '#EFF6FF', color: '#2563EB', padding: '2px 8px', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
                          {unreadNotifCount} New
                        </span>
                      )}
                    </div>
                    {notificationsList.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {unreadNotifCount > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await markAllNotificationsReadApi();
                                setNotificationsList(prev => prev.map(n => ({ ...n, isRead: true })));
                              } catch {}
                            }}
                            style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CheckCircle2 size={13} /> Mark all read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await clearAllNotificationsApi();
                              setNotificationsList([]);
                            } catch (err) {
                              console.error('Failed to clear notifications:', err);
                            }
                          }}
                          style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Trash2 size={13} /> Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                    {notificationsList.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                        <Bell size={32} color="#94A3B8" style={{ marginBottom: '8px' }} />
                        <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>No notifications yet</p>
                      </div>
                    ) : (
                      notificationsList.slice(0, 15).map((n: any) => (
                        <div
                          key={n.id}
                          onClick={async () => {
                            if (!n.isRead) {
                              try {
                                await markNotificationReadApi(n.id);
                                setNotificationsList(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item));
                              } catch {}
                            }
                            setIsNotificationDropdownOpen(false);
                            if (n.type === 'LEAVE') {
                              setActiveTab('my_leaves');
                            } else {
                              setActiveTab('dashboard');
                            }
                          }}
                          style={{
                            padding: '12px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            backgroundColor: n.isRead ? 'transparent' : (isDarkMode ? 'rgba(37, 99, 235, 0.15)' : '#F0F9FF'),
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            transition: 'background-color 0.15s ease'
                          }}
                        >
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: n.type === 'LEAVE' ? '#F3E8FF' : '#EFF6FF',
                            color: n.type === 'LEAVE' ? '#9333EA' : '#2563EB',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {n.type === 'LEAVE' ? <FileText size={15} /> : <Ticket size={15} />}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text-primary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                                {n.title}
                              </span>
                              <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)', flexShrink: 0, marginLeft: '8px' }}>
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {n.message}
                            </p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0, marginTop: '4px' }}>
                            {!n.isRead && (
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563EB' }}></span>
                            )}
                            <button
                              type="button"
                              title="Clear notification"
                              onClick={async (e) => {
                                e.stopPropagation();
                                try {
                                  await deleteNotificationApi(n.id);
                                  setNotificationsList(prev => prev.filter(item => item.id !== n.id));
                                } catch (err) {
                                  console.error('Failed to delete notification:', err);
                                }
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: '#94A3B8',
                                cursor: 'pointer',
                                padding: '2px',
                                borderRadius: '4px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                transition: 'color 0.15s ease'
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
                              onMouseLeave={(e) => (e.currentTarget.style.color = '#94A3B8')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-color)', textAlign: 'center', backgroundColor: 'var(--bg-main)' }}>
                    <button
                      type="button"
                      onClick={() => { setIsNotificationDropdownOpen(false); setActiveTab('notifications'); }}
                      style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '12.5px', fontWeight: 800, cursor: 'pointer' }}
                    >
                      View All Notifications Inbox →
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Profile Card with Dropdown Menu */}
            <div className="user-profile-dropdown-container">
              <div
                className="user-header-card"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              >
                <UserAvatar
                  src={(user as any)?.profileImage || user?.avatar}
                  name={user?.name || "Support Agent"}
                  size={36}
                  className="user-avatar-small"
                />
                <div className="user-info-text">
                  <span className="user-name">{user?.name || "Support Agent"}</span>
                  <span className="status-label-online">
                    <span className="green-pulse"></span> Online
                  </span>
                </div>
                <ChevronDown size={14} className={`dropdown-arrow ${profileDropdownOpen ? 'open' : ''}`} />
              </div>

              {profileDropdownOpen && (
                <div className="user-profile-menu animate-fade-in">
                  <div className="menu-profile-header">
                    <UserAvatar
                      src={(user as any)?.profileImage || user?.avatar}
                      name={user?.name || "Support Agent"}
                      size={46}
                    />
                    <div>
                      <div className="menu-user-name">{user?.name || "Support Agent"}</div>
                      <div className="menu-user-email">{user?.email || "support@union.com"}</div>
                      <span className="menu-role-badge">
                        {role === 'CUSTOMER_SUPPORT' ? 'CUSTOMER SUPPORT AGENT' : (role || 'AGENT')}
                      </span>
                    </div>
                  </div>

                  <div className="menu-divider"></div>

                  <button className="menu-item-btn" onClick={() => { setProfileDropdownOpen(false); setActiveTab('my_details'); }}>
                    <User size={16} />
                    <span>My Details</span>
                  </button>

                  <button className="menu-item-btn" onClick={() => { setProfileDropdownOpen(false); setIsChangePasswordOpen(true); }}>
                    <Lock size={16} />
                    <span>Reset / Change Password</span>
                  </button>

                  <div className="menu-divider"></div>

                  <button className="menu-item-btn logout-item" onClick={handleLogoutAction}>
                    <LogOut size={16} />
                    <span>Sign Out / Logout</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dashboard Title & Date Filter Bar */}
        {activeTab === 'dashboard' && (
          <div className="dashboard-sub-header">
            <div className="header-title-box">
              <h1>Dashboard</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '4px', flexWrap: 'wrap' }}>
                <p style={{ margin: 0 }}>Welcome back, {user?.name || "Support Agent"}! 👋</p>

                {/* Attendance Control Widget */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '20px',
                  padding: '4px 14px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                }}>
                  {!attendanceData?.checkInTime ? (
                    <>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748B' }}>Attendance: Not Checked In</span>
                      <button
                        type="button"
                        onClick={handleCheckInAction}
                        disabled={isAttendingAction}
                        style={{
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '14px',
                          padding: '5px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Clock size={13} /> {isAttendingAction ? 'Processing...' : 'Check In'}
                      </button>
                    </>
                  ) : !attendanceData?.checkOutTime ? (
                    <>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#059669' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.25)' }}></span>
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
                          borderRadius: '14px',
                          padding: '5px 14px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <LogOut size={13} /> {isAttendingAction ? 'Processing...' : 'Check Out'}
                      </button>
                    </>
                  ) : (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={14} color="#10B981" /> Checked Out Today ({liveTimerStr})
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="date-range-picker" style={{ position: 'relative' }} onClick={() => setShowDatePicker((v) => !v)}>
              <Calendar size={16} className="cal-icon" />
              <span>{getDateRangeLabel()}</span>
              <ChevronDown size={14} />
              {showDatePicker && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E2E8F0',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    padding: '16px',
                    zIndex: 1000,
                    minWidth: '260px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>From Date</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748B', textTransform: 'uppercase' }}>To Date</label>
                    <input
                      type="date"
                      value={dateTo}
                      min={dateFrom || undefined}
                      onChange={(e) => setDateTo(e.target.value)}
                      style={{ padding: '6px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      onClick={() => { setDateFrom(''); setDateTo(''); setShowDatePicker(false); }}
                      style={{ padding: '5px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#64748B' }}
                    >
                      Clear
                    </button>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      style={{ padding: '5px 14px', borderRadius: '6px', border: 'none', background: '#2563EB', cursor: 'pointer', fontSize: '12px', fontWeight: 700, color: '#FFFFFF' }}
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={loadAnalytics}>Retry</button>
          </div>
        )}

        {/* Render Active Tab Content */}
        {renderTabContent()}

        {/* Ticket Details Interactive Modal */}
        <TicketDetailModal
          isOpen={!!selectedTicketModal}
          ticket={selectedTicketModal}
          onClose={() => setSelectedTicketModal(null)}
          onRefresh={loadAnalytics}
        />

        {/* Create Ticket Modal */}
        <ActionModal
          isOpen={isCreateTicketModalOpen}
          onClose={() => setIsCreateTicketModalOpen(false)}
          type="create_ticket"
          onSuccessRefresh={loadAnalytics}
        />

        {/* Apply Leave Modal */}
        <ActionModal
          isOpen={isApplyLeaveModalOpen}
          onClose={() => setIsApplyLeaveModalOpen(false)}
          type="apply_leave"
          onSuccessRefresh={loadAnalytics}
        />

        {/* Change Password Interactive Modal */}
        {isChangePasswordOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(15, 23, 42, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              backdropFilter: 'blur(4px)'
            }}
            onClick={() => {
              setIsChangePasswordOpen(false);
              setPasswordError(null);
              setPasswordSuccess(null);
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-primary)',
                borderRadius: '16px',
                maxWidth: '420px',
                width: '90%',
                padding: '24px',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-color)',
                position: 'relative'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '10px', color: '#2563EB' }}>
                    <KeyRound size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Reset / Change Password</h3>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Update your account security password
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={18} />
                </button>
              </div>

              {passwordError && (
                <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 6 chars)"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsChangePasswordOpen(false);
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingPassword}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    {isSubmittingPassword ? <Loader2 size={16} className="spinner" /> : null}
                    <span>{isSubmittingPassword ? 'Saving...' : 'Update Password'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
