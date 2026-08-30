import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ApproveLoginPage } from './components/ApproveLoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { AttendanceOverviewChart } from './components/AttendanceOverviewChart';
import { WorkersBySiteChart } from './components/WorkersBySiteChart';
import { QuickActions } from './components/QuickActions';
import { RecentLeavesTable } from './components/RecentLeavesTable';
import { ActionModal } from './components/ActionModal';
import { Footer } from './components/Footer';

// Sub-module Pages
import { SitesPage } from './pages/SitesPage';
import { AgentsPage } from './pages/AgentsPage';
import { WorkersPage } from './pages/WorkersPage';
import { EnquiriesPage } from './pages/EnquiriesPage';
import { AttendancePage } from './pages/AttendancePage';
import { LeavePage } from './pages/LeavePage';
import { PayrollPage } from './pages/PayrollPage';
import { WalletPage } from './pages/WalletPage';
import { InsurancePage } from './pages/InsurancePage';
import { AgentSalaryPage } from './pages/AgentSalaryPage';
import { SupportPage } from './pages/SupportPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { WorkerDetailPage } from './pages/WorkerDetailPage';
import { AgentDetailPage } from './pages/AgentDetailPage';
import { WorkerVerifyPage } from './pages/WorkerVerifyPage';
import { SupportLoginPage } from './pages/SupportLoginPage';
import { SupportDashboardPage } from './pages/SupportDashboardPage';

// Role Specific Dashboards
import { AgentDashboardView, WorkerDashboardView } from './components/RoleDashboards';
import { CustomerSupportAgentsView } from './components/CustomerSupportAgentsView';
import { WorkerMyDetailsView } from './components/WorkerMyDetailsView';
import { AgentMyDetailsView } from './components/AgentMyDetailsView';
import { AgentVerifyPage } from './pages/AgentVerifyPage';
import { SaturdayReportBanner } from './components/SaturdayReportBanner';
import { ScanWorkerQrModal } from './components/ScanWorkerQrModal';
import { MarkAttendanceModal } from './components/MarkAttendanceModal';

import { Calendar, ChevronDown, LogOut } from 'lucide-react';
import {
  fetchDashboardStatsApi,
  fetchSitesApi,
  fetchLeavesApi,
  fetchPayrollsApi,
  fetchWorkersApi
} from './services/api';
import type {
  MetricData,
  AttendanceDataPoint,
  SiteWorkerDistribution,
  QuickActionItem,
  LeaveRecord,
  WorkerItem
} from './types';

// Dynamic Quick Actions
const SYSTEM_QUICK_ACTIONS: QuickActionItem[] = [
  { id: '1', title: 'Add New Site', description: 'Create a new working site', iconType: 'site', actionKey: 'add_site' },
  { id: '2', title: 'Add New Agent', description: 'Register a new agent', iconType: 'agent', actionKey: 'add_agent' },
  { id: '3', title: 'Add New Worker', description: 'Register a new worker', iconType: 'worker', actionKey: 'add_worker' },
  { id: '4', title: 'Mark Attendance', description: 'Mark attendance for workers', iconType: 'attendance', actionKey: 'mark_attendance' },
  { id: '5', title: 'View Reports', description: 'View system reports', iconType: 'report', actionKey: 'view_reports' }
];

import { PublicWorkerVerificationView } from './components/PublicWorkerVerificationView';

