import { useState, useEffect, lazy, Suspense } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SessionExpiredModal } from './components/SessionExpiredModal';
import { AccessDeniedScreen } from './components/AccessDeniedScreen';
import { LoginPage } from './components/LoginPage';
import { ResetPasswordPage } from './components/ResetPasswordPage';
import { ApproveLoginPage } from './components/ApproveLoginPage';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { MetricCard } from './components/MetricCard';
import { TodayAgentAttendanceTable } from './components/TodayAgentAttendanceTable';
import { QuickActions } from './components/QuickActions';
import { ActionModal } from './components/ActionModal';
import { Footer } from './components/Footer';
import { MobileBottomNav } from './components/MobileBottomNav';
import { useRealtimeSync } from './hooks/useRealtimeSync';
import './styles/responsive.css';

// Lazy Loaded Sub-module Pages & Heavy Views for Code Splitting & Performance
const SitesPage = lazy(() => import('./pages/SitesPage').then(m => ({ default: m.SitesPage })));
const AgentsPage = lazy(() => import('./pages/AgentsPage').then(m => ({ default: m.AgentsPage })));
const WorkersPage = lazy(() => import('./pages/WorkersPage').then(m => ({ default: m.WorkersPage })));
const EnquiriesPage = lazy(() => import('./pages/EnquiriesPage').then(m => ({ default: m.EnquiriesPage })));
const AttendancePage = lazy(() => import('./pages/AttendancePage').then(m => ({ default: m.AttendancePage })));
const LeavePage = lazy(() => import('./pages/LeavePage').then(m => ({ default: m.LeavePage })));
const PayrollPage = lazy(() => import('./pages/PayrollPage').then(m => ({ default: m.PayrollPage })));
const WalletPage = lazy(() => import('./pages/WalletPage').then(m => ({ default: m.WalletPage })));
const InsurancePage = lazy(() => import('./pages/InsurancePage').then(m => ({ default: m.InsurancePage })));
const AgentSalaryPage = lazy(() => import('./pages/AgentSalaryPage').then(m => ({ default: m.AgentSalaryPage })));
const SupportPage = lazy(() => import('./pages/SupportPage').then(m => ({ default: m.SupportPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage').then(m => ({ default: m.WorkerDetailPage })));
const AgentDetailPage = lazy(() => import('./pages/AgentDetailPage').then(m => ({ default: m.AgentDetailPage })));
const WorkerVerifyPage = lazy(() => import('./pages/WorkerVerifyPage').then(m => ({ default: m.WorkerVerifyPage })));
const SupportDashboardPage = lazy(() => import('./pages/SupportDashboardPage').then(m => ({ default: m.SupportDashboardPage })));
const SupportLoginPage = lazy(() => import('./pages/SupportLoginPage').then(m => ({ default: m.SupportLoginPage })));
const CustomerSupportAgentsView = lazy(() => import('./components/CustomerSupportAgentsView').then(m => ({ default: m.CustomerSupportAgentsView })));
const WorkerQrCardsView = lazy(() => import('./components/WorkerQrCardsView').then(m => ({ default: m.WorkerQrCardsView })));
const SitePaymentsView = lazy(() => import('./components/SitePaymentsView').then(m => ({ default: m.SitePaymentsView })));
const RegisterWorkerPage = lazy(() => import('./pages/RegisterWorkerPage').then(m => ({ default: m.RegisterWorkerPage })));

function PageFallback() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '320px', width: '100%', flexDirection: 'column', gap: '12px' }}>
      <div style={{ width: '36px', height: '36px', border: '3px solid #E2E8F0', borderTopColor: '#2563EB', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <span style={{ fontSize: '13px', color: '#64748B', fontWeight: 500 }}>Loading module...</span>
    </div>
  );
}

// Role Specific Dashboards
import { AgentDashboardView, WorkerDashboardView } from './components/RoleDashboards';
import { WorkerMyDetailsView } from './components/WorkerMyDetailsView';
import { AgentMyDetailsView } from './components/AgentMyDetailsView';
import { AgentVerifyPage } from './pages/AgentVerifyPage';
import { SaturdayReportBanner } from './components/SaturdayReportBanner';
import { ScanWorkerQrModal } from './components/ScanWorkerQrModal';
import { MarkAttendanceModal } from './components/MarkAttendanceModal';
import { SupportAgentModal } from './components/SupportAgentModal';

import { Calendar, ChevronDown, LogOut } from 'lucide-react';
import {
  fetchDashboardStatsApi,
  fetchPayrollsApi,
  fetchWorkersApi,
  fetchWorkerAttendanceApi
} from './services/api';
import type {
  MetricData,
  QuickActionItem,
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
  // Activate automatic background real-time cache synchronization across all queries
  useRealtimeSync();

  const { isAuthenticated, isValidating, sessionExpired, clearExpired, user, role, login, logout, hasPermission } = useAuth();
  
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname);
  const [currentSearch, setCurrentSearch] = useState(() => window.location.search);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setCurrentSearch(window.location.search);
    };
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Public QR Code Worker Identity Verification Route (No Authentication Required)
  const urlParams = new URLSearchParams(currentSearch);
  const verifyWorkerIdParam = urlParams.get('verifyWorkerId') || urlParams.get('workerId');
  const isPublicVerifyRoute = currentPath.startsWith('/verify-worker') || Boolean(verifyWorkerIdParam);

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
  const [scannedAttendanceMode, setScannedAttendanceMode] = useState<'CHECK_IN' | 'CHECK_OUT'>('CHECK_IN');
  const [isScannedAttendanceOpen, setIsScannedAttendanceOpen] = useState<boolean>(false);
  const [isCreateSupportAgentOpen, setIsCreateSupportAgentOpen] = useState<boolean>(false);

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
      })
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
          setCurrentPath(window.location.pathname);
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
          setCurrentPath(window.location.pathname);
        }}
      />
    );
  }

  if (currentPath === '/verify-worker' || currentPath.startsWith('/verify-worker')) {
    return (
      <Suspense fallback={<PageFallback />}>
        <WorkerVerifyPage />
      </Suspense>
    );
  }

  if (currentPath === '/verify-agent' || currentPath.startsWith('/verify-agent')) {
    return <AgentVerifyPage />;
  }

  if (currentPath === '/worker-details' || currentPath.includes('worker-details')) {
    return (
      <Suspense fallback={<PageFallback />}>
        <WorkerDetailPage />
      </Suspense>
    );
  }

  if (currentPath === '/agent-details' || currentPath.includes('agent-details')) {
    return (
      <Suspense fallback={<PageFallback />}>
        <AgentDetailPage />
      </Suspense>
    );
  }

  if (currentPath === '/support/login' || currentPath === '/support-login') {
    if (isAuthenticated) {
      return (
        <Suspense fallback={<PageFallback />}>
          <SupportDashboardPage />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageFallback />}>
        <SupportLoginPage
          onSuccessNavigate={() => {
            window.history.pushState({}, '', '/support/dashboard');
            window.dispatchEvent(new Event('popstate'));
          }}
        />
      </Suspense>
    );
  }

  if (currentPath === '/support/dashboard' || currentPath === '/support-portal' || currentPath === '/support-dashboard') {
    if (!isAuthenticated) {
      return (
        <Suspense fallback={<PageFallback />}>
          <SupportLoginPage
            onSuccessNavigate={() => {
              window.history.pushState({}, '', '/support/dashboard');
              window.dispatchEvent(new Event('popstate'));
            }}
          />
        </Suspense>
      );
    }
    return (
      <Suspense fallback={<PageFallback />}>
        <SupportDashboardPage />
      </Suspense>
    );
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
            onNavigateTab={(tab) => setActiveTab(tab)}
            refreshTrigger={refreshCounter}
          />
        );
      case 'register_worker':
      case 'add_worker_page':
        return (
          <RegisterWorkerPage
            onNavigateTab={(tab) => setActiveTab(tab)}
            onSuccess={() => {
              setActiveTab('workers');
              setRefreshCounter((p) => p + 1);
            }}
          />
        );
      case 'worker_qrs':
        if (role !== 'AGENT') {
          break;
        }
        return (
          <WorkerQrCardsView
            onOpenModal={(modal) => setActiveModal(modal)}
            onOpenQrScanner={() => setIsQrScannerOpen(true)}
          />
        );
      case 'site_payments':
      case 'payments':
        return <SitePaymentsView onNavigateTab={(tab) => setActiveTab(tab)} />;
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
                  style={{ backgroundColor: '#FFF7ED', color: '#EA580C', borderColor: '#FED7AA' }}
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

            <div className="middle-grid" style={{ gridTemplateColumns: '2.4fr 1fr', gap: '20px' }}>
              <TodayAgentAttendanceTable onViewAllAgents={() => setActiveTab('agents')} />
              <QuickActions
                actions={SYSTEM_QUICK_ACTIONS.filter(action => {
                  if (role === 'SUPER_AGENT') {
                    return action.actionKey !== 'mark_attendance' && action.actionKey !== 'view_reports';
                  }
                  return true;
                })}
                onActionClick={(actionKey) => {
                  if (actionKey === 'view_reports' || actionKey === 'reports') {
                    setActiveTab('reports');
                  } else if (actionKey === 'add_worker' || actionKey === 'register_worker') {
                    setActiveTab('register_worker');
                  } else {
                    setActiveModal(actionKey);
                  }
                }}
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
          <Suspense fallback={<PageFallback />}>
            {renderTabContent()}
          </Suspense>
        </main>

        <Footer setActiveTab={setActiveTab} onOpenModal={(type) => setActiveModal(type)} />
        <MobileBottomNav
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          userRole={role || 'AGENT'}
          isAnyModalActive={Boolean(
            activeModal !== null ||
            isQrScannerOpen ||
            isScannedAttendanceOpen ||
            isCreateSupportAgentOpen
          )}
          onOpenCreateWorker={() => setActiveModal('add_worker')}
          onOpenQrScanner={() => setIsQrScannerOpen(true)}
          onOpenCreateAgent={() => setActiveModal('add_agent')}
          onOpenCreateSupportAgent={() => setIsCreateSupportAgentOpen(true)}
          onOpenCreateSite={() => setActiveModal('add_site')}
          onOpenApplyLeave={() => setActiveModal('apply_leave')}
          onOpenCreateTicket={() => setActiveModal('create_ticket')}
          onOpenMobileDrawer={() => setSidebarCollapsed(false)}
        />
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

      <SupportAgentModal
        isOpen={isCreateSupportAgentOpen}
        onClose={() => setIsCreateSupportAgentOpen(false)}
        onSuccess={() => {
          setIsCreateSupportAgentOpen(false);
          setRefreshCounter((prev) => prev + 1);
        }}
      />

      <ScanWorkerQrModal
        isOpen={isQrScannerOpen}
        onClose={() => setIsQrScannerOpen(false)}
        onWorkerScanned={async (worker) => {
          if (role === 'AGENT' && user?.id) {
            const workerAgentId = Number((worker as any).assignedAgentId || (worker as any).agentId || (worker as any).assignedAgent?.id);
            if (!workerAgentId || workerAgentId !== Number(user.id)) {
              alert(`Access Denied: Worker ${worker.name} (ID: ${worker.employeeCode || `WRK-${worker.id}`}) is not assigned to you. Only the assigned supervisor can mark attendance.`);
              return;
            }
          }

          try {
            const logs = await fetchWorkerAttendanceApi(worker.id);
            const todayStr = new Date().toISOString().split('T')[0];
            const todayLog = Array.isArray(logs) ? logs.find((l: any) => {
              if (!l.date) return false;
              const logDateStr = typeof l.date === 'string' ? l.date.split('T')[0] : new Date(l.date).toISOString().split('T')[0];
              return logDateStr === todayStr;
            }) : null;

            const hasCheckIn = !!(todayLog && (todayLog.signInTime || todayLog.checkInTime || todayLog.checkIn || todayLog.signInPhoto));
            const hasCheckOut = !!(todayLog && (todayLog.signOutTime || todayLog.checkOutTime || todayLog.checkOut || todayLog.signOutPhoto));
            const todayFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

            if (hasCheckIn && hasCheckOut) {
              alert(`Worker ${worker.name} (ID: ${worker.employeeCode || `WRK-${worker.id}`}) has already completed both Check-In and Check-Out for today (${todayFormatted}).`);
              return;
            }

            if (hasCheckIn && !hasCheckOut) {
              setScannedAttendanceMode('CHECK_OUT');
            } else {
              setScannedAttendanceMode('CHECK_IN');
            }

            setScannedWorkerForAttendance(worker);
            setIsScannedAttendanceOpen(true);
          } catch (err) {
            setScannedAttendanceMode('CHECK_IN');
            setScannedWorkerForAttendance(worker);
            setIsScannedAttendanceOpen(true);
          }
        }}
      />

      <MarkAttendanceModal
        isOpen={isScannedAttendanceOpen}
        onClose={() => setIsScannedAttendanceOpen(false)}
        worker={scannedWorkerForAttendance}
        mode={scannedAttendanceMode}
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
