import React, { useState, useEffect } from 'react';
import { Plus, MapPin, Users, ChevronDown, ChevronUp, UserX, Loader2, CheckCircle2, Building, UserPlus } from 'lucide-react';
import { fetchSitesApi, fetchAgentsApi, removeAgentFromSiteApi, updateSiteApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { SiteItem, AgentItem } from '../types';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
import './Pages.css';

interface SitesPageProps {
  onOpenModal: (type: string) => void;
  onOpenAssignAgentModal?: (siteId: string, siteName: string) => void;
  refreshTrigger?: number;
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'All Statuses' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
  { key: 'ACTIVE', label: 'Active' },
  { key: 'ON_HOLD', label: 'On Hold' }
];

export const SitesPage: React.FC<SitesPageProps> = ({
  onOpenModal,
  onOpenAssignAgentModal,
  refreshTrigger
}) => {
  const { user, role } = useAuth();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [unassigningAgentId, setUnassigningAgentId] = useState<string | null>(null);
  const [updatingStatusSiteId, setUpdatingStatusSiteId] = useState<string | null>(null);

  const isAgentRole = role === 'AGENT';

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      fetchSitesApi().catch(() => []),
      fetchAgentsApi().catch(() => [])
    ])
      .then(([sitesData, agentsData]) => {
        setSites(sitesData);
        setAgents(agentsData);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [refreshTrigger]);

  const handleStatusChange = async (siteId: string, newStatus: string) => {
    setUpdatingStatusSiteId(siteId);
    try {
      await updateSiteApi(siteId, { status: newStatus });
      setSites((prev) =>
        prev.map((s) => (s.id === siteId ? { ...s, status: newStatus } : s))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update site status');
    } finally {
      setUpdatingStatusSiteId(null);
    }
  };

  const handleUnassignAgent = async (agentId: string, agentName: string) => {
    if (!window.confirm(`Are you sure you want to remove agent "${agentName}" from this working site?`)) {
      return;
    }

    setUnassigningAgentId(agentId);
    try {
      await removeAgentFromSiteApi(agentId);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to unassign agent from site');
    } finally {
      setUnassigningAgentId(null);
    }
  };

  const isSiteAssignedToAgent = (site: SiteItem) => {
    const siteAgents = agents.filter(
      (a) => a.assignedSite === site.siteName || (a as any).siteId === site.id
    );
    return Boolean(
      user?.id &&
      (siteAgents.some((a) => String(a.id) === String(user.id) || a.name === user.name) ||
        (user as any)?.assignedSite === site.siteName ||
        String((user as any)?.siteId) === String(site.id))
    );
  };

  const filteredSites = sites.filter((s) => {
    if (isAgentRole && !isSiteAssignedToAgent(s)) {
      return false;
    }

    const term = searchTerm.toLowerCase();
    const matchesSearch =
      s.siteName.toLowerCase().includes(term) ||
      (s.siteCode || '').toLowerCase().includes(term) ||
      (s.city || '').toLowerCase().includes(term) ||
      (s.companyName || '').toLowerCase().includes(term);

    const normStatus = (s.status || 'IN_PROGRESS').toUpperCase();
    let matchesStatus = true;
    if (statusFilter === 'IN_PROGRESS') matchesStatus = normStatus === 'IN_PROGRESS' || normStatus === 'IN PROGRESS';
    else if (statusFilter === 'COMPLETED') matchesStatus = normStatus === 'COMPLETED';
    else if (statusFilter === 'ON_HOLD') matchesStatus = normStatus === 'ON_HOLD' || normStatus === 'ON HOLD';
    else if (statusFilter === 'ACTIVE') matchesStatus = normStatus === 'ACTIVE';

    return matchesSearch && matchesStatus;
  });

  const toggleExpand = (siteId: string) => {
    setExpandedSiteId((prev) => (prev === siteId ? null : siteId));
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title={isAgentRole ? 'Assigned Working Sites' : 'Working Sites Directory'}
        subtitle={
          isAgentRole
            ? 'View and manage working sites assigned under your field agent supervision.'
            : 'Enterprise catalog of active commercial and industrial construction sites.'
        }
        badgeCount={filteredSites.length}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search sites by name, code, or city..."
        filterOptions={STATUS_FILTERS}
        activeFilter={statusFilter}
        onFilterSelect={setStatusFilter}
        primaryActionLabel={!isAgentRole ? 'Create New Site' : undefined}
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={!isAgentRole ? () => onOpenModal('add_site') : undefined}
      />

      {isLoading ? (
        <ListLoadingState message="Loading working sites..." rows={4} />
      ) : filteredSites.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm || statusFilter !== 'ALL')}
          onClearFilters={() => {
            setSearchTerm('');
            setStatusFilter('ALL');
          }}
          primaryActionLabel={!isAgentRole ? 'Create Site' : undefined}
          onPrimaryAction={!isAgentRole ? () => onOpenModal('add_site') : undefined}
        />
      ) : (
        <>
          {/* DESKTOP & TABLET VIEW (Cards Grid on ≥ 768px) */}
          <div className="table-desktop-view">
            <div className="cards-grid-3">
              {filteredSites.map((site) => {
                const siteAgents = agents.filter(
                  (a) => a.assignedSite === site.siteName || (a as any).siteId === site.id
                );
                const isExpanded = expandedSiteId === site.id;
                const isAssignedToMe = isSiteAssignedToAgent(site);

                return (
                  <div
                    key={site.id}
                    className="module-card"
                    style={isAssignedToMe ? { border: '2px solid #2563EB' } : undefined}
                  >
                    <div
                      className="card-badge-header"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="code-badge">{site.siteCode || 'SITE'}</span>
                        {isAssignedToMe && (
                          <span
                            className="badge badge-approved"
                            style={{
                              backgroundColor: '#2563EB',
                              color: '#FFFFFF',
                              fontSize: '11px',
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: '6px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <CheckCircle2 size={12} /> Assigned to You
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <StatusBadge status={site.status || 'IN_PROGRESS'} size="sm" />
                        <select
                          value={(site.status || 'IN_PROGRESS').toUpperCase()}
                          disabled={updatingStatusSiteId === site.id}
                          onChange={(e) => handleStatusChange(site.id, e.target.value)}
                          title="Change Site Status"
                          style={{
                            backgroundColor: 'var(--bg-main, #F1F5F9)',
                            color: 'var(--text-primary, #0F172A)',
                            border: '1px solid var(--border-color, #CBD5E1)',
                            borderRadius: '6px',
                            padding: '3px 6px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          <option value="IN_PROGRESS">IN PROGRESS</option>
                          <option value="COMPLETED">COMPLETED</option>
                          <option value="ON_HOLD">ON HOLD</option>
                          <option value="ACTIVE">ACTIVE</option>
                        </select>
                      </div>
                    </div>

                    <h3 className="card-main-title" style={{ marginTop: '8px' }}>{site.siteName}</h3>
                    <p className="card-sub-info">{site.companyName || 'Labor Union Project'}</p>

                    <div className="card-info-list">
                      <div className="info-row">
                        <MapPin size={15} color="#64748B" />
                        <span>{site.city}{site.state ? `, ${site.state}` : ''}</span>
                      </div>
                      <div className="info-row">
                        <Users size={15} color="#2563EB" />
                        <span>{siteAgents.length || site.assignedAgents} Agents Assigned • {site.totalWorkers} Workers</span>
                      </div>
                    </div>

                    <div className="card-footer-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        className="list-btn list-btn-primary touch-target"
                        style={{ flex: 1, padding: '7px 12px', fontSize: '12.5px', justifyContent: 'center' }}
                        onClick={() => {
                          if (onOpenAssignAgentModal) {
                            onOpenAssignAgentModal(site.id, site.siteName);
                          } else {
                            onOpenModal('assign_agent');
                          }
                        }}
                      >
                        <UserPlus size={14} /> Assign Agent
                      </button>
                      <button
                        className="list-btn list-btn-outline touch-target"
                        style={{ padding: '7px 12px', fontSize: '12.5px' }}
                        onClick={() => toggleExpand(site.id)}
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        <span>{isExpanded ? 'Hide' : 'Agents'}</span>
                      </button>
                    </div>

                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '14px',
                          paddingTop: '12px',
                          borderTop: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main, #f8fafc)',
                          padding: '10px 12px',
                          borderRadius: '8px'
                        }}
                      >
                        <h4
                          style={{
                            fontSize: '12px',
                            fontWeight: 700,
                            marginBottom: '8px',
                            color: 'var(--text-primary)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span>Assigned Supervisors ({siteAgents.length})</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{site.siteCode}</span>
                        </h4>
                        {siteAgents.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {siteAgents.map((a) => (
                              <div
                                key={a.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  backgroundColor: 'var(--bg-card, #ffffff)',
                                  padding: '6px 10px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--border-color, #e2e8f0)',
                                  fontSize: '12px'
                                }}
                              >
                                <div>
                                  <span className="user-name-bold" style={{ marginRight: '6px' }}>{a.name}</span>
                                  <span className="code-badge" style={{ fontSize: '10px' }}>{a.employeeCode}</span>
                                </div>
                                <button
                                  className="list-btn touch-target"
                                  style={{
                                    padding: '2px 6px',
                                    fontSize: '11px',
                                    minHeight: '26px',
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FECACA'
                                  }}
                                  disabled={unassigningAgentId === a.id}
                                  onClick={() => handleUnassignAgent(a.id, a.name)}
                                  title="Unassign agent from site"
                                >
                                  {unassigningAgentId === a.id ? (
                                    <Loader2 size={12} className="spinner" />
                                  ) : (
                                    <>
                                      <UserX size={12} />
                                      <span>Remove</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ fontSize: '11.5px', color: 'var(--text-secondary)', margin: 0 }}>
                            No field agents assigned to this site yet.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* MOBILE VIEW (< 768px) */}
          <div className="card-mobile-view">
            {filteredSites.map((site) => {
              const siteAgents = agents.filter(
                (a) => a.assignedSite === site.siteName || (a as any).siteId === site.id
              );
              return (
                <MobileListCard
                  key={site.id}
                  icon={<Building size={20} />}
                  title={site.siteName}
                  subtitle={site.companyName || 'Labor Union Site'}
                  idBadge={site.siteCode || 'SITE'}
                  status={site.status || 'IN_PROGRESS'}
                  metaRows={[
                    {
                      label: 'Location',
                      value: `${site.city}${site.state ? `, ${site.state}` : ''}`,
                      icon: <MapPin size={13} color="#64748B" />
                    },
                    {
                      label: 'Workforce',
                      value: `${site.totalWorkers} Workers • ${siteAgents.length} Agents`,
                      icon: <Users size={13} color="#2563EB" />
                    }
                  ]}
                  expandableRows={siteAgents.map((a) => ({
                    label: `Agent ${a.employeeCode || ''}`,
                    value: a.name
                  }))}
                  primaryAction={{
                    label: 'Assign Agent',
                    icon: <UserPlus size={14} />,
                    onClick: () => {
                      if (onOpenAssignAgentModal) {
                        onOpenAssignAgentModal(site.id, site.siteName);
                      } else {
                        onOpenModal('assign_agent');
                      }
                    }
                  }}
                />
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
