import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit2,
  Trash2,
  Info,
  MoreVertical,
  ExternalLink,
  Building2,
  Users,
  Phone,
  Mail,
  UserCheck,
  ShieldAlert,
  Loader2,
  X
} from 'lucide-react';
import {
  fetchAgentsApi,
  fetchWorkersApi,
  fetchSitesApi,
  deleteUserApi,
  updateUserApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { AgentItem, WorkerItem, SiteItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { AgentDetailsView } from '../components/AgentDetailsView';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface AgentsPageProps {
  onOpenModal: (type: string) => void;
  onOpenAssignModal?: (agentId: string, agentName: string) => void;
  refreshTrigger?: number;
}

const PRESET_FILTERS = [
  { key: 'ALL', label: 'All Agents' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'INACTIVE', label: 'Inactive' }
];

export const AgentsPage: React.FC<AgentsPageProps> = ({
  onOpenModal,
  refreshTrigger
}) => {
  // Core Data States
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [activePreset, setActivePreset] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Selected Agent View State (For Full Details & Attendance Calendar)
  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);

  // 3-Dots Action Dropdown State
  const [openDropdownId, setOpenDropdownId] = useState<string | number | null>(null);

  useEffect(() => {
    const handleDocumentClick = () => setOpenDropdownId(null);
    window.addEventListener('click', handleDocumentClick);
    return () => window.removeEventListener('click', handleDocumentClick);
  }, []);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Edit & Delete Modals State
  const [editingAgent, setEditingAgent] = useState<AgentItem | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<AgentItem | null>(null);
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

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [agentsData, workersData, sitesData] = await Promise.all([
        fetchAgentsApi().catch(() => []),
        fetchWorkersApi().catch(() => []),
        fetchSitesApi().catch(() => [])
      ]);

      // Strictly only Field Agents (exclude Customer Support Agents with CSA- or support designation)
      const fieldAgentsOnly = (agentsData || []).filter((a: any) => {
        const code = String(a.employeeCode || '').toUpperCase();
        const role = String(a.role || '').toUpperCase();
        const des = String(a.designation || '').toLowerCase();
        if (code.startsWith('CSA') || role === 'CUSTOMER_SUPPORT' || role === 'SUPPORT_AGENT' || des.includes('support')) {
          return false;
        }
        return true;
      });

      setAgents(fieldAgentsOnly);
      setWorkers(workersData || []);
      setSites(sitesData || []);

      // If an agent is selected, keep their state updated
      if (selectedAgent) {
        const updated = fieldAgentsOnly.find((a: any) => String(a.id) === String(selectedAgent.id));
        if (updated) setSelectedAgent(updated);
      }
    } catch (err) {
      console.error('Failed to load agents directory data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleRefresh = () => {
      loadData();
    };

    socket.on('agent:created', handleRefresh);
    socket.on('agent:updated', handleRefresh);
    socket.on('agent:deleted', handleRefresh);
    socket.on('user:created', handleRefresh);
    socket.on('user:updated', handleRefresh);
    socket.on('user:deleted', handleRefresh);
    socket.on('notification', handleRefresh);

    return () => {
      socket.off('agent:created', handleRefresh);
      socket.off('agent:updated', handleRefresh);
      socket.off('agent:deleted', handleRefresh);
      socket.off('user:created', handleRefresh);
      socket.off('user:updated', handleRefresh);
      socket.off('user:deleted', handleRefresh);
      socket.off('notification', handleRefresh);
    };
  }, [refreshTrigger]);

  const handleOpenEditModal = (agent: AgentItem) => {
    setEditingAgent(agent);
    setEditFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      siteId: (agent as any).siteId ? String((agent as any).siteId) : '',
      status: (agent as any).status || 'Active'
    });
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
      setToastMessage(`Agent "${deletingAgent.name}" deleted successfully.`);
      setTimeout(() => setToastMessage(null), 3500);
      setDeletingAgent(null);
      if (selectedAgent && String(selectedAgent.id) === String(deletingAgent.id)) {
        setSelectedAgent(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete agent.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Filter Agents
  const filteredAgents = agents.filter((agent) => {
    const code = String(agent.employeeCode || '').toUpperCase();
    const role = String((agent as any).role || '').toUpperCase();
    const des = String((agent as any).designation || '').toLowerCase();

    // Strictly exclude Customer Support Agents (CSA-*)
    if (code.startsWith('CSA') || role === 'CUSTOMER_SUPPORT' || role === 'SUPPORT_AGENT' || des.includes('support')) {
      return false;
    }

    const aStatus = (agent as any).status || 'Active';

    // Preset status filter
    if (activePreset === 'ACTIVE' && (aStatus === 'Inactive' || aStatus === 'INACTIVE')) return false;
    if (activePreset === 'INACTIVE' && aStatus !== 'Inactive' && aStatus !== 'INACTIVE') return false;

    // Site filter
    if (siteFilter !== 'ALL') {
      const aSite = typeof (agent as any).site === 'string' ? (agent as any).site : (agent as any)?.site?.siteName || agent.assignedSite;
      if (aSite !== siteFilter) return false;
    }

    // Search query
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const name = (agent.name || '').toLowerCase();
      const code = (agent.employeeCode || '').toLowerCase();
      const email = (agent.email || '').toLowerCase();
      const phone = (agent.phone || '').toLowerCase();
      const siteName = (typeof (agent as any).site === 'string' ? (agent as any).site : (agent as any)?.site?.siteName || agent.assignedSite || '').toLowerCase();

      if (!name.includes(q) && !code.includes(q) && !email.includes(q) && !phone.includes(q) && !siteName.includes(q)) {
        return false;
      }
    }

    return true;
  });

  // Calculate Summary Metrics
  const totalAgents = agents.length;
  const activeCount = agents.filter((a) => (a as any).status !== 'Inactive' && (a as any).status !== 'INACTIVE').length;
  const inactiveCount = agents.filter((a) => (a as any).status === 'Inactive' || (a as any).status === 'INACTIVE').length;
  const assignedSitesCount = new Set(agents.map((a) => (typeof (a as any).site === 'string' ? (a as any).site : (a as any)?.site?.siteName || a.assignedSite)).filter(Boolean)).size;

  // Pagination Math
  const totalItems = filteredAgents.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedAgents = filteredAgents.slice(startIndex, endIndex);

  // Helper to count workers assigned to this agent
  const getAgentWorkerCount = (agentId: string | number) => {
    return workers.filter(
      (w: any) =>
        String(w.assignedAgentId) === String(agentId) ||
        String(w.agentId) === String(agentId) ||
        String(w.agent?.id) === String(agentId)
    ).length;
  };

  // If viewing single agent details, render the AgentDetailsView component
  if (selectedAgent) {
    return (
      <div className="page-wrapper animate-fade-in">
        <AgentDetailsView
          agent={selectedAgent}
          onBack={() => setSelectedAgent(null)}
          allSites={sites}
          onEditAgent={handleOpenEditModal}
        />

        {/* Edit Modal */}
        {editingAgent && (
          <div className="header-modal-overlay animate-fade-in" onClick={() => setEditingAgent(null)}>
            <div className="header-modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="header-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Edit2 size={18} color="#2563EB" />
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Edit Agent Details</h3>
                </div>
                <button type="button" className="header-modal-close" onClick={() => setEditingAgent(null)}>
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSaveEditAgent} className="header-modal-body">
                <div className="form-group">
                  <label>Agent Name</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    type="email"
                    required
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Assigned Working Site</label>
                  <select
                    value={editFormData.siteId}
                    onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                  >
                    <option value="">No Site Assigned</option>
                    {sites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName} ({(s as any).location || `${s.city}, ${s.state}`})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Account Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                <div className="header-modal-footer">
                  <button type="button" className="list-btn list-btn-outline" onClick={() => setEditingAgent(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="list-btn list-btn-primary" disabled={isSubmittingEdit}>
                    {isSubmittingEdit ? <Loader2 size={15} className="spinner" /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="table-toast-banner animate-fade-in" style={{ backgroundColor: '#10B981', color: '#fff', padding: '12px 18px', borderRadius: '10px', marginBottom: '16px', fontWeight: 600, fontSize: '13px' }}>
          {toastMessage}
        </div>
      )}

      {/* Standardized Header */}
      <ListHeader
        title="Field Agents Directory"
        subtitle="Manage field agents, site allocations, and workforce supervision."
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search agents by name, ID, site, or contact..."
        filterOptions={PRESET_FILTERS}
        activeFilter={activePreset}
        onFilterSelect={(k) => setActivePreset(k as any)}
        primaryActionLabel="Add Agent"
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={() => onOpenModal('agent')}
        customFilters={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={14} color="#64748B" />
            <select
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="list-select-filter"
            >
              <option value="ALL">All Working Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.siteName}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
        }
      />

      {/* Metric Cards Row */}
      <div className="responsive-metrics-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Total Agents</span>
            <Users size={18} className="text-blue" />
          </div>
          <span className="stat-number">{totalAgents}</span>
          <span className="stat-sub">Registered Field Officers</span>
        </div>

        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Active Agents</span>
            <UserCheck size={18} className="text-green" />
          </div>
          <span className="stat-number">{activeCount}</span>
          <span className="stat-sub">On Duty Supervision</span>
        </div>

        <div className="stat-box-card border-amber">
          <div className="stat-header">
            <span>Working Sites</span>
            <Building2 size={18} className="text-amber" />
          </div>
          <span className="stat-number">{assignedSitesCount}</span>
          <span className="stat-sub">Active Project Locations</span>
        </div>

        <div className="stat-box-card border-purple">
          <div className="stat-header">
            <span>Inactive Agents</span>
            <ShieldAlert size={18} className="text-purple" />
          </div>
          <span className="stat-number">{inactiveCount}</span>
          <span className="stat-sub">Suspended or Off-duty</span>
        </div>
      </div>

      {isLoading ? (
        <ListLoadingState message="Loading field agents directory..." rows={6} />
      ) : filteredAgents.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm || siteFilter !== 'ALL' || activePreset !== 'ALL')}
          onClearFilters={() => {
            setSearchTerm('');
            setSiteFilter('ALL');
            setActivePreset('ALL');
          }}
          primaryActionLabel="Add Agent"
          onPrimaryAction={() => onOpenModal('agent')}
        />
      ) : (
        <>
          {/* DESKTOP & TABLET TABLE VIEW (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Agent Name</th>
                      <th>Employee ID</th>
                      <th>Contact Info</th>
                      <th>Assigned Site</th>
                      <th>Assigned Workers</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedAgents.map((agent) => {
                      const siteName =
                        typeof (agent as any).site === 'string'
                          ? (agent as any).site
                          : (agent as any)?.site?.siteName || agent.assignedSite || 'No Site Assigned';
                      const workerCount = getAgentWorkerCount(agent.id);

                      return (
                        <tr key={agent.id}>
                          <td>
                            <div className="table-user-cell">
                              <UserAvatar
                                src={(agent as any).profileImage || agent.avatar}
                                name={agent.name}
                                size={36}
                              />
                              <div className="table-user-meta">
                                <span className="table-user-name">{agent.name}</span>
                                <span className="table-user-sub">Field Agent</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="table-code-badge">{agent.employeeCode || `AGT-${agent.id}`}</span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '12px' }}>
                              {agent.phone && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#475569' }}>
                                  <Phone size={11} color="#64748B" /> {agent.phone}
                                </span>
                              )}
                              {agent.email && (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748B' }}>
                                  <Mail size={11} color="#94A3B8" /> {agent.email}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                              <Building2 size={14} color="#3B82F6" />
                              <span>{siteName}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '3px 8px',
                                borderRadius: '6px',
                                backgroundColor: '#EFF6FF',
                                color: '#2563EB',
                                fontSize: '12px',
                                fontWeight: 700,
                                border: '1px solid #BFDBFE'
                              }}
                            >
                              <Users size={12} />
                              <span>{workerCount} Workers</span>
                            </span>
                          </td>
                          <td>
                            <StatusBadge status={(agent as any).status || 'Active'} />
                          </td>
                          <td>
                            <div className="table-action-dropdown-wrap">
                              <button
                                type="button"
                                className="table-action-dots-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdownId(openDropdownId === agent.id ? null : agent.id);
                                }}
                                title="Action Menu"
                              >
                                <MoreVertical size={16} />
                              </button>

                              {openDropdownId === agent.id && (
                                <div className="table-action-dropdown animate-fade-in" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    className="table-action-dropdown-item"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setSelectedAgent(agent);
                                    }}
                                  >
                                    <ExternalLink size={14} color="#2563EB" />
                                    <span>View Profile</span>
                                  </button>

                                  <button
                                    type="button"
                                    className="table-action-dropdown-item"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      handleOpenEditModal(agent);
                                    }}
                                  >
                                    <Edit2 size={14} color="#475569" />
                                    <span>Edit Agent</span>
                                  </button>

                                  <div className="table-action-dropdown-divider" />

                                  <button
                                    type="button"
                                    className="table-action-dropdown-item is-danger"
                                    onClick={() => {
                                      setOpenDropdownId(null);
                                      setDeletingAgent(agent);
                                    }}
                                  >
                                    <Trash2 size={14} color="#DC2626" />
                                    <span>Delete Agent</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedAgents.map((agent) => {
              const siteName =
                typeof (agent as any).site === 'string'
                  ? (agent as any).site
                  : (agent as any)?.site?.siteName || agent.assignedSite || 'No Site Assigned';
              const workerCount = getAgentWorkerCount(agent.id);

              return (
                <MobileListCard
                  key={agent.id}
                  avatarName={agent.name}
                  avatarImage={(agent as any).profileImage || agent.avatar}
                  title={agent.name}
                  subtitle={`ID: ${agent.employeeCode || `AGT-${agent.id}`}`}
                  status={(agent as any).status || 'Active'}
                  metaRows={[
                    {
                      label: 'Assigned Site',
                      value: siteName,
                      icon: <Building2 size={13} color="#3B82F6" />
                    },
                    {
                      label: 'Workers',
                      value: `${workerCount} Assigned Members`,
                      icon: <Users size={13} color="#2563EB" />
                    },
                    {
                      label: 'Phone',
                      value: agent.phone || '—',
                      icon: <Phone size={13} color="#64748B" />
                    }
                  ]}
                  primaryAction={{
                    label: 'View Details & Calendar',
                    icon: <Info size={14} />,
                    onClick: () => setSelectedAgent(agent),
                    variant: 'primary'
                  }}
                  secondaryActions={[
                    {
                      label: 'Edit Agent',
                      icon: <Edit2 size={14} />,
                      onClick: () => handleOpenEditModal(agent)
                    },
                    {
                      label: 'Delete',
                      icon: <Trash2 size={14} />,
                      variant: 'danger',
                      onClick: () => setDeletingAgent(agent)
                    }
                  ]}
                />
              );
            })}
          </div>

          {/* Responsive Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}

      {/* Edit Agent Modal */}
      {editingAgent && (
        <div className="header-modal-overlay animate-fade-in" onClick={() => setEditingAgent(null)}>
          <div className="header-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="header-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Edit2 size={18} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800 }}>Edit Agent Details</h3>
              </div>
              <button type="button" className="header-modal-close" onClick={() => setEditingAgent(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditAgent} className="header-modal-body">
              <div className="form-group">
                <label>Agent Name</label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email"
                  required
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="text"
                  value={editFormData.phone}
                  onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Assigned Working Site</label>
                <select
                  value={editFormData.siteId}
                  onChange={(e) => setEditFormData({ ...editFormData, siteId: e.target.value })}
                >
                  <option value="">No Site Assigned</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName} ({(s as any).location || `${s.city}, ${s.state}`})
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Account Status</label>
                <select
                  value={editFormData.status}
                  onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="header-modal-footer">
                <button type="button" className="list-btn list-btn-outline" onClick={() => setEditingAgent(null)}>
                  Cancel
                </button>
                <button type="submit" className="list-btn list-btn-primary" disabled={isSubmittingEdit}>
                  {isSubmittingEdit ? <Loader2 size={15} className="spinner" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingAgent && (
        <div className="header-modal-overlay animate-fade-in" onClick={() => setDeletingAgent(null)}>
          <div className="header-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="header-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={18} color="#EF4444" />
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#991B1B' }}>Delete Agent</h3>
              </div>
              <button type="button" className="header-modal-close" onClick={() => setDeletingAgent(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="header-modal-body">
              <p style={{ fontSize: '14px', color: '#475569', margin: 0 }}>
                Are you sure you want to delete <strong>{deletingAgent.name}</strong> ({deletingAgent.employeeCode || `AGT-${deletingAgent.id}`})?
              </p>
              <p style={{ fontSize: '12px', color: '#DC2626', margin: '6px 0 0 0' }}>
                Workers currently assigned to this agent will be set to unassigned.
              </p>

              <div className="header-modal-footer" style={{ marginTop: '16px' }}>
                <button type="button" className="list-btn list-btn-outline" onClick={() => setDeletingAgent(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="list-btn list-btn-danger"
                  style={{ backgroundColor: '#DC2626', color: '#fff' }}
                  onClick={handleDeleteAgentConfirm}
                  disabled={isSubmittingDelete}
                >
                  {isSubmittingDelete ? <Loader2 size={15} className="spinner" /> : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
