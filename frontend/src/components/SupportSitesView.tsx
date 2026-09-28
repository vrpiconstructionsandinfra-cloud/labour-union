import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSitesApi,
  fetchAgentsApi,
  updateSiteApi,
  deleteSiteApi,
  createSiteApi,
  assignSiteToAgentApi,
  removeAgentFromSiteApi
} from '../services/api';
import type { AgentItem, SiteItem } from '../types';
import { queryClient, QUERY_KEYS } from '../services/queryClient';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import {
  Building2,
  Plus,
  RefreshCw,
  Search,
  MapPin,
  Users,
  UserPlus,
  MoreVertical,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  Loader2,
  UserCheck,
  UserX
} from 'lucide-react';
import './SupportSitesView.css';

interface SupportSitesViewProps {
  onOpenCreateSiteModal?: () => void;
}

export const SupportSitesView: React.FC<SupportSitesViewProps> = ({
  onOpenCreateSiteModal
}) => {
  const { user } = useAuth();

  const [sites, setSites] = useState<SiteItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD'>('ALL');
  const [openDropdownSiteId, setOpenDropdownSiteId] = useState<string | null>(null);
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);

  // Status updating & unassigning states
  const [updatingStatusSiteId, setUpdatingStatusSiteId] = useState<string | null>(null);
  const [unassigningAgentId, setUnassigningAgentId] = useState<string | null>(null);

  // Deletion Modal State
  const [deletingSite, setDeletingSite] = useState<SiteItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState<boolean>(false);

  // Assign Agent to Site Modal State
  const [assigningSiteModal, setAssigningSiteModal] = useState<SiteItem | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [workersNeeded, setWorkersNeeded] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isSubmittingAssign, setIsSubmittingAssign] = useState<boolean>(false);

  // Create Site Local Modal State
  const [isLocalCreateSiteOpen, setIsLocalCreateSiteOpen] = useState<boolean>(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newState, setNewState] = useState('');
  const [newPincode, setNewPincode] = useState('');
  const [newContactPerson, setNewContactPerson] = useState('');
  const [newContactNumber, setNewContactNumber] = useState('');
  const [newSiteStatus, setNewSiteStatus] = useState('ACTIVE');
  const [isCreatingSite, setIsCreatingSite] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setOpenDropdownSiteId(null);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [sitesData, agentsData] = await Promise.all([
        fetchSitesApi().catch(() => []),
        fetchAgentsApi().catch(() => [])
      ]);
      setSites(sitesData || []);
      setAgents(agentsData || []);
    } catch (err) {
      console.error('Failed to load sites data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Quick Status Change
  const handleStatusChange = async (siteId: string, newStatus: string) => {
    setUpdatingStatusSiteId(siteId);
    try {
      await updateSiteApi(siteId, { status: newStatus });
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, status: newStatus } : s))
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sites });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    } catch (err: any) {
      alert(err.message || 'Failed to update site status');
    } finally {
      setUpdatingStatusSiteId(null);
    }
  };

  // Unassign Agent from Site
  const handleUnassignAgent = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Are you sure you want to remove supervisor "${agentName}" from this working site?`)) {
      return;
    }

    setUnassigningAgentId(agentId);
    try {
      await removeAgentFromSiteApi(agentId);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to remove supervisor from site');
    } finally {
      setUnassigningAgentId(null);
    }
  };

  // Submit Assign Agent
  const handleAssignAgentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assigningSiteModal || !selectedAgentId) {
      alert('Please select a field agent to assign.');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      await assignSiteToAgentApi(Number(selectedAgentId), {
        siteId: Number(assigningSiteModal.id),
        durationDays,
        workersNeeded,
        startDate
      });

      setAssigningSiteModal(null);
      setSelectedAgentId('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to assign field agent to site.');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  // Create Site Submit
  const handleCreateSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim() || !newCity.trim()) {
      alert('Please enter site name and city.');
      return;
    }

    setIsCreatingSite(true);
    try {
      const generatedCode = `SITE-${Date.now().toString().slice(-4)}`;
      await createSiteApi({
        siteCode: generatedCode,
        siteName: newSiteName.trim(),
        companyName: newCompanyName.trim() || 'Labor Union Org',
        address: newAddress.trim() || 'Industrial Area',
        city: newCity.trim(),
        state: newState.trim() || 'Maharashtra',
        pincode: newPincode.trim() || '400001',
        contactPerson: newContactPerson.trim() || (user?.name || 'Customer Support'),
        contactNumber: newContactNumber.trim() || '+91 9876543210',
        status: newSiteStatus
      });

      setIsLocalCreateSiteOpen(false);
      setNewSiteName('');
      setNewCompanyName('');
      setNewAddress('');
      setNewCity('');
      setNewState('');
      setNewPincode('');
      setNewContactPerson('');
      setNewContactNumber('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create new working site.');
    } finally {
      setIsCreatingSite(false);
    }
  };

  // Delete Site Confirmation Handler
  const handleDeleteSiteConfirm = async () => {
    if (!deletingSite) return;
    setIsSubmittingDelete(true);
    try {
      await deleteSiteApi(deletingSite.id);
      setDeletingSite(null);
      await loadData();
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sites });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });
    } catch (err: any) {
      alert(err?.message || 'Failed to delete working site.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Filtering
  const filteredSites = sites.filter((site) => {
    const term = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !term ||
      site.siteName.toLowerCase().includes(term) ||
      (site.siteCode || '').toLowerCase().includes(term) ||
      (site.companyName || '').toLowerCase().includes(term) ||
      (site.city || '').toLowerCase().includes(term) ||
      (site.state || '').toLowerCase().includes(term);

    const normStatus = (site.status || 'ACTIVE').toUpperCase();
    let matchesStatus = true;
    if (statusFilter === 'ACTIVE') {
      matchesStatus = normStatus === 'ACTIVE';
    } else if (statusFilter === 'IN_PROGRESS') {
      matchesStatus = normStatus === 'IN_PROGRESS' || normStatus === 'IN PROGRESS';
    } else if (statusFilter === 'COMPLETED') {
      matchesStatus = normStatus === 'COMPLETED';
    } else if (statusFilter === 'ON_HOLD') {
      matchesStatus = normStatus === 'ON_HOLD' || normStatus === 'ON HOLD';
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalSitesCount = sites.length;
  const activeSitesCount = sites.filter((s) => (s.status || '').toUpperCase() === 'ACTIVE').length;
  const inProgressSitesCount = sites.filter((s) => {
    const st = (s.status || '').toUpperCase();
    return st === 'IN_PROGRESS' || st === 'IN PROGRESS';
  }).length;
  const completedOrHoldCount = sites.filter((s) => {
    const st = (s.status || '').toUpperCase();
    return st === 'COMPLETED' || st === 'ON_HOLD' || st === 'ON HOLD';
  }).length;

  const getStatusBadgeStyle = (status: string) => {
    const s = (status || 'ACTIVE').toUpperCase();
    if (s === 'ACTIVE') {
      return { bg: '#DCFCE7', color: '#15803D', border: '#86EFAC', label: 'Active' };
    }
    if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') {
      return { bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', label: 'In Progress' };
    }
    if (s === 'COMPLETED') {
      return { bg: '#F1F5F9', color: '#475569', border: '#CBD5E1', label: 'Completed' };
    }
    return { bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', label: 'On Hold' };
  };

  return (
    <div className="support-sites-container animate-fade-in">
      {/* 1. Top Header Row */}
      <div className="ssv-header-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="ssv-header-icon">
            <Building2 size={24} color="#2563eb" />
          </div>
          <div>
            <h1 className="ssv-page-title">Working Sites Directory & Operations</h1>
            <p className="ssv-page-subtitle">
              Manage enterprise working sites, supervise agent assignments, and monitor workforce allocations.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            className="ssv-create-site-btn"
            onClick={() => {
              if (onOpenCreateSiteModal) onOpenCreateSiteModal();
              else setIsLocalCreateSiteOpen(true);
            }}
          >
            <Plus size={16} />
            <span>Create Working Site</span>
          </button>

          <button
            type="button"
            className="ssv-refresh-btn"
            onClick={() => loadData(true)}
            title="Refresh Sites Roster"
          >
            <RefreshCw size={15} className={isRefreshing ? 'spin' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* 2. Metric Summary Cards */}
      <div className="ssv-metrics-grid">
        {/* Card 1: Total Sites */}
        <div className="ssv-metric-card">
          <div className="ssv-card-icon-wrap blue">
            <Building2 size={20} color="#2563eb" />
          </div>
          <div className="ssv-card-text">
            <span className="ssv-card-label">Total Working Sites</span>
            <h3 className="ssv-card-val">{totalSitesCount}</h3>
          </div>
        </div>

        {/* Card 2: Active Sites */}
        <div className="ssv-metric-card">
          <div className="ssv-card-icon-wrap green">
            <CheckCircle2 size={20} color="#16a34a" />
          </div>
          <div className="ssv-card-text">
            <span className="ssv-card-label">Active Operating Sites</span>
            <h3 className="ssv-card-val">{activeSitesCount}</h3>
          </div>
        </div>

        {/* Card 3: In Progress Sites */}
        <div className="ssv-metric-card">
          <div className="ssv-card-icon-wrap purple">
            <Clock size={20} color="#8b5cf6" />
          </div>
          <div className="ssv-card-text">
            <span className="ssv-card-label">In Progress Projects</span>
            <h3 className="ssv-card-val">{inProgressSitesCount}</h3>
          </div>
        </div>

        {/* Card 4: Completed / On Hold */}
        <div className="ssv-metric-card">
          <div className="ssv-card-icon-wrap amber">
            <AlertTriangle size={20} color="#d97706" />
          </div>
          <div className="ssv-card-text">
            <span className="ssv-card-label">Completed / On Hold</span>
            <h3 className="ssv-card-val">{completedOrHoldCount}</h3>
          </div>
        </div>
      </div>

      {/* 3. Filter Pills and Search Toolbar */}
      <div className="ssv-toolbar-row">
        <div className="ssv-filter-pills-group">
          <button
            type="button"
            className={`ssv-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            All Sites ({sites.length})
          </button>
          <button
            type="button"
            className={`ssv-filter-pill ${statusFilter === 'ACTIVE' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ACTIVE')}
          >
            Active ({activeSitesCount})
          </button>
          <button
            type="button"
            className={`ssv-filter-pill ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            In Progress ({inProgressSitesCount})
          </button>
          <button
            type="button"
            className={`ssv-filter-pill ${statusFilter === 'COMPLETED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('COMPLETED')}
          >
            Completed
          </button>
          <button
            type="button"
            className={`ssv-filter-pill ${statusFilter === 'ON_HOLD' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ON_HOLD')}
          >
            On Hold
          </button>
        </div>

        <div className="ssv-search-box-wrap">
          <Search size={16} className="ssv-search-icon" />
          <input
            type="text"
            placeholder="Search by site code, name, company, city..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              className="ssv-clear-search-btn"
              onClick={() => setSearchQuery('')}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* 4. Main Sites Catalog View */}
      {isLoading ? (
        <div className="ssv-loading-state">
          <Loader2 size={32} className="spinner" color="#2563eb" />
          <p>Loading working sites directory...</p>
        </div>
      ) : filteredSites.length === 0 ? (
        <div className="ssv-empty-state">
          <Building2 size={48} color="#94a3b8" />
          <h3>No working sites found</h3>
          <p>No sites match your search filters. Try adjusting your query or register a new working site.</p>
          <button
            type="button"
            className="ssv-create-site-btn"
            style={{ marginTop: '12px' }}
            onClick={() => {
              if (onOpenCreateSiteModal) onOpenCreateSiteModal();
              else setIsLocalCreateSiteOpen(true);
            }}
          >
            <Plus size={16} /> Create Working Site
          </button>
        </div>
      ) : (
        <div className="ssv-sites-grid">
          {filteredSites.map((site) => {
            const siteAgents = agents.filter(
              (a) => a.assignedSite === site.siteName || (a as any).siteId === site.id
            );
            const badge = getStatusBadgeStyle(site.status);
            const isExpanded = expandedSiteId === site.id;

            return (
              <div key={site.id} className="ssv-site-card">
                {/* Header */}
                <div className="ssv-site-card-header">
                  <div className="ssv-code-badge-wrap">
                    <span className="ssv-site-code">{site.siteCode || `SITE-${site.id}`}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <select
                      className="ssv-quick-status-select"
                      value={(site.status || 'ACTIVE').toUpperCase()}
                      disabled={updatingStatusSiteId === site.id}
                      onChange={(e) => handleStatusChange(site.id, e.target.value)}
                      style={{
                        backgroundColor: badge.bg,
                        color: badge.color,
                        borderColor: badge.border
                      }}
                      title="Quick Change Site Status"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="ON_HOLD">On Hold</option>
                    </select>

                    {/* 3-Dots Action Menu Dropdown */}
                    <div className="ssv-action-menu-wrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="ssv-action-dots-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDropdownSiteId(openDropdownSiteId === site.id ? null : site.id);
                        }}
                        title="Site Actions"
                      >
                        <MoreVertical size={16} />
                      </button>

                      {openDropdownSiteId === site.id && (
                        <div className="ssv-dropdown-menu animate-fade-in" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            className="ssv-dropdown-item"
                            onClick={() => {
                              setOpenDropdownSiteId(null);
                              setAssigningSiteModal(site);
                            }}
                          >
                            <UserPlus size={14} color="#2563EB" />
                            <span>Assign Field Agent</span>
                          </button>

                          <button
                            type="button"
                            className="ssv-dropdown-item"
                            onClick={() => {
                              setOpenDropdownSiteId(null);
                              setExpandedSiteId(isExpanded ? null : site.id);
                            }}
                          >
                            <Users size={14} color="#059669" />
                            <span>{isExpanded ? 'Hide Supervisors' : 'View Supervisors'}</span>
                          </button>

                          <div className="ssv-dropdown-divider" />

                          <button
                            type="button"
                            className="ssv-dropdown-item is-danger"
                            onClick={() => {
                              setOpenDropdownSiteId(null);
                              setDeletingSite(site);
                            }}
                          >
                            <Trash2 size={14} color="#DC2626" />
                            <span>Delete Working Site</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Site Title & Company */}
                <h3 className="ssv-site-name">{site.siteName}</h3>
                <p className="ssv-site-company">{site.companyName || 'Labor Union Project'}</p>

                {/* Meta details list */}
                <div className="ssv-site-meta-list">
                  <div className="ssv-meta-row">
                    <MapPin size={14} color="#64748B" />
                    <span>
                      {site.city}
                      {site.state ? `, ${site.state}` : ''}
                    </span>
                  </div>

                  <div className="ssv-meta-row">
                    <Users size={14} color="#2563EB" />
                    <span style={{ fontWeight: 600 }}>
                      {siteAgents.length} Supervisors Assigned • {site.totalWorkers} Workers
                    </span>
                  </div>
                </div>

                {/* Expandable Supervisors List */}
                {isExpanded && (
                  <div className="ssv-expanded-supervisors-box animate-fade-in">
                    <div className="ssv-supervisors-header">
                      <span>Assigned Supervisors ({siteAgents.length})</span>
                      <button
                        type="button"
                        className="ssv-close-expand-btn"
                        onClick={() => setExpandedSiteId(null)}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    {siteAgents.length > 0 ? (
                      <div className="ssv-supervisors-list">
                        {siteAgents.map((agent) => (
                          <div key={agent.id} className="ssv-supervisor-chip">
                            <div className="ssv-sup-info">
                              <span className="ssv-sup-name">{agent.name}</span>
                              <span className="ssv-sup-code">{agent.employeeCode}</span>
                            </div>
                            <button
                              type="button"
                              className="ssv-remove-sup-btn"
                              disabled={unassigningAgentId === agent.id}
                              onClick={() => handleUnassignAgent(agent.id, agent.name)}
                              title="Unassign supervisor from site"
                            >
                              {unassigningAgentId === agent.id ? (
                                <Loader2 size={11} className="spinner" />
                              ) : (
                                <UserX size={12} />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="ssv-no-sup-text">No field supervisors assigned to this site yet.</p>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="ssv-card-footer">
                  <button
                    type="button"
                    className="ssv-assign-agent-btn"
                    onClick={() => setAssigningSiteModal(site)}
                  >
                    <UserPlus size={14} />
                    <span>Assign Agent</span>
                  </button>

                  <button
                    type="button"
                    className="ssv-toggle-sup-btn"
                    onClick={() => setExpandedSiteId(isExpanded ? null : site.id)}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{isExpanded ? 'Hide' : `Agents (${siteAgents.length})`}</span>
                  </button>

                  <button
                    type="button"
                    className="ssv-delete-quick-btn"
                    onClick={() => setDeletingSite(site)}
                    title="Delete Working Site"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Delete Working Site Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingSite)}
        onClose={() => setDeletingSite(null)}
        onConfirm={handleDeleteSiteConfirm}
        isDeleting={isSubmittingDelete}
        title="Delete Working Site"
        itemType="custom"
        itemName={deletingSite?.siteName || 'Working Site'}
        itemCode={deletingSite?.siteCode || (deletingSite?.id ? `SITE-${deletingSite.id}` : undefined)}
        itemRole={deletingSite?.companyName || 'Industrial Construction Site'}
        itemEmail={deletingSite?.city ? `Location: ${deletingSite.city}${deletingSite.state ? ', ' + deletingSite.state : ''}` : undefined}
        itemPhone={deletingSite?.totalWorkers !== undefined ? `${deletingSite.totalWorkers} Workers Registered` : undefined}
        warningNote="All assigned field supervisors and registered workers will be unlinked from this site. Working site attendances and historical payments will be preserved. This action cannot be undone."
        confirmButtonText="Delete Working Site"
      />

      {/* 6. Assign Field Agent Modal */}
      {assigningSiteModal && (
        <div className="ssv-modal-backdrop animate-fade-in" onClick={() => !isSubmittingAssign && setAssigningSiteModal(null)}>
          <div className="ssv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ssv-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="ssv-modal-icon-wrap">
                  <UserPlus size={18} color="#2563EB" />
                </div>
                <div>
                  <h3>Assign Field Agent</h3>
                  <p>{assigningSiteModal.siteName} ({assigningSiteModal.siteCode})</p>
                </div>
              </div>
              <button
                type="button"
                className="ssv-modal-close-btn"
                onClick={() => setAssigningSiteModal(null)}
                disabled={isSubmittingAssign}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAssignAgentSubmit} className="ssv-modal-form">
              <div className="ssv-form-group">
                <label>Select Field Agent *</label>
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  required
                >
                  <option value="">-- Choose Field Agent --</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.employeeCode || `AGT-${agent.id}`}) — {agent.assignedSite || 'No Site'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ssv-form-grid-2">
                <div className="ssv-form-group">
                  <label>Assignment Duration (Days)</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="ssv-form-group">
                  <label>Workers Quota Needed</label>
                  <input
                    type="number"
                    min={1}
                    value={workersNeeded}
                    onChange={(e) => setWorkersNeeded(Number(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="ssv-form-group">
                <label>Start Assignment Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              </div>

              <div className="ssv-modal-footer">
                <button
                  type="button"
                  className="ssv-modal-cancel-btn"
                  onClick={() => setAssigningSiteModal(null)}
                  disabled={isSubmittingAssign}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ssv-modal-submit-btn"
                  disabled={isSubmittingAssign || !selectedAgentId}
                >
                  {isSubmittingAssign ? <Loader2 size={16} className="spinner" /> : <UserCheck size={16} />}
                  <span>{isSubmittingAssign ? 'Assigning...' : 'Confirm Assignment'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Local Create Working Site Modal */}
      {isLocalCreateSiteOpen && (
        <div className="ssv-modal-backdrop animate-fade-in" onClick={() => !isCreatingSite && setIsLocalCreateSiteOpen(false)}>
          <div className="ssv-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="ssv-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="ssv-modal-icon-wrap" style={{ background: '#ECFDF5', borderColor: '#A7F3D0' }}>
                  <Building2 size={18} color="#059669" />
                </div>
                <div>
                  <h3>Register Working Site</h3>
                  <p>Add a new commercial or industrial construction project</p>
                </div>
              </div>
              <button
                type="button"
                className="ssv-modal-close-btn"
                onClick={() => setIsLocalCreateSiteOpen(false)}
                disabled={isCreatingSite}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSiteSubmit} className="ssv-modal-form">
              <div className="ssv-form-group">
                <label>Site Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Metro Line 3 Extension Project"
                  value={newSiteName}
                  onChange={(e) => setNewSiteName(e.target.value)}
                  required
                />
              </div>

              <div className="ssv-form-group">
                <label>Company / Contractor Name</label>
                <input
                  type="text"
                  placeholder="e.g. L&T Construction Ltd"
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                />
              </div>

              <div className="ssv-form-grid-2">
                <div className="ssv-form-group">
                  <label>City *</label>
                  <input
                    type="text"
                    placeholder="e.g. Mumbai"
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    required
                  />
                </div>

                <div className="ssv-form-group">
                  <label>State</label>
                  <input
                    type="text"
                    placeholder="e.g. Maharashtra"
                    value={newState}
                    onChange={(e) => setNewState(e.target.value)}
                  />
                </div>
              </div>

              <div className="ssv-form-grid-2">
                <div className="ssv-form-group">
                  <label>Pincode</label>
                  <input
                    type="text"
                    placeholder="400001"
                    value={newPincode}
                    onChange={(e) => setNewPincode(e.target.value)}
                  />
                </div>

                <div className="ssv-form-group">
                  <label>Initial Status</label>
                  <select
                    value={newSiteStatus}
                    onChange={(e) => setNewSiteStatus(e.target.value)}
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>

              <div className="ssv-form-group">
                <label>Site Location Address</label>
                <input
                  type="text"
                  placeholder="Plot 45, MIDC Industrial Area"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                />
              </div>

              <div className="ssv-form-grid-2">
                <div className="ssv-form-group">
                  <label>Contact Person</label>
                  <input
                    type="text"
                    placeholder="Supervisor / Engineer Name"
                    value={newContactPerson}
                    onChange={(e) => setNewContactPerson(e.target.value)}
                  />
                </div>

                <div className="ssv-form-group">
                  <label>Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 9876543210"
                    value={newContactNumber}
                    onChange={(e) => setNewContactNumber(e.target.value)}
                  />
                </div>
              </div>

              <div className="ssv-modal-footer">
                <button
                  type="button"
                  className="ssv-modal-cancel-btn"
                  onClick={() => setIsLocalCreateSiteOpen(false)}
                  disabled={isCreatingSite}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ssv-modal-submit-btn"
                  disabled={isCreatingSite || !newSiteName.trim()}
                  style={{ backgroundColor: '#059669' }}
                >
                  {isCreatingSite ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
                  <span>{isCreatingSite ? 'Creating Site...' : 'Create Working Site'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