function MainAppContent() {
  const { isAuthenticated, isValidating, sessionExpired, clearExpired, user, role, login, logout, hasPermission } = useAuth();
  
  // Public QR Code Worker Identity Verification Route (No Authentication Required)
  const urlParams = new URLSearchParams(window.location.search);
  const verifyWorkerIdParam = urlParams.get('verifyWorkerId') || urlParams.get('workerId');
  const isPublicVerifyRoute = window.location.pathname.startsWith('/verify-worker') || Boolean(verifyWorkerIdParam);

  if (isPublicVerifyRoute) {
    return <PublicWorkerVerificationView workerId={verifyWorkerIdParam || undefined} />;
  }

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [targetAgent, setTargetAgent] = useState<{ id: string; name: string } | null>(null);
  const [targetSite, setTargetSite] = useState<{ id: string; name: string } | null>(null);
  const [targetWorker, setTargetWorker] = useState<any>(null);
  const [targetTicket, setTargetTicket] = useState<any>(null);
  const [targetInsurance, setTargetInsurance] = useState<any>(null);
  const [refreshCounter, setRefreshCounter] = useState<number>(0);

  // QR Scanner State & Scanned Attendance Trigger State
  const [isQrScannerOpen, setIsQrScannerOpen] = useState<boolean>(false);
  const [scannedWorkerForAttendance, setScannedWorkerForAttendance] = useState<WorkerItem | null>(null);
  const [isScannedAttendanceOpen, setIsScannedAttendanceOpen] = useState<boolean>(false);

  // Date Range Module State
  const [selectedDateRange, setSelectedDateRange] = useState<{
    label: string;
    startDate: string;
    endDate: string;
  }>({
    label: 'May 15, 2025 - May 21, 2025',
    startDate: '',
    endDate: ''
  });

  // Live Backend State
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [attendanceData, setAttendanceData] = useState<AttendanceDataPoint[]>([]);
  const [siteDistribution, setSiteDistribution] = useState<SiteWorkerDistribution[]>([]);
  const [recentLeaves, setRecentLeaves] = useState<LeaveRecord[]>([]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    if (darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleOpenModalEvent = (e: any) => {
      if (e.detail) {
        setActiveModal(e.detail);
      }
    };
    window.addEventListener('open-modal', handleOpenModalEvent);
    return () => {
      window.removeEventListener('open-modal', handleOpenModalEvent);
    };
  }, []);

  // Load All Backend Data on Mount / Authentication / Refresh
  useEffect(() => {
    if (!isAuthenticated) return;

    fetchDashboardStatsApi(selectedDateRange.startDate, selectedDateRange.endDate)
      .then((data) => {
        if (data.cards && data.cards.length > 0) {
          setMetrics(data.cards);
        } else {
          const stats = data.stats || {};
          const backendMetrics: MetricData[] = [
            { id: '1', title: 'Total Workers', value: (stats.totalWorkers ?? 0).toLocaleString(), change: '12.5%', isPositive: true, type: 'workers', comparisonPeriod: 'from last month' },
            { id: '2', title: 'Total Agents', value: (stats.totalAgents ?? 0).toLocaleString(), change: '8.3%', isPositive: true, type: 'agents', comparisonPeriod: 'from last month' },
            { id: '3', title: 'Total Sites', value: (stats.totalSites ?? 0).toLocaleString(), change: '4.2%', isPositive: true, type: 'sites', comparisonPeriod: 'from last month' },
            { id: '4', title: 'Active Workers', value: (stats.activeWorkers ?? 0).toLocaleString(), change: '10.8%', isPositive: true, type: 'active', comparisonPeriod: 'from last month' },
            { id: '5', title: 'Today Attendance', value: (stats.todayAttendance ?? 0).toLocaleString(), change: '3.6%', isPositive: false, type: 'attendance', comparisonPeriod: 'from yesterday' }
          ];
          setMetrics(backendMetrics);
        }

        if (data.attendance) {
          setAttendanceData(
            data.attendance.map((a: any) => ({
              date: a.day || a.date,
              present: a.present || 100,
              absent: a.absent || 10
            }))
          );
        }
      })
      .catch(() => {});

    fetchSitesApi()
      .then((sites) => {
        const colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4'];
        const total = sites.reduce((sum, s) => sum + (s.totalWorkers || 0), 0);
        const dist: SiteWorkerDistribution[] = sites.map((s, idx) => {
          const count = s.totalWorkers || 0;
          const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
          return {
            name: s.siteName,
            count: count,
            percentage: percentage,
            color: colors[idx % colors.length]
          };
        });
        setSiteDistribution(dist);
      })
      .catch(() => {});

    fetchLeavesApi()
      .then(setRecentLeaves)
      .catch(() => {});

    Promise.all([
      fetchPayrollsApi().catch(() => []),
      fetchWorkersApi().catch(() => [])
    ]).then(([payrolls, workers]) => {
      if (payrolls.length === 0 && workers.length === 0) return;

    });

  }, [isAuthenticated, refreshCounter, selectedDateRange]);

  const [resetToken, setResetToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (path === '/reset-password') return urlParams.get('token');
    return urlParams.get('token') && !path.includes('approve') ? urlParams.get('token') : null;
  });

  const [approveToken, setApproveToken] = useState<string | null>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const path = window.location.pathname;
    if (path === '/approve-login' || window.location.search.includes('approve')) {
      return urlParams.get('token');
    }
    return null;
  });

  if (approveToken) {
    return (
      <ApproveLoginPage
        token={approveToken}
        onApprovalDone={() => {
          setApproveToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onResetSuccess={() => {
          setResetToken(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        }}
      />
    );
  }

  if (window.location.pathname === '/verify-worker') {
    return <WorkerVerifyPage />;
  }

  if (window.location.pathname === '/verify-agent') {
    return <AgentVerifyPage />;
  }

  if (window.location.pathname === '/worker-details' || window.location.pathname.includes('worker-details')) {
    return <WorkerDetailPage />;
  }

  if (window.location.pathname === '/agent-details' || window.location.pathname.includes('agent-details')) {
    return <AgentDetailPage />;
  }

  if (window.location.pathname === '/support/login') {
    if (isAuthenticated) {
      return <SupportDashboardPage />;
    }
    return <SupportLoginPage onSuccessNavigate={() => { window.history.pushState({}, '', '/support/dashboard'); window.dispatchEvent(new Event('popstate')); }} />;
  }

  if (window.location.pathname === '/support/dashboard' || window.location.pathname === '/support-portal') {
    if (!isAuthenticated) {
      return <SupportLoginPage onSuccessNavigate={() => { window.history.pushState({}, '', '/support/dashboard'); window.dispatchEvent(new Event('popstate')); }} />;
    }
    return <SupportDashboardPage />;
  }

  // ── Show loading spinner while backend token validation is running ──────────
  if (isValidating) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-main, #f8fafc)',
        gap: '16px'
      }}>
        <div style={{
          width: '44px', height: '44px',
          borderRadius: '50%',
          border: '3px solid #e5e7eb',
          borderTopColor: '#4f46e5',
          animation: 'spin 0.8s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Verifying session…</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Session expired modal (mid-session 401) ────────────────────────────────
  if (sessionExpired) {
    return <SessionExpiredModal onGoToLogin={clearExpired} />;
  }

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(token, newUser) => login(token, newUser)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
    );
  }

  // Render Page Content based on Active Navigation Tab & Role
  const renderTabContent = () => {
    // ── Role Guard: block tabs the user's role has no permission for ────────
    const guardedTabs = ['sites', 'agents', 'workers', 'enquiries', 'attendance', 'leaves', 'my_leaves', 'payroll', 'wallet', 'insurance', 'tickets', 'reports', 'settings'];
    if (guardedTabs.includes(activeTab) && !hasPermission(activeTab)) {
      return (
        <AccessDeniedScreen
          tabName={activeTab}
          role={role}
          onGoToDashboard={() => setActiveTab('dashboard')}
          onGoBack={() => setActiveTab('dashboard')}
        />
      );
    }

    switch (activeTab) {
      case 'sites':
        return (
          <SitesPage
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenAssignAgentModal={(siteId, siteName) => {
              setTargetSite({ id: siteId, name: siteName });
              setActiveModal('assign_agent');
            }}
            refreshTrigger={refreshCounter}
          />
        );
      case 'agents':
        return (
          <AgentsPage
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenAssignModal={(agentId, agentName) => {
              setTargetAgent({ id: agentId, name: agentName });
              setActiveModal('assign_worker');
            }}
            refreshTrigger={refreshCounter}
          />
        );
      case 'workers':
        return (
          <WorkersPage
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenEditWorkerModal={(worker) => {
              setTargetWorker(worker);
              setActiveModal('edit_worker');
            }}
            refreshTrigger={refreshCounter}
          />
        );
      case 'enquiries':
        return <EnquiriesPage />;
      case 'attendance':
        return <AttendancePage user={user} onOpenModal={(modal) => setActiveModal(modal)} refreshTrigger={refreshCounter} />;
      case 'leaves':
        return <LeavePage onOpenModal={(modal) => setActiveModal(modal)} refreshTrigger={refreshCounter} />;
      case 'my_leaves':
        return <LeavePage isMyLeavesOnly={true} onOpenModal={(modal) => setActiveModal(modal)} refreshTrigger={refreshCounter} />;
      case 'payroll':
        return <PayrollPage user={user} onOpenModal={(modal) => setActiveModal(modal)} refreshTrigger={refreshCounter} />;
      case 'wallet':
        return <WalletPage user={user} onOpenModal={(modal) => setActiveModal(modal)} />;
      case 'insurance':
        return (
          <InsurancePage
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenEditInsuranceModal={(policy) => {
              setTargetInsurance(policy);
              setActiveModal('edit_insurance');
            }}
          />
        );
      case 'agent_salary':
        return <AgentSalaryPage />;
      case 'tickets':
        return (
          <SupportPage
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenRespondModal={(ticket) => {
              setTargetTicket(ticket);
              setActiveModal('respond_ticket');
            }}
            onOpenEditModal={(ticket) => {
              setTargetTicket(ticket);
              setActiveModal('edit_ticket');
            }}
            onOpenCommentModal={(ticket) => {
              setTargetTicket(ticket);
              setActiveModal('comment_ticket');
            }}
            refreshTrigger={refreshCounter}
          />
        );
      case 'support_agents':
        return <CustomerSupportAgentsView onNavigateTab={(tab) => setActiveTab(tab)} />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'my_details':
        return role === 'AGENT' ? <AgentMyDetailsView /> : <WorkerMyDetailsView />;
      default:
        // Role-based Dashboard rendering
        if (role === 'WORKER') {
          return (
            <WorkerDashboardView
              user={user}
              onOpenModal={(modal) => setActiveModal(modal)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          );
        }

        if (role === 'AGENT') {
          return (
            <AgentDashboardView
              user={user}
              onOpenModal={(modal) => setActiveModal(modal)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          );
        }

        // Default Super Agent Enterprise View
        return (
          <>
            <div className="dashboard-header">
              <div className="dashboard-title-group">
                <h1>Dashboard</h1>
                <p>Welcome back, {user?.name || 'Super Agent'}! ({role} Mode)</p>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  className="date-picker-btn"
                  onClick={() => setActiveModal('date_range')}
                >
                  <Calendar size={16} />
                  <span>{selectedDateRange.label}</span>
                  <ChevronDown size={14} />
                </button>

                <button
                  className="date-picker-btn"
                  style={{ backgroundColor: '#FEE2E2', color: '#DC2626', borderColor: '#FCA5A5' }}
                  onClick={logout}
                  title="Sign Out to Login Page"
                >
                  <LogOut size={15} />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <SaturdayReportBanner />

            <div className="metrics-grid">
              {metrics.map((metric) => (
                <MetricCard
                  key={metric.id}
                  data={metric}
                  onClick={() => {
                    if (metric.type === 'agents') setActiveTab('agents');
                    else if (metric.type === 'workers' || metric.type === 'active') setActiveTab('workers');
                    else if (metric.type === 'sites') setActiveTab('sites');
                    else if (metric.type === 'attendance' && hasPermission('attendance')) setActiveTab('attendance');
                  }}
                />
              ))}
            </div>

            <div className="middle-grid">
              <AttendanceOverviewChart data={attendanceData} />
              <WorkersBySiteChart
                data={siteDistribution}
                onViewAll={() => setActiveTab('sites')}
              />
              <QuickActions
                actions={SYSTEM_QUICK_ACTIONS.filter(action => {
                  if (role === 'SUPER_AGENT') {
                    return action.actionKey !== 'add_worker' && action.actionKey !== 'mark_attendance' && action.actionKey !== 'view_reports';
                  }
                  return true;
                })}
                onActionClick={(actionKey) => {
                  if (actionKey === 'view_reports' || actionKey === 'reports') {
                    setActiveTab('reports');
                  } else {
                    setActiveModal(actionKey);
                  }
                }}
              />
            </div>

            <div className="bottom-grid" style={{ gridTemplateColumns: '1fr' }}>
              <RecentLeavesTable
                leaves={recentLeaves}
                onViewAll={() => setActiveTab('leaves')}
              />
            </div>
          </>
        );
    }
  };

  return (
    <div className="app-container">
      {!sidebarCollapsed && (
        <div
          className="sidebar-backdrop-overlay"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <Sidebar
        collapsed={sidebarCollapsed}
        activeTab={activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (window.innerWidth < 768) {
            setSidebarCollapsed(true);
          }
        }}
        setSidebarCollapsed={setSidebarCollapsed}
        onOpenModal={(modalType) => setActiveModal(modalType)}
      />

      <div className={`main-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header
          toggleSidebar={() => setSidebarCollapsed((prev) => !prev)}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          onOpenSearch={() => setActiveModal('search')}
          onOpenNotifications={() => setActiveModal('notifications')}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            if (window.innerWidth < 768) {
              setSidebarCollapsed(true);
            }
          }}
        />

        <main className="main-content">
          {renderTabContent()}
        </main>

        <Footer setActiveTab={setActiveTab} onOpenModal={(type) => setActiveModal(type)} />
      </div>

      <ActionModal
        isOpen={activeModal !== null}
        onClose={() => {
          setActiveModal(null);
          setTargetAgent(null);
          setTargetSite(null);
          setTargetWorker(null);
          setTargetTicket(null);
          setTargetInsurance(null);
        }}
        type={activeModal || ''}
        targetAgentId={targetAgent?.id}
        targetAgentName={targetAgent?.name}
        targetSiteId={targetSite?.id}
        targetSiteName={targetSite?.name}
        targetWorker={targetWorker}
        targetTicket={targetTicket}
        targetInsurance={targetInsurance}
        onSuccessRefresh={() => setRefreshCounter((prev) => prev + 1)}
        onApplyDateRange={(startDate, endDate, label) => {
          setSelectedDateRange({ startDate, endDate, label });
        }}
      />

      <ScanWorkerQrModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onWorkerScanned={(worker) => {
          if (role === 'AGENT' && user?.id) {
            const workerAgentId = Number((worker as any).assignedAgentId || (worker as any).agentId || (worker as any).assignedAgent?.id);
            if (!workerAgentId || workerAgentId !== Number(user.id)) {
              alert(`Access Denied: Worker ${worker.name} (${worker.employeeCode || `WRK-${worker.id}`}) is unassigned or assigned to another agent. Only the assigned agent can scan attendance.`);
              return;
            }
          }
          setScannedWorkerForAttendance(worker);
          setIsScannedAttendanceOpen(true);
        }}
      />

      <MarkAttendanceModal
        isOpen={isScannedAttendanceOpen}
        onClose={() => setIsScannedAttendanceOpen(false)}
        worker={scannedWorkerForAttendance}
        mode="CHECK_IN"
        onSuccess={() => setRefreshCounter((prev) => prev + 1)}
      />
    </div>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainAppContent />
    </AuthProvider>
  );
}

export default App;
