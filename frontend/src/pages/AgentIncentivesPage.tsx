import React, { useState, useEffect } from 'react';
import {
  Coins,
  Users,
  UserCheck,
  Calendar,
  IndianRupee,
  Search,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Clock,
  CheckCircle2,
  FileSpreadsheet,
  ArrowRight,
  HardHat,
  UserPlus
} from 'lucide-react';
import {
  fetchIncentivesSummaryApi,
  fetchAgentIncentivesListApi,
  fetchAgentIncentiveDetailsApi,
  fetchMyIncentiveSummaryApi,
  exportAgentIncentivesExcelApi,
  type SuperAgentIncentiveSummary,
  type AgentIncentiveListItem,
  type AgentIncentiveDetails,
  type MyIncentiveSummary
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { UserAvatar } from '../components/UserAvatar';
import './AgentIncentivesPage.css';

interface AgentIncentivesPageProps {
  isAgentView?: boolean;
  onNavigateTab?: (tab: string) => void;
}

export const AgentIncentivesPage: React.FC<AgentIncentivesPageProps> = ({
  isAgentView: propIsAgentView,
  onNavigateTab
}) => {
  const { user, role } = useAuth();
  const isAgent = propIsAgentView || role === 'AGENT';

  // ── SUPER AGENT STATE ──
  const [summary, setSummary] = useState<SuperAgentIncentiveSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [agents, setAgents] = useState<AgentIncentiveListItem[]>([]);
  const [tableLoading, setTableLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  // Excel Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Drawer State
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
  const [agentDetails, setAgentDetails] = useState<AgentIncentiveDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsPage, setDetailsPage] = useState(1);

  // ── AGENT (MY INCENTIVES) STATE ──
  const [mySummary, setMySummary] = useState<MyIncentiveSummary | null>(null);
  const [myIncentiveDetails, setMyIncentiveDetails] = useState<AgentIncentiveDetails | null>(null);
  const [myLoading, setMyLoading] = useState(true);
  const [mySearch, setMySearch] = useState('');
  const [myDateFilter, setMyDateFilter] = useState('all');

  // ── Super Agent Data Fetchers ──
  const loadSuperAgentSummary = async () => {
    try {
      setSummaryLoading(true);
      const data = await fetchIncentivesSummaryApi();
      setSummary(data);
    } catch (err) {
      console.error('Failed to load incentive summary:', err);
    } finally {
      setSummaryLoading(false);
    }
  };

  const loadAgentsList = async () => {
    try {
      setTableLoading(true);
      const result = await fetchAgentIncentivesListApi({
        search: search.trim() || undefined,
        status: statusFilter,
        dateFilter: dateFilter === 'all' ? undefined : dateFilter,
        page,
        limit
      });
      setAgents(result.items);
      setTotalPages(result.pagination.totalPages);
      setTotalRecords(result.pagination.total);
    } catch (err) {
      console.error('Failed to load agent incentives:', err);
    } finally {
      setTableLoading(false);
    }
  };

  const loadAgentDetails = async (agentId: number, dPage = 1) => {
    try {
      setDetailsLoading(true);
      const data = await fetchAgentIncentiveDetailsApi(agentId, dPage, 50);
      setAgentDetails(data);
    } catch (err) {
      console.error('Failed to load agent incentive details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // ── Agent Personal Data Fetcher ──
  const loadMyIncentives = async () => {
    if (!user?.id) return;
    try {
      setMyLoading(true);
      const [sumData, detData] = await Promise.all([
        fetchMyIncentiveSummaryApi().catch(() => null),
        fetchAgentIncentiveDetailsApi(Number(user.id), 1, 100).catch(() => null)
      ]);
      if (sumData) setMySummary(sumData);
      if (detData) setMyIncentiveDetails(detData);
    } catch (err) {
      console.error('Failed to load my incentives:', err);
    } finally {
      setMyLoading(false);
    }
  };

  // ── Lifecycle Effects ──
  useEffect(() => {
    if (isAgent) {
      loadMyIncentives();
    } else {
      loadSuperAgentSummary();
    }
  }, [isAgent, user?.id]);

  useEffect(() => {
    if (!isAgent) {
      loadAgentsList();
    }
  }, [isAgent, search, statusFilter, dateFilter, page, limit]);

  useEffect(() => {
    if (selectedAgentId && !isAgent) {
      loadAgentDetails(selectedAgentId, detailsPage);
    }
  }, [selectedAgentId, detailsPage, isAgent]);

  // Real-time socket sync
  useEffect(() => {
    const socket = getSocket();
    const handleIncentiveUpdate = () => {
      if (isAgent) {
        loadMyIncentives();
      } else {
        loadSuperAgentSummary();
        loadAgentsList();
        if (selectedAgentId) {
          loadAgentDetails(selectedAgentId, detailsPage);
        }
      }
    };

    socket.on('incentive:credited', handleIncentiveUpdate);
    socket.on('incentive:updated', handleIncentiveUpdate);
    socket.on('worker:registered', handleIncentiveUpdate);

    return () => {
      socket.off('incentive:credited', handleIncentiveUpdate);
      socket.off('incentive:updated', handleIncentiveUpdate);
      socket.off('worker:registered', handleIncentiveUpdate);
    };
  }, [isAgent, user?.id, selectedAgentId, detailsPage]);

  // Handle Excel Export
  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      setExportError(null);
      await exportAgentIncentivesExcelApi();
    } catch (err: any) {
      setExportError(err.message || 'Failed to download Excel report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleOpenDetails = (agentId: number) => {
    setSelectedAgentId(agentId);
    setDetailsPage(1);
  };

  const handleCloseDetails = () => {
    setSelectedAgentId(null);
    setAgentDetails(null);
  };

  // Filtered workers for Agent view
  const myFilteredWorkers = (myIncentiveDetails?.history || []).filter((item) => {
    if (mySearch.trim()) {
      const q = mySearch.toLowerCase();
      const matchName = item.workerName.toLowerCase().includes(q);
      const matchCode = item.workerEmployeeCode.toLowerCase().includes(q);
      const matchDesig = item.designation.toLowerCase().includes(q);
      const matchRef = item.reference.toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDesig && !matchRef) return false;
    }

    if (myDateFilter !== 'all') {
      const itemDate = new Date(item.date);
      const now = new Date();
      if (myDateFilter === 'today') {
        const todayStr = now.toISOString().split('T')[0];
        if (item.date.split('T')[0] !== todayStr) return false;
      } else if (myDateFilter === 'this_week') {
        const dayOfWeek = now.getDay();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
        startOfWeek.setHours(0, 0, 0, 0);
        if (itemDate < startOfWeek) return false;
      } else if (myDateFilter === 'this_month') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        if (itemDate < startOfMonth) return false;
      }
    }

    return true;
  });

  // ══════════════════════════════════════════════════════════════
  // RENDER 1: AGENT PORTAL VIEW ("My Incentives")
  // ══════════════════════════════════════════════════════════════
  if (isAgent) {
    const totalWorkersCount = mySummary?.myWorkersRegistered ?? (myIncentiveDetails?.summary.workersRegistered || 0);
    const totalEarnings = mySummary?.myRegistrationIncentives ?? (myIncentiveDetails?.summary.totalIncentive || 0);
    const thisMonthEarnings = mySummary?.thisMonthIncentive ?? (myIncentiveDetails?.summary.thisMonthIncentive || 0);
    const ratePerWorker = mySummary?.ratePerWorker ?? 25;

    return (
      <div className="agent-incentives-page animate-fade-in">
        {/* Header */}
        <div className="incentives-page-header">
          <div className="incentives-title-group">
            <div className="incentives-title-icon-box">
              <Coins size={24} color="#EA580C" />
            </div>
            <div>
              <h1 className="incentives-page-title">My Registration Incentives</h1>
              <p className="incentives-page-subtitle">
                Track workers enrolled under your agent account and registration incentives earned (₹{ratePerWorker} per worker).
              </p>
            </div>
          </div>

          <div className="incentives-header-actions">
            {onNavigateTab && (
              <button
                type="button"
                className="btn-register-worker-action"
                onClick={() => onNavigateTab('register_worker')}
                title="Register a new worker and earn ₹25 incentive"
              >
                <UserPlus size={16} />
                <span>Register New Worker</span>
              </button>
            )}

            <button
              type="button"
              className="btn-refresh-data"
              onClick={loadMyIncentives}
              title="Refresh latest incentive records"
            >
              <RefreshCw size={15} />
              <span className="hide-on-mobile">Refresh</span>
            </button>
          </div>
        </div>

        {/* 4 KPI Summary Cards */}
        <div className="incentives-summary-grid">
          <div className="incentive-kpi-card purple">
            <div className="kpi-icon-wrap purple">
              <UserCheck size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">My Workers Registered</span>
              <h2 className="kpi-value">
                {myLoading ? <Loader2 size={18} className="spinner" /> : totalWorkersCount}
              </h2>
              <span className="kpi-subtext">Enrolled under your code</span>
            </div>
          </div>

          <div className="incentive-kpi-card orange">
            <div className="kpi-icon-wrap orange">
              <Coins size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Incentive Rate</span>
              <h2 className="kpi-value text-orange">
                ₹{ratePerWorker}.00
              </h2>
              <span className="kpi-subtext">Fixed reward per worker</span>
            </div>
          </div>

          <div className="incentive-kpi-card green">
            <div className="kpi-icon-wrap green">
              <IndianRupee size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">Total Incentives Earned</span>
              <h2 className="kpi-value text-green">
                {myLoading ? <Loader2 size={18} className="spinner" /> : `₹${totalEarnings.toLocaleString('en-IN')}`}
              </h2>
              <span className="kpi-subtext">Total credited to your account</span>
            </div>
          </div>

          <div className="incentive-kpi-card blue">
            <div className="kpi-icon-wrap blue">
              <Calendar size={22} />
            </div>
            <div className="kpi-info">
              <span className="kpi-label">This Month's Earnings</span>
              <h2 className="kpi-value" style={{ color: '#2563EB' }}>
                {myLoading ? <Loader2 size={18} className="spinner" /> : `₹${thisMonthEarnings.toLocaleString('en-IN')}`}
              </h2>
              <span className="kpi-subtext">Current month cycle</span>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="incentives-filters-card">
          <div className="incentives-search-wrap">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              className="incentives-search-input"
              placeholder="Search by Worker Name, ID (WRK-001), Trade Skill..."
              value={mySearch}
              onChange={(e) => setMySearch(e.target.value)}
            />
            {mySearch && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setMySearch('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div className="incentives-filter-groups">
            <div className="filter-item">
              <label>Timeframe:</label>
              <select
                value={myDateFilter}
                onChange={(e) => setMyDateFilter(e.target.value)}
                className="incentives-select"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="this_week">This Week</option>
                <option value="this_month">This Month</option>
              </select>
            </div>
          </div>
        </div>

        {/* Main Data Container */}
        <div className="incentives-data-container">
          <div className="agent-worker-incentives-header">
            <div>
              <h3 className="section-heading">Worker Registration History</h3>
              <p className="section-subtext">
                Showing all {myFilteredWorkers.length} workers registered and incentives credited.
              </p>
            </div>
            <span className="incentive-guarantee-pill">
              <CheckCircle2 size={13} />
              <span>₹{ratePerWorker} Credited per Worker</span>
            </span>
          </div>

          {myLoading ? (
            <div className="incentives-loading-box">
              <Loader2 size={28} className="spinner" color="#2563EB" />
              <p>Loading your registration incentive records...</p>
            </div>
          ) : myFilteredWorkers.length === 0 ? (
            <div className="incentives-empty-box">
              <HardHat size={44} style={{ opacity: 0.35, color: '#EA580C' }} />
              <h3>No Worker Registrations Found</h3>
              <p>
                {mySearch
                  ? 'No registered workers match your search query.'
                  : 'You have not registered any workers yet. Start registering workers to earn ₹25 per worker.'}
              </p>
              {onNavigateTab && (
                <button
                  type="button"
                  className="btn-register-worker-action"
                  style={{ marginTop: '12px' }}
                  onClick={() => onNavigateTab('register_worker')}
                >
                  <UserPlus size={16} />
                  <span>Register First Worker</span>
                </button>
              )}
            </div>
          ) : (
            <>
              {/* DESKTOP & LAPTOP TABLE (Screen >= 768px) */}
              <div className="incentives-desktop-table-wrap">
                <table className="incentives-table">
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Worker Name</th>
                      <th>Worker ID</th>
                      <th>Trade Skill</th>
                      <th style={{ textAlign: 'center' }}>Incentive Rate</th>
                      <th style={{ textAlign: 'right' }}>Amount Credited</th>
                      <th>Status</th>
                      <th>Reference Code</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myFilteredWorkers.map((item) => (
                      <tr key={item.id} className="incentive-row-hover">
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#475569', fontSize: '12.5px' }}>
                            <Clock size={13} color="#94A3B8" />
                            <span>
                              {new Date(item.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        </td>

                        <td>
                          <div className="agent-profile-cell">
                            <UserAvatar name={item.workerName} size={32} />
                            <div>
                              <div className="agent-name-strong">{item.workerName}</div>
                              <span className="agent-email-muted">{item.designation}</span>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="badge-worker-code">{item.workerEmployeeCode}</span>
                        </td>

                        <td>
                          <span style={{ color: '#334155', fontWeight: 500, fontSize: '13px' }}>
                            {item.designation}
                          </span>
                        </td>

                        <td style={{ textAlign: 'center' }}>
                          <span className="rate-fixed-badge">₹{item.amount || ratePerWorker}</span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          <span className="amount-credited-tag">
                            +₹{item.amount || ratePerWorker}
                          </span>
                        </td>

                        <td>
                          <span className="pill-credited">
                            <CheckCircle2 size={12} />
                            <span>Credited</span>
                          </span>
                        </td>

                        <td>
                          <code className="code-ref">{item.reference}</code>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW (Screen < 768px) */}
              <div className="incentives-mobile-cards-list">
                {myFilteredWorkers.map((item) => (
                  <div key={item.id} className="incentive-mobile-card">
                    <div className="mobile-card-header">
                      <div className="mobile-agent-user">
                        <UserAvatar name={item.workerName} size={36} />
                        <div>
                          <h4 className="mobile-agent-name">{item.workerName}</h4>
                          <span className="badge-worker-code" style={{ marginTop: '2px', display: 'inline-block' }}>
                            {item.workerEmployeeCode}
                          </span>
                        </div>
                      </div>
                      <span className="pill-credited">
                        <CheckCircle2 size={12} />
                        <span>Credited</span>
                      </span>
                    </div>

                    <div className="mobile-card-stats-grid">
                      <div className="mobile-stat-row">
                        <span className="mobile-stat-label">Trade Skill:</span>
                        <span className="mobile-stat-val">{item.designation}</span>
                      </div>
                      <div className="mobile-stat-row">
                        <span className="mobile-stat-label">Registered On:</span>
                        <span className="mobile-stat-val">
                          {new Date(item.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <div className="mobile-stat-row">
                        <span className="mobile-stat-label">Incentive Credited:</span>
                        <span className="mobile-stat-val amount-credited-tag">
                          +₹{item.amount || ratePerWorker}
                        </span>
                      </div>
                      <div className="mobile-stat-row">
                        <span className="mobile-stat-label">Reference:</span>
                        <span className="mobile-stat-val">
                          <code className="code-ref">{item.reference}</code>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER 2: SUPER AGENT VIEW ("Agent Incentives")
  // ══════════════════════════════════════════════════════════════
  return (
    <div className="agent-incentives-page animate-fade-in">
      {/* ── Page Header ── */}
      <div className="incentives-page-header">
        <div className="incentives-title-group">
          <div className="incentives-title-icon-box">
            <Coins size={24} color="#EA580C" />
          </div>
          <div>
            <h1 className="incentives-page-title">Agent Incentives</h1>
            <p className="incentives-page-subtitle">
              Track worker registrations and Worker Registration Incentives earned by field agents.
            </p>
          </div>
        </div>

        <div className="incentives-header-actions">
          <button
            type="button"
            className="btn-excel-export"
            onClick={handleExportExcel}
            disabled={isExporting}
            title="Export full multi-sheet audit Excel report"
          >
            {isExporting ? (
              <Loader2 size={16} className="spinner" />
            ) : (
              <FileSpreadsheet size={16} />
            )}
            <span>{isExporting ? 'Generating XLSX...' : 'Export to Excel'}</span>
          </button>

          <button
            type="button"
            className="btn-refresh-data"
            onClick={() => {
              loadSuperAgentSummary();
              loadAgentsList();
            }}
            title="Refresh latest live metrics"
          >
            <RefreshCw size={15} />
            <span className="hide-on-mobile">Refresh</span>
          </button>
        </div>
      </div>

      {exportError && (
        <div className="incentives-error-alert">
          <AlertCircle size={16} />
          <span>{exportError}</span>
        </div>
      )}

      {/* ── Top Summary KPI Cards (Responsive 4-col -> 2-col -> 1-col) ── */}
      <div className="incentives-summary-grid">
        <div className="incentive-kpi-card blue">
          <div className="kpi-icon-wrap blue">
            <Users size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Agents</span>
            <h2 className="kpi-value">
              {summaryLoading ? <Loader2 size={18} className="spinner" /> : (summary?.totalAgents ?? '—')}
            </h2>
            <span className="kpi-subtext">Active Supervisors</span>
          </div>
        </div>

        <div className="incentive-kpi-card purple">
          <div className="kpi-icon-wrap purple">
            <UserCheck size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Workers Registered</span>
            <h2 className="kpi-value">
              {summaryLoading ? <Loader2 size={18} className="spinner" /> : (summary?.workersRegistered ?? '—')}
            </h2>
            <span className="kpi-subtext">₹25 earned per worker</span>
          </div>
        </div>

        <div className="incentive-kpi-card green">
          <div className="kpi-icon-wrap green">
            <IndianRupee size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">Total Incentives</span>
            <h2 className="kpi-value text-green">
              {summaryLoading ? <Loader2 size={18} className="spinner" /> : `₹${(summary?.totalIncentives || 0).toLocaleString('en-IN')}`}
            </h2>
            <span className="kpi-subtext">All-time registration payouts</span>
          </div>
        </div>

        <div className="incentive-kpi-card orange">
          <div className="kpi-icon-wrap orange">
            <Calendar size={22} />
          </div>
          <div className="kpi-info">
            <span className="kpi-label">This Month</span>
            <h2 className="kpi-value text-orange">
              {summaryLoading ? <Loader2 size={18} className="spinner" /> : `₹${(summary?.thisMonthIncentives || 0).toLocaleString('en-IN')}`}
            </h2>
            <span className="kpi-subtext">Current billing cycle</span>
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="incentives-filters-card">
        <div className="incentives-search-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="incentives-search-input"
            placeholder="Search by Agent Name, ID (AGT-001), or Phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          {search && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="incentives-filter-groups">
          <div className="filter-item">
            <label>Status:</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="incentives-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>

          <div className="filter-item">
            <label>Timeframe:</label>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setPage(1);
              }}
              className="incentives-select"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="this_week">This Week</option>
              <option value="this_month">This Month</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Main Data View (Desktop Table + Mobile Cards) ── */}
      <div className="incentives-data-container">
        {tableLoading ? (
          <div className="incentives-loading-box">
            <Loader2 size={28} className="spinner" color="#2563EB" />
            <p>Loading agent incentive records from database...</p>
          </div>
        ) : agents.length === 0 ? (
          <div className="incentives-empty-box">
            <Coins size={42} style={{ opacity: 0.4 }} />
            <h3>No agent incentive records found</h3>
            <p>No active field agents match the current search filters or date range.</p>
          </div>
        ) : (
          <>
            {/* DESKTOP & LAPTOP TABLE (Screen >= 768px) */}
            <div className="incentives-desktop-table-wrap">
              <table className="incentives-table">
                <thead>
                  <tr>
                    <th>Agent Name</th>
                    <th>Agent ID</th>
                    <th>Phone Number</th>
                    <th style={{ textAlign: 'center' }}>Workers Added</th>
                    <th style={{ textAlign: 'center' }}>Incentive Rate</th>
                    <th style={{ textAlign: 'right' }}>Total Incentive</th>
                    <th style={{ textAlign: 'right' }}>This Month</th>
                    <th>Status</th>
                    <th>Last Worker Added</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {agents.map((agent) => (
                    <tr key={agent.agentId} className="incentive-row-hover">
                      <td>
                        <div className="agent-profile-cell">
                          <UserAvatar
                            src={agent.profileImage || undefined}
                            name={agent.name}
                            size={34}
                          />
                          <div>
                            <div className="agent-name-strong">{agent.name}</div>
                            <span className="agent-email-muted">{agent.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge-agent-code">{agent.employeeCode}</span>
                      </td>

                      <td>
                        <span className="agent-phone-text">{agent.phone}</span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="workers-added-pill">
                          <UserCheck size={13} />
                          <strong>{agent.workersAdded}</strong>
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <span className="rate-fixed-badge">₹{agent.incentiveRate}</span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <span className="amount-total-strong">
                          ₹{agent.totalIncentive.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <span className="amount-month-strong">
                          ₹{agent.thisMonthIncentive.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td>
                        <span className={`status-pill-badge ${agent.status.toLowerCase()}`}>
                          <span className={`status-dot ${agent.status.toLowerCase()}`} />
                          {agent.status}
                        </span>
                      </td>

                      <td>
                        {agent.lastWorkerAdded ? (
                          <div className="last-worker-cell">
                            <span className="last-worker-name">{agent.lastWorkerAdded.name}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                              <span className="badge-worker-code" style={{ fontSize: '10.5px', padding: '1px 5px' }}>
                                {agent.lastWorkerAdded.employeeCode}
                              </span>
                              <span className="last-worker-date">
                                {new Date(agent.lastWorkerAdded.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short'
                                })}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#94A3B8', fontSize: '12px' }}>—</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-view-details"
                          onClick={() => handleOpenDetails(agent.agentId)}
                          title={`View ${agent.name}'s registration history`}
                        >
                          <span>View Details</span>
                          <ArrowRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* MOBILE CARDS VIEW (Screen < 768px) */}
            <div className="incentives-mobile-cards-list">
              {agents.map((agent) => (
                <div key={agent.agentId} className="incentive-mobile-card">
                  <div className="mobile-card-header">
                    <div className="mobile-agent-user">
                      <UserAvatar
                        src={agent.profileImage || undefined}
                        name={agent.name}
                        size={38}
                      />
                      <div>
                        <h4 className="mobile-agent-name">{agent.name}</h4>
                        <span className="mobile-agent-code">{agent.employeeCode}</span>
                      </div>
                    </div>
                    <span className={`status-pill-badge ${agent.status.toLowerCase()}`}>
                      {agent.status}
                    </span>
                  </div>

                  <div className="mobile-card-stats-grid">
                    <div className="mobile-stat-row">
                      <span className="mobile-stat-label">Phone:</span>
                      <span className="mobile-stat-val">{agent.phone}</span>
                    </div>
                    <div className="mobile-stat-row">
                      <span className="mobile-stat-label">Workers Added:</span>
                      <span className="mobile-stat-val" style={{ fontWeight: 800, color: '#2563EB' }}>
                        {agent.workersAdded}
                      </span>
                    </div>
                    <div className="mobile-stat-row">
                      <span className="mobile-stat-label">Incentive / Worker:</span>
                      <span className="mobile-stat-val">₹{agent.incentiveRate}</span>
                    </div>
                    <div className="mobile-stat-row">
                      <span className="mobile-stat-label">Total Incentive:</span>
                      <span className="mobile-stat-val amount-total-strong">
                        ₹{agent.totalIncentive.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="mobile-stat-row">
                      <span className="mobile-stat-label">This Month:</span>
                      <span className="mobile-stat-val amount-month-strong">
                        ₹{agent.thisMonthIncentive.toLocaleString('en-IN')}
                      </span>
                    </div>
                    {agent.lastWorkerAdded && (
                      <div className="mobile-stat-row">
                        <span className="mobile-stat-label">Last Added:</span>
                        <span className="mobile-stat-val" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <strong>{agent.lastWorkerAdded.name}</strong>
                          <span className="badge-worker-code" style={{ fontSize: '10px', padding: '1px 4px' }}>
                            {agent.lastWorkerAdded.employeeCode}
                          </span>
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    className="mobile-btn-details touch-target"
                    onClick={() => handleOpenDetails(agent.agentId)}
                  >
                    <span>View Registration History</span>
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* ── Pagination Footer ── */}
            <div className="incentives-pagination-bar">
              <div className="pagination-info">
                Showing{' '}
                <strong>
                  {Math.min((page - 1) * limit + 1, totalRecords)}–
                  {Math.min(page * limit, totalRecords)}
                </strong>{' '}
                of <strong>{totalRecords}</strong> field agents
              </div>

              <div className="pagination-controls">
                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  title="Previous Page"
                >
                  <ChevronLeft size={16} />
                  <span className="hide-on-mobile">Previous</span>
                </button>

                <span className="page-indicator">
                  Page <strong>{page}</strong> of <strong>{totalPages}</strong>
                </span>

                <button
                  type="button"
                  className="page-btn"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  title="Next Page"
                >
                  <span className="hide-on-mobile">Next</span>
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Agent Incentive Details Drawer / Modal ── */}
      {selectedAgentId && (
        <div className="modal-backdrop-overlay" onClick={handleCloseDetails}>
          <div
            className="agent-details-drawer animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="drawer-header">
              <div className="drawer-title-wrap">
                <UserAvatar
                  src={agentDetails?.agent.profileImage || undefined}
                  name={agentDetails?.agent.name || 'Agent'}
                  size={44}
                />
                <div>
                  <h3 className="drawer-agent-name">{agentDetails?.agent.name || 'Agent Details'}</h3>
                  <div className="drawer-agent-meta">
                    <span className="badge-agent-code">{agentDetails?.agent.employeeCode}</span>
                    <span className="meta-sep">•</span>
                    <span className="drawer-phone-text">{agentDetails?.agent.phone}</span>
                    <span className="meta-sep">•</span>
                    <span className="drawer-site-tag">{agentDetails?.agent.siteName || 'Field Agent'}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="drawer-close-btn"
                onClick={handleCloseDetails}
                title="Close Drawer"
              >
                <X size={18} />
              </button>
            </div>

            {detailsLoading ? (
              <div style={{ padding: '60px', textAlign: 'center', color: '#64748B' }}>
                <Loader2 size={32} className="spinner" color="#2563EB" style={{ margin: '0 auto 12px' }} />
                <p>Loading agent incentive history...</p>
              </div>
            ) : agentDetails ? (
              <div className="drawer-body">
                {/* Mini Summary Cards */}
                <div className="drawer-stats-row">
                  <div className="drawer-stat-card">
                    <span className="d-stat-label">Workers Registered</span>
                    <h3 className="d-stat-val">{agentDetails.summary.workersRegistered}</h3>
                  </div>
                  <div className="drawer-stat-card">
                    <span className="d-stat-label">Incentive / Worker</span>
                    <h3 className="d-stat-val text-orange">₹{agentDetails.summary.incentiveRate}</h3>
                  </div>
                  <div className="drawer-stat-card">
                    <span className="d-stat-label">Total Earned</span>
                    <h3 className="d-stat-val text-green">
                      ₹{agentDetails.summary.totalIncentive.toLocaleString('en-IN')}
                    </h3>
                  </div>
                  <div className="drawer-stat-card">
                    <span className="d-stat-label">This Month</span>
                    <h3 className="d-stat-val text-blue">
                      ₹{agentDetails.summary.thisMonthIncentive.toLocaleString('en-IN')}
                    </h3>
                  </div>
                </div>

                {/* Transaction History Section */}
                <div className="drawer-history-section">
                  <div className="history-section-header">
                    <h4>Incentive History ({agentDetails.history.length} Transactions)</h4>
                    <span className="history-note">₹25 credited per enrolled worker</span>
                  </div>

                  {agentDetails.history.length === 0 ? (
                    <div className="history-empty">
                      <HardHat size={32} style={{ opacity: 0.4 }} />
                      <p>No worker registrations recorded for this agent yet.</p>
                    </div>
                  ) : (
                    <>
                      {/* Desktop Table inside Drawer */}
                      <div className="history-table-container drawer-desktop-history">
                        <table className="drawer-history-table">
                          <thead>
                            <tr>
                              <th>Date & Time</th>
                              <th>Worker Name</th>
                              <th>Worker ID</th>
                              <th>Trade Skill</th>
                              <th>Amount</th>
                              <th>Status</th>
                              <th>Reference</th>
                            </tr>
                          </thead>
                          <tbody>
                            {agentDetails.history.map((record) => (
                              <tr key={record.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#475569', fontSize: '12px' }}>
                                    <Clock size={12} color="#94A3B8" />
                                    <span>{new Date(record.date).toLocaleDateString('en-IN', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}</span>
                                  </div>
                                </td>

                                <td>
                                  <div style={{ fontWeight: 700, color: '#0F172A' }}>
                                    {record.workerName}
                                  </div>
                                </td>

                                <td>
                                  <span className="badge-worker-code">{record.workerEmployeeCode}</span>
                                </td>

                                <td>
                                  <span style={{ color: '#475569', fontSize: '12px' }}>
                                    {record.designation}
                                  </span>
                                </td>

                                <td>
                                  <span className="amount-credited-tag">
                                    +₹{record.amount}
                                  </span>
                                </td>

                                <td>
                                  <span className="pill-credited">
                                    <CheckCircle2 size={12} />
                                    <span>Credited</span>
                                  </span>
                                </td>

                                <td>
                                  <code className="code-ref">{record.reference}</code>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards inside Drawer (< 768px) */}
                      <div className="drawer-mobile-history">
                        {agentDetails.history.map((record) => (
                          <div key={record.id} className="drawer-history-mobile-card">
                            <div className="d-card-top">
                              <div>
                                <span className="d-card-worker-name">{record.workerName}</span>
                                <span className="badge-worker-code" style={{ marginLeft: '6px' }}>
                                  {record.workerEmployeeCode}
                                </span>
                              </div>
                              <span className="amount-credited-tag">+₹{record.amount}</span>
                            </div>
                            <div className="d-card-details">
                              <span className="d-card-sub">{record.designation}</span>
                              <span className="d-card-date">
                                {new Date(record.date).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })}
                              </span>
                            </div>
                            <div className="d-card-footer">
                              <span className="pill-credited">
                                <CheckCircle2 size={11} />
                                <span>Credited</span>
                              </span>
                              <code className="code-ref">{record.reference}</code>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
