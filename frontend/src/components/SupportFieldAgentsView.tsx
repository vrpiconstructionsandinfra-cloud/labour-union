import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchSupportFieldAgentsApi,
  assignAgentToBasketApi,
  unassignAgentFromBasketApi,
  assignSiteToAgentApi,
  updateSiteStatusApi,
  fetchSupportMessagesApi,
  sendSupportMessageApi,
  raiseTicketFromChatApi,
  fetchSitesApi,
  type SupportFieldAgentItem,
  type SupportAgentMessageItem,
} from '../services/api';
import { getSocket } from '../services/socket';
import {
  Users,
  Search,
  RefreshCw,
  Phone,
  Mail,
  MapPin,
  Building2,
  Calendar,
  Clock,
  UserCheck,
  Send,
  MessageSquare,
  ShieldAlert,
  Wrench,
  CheckCircle2,
  X,
  UserPlus,
  Briefcase
} from 'lucide-react';
import './SupportFieldAgentsView.css';

interface SupportFieldAgentsViewProps {
  onOpenRegisterModal?: () => void;
}

export const SupportFieldAgentsView: React.FC<SupportFieldAgentsViewProps> = ({
  onOpenRegisterModal
}) => {
  const { user } = useAuth();

  const [agents, setAgents] = useState<SupportFieldAgentItem[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterTab, setFilterTab] = useState<'ALL' | 'MY_BASKET' | 'ACTIVE_SITE' | 'UNASSIGNED'>('ALL');

  // Selected Agent for Details Drawer
  const [selectedAgent, setSelectedAgent] = useState<SupportFieldAgentItem | null>(null);

  // Assign Site Modal State
  const [siteModalAgent, setSiteModalAgent] = useState<SupportFieldAgentItem | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAssigningSite, setIsAssigningSite] = useState<boolean>(false);

  // Chat & Emergency Drawer State
  const [chatAgent, setChatAgent] = useState<SupportFieldAgentItem | null>(null);
  const [messages, setMessages] = useState<SupportAgentMessageItem[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessageType, setChatMessageType] = useState<'TEXT' | 'EQUIPMENT_REQUEST' | 'EMERGENCY'>('TEXT');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Raise Ticket Modal State inside Chat
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState<boolean>(false);
  const [ticketSubject, setTicketSubject] = useState<string>('');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<string>('HIGH');
  const [isRaisingTicket, setIsRaisingTicket] = useState<boolean>(false);

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      const [agentsData, sitesData] = await Promise.all([
        fetchSupportFieldAgentsApi().catch((e) => {
          console.error('fetchSupportFieldAgentsApi error:', e);
          return [];
        }),
        fetchSitesApi().catch((e) => {
          console.error('fetchSitesApi error:', e);
          return [];
        }),
      ]);
      setAgents(Array.isArray(agentsData) ? agentsData : []);
      setSites(Array.isArray(sitesData) ? sitesData : []);

      // If drawer is open, keep selectedAgent updated
      if (selectedAgent && Array.isArray(agentsData)) {
        const updated = agentsData.find((a) => a.id === selectedAgent.id);
        if (updated) setSelectedAgent(updated);
      }
    } catch (err) {
      console.error('Failed to load field agents:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Socket.io Real-Time Listener for Support Messages & Site Updates
  useEffect(() => {
    const socket = getSocket();
    const handleNewMessage = (msg: any) => {
      if (chatAgent && (msg.fieldAgentId === chatAgent.id || msg.senderId === chatAgent.id)) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('support_message', handleNewMessage);
    return () => {
      socket.off('support_message', handleNewMessage);
    };
  }, [chatAgent]);

  // Load chat messages when chat drawer opens
  useEffect(() => {
    if (chatAgent) {
      fetchSupportMessagesApi(chatAgent.id)
        .then((msgs) => setMessages(msgs))
        .catch(() => setMessages([]));
    }
  }, [chatAgent]);

  // Basket Claim / Unassign Handlers
  const handleToggleBasket = async (agent: SupportFieldAgentItem) => {
    try {
      if (agent.isInMyBasket) {
        await unassignAgentFromBasketApi(agent.id);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id ? { ...a, isInMyBasket: false, managedBySupportId: null, managedBySupport: null } : a
          )
        );
      } else {
        await assignAgentToBasketApi(agent.id);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agent.id
              ? {
                  ...a,
                  isInMyBasket: true,
                  managedBySupportId: user?.id ? Number(user.id) : null,
                  managedBySupport: { id: Number(user?.id) || 0, name: user?.name || 'Support Agent', employeeCode: 'CSA', email: user?.email }
                }
              : a
          )
        );
      }
    } catch (err: any) {
      alert(err.message || 'Failed to update basket status');
    }
  };

  // Submit Site Assignment
  const handleAssignSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!siteModalAgent || !selectedSiteId) return;

    setIsAssigningSite(true);
    try {
      await assignSiteToAgentApi(siteModalAgent.id, {
        siteId: selectedSiteId,
        durationDays,
        startDate,
      });
      await loadData();
      setSiteModalAgent(null);
      setSelectedSiteId('');
    } catch (err: any) {
      alert(err.message || 'Failed to assign site');
    } finally {
      setIsAssigningSite(false);
    }
  };

  // Site Status Change Handler
  const handleSiteStatusChange = async (siteId: number, newStatus: string) => {
    try {
      await updateSiteStatusApi(siteId, newStatus);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to update site status');
    }
  };

  // Send Chat Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatAgent || !chatInput.trim()) return;

    setIsSendingMessage(true);
    try {
      const msg = await sendSupportMessageApi({
        supportAgentId: user?.id ? Number(user.id) : undefined,
        fieldAgentId: chatAgent.id,
        message: chatInput.trim(),
        messageType: chatMessageType,
      });

      setMessages((prev) => [...prev, msg]);
      setChatInput('');
      setChatMessageType('TEXT');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Raise Ticket from Chat Handler
  const handleRaiseTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatAgent || !ticketSubject.trim() || !ticketDescription.trim()) return;

    setIsRaisingTicket(true);
    try {
      await raiseTicketFromChatApi({
        fieldAgentId: chatAgent.id,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        priority: ticketPriority,
      });

      // Reload chat messages to reflect the newly posted ticket message
      const updatedMsgs = await fetchSupportMessagesApi(chatAgent.id);
      setMessages(updatedMsgs);

      setIsRaiseTicketOpen(false);
      setTicketSubject('');
      setTicketDescription('');
      alert('Support ticket raised successfully and linked to this conversation!');
    } catch (err: any) {
      alert(err.message || 'Failed to raise support ticket');
    } finally {
      setIsRaisingTicket(false);
    }
  };

  // Filter Agents
  const filteredAgents = (agents || []).filter((agent) => {
    if (!agent) return false;
    const query = (searchQuery || '').toLowerCase().trim();
    const name = (agent.name || '').toLowerCase();
    const code = (agent.employeeCode || '').toLowerCase();
    const phone = (agent.phone || '');
    const address = (agent.address || '').toLowerCase();
    const siteName = (agent.currentSite?.siteName || '').toLowerCase();

    const matchesSearch =
      !query ||
      name.includes(query) ||
      code.includes(query) ||
      phone.includes(query) ||
      address.includes(query) ||
      siteName.includes(query);

    if (!matchesSearch) return false;

    if (filterTab === 'MY_BASKET') return Boolean(agent.isInMyBasket);
    if (filterTab === 'ACTIVE_SITE') return Boolean(agent.currentSite);
    if (filterTab === 'UNASSIGNED') return !agent.currentSite;
    return true;
  });

  // Metrics
  const totalAgents = (agents || []).length;
  const myBasketCount = (agents || []).filter((a) => a && a.isInMyBasket).length;
  const onSiteCount = (agents || []).filter((a) => a && a.currentSite).length;
  const unassignedCount = (agents || []).filter((a) => a && !a.currentSite).length;

  return (
    <div className="support-field-agents-container">
      {/* Top Header Row */}
      <div className="sfa-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="sfa-header-icon">
              <Users size={24} color="#2563EB" />
            </div>
            <div>
              <h1 className="sfa-page-title">Field Agent & Site Operations</h1>
              <p className="sfa-page-subtitle">
                Manage field agent allocations, claim agents to your basket, assign working sites with days, and coordinate live equipment requests.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {onOpenRegisterModal && (
            <button
              type="button"
              onClick={onOpenRegisterModal}
              className="sfa-add-agent-btn"
            >
              <UserPlus size={16} />
              <span>Register New Agent</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => loadData(true)}
            className="sfa-refresh-btn"
            disabled={isRefreshing}
            title="Refresh Agents List"
          >
            <RefreshCw size={16} className={isRefreshing ? 'spinner' : ''} />
            <span>Refresh Roster</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="sfa-metrics-grid">
        <div className="sfa-metric-card">
          <div className="sfa-metric-icon blue">
            <Users size={20} />
          </div>
          <div>
            <span className="sfa-metric-label">Total Field Agents</span>
            <h3 className="sfa-metric-value">{totalAgents}</h3>
          </div>
        </div>

        <div className="sfa-metric-card">
          <div className="sfa-metric-icon purple">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="sfa-metric-label">In My Basket</span>
            <h3 className="sfa-metric-value">{myBasketCount}</h3>
          </div>
        </div>

        <div className="sfa-metric-card">
          <div className="sfa-metric-icon green">
            <Building2 size={20} />
          </div>
          <div>
            <span className="sfa-metric-label">On Active Sites</span>
            <h3 className="sfa-metric-value">{onSiteCount}</h3>
          </div>
        </div>

        <div className="sfa-metric-card">
          <div className="sfa-metric-icon amber">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="sfa-metric-label">Unassigned / Standby</span>
            <h3 className="sfa-metric-value">{unassignedCount}</h3>
          </div>
        </div>
      </div>

      {/* Toolbar: Filter Tabs & Search */}
      <div className="sfa-toolbar">
        <div className="sfa-filter-tabs">
          <button
            type="button"
            className={`sfa-tab-btn ${filterTab === 'ALL' ? 'active' : ''}`}
            onClick={() => setFilterTab('ALL')}
          >
            All Agents ({totalAgents})
          </button>
          <button
            type="button"
            className={`sfa-tab-btn ${filterTab === 'MY_BASKET' ? 'active' : ''}`}
            onClick={() => setFilterTab('MY_BASKET')}
          >
            ⭐ My Basket ({myBasketCount})
          </button>
          <button
            type="button"
            className={`sfa-tab-btn ${filterTab === 'ACTIVE_SITE' ? 'active' : ''}`}
            onClick={() => setFilterTab('ACTIVE_SITE')}
          >
            🏗️ On Active Sites ({onSiteCount})
          </button>
          <button
            type="button"
            className={`sfa-tab-btn ${filterTab === 'UNASSIGNED' ? 'active' : ''}`}
            onClick={() => setFilterTab('UNASSIGNED')}
          >
            ⏳ Standby / Unassigned ({unassignedCount})
          </button>
        </div>

        <div className="sfa-search-box">
          <Search size={16} color="#64748B" />
          <input
            type="text"
            placeholder="Search by agent name, phone, address, site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Main Table Card */}
      <div className="sfa-table-card">
        {isLoading ? (
          <div className="sfa-state-box">
            <RefreshCw size={28} className="spinner" color="#2563EB" />
            <p>Loading field agents and site assignments...</p>
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="sfa-state-box">
            <Users size={44} color="#94A3B8" />
            <h3>No Field Agents Found</h3>
            <p>No agents match the selected filter criteria or search query.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="sfa-table">
              <thead>
                <tr>
                  <th>Field Agent</th>
                  <th>Contact Info</th>
                  <th>Residential Address</th>
                  <th>Assigned Site & Duration</th>
                  <th>Assigned Workers</th>
                  <th>Basket Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAgents.map((agent) => (
                  <tr key={agent.id} onClick={() => setSelectedAgent(agent)} style={{ cursor: 'pointer' }}>
                    {/* Agent Name & ID */}
                    <td>
                      <div className="sfa-agent-cell">
                        <div className="sfa-agent-avatar">
                          {agent.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="sfa-agent-name">{agent.name}</span>
                          <span className="sfa-agent-code">{agent.employeeCode}</span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="sfa-contact-cell">
                        {agent.phone ? (
                          <a href={`tel:${agent.phone}`} className="sfa-contact-link">
                            <Phone size={13} color="#2563EB" />
                            <span>{agent.phone}</span>
                          </a>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                        {agent.email && (
                          <a href={`mailto:${agent.email}`} className="sfa-email-link">
                            <Mail size={12} color="#64748B" />
                            <span>{agent.email}</span>
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Residential Address */}
                    <td>
                      {agent.address ? (
                        <div className="sfa-address-text" title={agent.address}>
                          <MapPin size={13} color="#64748B" style={{ flexShrink: 0 }} />
                          <span>{agent.address}</span>
                        </div>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>

                    {/* Assigned Site & Duration */}
                    <td onClick={(e) => e.stopPropagation()}>
                      {agent.currentSite ? (
                        <div className="sfa-site-cell">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={14} color="#059669" />
                            <strong style={{ color: '#0F172A', fontSize: '13px' }}>
                              {agent.currentSite.siteName}
                            </strong>
                          </div>
                          {agent.activeAssignment?.durationDays && (
                            <div className="sfa-duration-badge">
                              <Clock size={11} />
                              <span>{agent.activeAssignment.durationDays} Days allocated</span>
                              {agent.activeAssignment.remainingDays !== null && (
                                <span className="sfa-remaining-tag">
                                  ({agent.activeAssignment.remainingDays}d left)
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="sfa-unassigned-pill">Not Assigned</span>
                      )}
                    </td>

                    {/* Assigned Workers Count */}
                    <td>
                      <div className="sfa-workers-badge">
                        <UserCheck size={13} />
                        <span>{agent.workersCount} Workers</span>
                      </div>
                    </td>

                    {/* Basket Status */}
                    <td onClick={(e) => e.stopPropagation()}>
                      {agent.isInMyBasket ? (
                        <span className="sfa-basket-pill my-basket">
                          ⭐ In My Basket
                        </span>
                      ) : agent.managedBySupport ? (
                        <span className="sfa-basket-pill other-basket" title={`Managed by ${agent.managedBySupport.name}`}>
                          Assigned: {agent.managedBySupport.name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="sfa-basket-pill unassigned">
                          Unassigned Basket
                        </span>
                      )}
                    </td>

                    {/* Action Buttons */}
                    <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                      <div className="sfa-actions-cell">
                        {/* Basket Claim / Release */}
                        <button
                          type="button"
                          onClick={() => handleToggleBasket(agent)}
                          className={`sfa-basket-btn ${agent.isInMyBasket ? 'unassign' : 'assign'}`}
                          title={agent.isInMyBasket ? 'Release from My Basket' : 'Claim to My Basket'}
                        >
                          {agent.isInMyBasket ? 'Unassign' : 'Assign to Me'}
                        </button>

                        {/* Assign Site Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setSiteModalAgent(agent);
                            setSelectedSiteId(agent.currentSite?.id ? String(agent.currentSite.id) : '');
                          }}
                          className="sfa-assign-site-btn"
                          title="Assign Working Site & Duration"
                        >
                          <Building2 size={13} />
                          <span>Assign Site</span>
                        </button>

                        {/* Direct Chat / Equipment Request */}
                        <button
                          type="button"
                          onClick={() => setChatAgent(agent)}
                          className="sfa-chat-btn"
                          title="Direct Message / Equipment Request"
                        >
                          <MessageSquare size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          1. Slide-Over Drawer: Agent Details, Site Status & Assigned Workers Roster
         ───────────────────────────────────────────────────────────────────────────── */}
      {selectedAgent && (
        <div className="sfa-drawer-backdrop" onClick={() => setSelectedAgent(null)}>
          <div className="sfa-drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="sfa-agent-avatar large">
                  {selectedAgent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    {selectedAgent.name}
                  </h2>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600 }}>
                    {selectedAgent.employeeCode} • Field Agent
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAgent(null)}
                className="sfa-drawer-close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="sfa-drawer-body">
              {/* Agent Contact & Address Info */}
              <div className="sfa-drawer-card">
                <h4 className="sfa-drawer-card-title">Agent Contact Details</h4>
                <div className="sfa-detail-grid">
                  <div className="sfa-detail-item">
                    <span className="sfa-detail-label">Phone Number</span>
                    <strong className="sfa-detail-val">{selectedAgent.phone || 'Not Provided'}</strong>
                  </div>
                  <div className="sfa-detail-item">
                    <span className="sfa-detail-label">Email Address</span>
                    <strong className="sfa-detail-val">{selectedAgent.email || 'Not Provided'}</strong>
                  </div>
                  <div className="sfa-detail-item" style={{ gridColumn: 'span 2' }}>
                    <span className="sfa-detail-label">Residential Address</span>
                    <strong className="sfa-detail-val">{selectedAgent.address || 'Address not listed'}</strong>
                  </div>
                </div>
              </div>

              {/* Working Site & Status Control */}
              <div className="sfa-drawer-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h4 className="sfa-drawer-card-title" style={{ margin: 0 }}>Current Working Site</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSiteModalAgent(selectedAgent);
                      setSelectedSiteId(selectedAgent.currentSite?.id ? String(selectedAgent.currentSite.id) : '');
                    }}
                    className="sfa-drawer-assign-site-link"
                  >
                    + Change / Assign Site
                  </button>
                </div>

                {selectedAgent.currentSite ? (
                  <div className="sfa-site-status-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                          {selectedAgent.currentSite.siteName}
                        </h4>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>
                          {selectedAgent.currentSite.companyName} • {selectedAgent.currentSite.city}, {selectedAgent.currentSite.state}
                        </span>
                      </div>

                      {/* Live Site Status Changer Dropdown */}
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#64748B', marginBottom: '4px', textAlign: 'right' }}>
                          Site Status:
                        </label>
                        <select
                          value={selectedAgent.currentSite.status}
                          onChange={(e) => handleSiteStatusChange(selectedAgent.currentSite!.id, e.target.value)}
                          className={`sfa-site-status-select ${selectedAgent.currentSite.status.toLowerCase()}`}
                        >
                          <option value="ACTIVE">🟢 Active Working</option>
                          <option value="IN_PROGRESS">🟡 Work In Progress</option>
                          <option value="COMPLETED">✓ Work Done / Completed</option>
                          <option value="ON_HOLD">⏸️ On Hold</option>
                        </select>
                      </div>
                    </div>

                    {selectedAgent.activeAssignment && (
                      <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #CBD5E1', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#334155' }}>
                        <span>
                          <strong>Duration:</strong> {selectedAgent.activeAssignment.durationDays || '—'} Days
                        </span>
                        <span>
                          <strong>Remaining:</strong> {selectedAgent.activeAssignment.remainingDays !== null ? `${selectedAgent.activeAssignment.remainingDays} Days` : '—'}
                        </span>
                        <span>
                          <strong>Assigned By:</strong> {selectedAgent.activeAssignment.assignedBy}
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '16px', backgroundColor: '#F8FAFC', borderRadius: '8px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                    No site currently assigned to this agent.
                  </div>
                )}
              </div>

              {/* Assigned Workers Roster */}
              <div className="sfa-drawer-card">
                <h4 className="sfa-drawer-card-title">
                  Assigned Workers Under This Agent ({selectedAgent.workers.length})
                </h4>

                {selectedAgent.workers.length === 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#94A3B8', fontSize: '13px' }}>
                    No workers currently assigned under this agent.
                  </div>
                ) : (
                  <div className="sfa-workers-list">
                    {selectedAgent.workers.map((worker) => (
                      <div key={worker.id} className="sfa-worker-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="sfa-worker-avatar">
                            {worker.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: '13.5px', fontWeight: 700, color: '#0F172A' }}>
                              {worker.name}
                            </span>
                            <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                              {worker.employeeCode} {worker.phone ? `• ${worker.phone}` : ''}
                            </span>
                          </div>
                        </div>

                        <div>
                          <span className={`sfa-attendance-pill ${worker.todayAttendance.toLowerCase()}`}>
                            {worker.todayAttendance}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. Modal: Assign Site to Field Agent with Duration (Days)
         ───────────────────────────────────────────────────────────────────────────── */}
      {siteModalAgent && (
        <div className="sfa-modal-backdrop" onClick={() => setSiteModalAgent(null)}>
          <div className="sfa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A' }}>
                Assign Working Site to {siteModalAgent.name}
              </h3>
              <button type="button" onClick={() => setSiteModalAgent(null)} className="sfa-drawer-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignSiteSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label className="sfa-form-label">
                  <Building2 size={14} color="#2563EB" />
                  <span>Select Working Site *</span>
                </label>
                <select
                  value={selectedSiteId}
                  onChange={(e) => setSelectedSiteId(e.target.value)}
                  className="sfa-form-select"
                  required
                >
                  <option value="">-- Choose Working Site --</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName} ({s.companyName || s.city})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '20px' }}>
                <div>
                  <label className="sfa-form-label">
                    <Clock size={14} color="#2563EB" />
                    <span>Duration (Days) *</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="sfa-form-input"
                    required
                  />
                </div>

                <div>
                  <label className="sfa-form-label">
                    <Calendar size={14} color="#2563EB" />
                    <span>Start Date *</span>
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="sfa-form-input"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setSiteModalAgent(null)}
                  className="sfa-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAssigningSite}
                  className="sfa-submit-btn"
                >
                  {isAssigningSite ? 'Assigning...' : 'Confirm Site Assignment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. Drawer: Live Chat, Equipment Requests & Emergency Ticket Action
         ───────────────────────────────────────────────────────────────────────────── */}
      {chatAgent && (
        <div className="sfa-drawer-backdrop" onClick={() => setChatAgent(null)}>
          <div className="sfa-chat-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="sfa-agent-avatar">
                  {chatAgent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                    {chatAgent.name}
                  </h3>
                  <span style={{ fontSize: '11.5px', color: '#059669', fontWeight: 600 }}>
                    ● Online • {chatAgent.currentSite?.siteName || 'No Site'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* 1-Click Raise Emergency Ticket */}
                <button
                  type="button"
                  onClick={() => {
                    setTicketSubject(`Emergency / Equipment Issue at ${chatAgent.currentSite?.siteName || 'Field'}`);
                    setIsRaiseTicketOpen(true);
                  }}
                  className="sfa-raise-ticket-btn"
                  title="Raise Official Emergency Support Ticket"
                >
                  <ShieldAlert size={14} />
                  <span>Raise Ticket</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChatAgent(null)}
                  className="sfa-drawer-close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Chat Messages Container */}
            <div className="sfa-chat-messages">
              {messages.length === 0 ? (
                <div style={{ padding: '32px 16px', textAlign: 'center', color: '#94A3B8' }}>
                  <MessageSquare size={36} style={{ marginBottom: '8px' }} />
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 600 }}>
                    No messages yet with {chatAgent.name}. Send a direct note or equipment request below.
                  </p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = Number(m.senderId) === Number(user?.id);
                  return (
                    <div key={m.id} className={`sfa-msg-row ${isMe ? 'outgoing' : 'incoming'}`}>
                      <div className={`sfa-msg-bubble ${m.messageType.toLowerCase()}`}>
                        {m.messageType === 'EQUIPMENT_REQUEST' && (
                          <div className="sfa-msg-tag equipment">
                            <Wrench size={12} />
                            <span>Equipment Request</span>
                          </div>
                        )}
                        {m.messageType === 'EMERGENCY' && (
                          <div className="sfa-msg-tag emergency">
                            <ShieldAlert size={12} />
                            <span>Emergency Notice</span>
                          </div>
                        )}
                        {m.messageType === 'TICKET_RAISED' && (
                          <div className="sfa-msg-tag ticket">
                            <CheckCircle2 size={12} />
                            <span>Ticket Created</span>
                          </div>
                        )}

                        <p className="sfa-msg-text">{m.message}</p>
                        <span className="sfa-msg-time">
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Chat Type Tags & Input Form */}
            <form onSubmit={handleSendMessage} className="sfa-chat-footer">
              <div className="sfa-tag-pills">
                <button
                  type="button"
                  onClick={() => setChatMessageType('TEXT')}
                  className={`sfa-type-pill ${chatMessageType === 'TEXT' ? 'active' : ''}`}
                >
                  💬 Note
                </button>
                <button
                  type="button"
                  onClick={() => setChatMessageType('EQUIPMENT_REQUEST')}
                  className={`sfa-type-pill equipment ${chatMessageType === 'EQUIPMENT_REQUEST' ? 'active' : ''}`}
                >
                  🛠️ Equipment
                </button>
                <button
                  type="button"
                  onClick={() => setChatMessageType('EMERGENCY')}
                  className={`sfa-type-pill emergency ${chatMessageType === 'EMERGENCY' ? 'active' : ''}`}
                >
                  🚨 Emergency
                </button>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={
                    chatMessageType === 'EQUIPMENT_REQUEST'
                      ? 'Specify tools/equipment needed at site...'
                      : chatMessageType === 'EMERGENCY'
                      ? 'Describe emergency situation...'
                      : 'Type a message to the field agent...'
                  }
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  className="sfa-chat-input"
                />
                <button
                  type="submit"
                  disabled={isSendingMessage || !chatInput.trim()}
                  className="sfa-chat-send-btn"
                >
                  <Send size={15} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. Modal: Raise Ticket directly from Chat
         ───────────────────────────────────────────────────────────────────────────── */}
      {isRaiseTicketOpen && chatAgent && (
        <div className="sfa-modal-backdrop" style={{ zIndex: 100000 }} onClick={() => setIsRaiseTicketOpen(false)}>
          <div className="sfa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-modal-header">
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldAlert size={18} />
                <span>Raise Official Support Ticket for {chatAgent.name}</span>
              </h3>
              <button type="button" onClick={() => setIsRaiseTicketOpen(false)} className="sfa-drawer-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleRaiseTicketSubmit} style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '14px' }}>
                <label className="sfa-form-label">Ticket Subject *</label>
                <input
                  type="text"
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  className="sfa-form-input"
                  placeholder="e.g. Concrete Mixer equipment failure at site"
                  required
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label className="sfa-form-label">Priority Level *</label>
                <select
                  value={ticketPriority}
                  onChange={(e) => setTicketPriority(e.target.value)}
                  className="sfa-form-select"
                >
                  <option value="HIGH">🔴 High Priority</option>
                  <option value="MEDIUM">🟡 Medium Priority</option>
                  <option value="LOW">🟢 Low Priority</option>
                </select>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label className="sfa-form-label">Issue Details & Instructions *</label>
                <textarea
                  rows={3}
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  className="sfa-form-input"
                  placeholder="Provide complete breakdown of the equipment issue or emergency requirement..."
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsRaiseTicketOpen(false)}
                  className="sfa-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRaisingTicket}
                  className="sfa-submit-btn"
                  style={{ backgroundColor: '#DC2626' }}
                >
                  {isRaisingTicket ? 'Creating Ticket...' : 'Create Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
