import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Users,
  HardHat,
  Building2,
  CheckCircle2,
  Phone,
  MapPin,
  Trash2,
  Search,
  Loader2,
  RefreshCw,
  LogOut,
  X,
  AlertCircle,
  Banknote
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchAdminPortalDashboardApi,
  adminDeleteAgentApi,
  createSiteApi,
  deleteSiteApi,
} from '../services/api';
import type { AdminDetailData, AdminAgentDetailItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AdminAgentCreateModal } from '../components/AdminAgentCreateModal';
import { AdminWorkerRosterModal } from '../components/AdminWorkerRosterModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import { AdminCreateAgentPage } from './AdminCreateAgentPage';
import './AdminPortal.css';

interface AdminPortalPageProps {
  adminIdOverride?: string | number;
  onExitOverride?: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const AdminPortalPage: React.FC<AdminPortalPageProps> = ({
  adminIdOverride,
  onExitOverride,
  onNavigateTab,
}) => {
  const { user, logout } = useAuth();
  const effectiveAdminId = adminIdOverride || user?.id;

  const [dashboardData, setDashboardData] = useState<AdminDetailData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'dashboard' | 'create_agent'>('dashboard');

  // Modals state
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isCreateSiteOpen, setIsCreateSiteOpen] = useState(false);
  const [newSiteData, setNewSiteData] = useState({
    siteName: '',
    siteCode: '',
    companyName: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    contactPerson: '',
    contactNumber: '',
  });
  const [isSubmittingSite, setIsSubmittingSite] = useState(false);

  const [agentToDelete, setAgentToDelete] = useState<{ id: string | number; name: string } | null>(null);
  const [siteToDelete, setSiteToDelete] = useState<{ id: number; name: string } | null>(null);

