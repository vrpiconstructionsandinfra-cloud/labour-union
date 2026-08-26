import React, { useState, useEffect } from 'react';
import { Plus, Search, MapPin, Users, ChevronDown, ChevronUp, UserX, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchSitesApi, fetchAgentsApi, removeAgentFromSiteApi, updateSiteApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { SiteItem, AgentItem } from '../types';
import './Pages.css';

interface SitesPageProps {
  onOpenModal: (type: string) => void;
  onOpenAssignAgentModal?: (siteId: string, siteName: string) => void;
  refreshTrigger?: number;
}

export const SitesPage: React.FC<SitesPageProps> = ({
  onOpenModal,
  onOpenAssignAgentModal,
  refreshTrigger
}) => {
  const { user, role } = useAuth();
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedSiteId, setExpandedSiteId] = useState<string | null>(null);
  const [unassigningAgentId, setUnassigningAgentId] = useState<string | null>(null);
  const [updatingStatusSiteId, setUpdatingStatusSiteId] = useState<string | null>(null);

  const isAgentRole = role === 'AGENT';

  const loadData = () => {
    fetchSitesApi().then(setSites).catch(() => {});
    fetchAgentsApi().then(setAgents).catch(() => {});
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

    const matchesSearch =
      s.siteName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.siteCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.city.toLowerCase().includes(searchTerm.toLowerCase());

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

  const renderStatusControls = (statusStr: string, siteId: string) => {
    const s = (statusStr || 'IN_PROGRESS').toUpperCase();
    let badgeBg = '#2563EB';
    let label = 'IN PROGRESS';

    if (s === 'COMPLETED') {
      badgeBg = '#059669';
      label = 'COMPLETED';
    } else if (s === 'ACTIVE') {
      badgeBg = '#10B981';
      label = 'ACTIVE';
    } else if (s === 'ON_HOLD' || s === 'ON HOLD') {
      badgeBg = '#D97706';
      label = 'ON HOLD';
    }

    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            backgroundColor: badgeBg,
            color: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            textTransform: 'uppercase'
          }}
        >
          {label}
        </span>

        <select
          value={s}
          disabled={updatingStatusSiteId === siteId}
          onChange={(e) => handleStatusChange(siteId, e.target.value)}
          title="Change Site Status"
          style={{
            backgroundColor: 'var(--bg-main, #F1F5F9)',
            color: 'var(--text-primary, #0F172A)',
            border: '1px solid var(--border-color, #CBD5E1)',
            borderRadius: '6px',
            padding: '4px 8px',
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
    );
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>{isAgentRole ? 'Assigned Working Sites' : 'Site Management'}</h2>
          <p>
            {isAgentRole
              ? 'View working sites assigned under your field agent supervision and edit site status.'
              : 'Create and monitor active working sites, assign agents, and track workforce deployment.'}
          </p>
        </div>
        {!isAgentRole && (
          <button className="primary-btn" onClick={() => onOpenModal('add_site')}>
            <Plus size={16} />
            <span>Add New Site</span>
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search by site name, code, or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select-dropdown"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Statuses</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="ACTIVE">Active</option>
          <option value="ON_HOLD">On Hold</option>
        </select>
      </div>

      <div className="cards-grid-3">
        {filteredSites.length > 0 ? (
          filteredSites.map((site) => {
            const siteAgents = agents.filter(
              (a) => a.assignedSite === site.siteName || (a as any).siteId === site.id
            );
            const isExpanded = expandedSiteId === site.id;
            const isAssignedToMe = isSiteAssignedToAgent(site);

            return (
              <div key={site.id} className="module-card" style={isAssignedToMe ? { border: '2px solid #2563EB' } : undefined}>
                <div className="card-badge-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="code-badge">{site.siteCode}</span>
                    {isAssignedToMe && (
                      <span className="badge badge-approved" style={{ backgroundColor: '#2563EB', color: '#FFFFFF', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '6px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={12} /> Assigned to You
                      </span>
                    )}
                  </div>
                  {renderStatusControls(site.status, site.id)}
                </div>
              <h3 className="card-main-title">{site.siteName}</h3>
              <p className="card-sub-info">{site.companyName}</p>

              <div className="card-info-list">
                <div className="info-row">
                  <MapPin size={15} />
                  <span>{site.city}, {site.state}</span>
                </div>
                <div className="info-row">
                  <Users size={15} />
                  <span>{siteAgents.length || site.assignedAgents} Agents Assigned • {site.totalWorkers} Workers</span>
                </div>
              </div>

              <div className="card-footer-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  className="secondary-btn"
                  onClick={() => {
                    if (onOpenAssignAgentModal) {
                      onOpenAssignAgentModal(site.id, site.siteName);
                    } else {
                      onOpenModal('assign_agent');
                    }
                  }}
                >
                  Assign Agent
                </button>
                <button
                  className="secondary-btn"
                  style={{ backgroundColor: '#F1F5F9', color: '#334155' }}
                  onClick={() => toggleExpand(site.id)}
                >
                  {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  <span>{isExpanded ? 'Hide Agents' : 'View Assigned Agents'}</span>
                </button>
              </div>

              {isExpanded && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', padding: '10px 12px', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '12.5px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>Assigned Field Agents ({siteAgents.length})</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400 }}>{site.siteName}</span>
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
                            backgroundColor: 'var(--bg-card)',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-color)',
                            fontSize: '12px'
                          }}
                        >
                          <div>
                            <span className="user-name-bold" style={{ marginRight: '6px' }}>{a.name}</span>
                            <span className="code-badge" style={{ fontSize: '10px' }}>{a.employeeCode}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span className="badge badge-earned" style={{ fontSize: '10px', padding: '2px 6px' }}>{a.designation || 'Field Agent'}</span>
                            <button
                              className="text-action-btn"
                              style={{ color: '#DC2626', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                              disabled={unassigningAgentId === a.id}
                              onClick={() => handleUnassignAgent(a.id, a.name)}
                              title="Unassign agent from site"
                            >
                              {unassigningAgentId === a.id ? (
                                <Loader2 size={12} className="spinner" />
                              ) : (
                                <>
                                  <UserX size={12} />
                                  <span>Unassign</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0 }}>
                      No field agents currently assigned to this working site. Click "Assign Agent" to allocate a supervisor.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })
      ) : (
        <div style={{ gridColumn: '1 / -1', padding: '40px 20px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '16px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          <MapPin size={36} style={{ margin: '0 auto 12px', opacity: 0.7 }} />
          <h3 style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text-primary)', margin: '0 0 6px' }}>
            {isAgentRole ? 'No Assigned Sites Found' : 'No Working Sites Found'}
          </h3>
          <p style={{ fontSize: '13px', margin: 0 }}>
            {isAgentRole
              ? 'No working sites currently assigned under your field agent supervision.'
              : 'No sites match the current search or status filter.'}
          </p>
        </div>
      )}
      </div>
    </div>
  );
};
