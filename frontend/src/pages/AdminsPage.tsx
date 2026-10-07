import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Search,
  Users,
  HardHat,
  Building2,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ArrowLeft,
  Trash2,
  ExternalLink,
  Loader2,
  UserCheck,
  CheckCircle2,
  Briefcase,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import {
  fetchAdminsApi,
  fetchAdminDetailApi,
  deleteAdminApi,
  adminDeleteAgentApi,
  removeAgentFromAdminApi,
} from '../services/api';
import type { AdminItem, AdminDetailData, AdminAgentDetailItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AdminCreateModal } from '../components/AdminCreateModal';
import { AdminAgentCreateModal } from '../components/AdminAgentCreateModal';
import { AdminAssignExistingAgentModal } from '../components/AdminAssignExistingAgentModal';
import { AdminWorkerRosterModal } from '../components/AdminWorkerRosterModal';
import { DeleteConfirmModal } from '../components/DeleteConfirmModal';
import './AdminPortal.css';

interface AdminsPageProps {
  onNavigateTab?: (tab: string) => void;
  onOpenAdminPortal?: (adminId: string | number) => void;
}

export const AdminsPage: React.FC<AdminsPageProps> = ({
  onNavigateTab,
  onOpenAdminPortal,
}) => {
  const [admins, setAdmins] = useState<AdminItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Admin for Detail View (Click on Admin requirement)
  const [selectedAdminId, setSelectedAdminId] = useState<string | number | null>(null);
  const [selectedAdminDetail, setSelectedAdminDetail] = useState<AdminDetailData | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Modals state
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [isCreateAgentOpen, setIsCreateAgentOpen] = useState(false);
  const [isAssignExistingAgentOpen, setIsAssignExistingAgentOpen] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState<AdminItem | null>(null);
  const [agentToDelete, setAgentToDelete] = useState<{ id: string | number; name: string } | null>(null);

  // Worker Roster Modal (monitor workers under particular agent)
  const [rosterAgent, setRosterAgent] = useState<AdminAgentDetailItem | null>(null);

  const loadAdmins = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAdminsApi();
      setAdmins(data || []);
    } catch (err) {
      console.error('Failed to load admins', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  // When clicking on an Admin, fetch their complete hierarchy details
  const handleSelectAdmin = async (adminId: string | number) => {
    setSelectedAdminId(adminId);
    setIsLoadingDetail(true);
    try {
      const detail = await fetchAdminDetailApi(adminId);
      setSelectedAdminDetail(detail);
    } catch (err) {
      console.error('Failed to load admin detail', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const handleBackToList = () => {
    setSelectedAdminId(null);
    setSelectedAdminDetail(null);
    loadAdmins();
  };

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    try {
      await deleteAdminApi(adminToDelete.id);
      setAdminToDelete(null);
      if (selectedAdminId === adminToDelete.id) {
        handleBackToList();
      } else {
        loadAdmins();
      }
    } catch (err: any) {
      alert(err.message || 'Failed to delete administrator');
    }
  };

  const handleDeleteAgent = async () => {
    if (!agentToDelete || !selectedAdminId) return;
    try {
      await adminDeleteAgentApi(agentToDelete.id);
      setAgentToDelete(null);
      // Reload admin detail
      const updated = await fetchAdminDetailApi(selectedAdminId);
      setSelectedAdminDetail(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent');
    }
  };

  const handleRemoveAgentFromAdmin = async (agentId: string | number) => {
    if (!selectedAdminId) return;
    if (!window.confirm('Are you sure you want to unassign this agent from this Administrator?')) return;
    try {
      await removeAgentFromAdminApi(selectedAdminId, agentId);
      const updated = await fetchAdminDetailApi(selectedAdminId);
      setSelectedAdminDetail(updated);
    } catch (err: any) {
      alert(err.message || 'Failed to unassign agent from administrator');
    }
  };

  // Filtered admins list
  const filteredAdmins = admins.filter((a) => {
    const q = searchTerm.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      a.employeeCode.toLowerCase().includes(q) ||
      (a.email && a.email.toLowerCase().includes(q)) ||
      (a.phone && a.phone.includes(q)) ||
      (a.address && a.address.toLowerCase().includes(q))
    );
  });

  const totalAdminsCount = admins.length;
  const totalAgentsUnderAdmins = admins.reduce((acc, a) => acc + (a.totalAgents || 0), 0);
  const totalWorkersUnderAdmins = admins.reduce((acc, a) => acc + (a.totalWorkers || 0), 0);

  // =========================================================================
  // VIEW 1: SELECTED ADMIN HIERARCHY & MONITORING VIEW
  // =========================================================================
  if (selectedAdminId) {
    if (isLoadingDetail || !selectedAdminDetail) {
      return (
        <div className="admin-portal-container">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
            <button className="btn-secondary-admin" onClick={handleBackToList}>
              <ArrowLeft size={16} />
              <span>Back to Administrators List</span>
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '360px', gap: '12px' }}>
            <Loader2 size={36} className="animate-spin" color="#2563EB" />
            <span style={{ fontSize: '14px', color: '#64748B', fontWeight: 500 }}>
              Loading administrator hierarchy details...
            </span>
          </div>
        </div>
      );
    }

    const detail = selectedAdminDetail;

    return (
      <div className="admin-portal-container">
        {/* Navigation back and Hierarchy breadcrumb */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <button className="btn-secondary-admin" onClick={handleBackToList}>
            <ArrowLeft size={16} />
            <span>Back to Administrators List</span>
          </button>

          <div className="hierarchy-breadcrumbs">
            <span className="hierarchy-node">
              <Shield size={13} color="#2563EB" /> Super Admin
            </span>
            <ChevronRight size={13} color="#94A3B8" />
            <span className="hierarchy-node active">
              <Shield size={13} /> Admin: {detail.name}
            </span>
            <ChevronRight size={13} color="#94A3B8" />
            <span className="hierarchy-node">
              <Users size={13} /> {detail.totalAgents} Agents
            </span>
            <ChevronRight size={13} color="#94A3B8" />
            <span className="hierarchy-node">
              <HardHat size={13} /> {detail.totalWorkers} Workers
            </span>
          </div>
        </div>

        {/* Admin Inspector Header Card */}
        <div className="admin-inspector-card">
          <div className="inspector-header">
            <div className="inspector-profile-row">
              <UserAvatar
                name={detail.name}
                src={detail.profileImage}
                size={58}
              />
              <div className="inspector-info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <h2>{detail.name}</h2>
                  <span className="badge-count-pill blue" style={{ fontSize: '11px' }}>
                    {detail.employeeCode}
                  </span>
                  <span
                    style={{
                      background: detail.active ? '#DCFCE7' : '#F1F5F9',
                      color: detail.active ? '#166534' : '#64748B',
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '6px',
                    }}
                  >
                    {detail.active ? 'ACTIVE ADMIN' : 'INACTIVE'}
                  </span>
                </div>
                <div className="inspector-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Briefcase size={14} color="#64748B" />
                    <strong>{detail.designation || 'Regional Administrator'}</strong>
                  </span>
                  {detail.address && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <MapPin size={14} color="#64748B" />
                      {detail.address}
                    </span>
                  )}
                  {detail.email && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Mail size={14} color="#64748B" />
                      {detail.email}
                    </span>
                  )}
                  {detail.phone && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={14} color="#64748B" />
                      {detail.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {onOpenAdminPortal && (
                <button
                  className="btn-secondary-admin"
                  onClick={() => onOpenAdminPortal(detail.id)}
                  title="View portal exactly as this Admin sees it"
                >
                  <ExternalLink size={15} />
                  <span>Launch Admin Portal View</span>
                </button>
              )}
              <button
                className="btn-primary-admin"
                onClick={() => setIsCreateAgentOpen(true)}
              >
                <Plus size={16} />
                <span>Add Agent Under Admin</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics of this Admin */}
          <div className="admin-stats-grid">
            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap blue">
                <Users size={22} />
              </div>
              <div className="admin-stat-content">
                <span className="admin-stat-label">Agents Under Admin</span>
                <span className="admin-stat-value">{detail.totalAgents}</span>
                <span className="admin-stat-subtext">Direct Field Supervisors</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap amber">
                <HardHat size={22} />
              </div>
              <div className="admin-stat-content">
                <span className="admin-stat-label">Workers Under Agents</span>
                <span className="admin-stat-value">{detail.totalWorkers}</span>
                <span className="admin-stat-subtext">Total Labor Managed</span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap emerald">
                <CheckCircle2 size={22} />
              </div>
              <div className="admin-stat-content">
                <span className="admin-stat-label">Today's Attendance</span>
                <span className="admin-stat-value">
                  {detail.presentWorkersToday} / {detail.totalWorkers}
                </span>
                <span className="admin-stat-subtext">
                  {detail.attendanceRate}% Attendance Rate
                </span>
              </div>
            </div>

            <div className="admin-stat-card">
              <div className="admin-stat-icon-wrap purple">
                <Building2 size={22} />
              </div>
              <div className="admin-stat-content">
                <span className="admin-stat-label">Local Working Sites</span>
                <span className="admin-stat-value">{detail.sites?.length || 0}</span>
                <span className="admin-stat-subtext">Project Locations</span>
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Supervised Field Agents and Their Workers */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                Field Agents Supervised by {detail.name}
              </h3>
              <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Monitor each field agent and the laborers working under that particular agent
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="btn-secondary-admin"
                onClick={() => setIsAssignExistingAgentOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <UserPlus size={15} />
                <span>Assign Existing Agent</span>
              </button>
              <button
                className="btn-primary-admin"
                onClick={() => setIsCreateAgentOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={15} />
                <span>Register New Agent</span>
              </button>
            </div>
          </div>

          {detail.agents.length === 0 ? (
            <div
              className="admin-inspector-card"
              style={{ padding: '48px 24px', textAlign: 'center', color: '#64748B' }}
            >
              <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.35 }} />
              <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>No Agents Assigned Under This Admin Yet</h4>
              <p style={{ margin: '6px auto 16px', maxWidth: '420px', fontSize: '13px' }}>
                You can create a new Field Agent directly assigned to this Admin, or assign existing agents.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn-secondary-admin"
                  onClick={() => setIsAssignExistingAgentOpen(true)}
                >
                  <UserPlus size={15} />
                  <span>Assign Existing Agent</span>
                </button>
                <button
                  className="btn-primary-admin"
                  onClick={() => setIsCreateAgentOpen(true)}
                >
                  <Plus size={15} />
                  <span>Register New Agent</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="supervised-agents-grid">
              {detail.agents.map((agent) => (
                <div key={agent.id} className="agent-monitor-card">
                  <div className="agent-monitor-top">
                    <div className="agent-monitor-identity">
                      <UserAvatar
                        name={agent.name}
                        src={agent.profileImage}
                        size={40}
                      />
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
                      Site: <strong>{agent.siteName || 'Unassigned'}</strong>
                      {agent.siteLocation ? ` • ${agent.siteLocation}` : ''}
                    </span>
                  </div>

                  {/* Highlighted Worker Count */}
                  <div className="agent-monitor-stats">
                    <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      Laborers Supervised:
                    </span>
                    <div className="agent-monitor-workers-badge">
                      <HardHat size={16} />
                      <span>{agent.workersCount} Workers</span>
                    </div>
                  </div>

                  <div className="agent-monitor-actions">
                    <button
                      className="btn-primary-admin"
                      style={{ flex: 1, padding: '7px 12px', fontSize: '12.5px' }}
                      onClick={() => setRosterAgent(agent)}
                    >
                      <HardHat size={14} />
                      <span>Monitor Workers ({agent.workersCount})</span>
                    </button>
                    <button
                      className="btn-secondary-admin"
                      style={{ padding: '7px 10px', fontSize: '12px' }}
                      title="Unassign Agent from this Administrator"
                      onClick={() => handleRemoveAgentFromAdmin(agent.id)}
                    >
                      <UserMinus size={14} />
                    </button>
                    <button
                      className="btn-danger-outline"
                      title="Delete Agent under this Admin"
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

        {/* Section 2: Local Working Sites Assigned */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Local Area Sites & Projects
            </h3>
            <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Sites and active project locations assigned under this Administrator's local area
            </p>
          </div>

          <div className="admins-list-container">
            {detail.sites.length === 0 ? (
              <div style={{ padding: '36px', textAlign: 'center', color: '#64748B' }}>
                <Building2 size={32} style={{ margin: '0 auto 8px', opacity: 0.35 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>No sites specifically linked to this admin yet</p>
              </div>
            ) : (
              <table className="admins-table">
                <thead>
                  <tr>
                    <th>Site Name & Code</th>
                    <th>Company</th>
                    <th>Location / City</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sites.map((site) => (
                    <tr key={site.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {site.siteName}
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {site.siteCode}
                        </div>
                      </td>
                      <td>{site.companyName}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <MapPin size={13} color="#64748B" />
                          <span>{site.city}, {site.state}</span>
                        </div>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modals for Selected Admin View */}
        <AdminAgentCreateModal
          isOpen={isCreateAgentOpen}
          onClose={() => setIsCreateAgentOpen(false)}
          adminName={detail.name}
          adminId={detail.id}
          onSuccess={async () => {
            const updated = await fetchAdminDetailApi(detail.id);
            setSelectedAdminDetail(updated);
          }}
        />

        <AdminAssignExistingAgentModal
          isOpen={isAssignExistingAgentOpen}
          onClose={() => setIsAssignExistingAgentOpen(false)}
          adminName={detail.name}
          adminId={detail.id}
          currentlyAssignedAgentIds={detail.agents.map((ag) => ag.id)}
          onSuccess={async () => {
            const updated = await fetchAdminDetailApi(detail.id);
            setSelectedAdminDetail(updated);
          }}
        />

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

        <DeleteConfirmModal
          isOpen={Boolean(agentToDelete)}
          onClose={() => setAgentToDelete(null)}
          onConfirm={handleDeleteAgent}
          isDeleting={false}
          title="Delete Field Agent"
          itemName={agentToDelete?.name || ''}
          itemRole="Field Agent"
          warningNote="The field agent and their credentials will be removed. All workers under this agent will remain safe in the database."
        />
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: ALL ADMINISTRATORS OVERVIEW (SUPER ADMIN LIST)
  // =========================================================================
  return (
    <div className="admin-portal-container">
      {/* Hero Banner */}
      <div className="admin-hero-banner">
        <div className="admin-hero-title">
          <div className="admin-hero-icon">
            <Shield size={20} />
          </div>
          <div className="admin-hero-text">
            <h1>Area Administrators Management</h1>
            <p>
              Super Admin Control • Super Admin → Admin → Agents → Workers Hierarchy
            </p>
          </div>
        </div>
        <div className="admin-hero-actions">
          <button
            className="btn-primary-admin"
            onClick={() => onNavigateTab ? onNavigateTab('create_admin') : setIsCreateAdminOpen(true)}
            style={{ background: '#3B82F6', boxShadow: '0 4px 14px rgba(59, 130, 246, 0.3)' }}
          >
            <Plus size={15} />
            <span>Create New Administrator</span>
          </button>
        </div>
      </div>

      {/* Hierarchy Path Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div className="hierarchy-breadcrumbs">
          <span className="hierarchy-node active">
            <Shield size={12} color="#2563EB" /> Super Admin
          </span>
          <ChevronRight size={12} color="#94A3B8" />
          <span className="hierarchy-node">
            <Shield size={12} /> {totalAdminsCount} Administrators
          </span>
          <ChevronRight size={12} color="#94A3B8" />
          <span className="hierarchy-node">
            <Users size={12} /> {totalAgentsUnderAdmins} Supervised Agents
          </span>
          <ChevronRight size={12} color="#94A3B8" />
          <span className="hierarchy-node">
            <HardHat size={12} /> {totalWorkersUnderAdmins} Total Labor
          </span>
        </div>

        <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
          Click any Administrator below to inspect their supervised agents and workers
        </span>
      </div>

      {/* Aggregate Metrics Grid */}
      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap blue">
            <Shield size={18} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Area Administrators</span>
            <span className="admin-stat-value">{totalAdminsCount}</span>
            <span className="admin-stat-subtext">Active Regional Heads</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap amber">
            <Users size={18} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Agents Under Admins</span>
            <span className="admin-stat-value">{totalAgentsUnderAdmins}</span>
            <span className="admin-stat-subtext">Field Supervisors</span>
          </div>
        </div>

        <div className="admin-stat-card">
          <div className="admin-stat-icon-wrap emerald">
            <HardHat size={18} />
          </div>
          <div className="admin-stat-content">
            <span className="admin-stat-label">Workers Under Agents</span>
            <span className="admin-stat-value">{totalWorkersUnderAdmins}</span>
            <span className="admin-stat-subtext">Active Field Workforce</span>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={15} color="#94A3B8" />
          <input
            type="text"
            placeholder="Search administrators by name, employee code, area, or contact..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Admins Table / List */}
      <div className="admins-list-container">
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '10px' }}>
            <Loader2 size={26} className="animate-spin" color="#2563EB" />
            <span style={{ fontSize: '12px', color: '#64748B' }}>Loading administrators...</span>
          </div>
        ) : filteredAdmins.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '44px 20px', color: '#64748B' }}>
            <Shield size={34} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
            <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>No Administrators Found</h3>
            <p style={{ margin: '4px 0 14px', fontSize: '12px' }}>
              Create an administrator to manage and monitor field agents in local areas.
            </p>
            <button
              className="btn-primary-admin"
              style={{ margin: '0 auto', fontSize: '12px', padding: '7px 14px' }}
              onClick={() => onNavigateTab ? onNavigateTab('create_admin') : setIsCreateAdminOpen(true)}
            >
              <Plus size={14} />
              <span>Create First Administrator</span>
            </button>
          </div>
        ) : (
          <table className="admins-table">
            <thead>
              <tr>
                <th>Administrator</th>
                <th>Employee Code</th>
                <th>Contact</th>
                <th>Area Jurisdiction</th>
                <th>Supervised Agents</th>
                <th>Total Workers</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin) => (
                <tr
                  key={admin.id}
                  className="clickable-row"
                  onClick={() => handleSelectAdmin(admin.id)}
                >
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserAvatar
                        name={admin.name}
                        src={admin.profileImage}
                        size={38}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {admin.name}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {admin.designation || 'Regional Administrator'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-count-pill blue" style={{ fontSize: '11.5px' }}>
                      {admin.employeeCode}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: '12.5px' }}>
                      {admin.email && <div>{admin.email}</div>}
                      {admin.phone && <div style={{ color: 'var(--text-secondary)' }}>{admin.phone}</div>}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
                      <MapPin size={13} color="#64748B" />
                      <span>{admin.address || 'Local Area'}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge-count-pill blue">
                      <Users size={13} />
                      <span>{admin.totalAgents} Agents</span>
                    </span>
                  </td>
                  <td>
                    <span className="badge-count-pill amber">
                      <HardHat size={13} />
                      <span>{admin.totalWorkers} Workers</span>
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        className="btn-primary-admin"
                        style={{ padding: '6px 12px', fontSize: '12.5px' }}
                        onClick={() => handleSelectAdmin(admin.id)}
                      >
                        <UserCheck size={14} />
                        <span>Inspect Details</span>
                        <ChevronRight size={14} />
                      </button>
                      <button
                        className="btn-danger-outline"
                        title="Delete Administrator"
                        onClick={() => setAdminToDelete(admin)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <AdminCreateModal
        isOpen={isCreateAdminOpen}
        onClose={() => setIsCreateAdminOpen(false)}
        onSuccess={loadAdmins}
      />

      <DeleteConfirmModal
        isOpen={Boolean(adminToDelete)}
        onClose={() => setAdminToDelete(null)}
        onConfirm={handleDeleteAdmin}
        isDeleting={false}
        title="Delete Administrator"
        itemName={adminToDelete?.name || ''}
        itemRole="Administrator"
        warningNote="All supervised agents and workers will remain safe in the system."
      />
    </div>
  );
};