  // Worker Roster Modal state
  const [rosterAgent, setRosterAgent] = useState<AdminAgentDetailItem | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const loadPortalData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await fetchAdminPortalDashboardApi(effectiveAdminId);
      setDashboardData(data);
    } catch (err: any) {
      console.error('Failed to load admin portal dashboard', err);
      setLoadError(err?.response?.data?.message || err?.message || 'Failed to load your admin portal data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [effectiveAdminId]);

  const handleDeleteAgent = async () => {
    if (!agentToDelete) return;
    try {
      await adminDeleteAgentApi(agentToDelete.id);
      setAgentToDelete(null);
      loadPortalData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete field agent');
    }
  };

  const handleCreateSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteData.siteName || !newSiteData.companyName) {
      alert('Site name and company name are required');
      return;
    }

    setIsSubmittingSite(true);
    try {
      await createSiteApi({
        siteName: newSiteData.siteName,
        siteCode: newSiteData.siteCode || `SITE-${Date.now().toString().slice(-4)}`,
        companyName: newSiteData.companyName,
        address: newSiteData.address || 'Local Construction Site',
        city: newSiteData.city || 'Local Area',
        state: newSiteData.state || 'Maharashtra',
        pincode: newSiteData.pincode || '411001',
        contactPerson: newSiteData.contactPerson || user?.name || 'Site Supervisor',
        contactNumber: newSiteData.contactNumber || user?.phone || '9876543210',
      });
      setIsCreateSiteOpen(false);
      setNewSiteData({
        siteName: '',
        siteCode: '',
        companyName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        contactPerson: '',
        contactNumber: '',
      });
      loadPortalData();
    } catch (err: any) {
      alert(err.message || 'Failed to create local site');
    } finally {
      setIsSubmittingSite(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!siteToDelete) return;
    try {
      await deleteSiteApi(siteToDelete.id);
      setSiteToDelete(null);
      loadPortalData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete site');
    }
  };

  if (isLoading) {
    return (
      <div className="admin-portal-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '12px' }}>
          <Loader2 size={36} className="animate-spin" color="#2563EB" />
          <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>
            Loading Super Admin Portal...
          </span>
        </div>
      </div>
    );
  }

  if (loadError && !dashboardData) {
    return (
      <div className="admin-portal-container">
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '380px', gap: '16px', textAlign: 'center', padding: '40px 20px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={32} />
          </div>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#1E293B' }}>
            Unable to Load Super Admin Portal
          </h3>
          <p style={{ margin: 0, fontSize: '14px', color: '#64748B', maxWidth: '440px', lineHeight: 1.5 }}>
            {loadError}
          </p>
          <button
            className="btn-primary-admin"
            style={{ marginTop: '8px' }}
            onClick={loadPortalData}
          >
            <RefreshCw size={15} />
            <span>Try Again</span>
          </button>
        </div>
      </div>
    );
  }

  const adminName = dashboardData?.name || user?.name || 'Administrator';
  const totalAgents = dashboardData?.totalAgents || 0;
  const totalWorkers = dashboardData?.totalWorkers || 0;
  const presentWorkersToday = dashboardData?.presentWorkersToday || 0;
  const attendanceRate = dashboardData?.attendanceRate || 0;
  const sitesList = dashboardData?.sites || [];
  const agentsList = dashboardData?.agents || [];

  const filteredAgents = agentsList.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.employeeCode.toLowerCase().includes(q) ||
      (a.siteName && a.siteName.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q))
    );
  });

  if (viewMode === 'create_agent') {
    return (
      <AdminCreateAgentPage
        adminId={effectiveAdminId}
        adminName={adminName}
        onBack={() => setViewMode('dashboard')}
        onSuccess={() => {
          setViewMode('dashboard');
          loadPortalData();
        }}
      />
    );
  }

  return (
    <div className="admin-portal-container">
      {/* If Super Admin is inspecting an Admin's portal, show exit button */}
      {adminIdOverride && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FEF3C7', padding: '10px 16px', borderRadius: '10px', border: '1px solid #FDE68A' }}>
          <span style={{ fontSize: '13px', color: '#92400E', fontWeight: 600 }}>
            👁 Super Admin Inspection Mode: You are viewing Administrator <strong>{adminName}</strong>'s portal
          </span>
          {onExitOverride && (
            <button className="btn-secondary-admin" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={onExitOverride}>
              Exit Inspection Mode
            </button>
          )}
        </div>
      )}

      {/* Hero Banner */}
      <div className="admin-hero-banner">
        <div className="admin-hero-title">
          <div className="admin-hero-icon">
            <Shield size={28} />
          </div>
          <div className="admin-hero-text">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1>Super Admin Portal</h1>
              <span style={{ background: '#2563EB', color: '#FFFFFF', fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px' }}>
                SUPER ADMIN JURISDICTION
              </span>
            </div>
            <p>
              Welcome back, <strong>{adminName}</strong> • {dashboardData?.designation || 'Regional Super Admin'} • {dashboardData?.address || 'Local Office'}
            </p>
          </div>
        </div>
        <div className="admin-hero-actions">
          <button className="btn-secondary-admin" onClick={loadPortalData} title="Refresh data">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button className="btn-primary-admin" onClick={() => setViewMode('create_agent')}>
            <Plus size={16} />
            <span>Add Field Agent</span>
          </button>
          <button className="btn-secondary-admin" onClick={() => setIsCreateSiteOpen(true)}>
            <Building2 size={15} />
            <span>Add Local Site</span>
          </button>
          {onNavigateTab && (
            <>
              <button className="btn-secondary-admin" onClick={() => onNavigateTab('workers')} title="View All Workers">
                <HardHat size={15} />
                <span>All Workers</span>
              </button>
              <button className="btn-secondary-admin" onClick={() => onNavigateTab('agents')} title="View All Agents">
                <Users size={15} />
                <span>All Agents</span>
              </button>
              <button className="btn-secondary-admin" onClick={() => onNavigateTab('salary_management')} title="Salary & Wage Management Report">
                <Banknote size={15} />
                <span>Salary Management</span>
              </button>
            </>
          )}
          {!adminIdOverride && (
            <button
              className="btn-secondary-admin"
              style={{ color: '#EA580C', borderColor: '#FED7AA', background: '#FFF7ED' }}
              onClick={logout}
              title="Sign Out"
            >
              <LogOut size={15} />
              <span>Sign Out</span>
            </button>
          )}
        </div>
      </div>

      {/* Hierarchy Path Badge */}
      <div className="hierarchy-breadcrumbs" style={{ alignSelf: 'flex-start' }}>
        <span className="hierarchy-node">
          <Shield size={13} color="#64748B" /> Super Admin
        </span>
        <span style={{ color: '#94A3B8' }}>→</span>
        <span className="hierarchy-node active">
          <Shield size={13} color="#2563EB" /> Super Admin: {adminName}
        </span>
        <span style={{ color: '#94A3B8' }}>→</span>
        <span className="hierarchy-node">
          <Users size={13} /> {totalAgents} Agents
        </span>
        <span style={{ color: '#94A3B8' }}>→</span>
        <span className="hierarchy-node">
          <HardHat size={13} /> {totalWorkers} Workers
        </span>
      </div>

      {/* Primary Metrics Grid */}
      <div className="admin-stats-grid">
        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab?.('agents')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
          title="Click to view all agents"
        >
          <div className="admin-stat-icon-wrap blue">
            <Users size={24} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Supervised Agents</span>
            <span className="admin-stat-value">{totalAgents}</span>
            <span className="admin-stat-subtext">Direct Field Supervisors</span>
          </div>
        </div>

        <div
          className="admin-stat-card"
          onClick={() => onNavigateTab?.('workers')}
          style={{ cursor: onNavigateTab ? 'pointer' : 'default' }}
          title="Click to view all workers"
        >
          <div className="admin-stat-icon-wrap amber">
            <HardHat size={24} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Total Labor Under Agents</span>
            <span className="admin-stat-value">{totalWorkers}</span>
            <span className="admin-stat-subtext">Active Construction Crew</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap emerald">
            <CheckCircle2 size={24} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Today's Field Attendance</span>
            <span className="admin-stat-value">
              {presentWorkersToday} / {totalWorkers}
            </span>
            <span className="admin-stat-subtext">{attendanceRate}% Attendance Rate</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap purple">
            <Building2 size={24} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Local Working Sites</span>
            <span className="admin-stat-value">{sitesList.length}</span>
            <span className="admin-stat-subtext">Jurisdiction Locations</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Supervised Agents & Their Workers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Field Agents & Labor Monitoring
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Monitor each field supervisor and the number of laborers working under that particular agent
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="search-input-wrap" style={{ minWidth: '260px' }}>
              <Search size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Search agent name, code, or site..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="btn-primary-admin" onClick={() => setViewMode('create_agent')}>
              <Plus size={15} />
              <span>Add Agent</span>
            </button>
          </div>
        </div>

        {filteredAgents.length === 0 ? (
          <div className="admin-inspector-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}>
            <Users size={44} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No Field Agents Supervised Yet</h4>
            <p style={{ margin: '6px auto 16px', maxWidth: '420px', fontSize: '13px' }}>
              Add field agents under your supervision. They will register labor crews and mark daily attendance on sites.
            </p>
            <button className="btn-primary-admin" style={{ margin: '0 auto' }} onClick={() => setViewMode('create_agent')}>
              <Plus size={16} />
              <span>Register First Agent</span>
            </button>
          </div>
        ) : (
          <div className="supervised-agents-grid">
            {filteredAgents.map((agent) => (
              <div key={agent.id} className="agent-monitor-card">
                <div className="agent-monitor-top">
                  <div className="agent-monitor-identity">
                    <UserAvatar name={agent.name} src={agent.profileImage} size={42} />
                    <div>
                      <div className="agent-monitor-name">{agent.name}</div>
                      <div className="agent-monitor-code">{agent.employeeCode}</div>
                    </div>
                  </div>
                  <span
                    style={{
                      background: agent.active ? '#DCFCE7' : '#F1F5F9',
                      color: agent.active ? '#166534' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {agent.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>

                <div className="agent-monitor-site">
                  <Building2 size={14} color="#64748B" />
                  <span>
                    Assigned Site: <strong>{agent.siteName || 'Unassigned'}</strong>
                    {agent.siteLocation ? ` • ${agent.siteLocation}` : ''}
                  </span>
                </div>

                {agent.phone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#64748B' }}>
                    <Phone size={13} />
                    <span>{agent.phone}</span>
                    {agent.email && <span>• {agent.email}</span>}
                  </div>
                )}

                {/* Highlighted Worker Count */}
                <div className="agent-monitor-stats">
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    Workers Under This Agent:
                  </span>
                  <div className="agent-monitor-workers-badge">
                    <HardHat size={16} />
                    <span>{agent.workersCount} Workers</span>
                  </div>
                </div>

                <div className="agent-monitor-actions">
                  <button
                    className="btn-primary-admin"
                    style={{ flex: 1, padding: '8px 12px', fontSize: '12.5px' }}
                    onClick={() => setRosterAgent(agent)}
                  >
                    <HardHat size={14} />
                    <span>Monitor Workers ({agent.workersCount})</span>
                  </button>
                  <button
                    className="btn-danger-outline"
                    title="Delete Agent under supervision"
                    onClick={() => setAgentToDelete({ id: agent.id, name: agent.name })}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: Local Area Sites (Add / Delete / Assign) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Local Area Sites & Project Locations
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Admin has authority to add and delete sites in local areas and assign supervisors
            </p>
          </div>
          <button className="btn-primary-admin" onClick={() => setIsCreateSiteOpen(true)}>
            <Plus size={15} />
            <span>Add New Site</span>
          </button>
        </div>

        <div className="admins-list-container">
          {sitesList.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
              <Building2 size={36} style={{ margin: '0 auto 10px', opacity: 0.35 }} />
              <h4 style={{ margin: 0, fontSize: '15px', fontWeight: 600 }}>No Local Sites Created Yet</h4>
              <p style={{ margin: '4px 0 14px', fontSize: '12.5px' }}>
                Add local construction sites to assign field agents and laborers.
              </p>
              <button className="btn-primary-admin" style={{ margin: '0 auto' }} onClick={() => setIsCreateSiteOpen(true)}>
                <Plus size={15} />
                <span>Create First Site</span>
              </button>
            </div>
          ) : (
            <table className="admins-table">
              <thead>
                <tr>
                  <th>Site Name & Code</th>
                  <th>Company / Contractor</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {sitesList.map((site) => (
                  <tr key={site.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                        {site.siteName}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {site.siteCode}
                      </div>
                    </td>
                    <td>{site.companyName}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12.5px' }}>
                        <MapPin size={13} color="#64748B" />
                        <span>{site.city}, {site.state}</span>
                      </div>
                      {site.address && (
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          {site.address}
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          background: site.active ? '#DCFCE7' : '#F1F5F9',
                          color: site.active ? '#166534' : '#64748B',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        {site.status || 'ACTIVE'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="btn-danger-outline"
                        title="Delete Site"
                        onClick={() => setSiteToDelete({ id: site.id, name: site.siteName })}
                      >
                        <Trash2 size={13} />
                        <span>Delete Site</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Field Agent Modal */}
      <AdminAgentCreateModal
        isOpen={isCreateAgentOpen}
        onClose={() => setIsCreateAgentOpen(false)}
        adminName={adminName}
        adminId={effectiveAdminId}
        onSuccess={loadPortalData}
      />

      {/* Monitor Workers under Agent Modal */}
      {rosterAgent && (
        <AdminWorkerRosterModal
          isOpen={Boolean(rosterAgent)}
          onClose={() => setRosterAgent(null)}
          agentName={rosterAgent.name}
          agentCode={rosterAgent.employeeCode}
          agentSiteName={rosterAgent.siteName}
          workers={rosterAgent.workers}
        />
      )}

      {/* Add Site Modal */}
      {isCreateSiteOpen && (
        <div className="action-modal-backdrop animate-fade-in" style={{ zIndex: 1100 }}>
          <div className="action-modal-card animate-scale-up" style={{ maxWidth: '520px', width: '92%' }}>
            <div className="action-modal-header" style={{ borderBottom: '1px solid var(--border-color, #E2E8F0)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#F3E8FF', color: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Building2 size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>Add Local Site</h3>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Admin authority: Register a construction site in your local area
                  </p>
                </div>
              </div>
              <button onClick={() => setIsCreateSiteOpen(false)} className="action-modal-close-btn" style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSite} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                    Site Name *
                  </label>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. Metro Line Extension 4"
                      value={newSiteData.siteName}
                      onChange={(e) => setNewSiteData({ ...newSiteData, siteName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                    Site Code
                  </label>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      placeholder="e.g. METRO-04"
                      value={newSiteData.siteCode}
                      onChange={(e) => setNewSiteData({ ...newSiteData, siteCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  Company / Contractor Name *
                </label>
                <div className="search-input-wrap">
                  <input
                    type="text"
                    placeholder="e.g. L&T Infrastructure Ltd"
                    value={newSiteData.companyName}
                    onChange={(e) => setNewSiteData({ ...newSiteData, companyName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                  Site Address / Location
                </label>
                <div className="search-input-wrap">
                  <input
                    type="text"
                    placeholder="e.g. Sector 18, Hinjewadi Phase 3"
                    value={newSiteData.address}
                    onChange={(e) => setNewSiteData({ ...newSiteData, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                    City
                  </label>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      placeholder="Pune"
                      value={newSiteData.city}
                      onChange={(e) => setNewSiteData({ ...newSiteData, city: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '5px' }}>
                    State
                  </label>
                  <div className="search-input-wrap">
                    <input
                      type="text"
                      placeholder="Maharashtra"
                      value={newSiteData.state}
                      onChange={(e) => setNewSiteData({ ...newSiteData, state: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px', paddingTop: '14px', borderTop: '1px solid var(--border-color, #E2E8F0)' }}>
                <button type="button" className="btn-secondary-admin" onClick={() => setIsCreateSiteOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary-admin" disabled={isSubmittingSite}>
                  {isSubmittingSite ? 'Creating Site...' : 'Create Site'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Agent Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(agentToDelete)}
        onClose={() => setAgentToDelete(null)}
        onConfirm={handleDeleteAgent}
        isDeleting={false}
        title="Delete Field Agent"
        itemName={agentToDelete?.name || ''}
        itemRole="Field Agent"
        warningNote="The field agent will be removed. All workers under this agent will remain safe in the database."
      />

      {/* Delete Site Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(siteToDelete)}
        onClose={() => setSiteToDelete(null)}
        onConfirm={handleDeleteSite}
        isDeleting={false}
        title="Delete Working Site"
        itemName={siteToDelete?.name || ''}
        itemRole="Construction Site"
        warningNote="This site will be deleted from your local jurisdiction."
      />
    </div>
  );
};
