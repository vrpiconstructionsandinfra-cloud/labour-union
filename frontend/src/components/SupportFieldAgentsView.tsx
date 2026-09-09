import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  createSiteApi,
  fetchAgentsApi,
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
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  // Selected Agent for Details Drawer
  const [selectedAgent, setSelectedAgent] = useState<SupportFieldAgentItem | null>(null);

  // Assign Site Modal State
  const [siteModalAgent, setSiteModalAgent] = useState<SupportFieldAgentItem | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [workersNeeded, setWorkersNeeded] = useState<number>(5);
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isAssigningSite, setIsAssigningSite] = useState<boolean>(false);

  // Create Site Modal State
  const [isCreateSiteModalOpen, setIsCreateSiteModalOpen] = useState<boolean>(false);
  const [newSiteName, setNewSiteName] = useState<string>('');
  const [newCompanyName, setNewCompanyName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [newCity, setNewCity] = useState<string>('');
  const [newState, setNewState] = useState<string>('');
  const [newPincode, setNewPincode] = useState<string>('');
  const [newContactPerson, setNewContactPerson] = useState<string>('');
  const [newContactNumber, setNewContactNumber] = useState<string>('');
  const [newAssignAgentId, setNewAssignAgentId] = useState<string>('');
  const [modalAgentSearch, setModalAgentSearch] = useState<string>('');
  const [isAgentDropdownOpen, setIsAgentDropdownOpen] = useState<boolean>(false);
  const [newDurationDays, setNewDurationDays] = useState<number>(7);
  const [newWorkersNeeded, setNewWorkersNeeded] = useState<number>(5);
  const [isCreatingSite, setIsCreatingSite] = useState<boolean>(false);

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
      let [agentsData, sitesData] = await Promise.all([
        fetchSupportFieldAgentsApi().catch((e) => {
          console.error('fetchSupportFieldAgentsApi error:', e);
          return [];
        }),
        fetchSitesApi().catch((e) => {
          console.error('fetchSitesApi error:', e);
          return [];
        }),
      ]);

      if (!agentsData || agentsData.length === 0) {
        try {
          const fallbackAgents = await fetchAgentsApi();
          if (Array.isArray(fallbackAgents) && fallbackAgents.length > 0) {
            agentsData = fallbackAgents
              .filter((fa: any) => {
                const r = String(fa.role || '').toUpperCase();
                const c = String(fa.employeeCode || '').toUpperCase();
                return r !== 'SUPER_AGENT' && !c.startsWith('SA-');
              })
              .map((fa: any) => ({
                id: Number(fa.id),
                name: fa.name,
                employeeCode: fa.employeeCode || `AGT-${fa.id}`,
                email: fa.email,
                phone: fa.phone,
                address: fa.address || '',
                status: fa.status || 'ACTIVE',
                active: fa.status === 'ACTIVE' || Boolean(fa.active),
                workersCount: fa.assignedWorkersCount || fa.assignedWorkers?.length || 0,
                workers: (fa.assignedWorkers || []).map((w: any) => ({
                  id: Number(w.id),
                  name: w.name,
                  employeeCode: w.employeeCode || `WRK-${w.id}`,
                  phone: w.phone || '',
                  email: w.email || '',
                  status: 'ACTIVE',
                  todayAttendance: 'PRESENT' as const,
                })),
                currentSite: fa.siteId ? {
                  id: Number(fa.siteId),
                  siteCode: `SITE-${fa.siteId}`,
                  siteName: fa.assignedSite || 'Working Site',
                  companyName: 'Labor Union Org',
                  city: 'City',
                  state: 'State',
                  status: 'ACTIVE',
                } : null,
                activeAssignment: null,
                isInMyBasket: false,
                managedBySupportId: null,
                managedBySupport: null,
              }));
          }
        } catch (e) {
          console.error('Fallback fetchAgentsApi error:', e);
        }
      }

      const rawList = Array.isArray(agentsData) ? agentsData : [];
      const cleanFieldAgents = rawList.filter((a: any) => {
        if (!a) return false;
        const role = String(a.role || '').toUpperCase();
        const code = String(a.employeeCode || '').toUpperCase();
        return role !== 'SUPER_AGENT' && !code.startsWith('SA-');
      });

      setAgents(cleanFieldAgents);
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

  // Socket.io Real-Time Listener for Support Messages, Online Presence & Site Updates
  useEffect(() => {
    const socket = getSocket();

    const handleOnlineUsers = (userIds: number[]) => {
      if (Array.isArray(userIds)) {
        setOnlineUserIds(new Set(userIds.map(Number)));
      }
    };

    const handleUserStatusChange = (data: { userId: number; isOnline: boolean }) => {
      if (data && data.userId) {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (data.isOnline) {
            next.add(Number(data.userId));
          } else {
            next.delete(Number(data.userId));
          }
          return next;
        });
      }
    };

    const handleNewMessage = (msg: any) => {
      if (chatAgent && (msg.fieldAgentId === chatAgent.id || msg.senderId === chatAgent.id)) {
        setMessages((prev) => [...prev, msg]);
      }
    };

    socket.on('users:online', handleOnlineUsers);
    socket.on('user:status:changed', handleUserStatusChange);
    socket.on('support_message', handleNewMessage);
    socket.emit('get:online_users');

    return () => {
      socket.off('users:online', handleOnlineUsers);
      socket.off('user:status:changed', handleUserStatusChange);
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
        workersNeeded,
      });
      await loadData();
      setSiteModalAgent(null);
      setSelectedSiteId('');
      setWorkersNeeded(5);
    } catch (err: any) {
      alert(err.message || 'Failed to assign site');
    } finally {
      setIsAssigningSite(false);
    }
  };

  // Submit Create New Working Site
  const handleCreateSiteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSiteName.trim()) return;

    setIsCreatingSite(true);
    try {
      const siteCode = `SITE-${Date.now().toString().slice(-4)}`;
      const createdSite = await createSiteApi({
        siteCode,
        siteName: newSiteName.trim(),
        companyName: newCompanyName.trim() || 'Labor Union Org',
        address: newAddress.trim() || 'Site Address',
        city: newCity.trim() || 'Mumbai',
        state: newState.trim() || 'Maharashtra',
        pincode: newPincode.trim() || '400001',
        contactPerson: newContactPerson.trim() || 'Site Supervisor',
        contactNumber: newContactNumber.trim() || '9876543210',
        status: 'ACTIVE',
      });

      const newSiteId = createdSite?.id;

      // If an agent was selected to be assigned right away:
      if (newAssignAgentId && newSiteId) {
        await assignSiteToAgentApi(newAssignAgentId, {
          siteId: newSiteId,
          durationDays: newDurationDays || 7,
          startDate: new Date().toISOString().split('T')[0],
          workersNeeded: newWorkersNeeded || 5,
        });
      }

      await loadData();
      setIsCreateSiteModalOpen(false);
      // Reset form fields
      setNewSiteName('');
      setNewCompanyName('');
      setNewAddress('');
      setNewCity('');
      setNewState('');
      setNewPincode('');
      setNewContactPerson('');
      setNewContactNumber('');
      setNewAssignAgentId('');
      setNewDurationDays(7);
      setNewWorkersNeeded(5);
      alert('Working site created successfully' + (newAssignAgentId ? ' and agent assigned with automated chat notice!' : '!'));
    } catch (err: any) {
      alert(err.message || 'Failed to create working site');
    } finally {
      setIsCreatingSite(false);
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
    const role = String((agent as any).role || '').toUpperCase();
    const code = (agent.employeeCode || '').toLowerCase();
    if (role === 'SUPER_AGENT' || code.startsWith('sa-')) return false;

    const query = (searchQuery || '').toLowerCase().trim();
    const idStr = String(agent.id);
    const name = (agent.name || '').toLowerCase();
    const phone = (agent.phone || '');
    const email = (agent.email || '').toLowerCase();
    const address = (agent.address || '').toLowerCase();
    const siteName = (agent.currentSite?.siteName || '').toLowerCase();

    // Enhanced Agent ID matching (e.g. "1", "#1", "AGT-001", "AGT-1", "ID: 1")
    const cleanIdQuery = query.replace(/^[#\s]*(?:AGT-?|AGENT-?|ID:?\s*)?/i, '').trim();
    const matchesId =
      idStr === query ||
      idStr === cleanIdQuery ||
      code.includes(query) ||
      code.includes(cleanIdQuery);

    const matchesSearch =
      !query ||
      matchesId ||
      name.includes(query) ||
      phone.includes(query) ||
      email.includes(query) ||
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

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setIsCreateSiteModalOpen(true)}
            className="sfa-create-site-btn"
          >
            <Building2 size={16} />
            <span>+ Create Working Site</span>
          </button>

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
            placeholder="Search by Agent ID (AGT-001), name, phone, site..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '2px',
                color: '#94A3B8'
              }}
              title="Clear search"
            >
              <X size={15} />
            </button>
          )}
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
          <>
            {/* Desktop Table View */}
            <div className="table-responsive sfa-desktop-table">
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
                          <div className="sfa-agent-avatar" style={{ position: 'relative' }}>
                            {agent.name.charAt(0).toUpperCase()}
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '-1px',
                                right: '-1px',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                backgroundColor: onlineUserIds.has(Number(agent.id)) ? '#10B981' : '#94A3B8',
                                border: '1.5px solid #FFFFFF'
                              }}
                              title={onlineUserIds.has(Number(agent.id)) ? 'Online' : 'Offline'}
                            />
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

            {/* Mobile Cards View */}
            <div className="sfa-mobile-cards">
              {filteredAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="sfa-agent-card"
                  onClick={() => setSelectedAgent(agent)}
                >
                  {/* Top Row: Avatar, Name, Code, Basket Pill */}
                  <div className="sfa-card-top">
                    <div className="sfa-card-agent-info">
                      <div className="sfa-agent-avatar" style={{ position: 'relative' }}>
                        {agent.name.charAt(0).toUpperCase()}
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '-1px',
                            right: '-1px',
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            backgroundColor: onlineUserIds.has(Number(agent.id)) ? '#10B981' : '#94A3B8',
                            border: '1.5px solid #FFFFFF'
                          }}
                          title={onlineUserIds.has(Number(agent.id)) ? 'Online' : 'Offline'}
                        />
                      </div>
                      <div>
                        <span className="sfa-card-agent-name">{agent.name}</span>
                        <span className="sfa-agent-code">{agent.employeeCode}</span>
                      </div>
                    </div>
                    <div className="sfa-card-basket-badge" onClick={(e) => e.stopPropagation()}>
                      {agent.isInMyBasket ? (
                        <span className="sfa-basket-pill my-basket">⭐ In My Basket</span>
                      ) : agent.managedBySupport ? (
                        <span className="sfa-basket-pill other-basket" title={`Managed by ${agent.managedBySupport.name}`}>
                          Assigned: {agent.managedBySupport.name.split(' ')[0]}
                        </span>
                      ) : (
                        <span className="sfa-basket-pill unassigned">Unassigned</span>
                      )}
                    </div>
                  </div>

                  {/* Contact Row */}
                  <div className="sfa-card-contact-row" onClick={(e) => e.stopPropagation()}>
                    {agent.phone ? (
                      <a href={`tel:${agent.phone}`} className="sfa-card-contact-pill">
                        <Phone size={12} color="#2563EB" />
                        <span>{agent.phone}</span>
                      </a>
                    ) : null}
                    {agent.email ? (
                      <a href={`mailto:${agent.email}`} className="sfa-card-contact-pill">
                        <Mail size={12} color="#64748B" />
                        <span className="truncate-pill-text">{agent.email}</span>
                      </a>
                    ) : null}
                  </div>

                  {/* Residential Address */}
                  {agent.address ? (
                    <div className="sfa-card-address">
                      <MapPin size={12} color="#64748B" style={{ flexShrink: 0 }} />
                      <span>{agent.address}</span>
                    </div>
                  ) : null}

                  {/* Site & Workforce Metadata Box */}
                  <div className="sfa-card-meta-box">
                    <div className="sfa-card-meta-col">
                      <span className="sfa-card-meta-label">Assigned Site</span>
                      {agent.currentSite ? (
                        <div className="sfa-card-site-info">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Building2 size={13} color="#059669" />
                            <strong>{agent.currentSite.siteName}</strong>
                          </div>
                          {agent.activeAssignment?.durationDays && (
                            <span className="sfa-card-duration-text">
                              {agent.activeAssignment.durationDays}d allocated
                              {agent.activeAssignment.remainingDays !== null ? ` (${agent.activeAssignment.remainingDays}d left)` : ''}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="sfa-unassigned-pill">Not Assigned</span>
                      )}
                    </div>

                    <div className="sfa-card-meta-col right">
                      <span className="sfa-card-meta-label">Workforce</span>
                      <div className="sfa-workers-badge">
                        <UserCheck size={12} />
                        <span>{agent.workersCount} Workers</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons Footer */}
                  <div className="sfa-card-actions" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleToggleBasket(agent)}
                      className={`sfa-basket-btn ${agent.isInMyBasket ? 'unassign' : 'assign'}`}
                    >
                      {agent.isInMyBasket ? 'Unassign' : 'Assign to Me'}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setSiteModalAgent(agent);
                        setSelectedSiteId(agent.currentSite?.id ? String(agent.currentSite.id) : '');
                      }}
                      className="sfa-assign-site-btn"
                    >
                      <Building2 size={13} />
                      <span>Assign Site</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setChatAgent(agent)}
                      className="sfa-chat-btn"
                      title="Direct Message / Equipment Request"
                    >
                      <MessageSquare size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
                <div className="sfa-agent-avatar large" style={{ position: 'relative' }}>
                  {selectedAgent.name.charAt(0).toUpperCase()}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '0px',
                      right: '0px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: onlineUserIds.has(Number(selectedAgent.id)) ? '#10B981' : '#94A3B8',
                      border: '2px solid #FFFFFF'
                    }}
                    title={onlineUserIds.has(Number(selectedAgent.id)) ? 'Online' : 'Offline'}
                  />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
                    {selectedAgent.name}
                  </h2>
                  <span style={{ fontSize: '12.5px', color: '#64748B', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <span>{selectedAgent.employeeCode} • Field Agent</span>
                    <span>•</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: onlineUserIds.has(Number(selectedAgent.id)) ? '#059669' : '#64748B' }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: onlineUserIds.has(Number(selectedAgent.id)) ? '#10B981' : '#94A3B8', display: 'inline-block' }}></span>
                      {onlineUserIds.has(Number(selectedAgent.id)) ? 'Online' : 'Offline'}
                    </span>
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
      {siteModalAgent && createPortal(
        <div className="sfa-modal-backdrop" onClick={() => setSiteModalAgent(null)}>
          <div className="sfa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#2563EB" />
                <span>Assign Working Site to {siteModalAgent.name}</span>
              </h3>
              <button type="button" onClick={() => setSiteModalAgent(null)} className="sfa-drawer-close">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAssignSiteSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="sfa-modal-body">
                <div>
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

                <div className="sfa-form-grid-3col">
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
                      <UserCheck size={14} color="#2563EB" />
                      <span>Workers Needed *</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="1000"
                      value={workersNeeded}
                      onChange={(e) => setWorkersNeeded(Number(e.target.value))}
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
              </div>

              <div className="sfa-modal-footer">
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
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          2b. Modal: Create New Working Site & Assign Field Agent
         ───────────────────────────────────────────────────────────────────────────── */}
      {isCreateSiteModalOpen && createPortal(
        <div
          className="sfa-modal-backdrop"
          onClick={() => {
            setIsCreateSiteModalOpen(false);
            setIsAgentDropdownOpen(false);
            setModalAgentSearch('');
          }}
        >
          <div className="sfa-modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-modal-header">
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={20} color="#059669" />
                <span>Create New Working Site</span>
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateSiteModalOpen(false);
                  setIsAgentDropdownOpen(false);
                  setModalAgentSearch('');
                }}
                className="sfa-drawer-close"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateSiteSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="sfa-modal-body">
                <div className="sfa-form-grid-2col">
                  <div>
                    <label className="sfa-form-label">
                      <Building2 size={14} color="#2563EB" />
                      <span>Site Name *</span>
                    </label>
                    <input
                      type="text"
                      value={newSiteName}
                      onChange={(e) => setNewSiteName(e.target.value)}
                      className="sfa-form-input"
                      placeholder="e.g. Metro Line 4 Construction"
                      required
                    />
                  </div>

                  <div>
                    <label className="sfa-form-label">
                      <Briefcase size={14} color="#2563EB" />
                      <span>Company / Client Name</span>
                    </label>
                    <input
                      type="text"
                      value={newCompanyName}
                      onChange={(e) => setNewCompanyName(e.target.value)}
                      className="sfa-form-input"
                      placeholder="e.g. L&T Infrastructure"
                    />
                  </div>
                </div>

                <div>
                  <label className="sfa-form-label">
                    <MapPin size={14} color="#2563EB" />
                    <span>Site Address / Landmark</span>
                  </label>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    className="sfa-form-input"
                    placeholder="e.g. Plot 42, Sector 18, BKC"
                  />
                </div>

                <div className="sfa-form-grid-3col">
                  <div>
                    <label className="sfa-form-label"><span>City</span></label>
                    <input
                      type="text"
                      value={newCity}
                      onChange={(e) => setNewCity(e.target.value)}
                      className="sfa-form-input"
                      placeholder="Mumbai"
                    />
                  </div>
                  <div>
                    <label className="sfa-form-label"><span>State</span></label>
                    <input
                      type="text"
                      value={newState}
                      onChange={(e) => setNewState(e.target.value)}
                      className="sfa-form-input"
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <label className="sfa-form-label"><span>Pincode</span></label>
                    <input
                      type="text"
                      value={newPincode}
                      onChange={(e) => setNewPincode(e.target.value)}
                      className="sfa-form-input"
                      placeholder="400051"
                    />
                  </div>
                </div>

                <div className="sfa-form-grid-2col">
                  <div>
                    <label className="sfa-form-label">
                      <Users size={14} color="#2563EB" />
                      <span>Site Supervisor / Contact Person</span>
                    </label>
                    <input
                      type="text"
                      value={newContactPerson}
                      onChange={(e) => setNewContactPerson(e.target.value)}
                      className="sfa-form-input"
                      placeholder="e.g. Rajesh Kumar"
                    />
                  </div>
                  <div>
                    <label className="sfa-form-label">
                      <Phone size={14} color="#2563EB" />
                      <span>Contact Phone Number</span>
                    </label>
                    <input
                      type="text"
                      value={newContactNumber}
                      onChange={(e) => setNewContactNumber(e.target.value)}
                      className="sfa-form-input"
                      placeholder="e.g. 9876543210"
                    />
                  </div>
                </div>

                {/* Optional Field Agent Assignment Section */}
                <div style={{ backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: '10px', padding: '14px 16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '13.5px', fontWeight: 800, color: '#1E293B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UserCheck size={16} color="#2563EB" />
                    <span>Assign Field Agent Immediately (Optional)</span>
                  </h4>

                  <div style={{ marginBottom: '12px' }}>
                    <label className="sfa-form-label" style={{ marginBottom: '6px' }}>
                      <span>Select Field Agent</span>
                    </label>

                    {agents.find((ag) => String(ag.id) === String(newAssignAgentId)) ? (
                      (() => {
                        const selectedAssignAgent = agents.find((ag) => String(ag.id) === String(newAssignAgentId))!;
                        return (
                          <div className="sfa-selected-agent-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div className="sfa-picker-avatar" style={{ margin: 0 }}>
                                {selectedAssignAgent.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="sfa-picker-name">
                                  {selectedAssignAgent.name}
                                </div>
                                <div className="sfa-picker-sub">
                                  {selectedAssignAgent.employeeCode} {selectedAssignAgent.phone ? `• 📞 ${selectedAssignAgent.phone}` : ''}
                                </div>
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {selectedAssignAgent.currentSite ? (
                                <span className="sfa-site-tag active">
                                  🏗️ {selectedAssignAgent.currentSite.siteName}
                                </span>
                              ) : (
                                <span className="sfa-site-tag unassigned">
                                  ⏳ Standby
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  setNewAssignAgentId('');
                                  setModalAgentSearch('');
                                }}
                                className="sfa-change-agent-btn"
                                title="Deselect Agent"
                              >
                                <X size={13} />
                                <span>Remove</span>
                              </button>
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="sfa-searchable-picker">
                        <div className="sfa-picker-search-bar" onClick={() => setIsAgentDropdownOpen(true)}>
                          <Search size={15} color="#64748B" />
                          <input
                            type="text"
                            placeholder="Type to search agent by name, code, phone..."
                            value={modalAgentSearch}
                            onChange={(e) => {
                              setModalAgentSearch(e.target.value);
                              setIsAgentDropdownOpen(true);
                            }}
                            onFocus={() => setIsAgentDropdownOpen(true)}
                            className="sfa-picker-input"
                          />
                          {modalAgentSearch && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setModalAgentSearch('');
                              }}
                              className="sfa-picker-clear"
                            >
                              <X size={13} />
                            </button>
                          )}
                        </div>

                        {isAgentDropdownOpen && (
                          <div className="sfa-picker-dropdown">
                            <div
                              className="sfa-picker-item unassigned-opt"
                              onClick={() => {
                                setNewAssignAgentId('');
                                setIsAgentDropdownOpen(false);
                              }}
                            >
                              <span style={{ fontWeight: 600, color: '#64748B' }}>
                                -- No Agent (Keep Unassigned) --
                              </span>
                            </div>

                            {agents
                              .filter((ag) => {
                                if (!modalAgentSearch.trim()) return true;
                                const q = modalAgentSearch.toLowerCase().trim();
                                return (
                                  (ag.name || '').toLowerCase().includes(q) ||
                                  (ag.employeeCode || '').toLowerCase().includes(q) ||
                                  (ag.phone || '').includes(q) ||
                                  (ag.currentSite?.siteName || '').toLowerCase().includes(q)
                                );
                              })
                              .length === 0 ? (
                              <div className="sfa-picker-empty">
                                {agents.length === 0
                                  ? 'No field agents available to assign.'
                                  : `No field agents found matching "${modalAgentSearch}".`}
                              </div>
                            ) : (
                              agents
                                .filter((ag) => {
                                  if (!modalAgentSearch.trim()) return true;
                                  const q = modalAgentSearch.toLowerCase().trim();
                                  return (
                                    (ag.name || '').toLowerCase().includes(q) ||
                                    (ag.employeeCode || '').toLowerCase().includes(q) ||
                                    (ag.phone || '').includes(q) ||
                                    (ag.currentSite?.siteName || '').toLowerCase().includes(q)
                                  );
                                })
                                .map((ag) => (
                                  <div
                                    key={ag.id}
                                    className="sfa-picker-item"
                                    onClick={() => {
                                      setNewAssignAgentId(String(ag.id));
                                      setIsAgentDropdownOpen(false);
                                      setModalAgentSearch('');
                                    }}
                                  >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                      <div className="sfa-picker-avatar">
                                        {ag.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="sfa-picker-info">
                                        <span className="sfa-picker-name">{ag.name}</span>
                                        <span className="sfa-picker-sub">
                                          {ag.employeeCode} {ag.phone ? `• 📞 ${ag.phone}` : ''}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="sfa-picker-site-tag">
                                      {ag.currentSite ? `🏗️ ${ag.currentSite.siteName}` : '⏳ Standby'}
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {newAssignAgentId && (
                    <div className="sfa-form-grid-2col">
                      <div>
                        <label className="sfa-form-label">
                          <Clock size={13} color="#2563EB" />
                          <span>Work Duration (Days) *</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          value={newDurationDays}
                          onChange={(e) => setNewDurationDays(Number(e.target.value))}
                          className="sfa-form-input"
                          required
                        />
                      </div>
                      <div>
                        <label className="sfa-form-label">
                          <Users size={13} color="#2563EB" />
                          <span>Workers Needed *</span>
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          value={newWorkersNeeded}
                          onChange={(e) => setNewWorkersNeeded(Number(e.target.value))}
                          className="sfa-form-input"
                          required
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="sfa-modal-footer">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreateSiteModalOpen(false);
                    setIsAgentDropdownOpen(false);
                    setModalAgentSearch('');
                  }}
                  className="sfa-cancel-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSite}
                  className="sfa-submit-btn"
                  style={{ backgroundColor: '#059669' }}
                >
                  {isCreatingSite ? 'Creating Site...' : newAssignAgentId ? 'Create Site & Assign Agent' : 'Create Working Site'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. Drawer: Live Chat, Equipment Requests & Emergency Ticket Action
         ───────────────────────────────────────────────────────────────────────────── */}
      {chatAgent && (
        <div className="sfa-drawer-backdrop" onClick={() => setChatAgent(null)}>
          <div className="sfa-chat-panel" onClick={(e) => e.stopPropagation()}>
            <div className="sfa-chat-header">
              {(() => {
                const isOnline = onlineUserIds.has(Number(chatAgent.id));
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="sfa-agent-avatar" style={{ position: 'relative' }}>
                      {chatAgent.name.charAt(0).toUpperCase()}
                      <span
                        style={{
                          position: 'absolute',
                          bottom: '-1px',
                          right: '-1px',
                          width: '9px',
                          height: '9px',
                          borderRadius: '50%',
                          backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                          border: '1.5px solid #FFFFFF'
                        }}
                        title={isOnline ? 'Online' : 'Offline'}
                      />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                        {chatAgent.name}
                      </h3>
                      <span
                        style={{
                          fontSize: '11.5px',
                          color: isOnline ? '#059669' : '#64748B',
                          fontWeight: 600,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span
                          style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: isOnline ? '#10B981' : '#94A3B8',
                            display: 'inline-block'
                          }}
                        />
                        {isOnline ? 'Online' : 'Offline'} • {chatAgent.currentSite?.siteName || 'No Site'}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                  const senderName = m.sender?.name || (isMe ? (user?.name || 'Support Agent') : (chatAgent?.name || 'Field Agent'));
                  const senderCode = m.sender?.employeeCode || (isMe ? `CSA-${String(user?.id || 1).padStart(3, '0')}` : chatAgent?.employeeCode || `AGT-${String(chatAgent?.id || 1).padStart(3, '0')}`);
                  const senderRole = isMe ? 'Support Agent' : 'Field Agent';

                  return (
                    <div key={m.id} className={`sfa-msg-row ${isMe ? 'outgoing' : 'incoming'}`}>
                      <div className={`sfa-msg-bubble ${m.messageType.toLowerCase()}`}>
                        {/* Speaker Name Header */}
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            marginBottom: '5px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: isMe ? 'rgba(255,255,255,0.92)' : '#64748B'
                          }}
                        >
                          <span style={{ color: isMe ? '#FFFFFF' : '#2563EB', fontWeight: 800 }}>
                            {senderName}
                          </span>
                          <span>•</span>
                          <span>{senderRole} ({senderCode})</span>
                        </div>

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
      {isRaiseTicketOpen && chatAgent && typeof document !== 'undefined' && createPortal(
        <div className="sfa-modal-backdrop" onClick={() => setIsRaiseTicketOpen(false)}>
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

            <form onSubmit={handleRaiseTicketSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div className="sfa-modal-body">
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

                <div>
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
              </div>

              <div className="sfa-modal-footer">
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
        </div>,
        document.body
      )}
    </div>
  );
};
