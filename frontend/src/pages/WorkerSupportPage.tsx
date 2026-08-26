import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  Ticket,
  Clock,
  CheckCircle2,
  X,
  Paperclip,
  Send,
  Download,
  Star,
  MessageSquare,
  Headset,
  Lock,
  History,
  MoreVertical,
  TrendingUp,
  FileText,
  UserCheck
} from 'lucide-react';
import {
  fetchSupportTicketsApi,
  fetchTicketCommentsApi,
  addTicketCommentApi,
  updateSupportTicketApi
} from '../services/api';
import { getSocket } from '../services/socket';
import { useAuth } from '../context/AuthContext';
import type { SupportTicket, TicketComment } from '../types';
import './WorkerSupportPage.css';

interface WorkerSupportPageProps {
  onOpenModal: (type: string) => void;
  refreshTrigger?: number;
  subTabFilter?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const WorkerSupportPage: React.FC<WorkerSupportPageProps> = ({
  onOpenModal,
  refreshTrigger = 0,
  subTabFilter = 'ALL',
  dateFrom,
  dateTo
}) => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket for Right Panel
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  // Assignment Tab Filter State ('ALL' | 'MY' | 'UNASSIGNED')
  const [assignmentTab, setAssignmentTab] = useState<'ALL' | 'MY' | 'UNASSIGNED'>(
    subTabFilter === 'MY' ? 'MY' : subTabFilter === 'UNASSIGNED' ? 'UNASSIGNED' : 'ALL'
  );

  useEffect(() => {
    if (subTabFilter === 'MY' || subTabFilter === 'UNASSIGNED' || subTabFilter === 'ALL') {
      setAssignmentTab(subTabFilter as any);
    }
  }, [subTabFilter]);

  // Conversation Comments State
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newCommentText, setNewCommentText] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const isSupportAgentRole =
    user?.role === 'SUPER_AGENT' ||
    (user?.role as string) === 'SUPPORT_AGENT' ||
    (user?.role as string) === 'ADMIN' ||
    (user as any)?.employeeCode?.startsWith('CSA') ||
    window.location.pathname.includes('support');

  const isTicketAssignedToMe = (t: SupportTicket) => {
    if (!user) return false;
    const status = (t.status || '').toUpperCase();
    if (status === 'OPEN') return false;

    const userIdStr = String(user.id || '');
    const myName = (user.name || '').trim().toLowerCase();
    const hId = (t as any).handledById !== undefined && (t as any).handledById !== null ? String((t as any).handledById) : '';
    const hByObj = (t as any).handledBy;
    const hByName = typeof hByObj === 'object' && hByObj !== null ? (hByObj.name || '').trim().toLowerCase() : (typeof hByObj === 'string' ? hByObj.trim().toLowerCase() : '');

    if (hId !== '' && (hId === userIdStr || Number(hId) === Number(user.id))) return true;
    if (hByName !== '' && myName !== '' && (hByName === myName || hByName.includes(myName) || myName.includes(hByName))) return true;
    return false;
  };

  const isTicketUnassigned = (t: SupportTicket) => {
    const status = (t.status || '').toUpperCase();
    if (status === 'OPEN') return true;

    const hId = (t as any).handledById;
    const hByObj = (t as any).handledBy;
    const hByName = typeof hByObj === 'object' && hByObj !== null ? (hByObj.name || '').trim() : (typeof hByObj === 'string' ? hByObj.trim() : '');

    if (hId !== null && hId !== undefined && Number(hId) > 0) return false;
    if (hByName !== '' && hByName !== 'Unassigned' && hByName !== 'Pending Assignment') return false;
    return true;
  };

  const handleAssignToMe = async (ticketId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateSupportTicketApi(ticketId, {
        handledById: user?.id || null,
        handledBy: user?.name || 'Support Agent',
        status: 'IN_PROGRESS'
      } as any);
      const updatedObj = {
        ...updated,
        handledById: user?.id,
        handledBy: typeof updated?.handledBy === 'object' && updated?.handledBy !== null ? updated.handledBy : (user?.name || 'Support Agent'),
        status: 'IN_PROGRESS'
      };
      setTickets((prev) =>
        prev.map((t) => (String(t.id) === String(ticketId) ? { ...t, ...updatedObj } : t))
      );
      if (selectedTicket && String(selectedTicket.id) === String(ticketId)) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updatedObj } : null));
      }
    } catch (err) {
      console.error('Failed to assign ticket:', err);
    }
  };

  const handleUnassignFromMe = async (ticketId: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const updated = await updateSupportTicketApi(ticketId, {
        unassign: true,
        handledById: null,
        handledBy: '',
        status: 'OPEN'
      } as any);
      const updatedObj = {
        ...updated,
        handledById: null,
        handledBy: null,
        status: 'OPEN'
      };
      setTickets((prev) =>
        prev.map((t) => (String(t.id) === String(ticketId) ? { ...t, ...updatedObj } : t))
      );
      if (selectedTicket && String(selectedTicket.id) === String(ticketId)) {
        setSelectedTicket((prev) => (prev ? { ...prev, ...updatedObj } : null));
      }
    } catch (err) {
      console.error('Failed to unassign ticket:', err);
    }
  };

  const loadTickets = async (isInitial = false) => {
    if (isInitial) {
      setLoading(true);
    }
    try {
      const data = await fetchSupportTicketsApi();

      // In the Customer Support Portal (isSupportAgentRole), load ALL tickets from all users
      // For Workers/Agents in their own portal, scope to their own tickets
      let scoped = data;
      if (user && !isSupportAgentRole) {
        const userIdStr = String(user.id || '');
        const userNumId = Number(userIdStr.replace(/\D/g, ''));
        const userName = (user.name || '').trim().toLowerCase();

        if (user.role === 'AGENT') {
          scoped = data.filter((t: any) => {
            const tickWorkerId = String(t.workerId || t.userId || t.createdById || t.worker?.id || '');
            const tickWorkerNum = Number(tickWorkerId.replace(/\D/g, ''));
            const tickUserName = (t.createdByName || t.userName || t.agentName || t.workerName || t.worker?.name || '').trim().toLowerCase();
            const tickCreatorCode = (t.workerCode || t.employeeCode || t.worker?.employeeCode || '').toUpperCase();
            const myEmpCode = (user.employeeCode || '').toUpperCase();
            const myName = (user.name || '').trim().toLowerCase();

            // 1. Direct ID match (ticket created directly by this logged-in agent)
            if (tickWorkerId !== '' && (tickWorkerId === userIdStr || Number(tickWorkerId) === userNumId || (userNumId > 0 && tickWorkerNum === userNumId))) return true;

            // 2. Employee Code match (e.g. AGT-002)
            if (myEmpCode !== '' && tickCreatorCode !== '' && (myEmpCode === tickCreatorCode || myEmpCode.replace(/\D/g, '') === tickCreatorCode.replace(/\D/g, ''))) return true;

            // 3. Normalized Creator name match (ignoring spaces & special chars, e.g. "Satish 2" vs "Satish2")
            const cleanMyName = myName.replace(/[^a-z0-9]/g, '');
            const cleanTickName = tickUserName.replace(/[^a-z0-9]/g, '');
            if (cleanMyName !== '' && cleanTickName !== '' && (cleanMyName === cleanTickName || cleanMyName.includes(cleanTickName) || cleanTickName.includes(cleanMyName))) return true;

            // 4. Root Creator name prefix match (ignoring trailing digits, e.g. "satish" prefix)
            const rootMyName = cleanMyName.replace(/\d+/g, '');
            const rootTickName = cleanTickName.replace(/\d+/g, '');
            if (rootMyName.length >= 3 && rootTickName.length >= 3 && (rootMyName === rootTickName || rootMyName.startsWith(rootTickName) || rootTickName.startsWith(rootMyName))) return true;

            return false;
          });
        } else if (user.role === 'WORKER') {
          scoped = data.filter((t: any) => {
            const tickWorkerId = String(t.workerId || t.userId || t.createdById || t.worker?.id || '');
            const tickUserNum = Number(tickWorkerId.replace(/\D/g, ''));
            const tickUserName = (t.createdByName || t.userName || t.workerName || t.worker?.name || '').trim().toLowerCase();
            return (
              (tickWorkerId !== '' && (tickWorkerId === userIdStr || Number(tickWorkerId) === userNumId)) ||
              (userNumId > 0 && tickUserNum === userNumId) ||
              (userName !== '' && tickUserName !== '' && (userName === tickUserName || userName.includes(tickUserName) || tickUserName.includes(userName)))
            );
          });
        }
      }

      setTickets(scoped);
      if (scoped.length > 0) {
        setSelectedTicket((prev) => {
          if (prev && scoped.some((t: any) => String(t.id) === String(prev.id))) {
            return scoped.find((t: any) => String(t.id) === String(prev.id)) || prev;
          }
          return scoped[0];
        });
      } else {
        setSelectedTicket(null);
      }
    } catch (err) {
      console.error('Failed to load support tickets:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadTickets(true);

    const handleGlobalRefresh = () => {
      loadTickets(false);
    };

    window.addEventListener('refresh-data', handleGlobalRefresh);
    window.addEventListener('ticket:created', handleGlobalRefresh);

    return () => {
      window.removeEventListener('refresh-data', handleGlobalRefresh);
      window.removeEventListener('ticket:created', handleGlobalRefresh);
    };
  }, [refreshTrigger]);

  // 30-second polling for live data
  useEffect(() => {
    const interval = setInterval(() => {
      loadTickets(false);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Load comments when selectedTicket changes
  const loadComments = async (ticketId: string | number) => {
    try {
      const list = await fetchTicketCommentsApi(ticketId);
      setComments(list);
    } catch {
      setComments([]);
    }
  };

  useEffect(() => {
    if (selectedTicket) {
      loadComments(selectedTicket.id);
    }
  }, [selectedTicket?.id]);

  // Socket listener for live comments & status updates
  useEffect(() => {
    const socket = getSocket();

    const handleComment = (data: any) => {
      if (selectedTicket && String(data.ticketId) === String(selectedTicket.id)) {
        const commentObj = data.comment || data;
        setComments((prev) => {
          if (commentObj.id && prev.some((c) => String(c.id) === String(commentObj.id))) {
            return prev;
          }
          return [...prev, commentObj];
        });
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    const handleUpdate = () => {
      loadTickets();
    };

    socket.on('ticket:comment', handleComment);
    socket.on('ticket:updated', handleUpdate);
    socket.on('ticket:created', handleUpdate);
    socket.on('ticket:assigned', handleUpdate);

    return () => {
      socket.off('ticket:comment', handleComment);
      socket.off('ticket:updated', handleUpdate);
      socket.off('ticket:created', handleUpdate);
      socket.off('ticket:assigned', handleUpdate);
    };
  }, [selectedTicket]);

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !newCommentText.trim() || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      const newComment = await addTicketCommentApi(selectedTicket.id, newCommentText.trim());
      setComments((prev) => {
        if (newComment.id && prev.some((c) => String(c.id) === String(newComment.id))) {
          return prev;
        }
        return [...prev, newComment];
      });
      setNewCommentText('');
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to post comment:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Counts for 5 Stat Filter Cards
  const totalCount = tickets.length;
  const openCount = tickets.filter((t) => t.status === 'OPEN').length;
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length;
  const resolvedCount = tickets.filter((t) => t.status === 'RESOLVED').length;
  const closedCount = tickets.filter((t) => t.status === 'CLOSED').length;

  // Filtered Tickets Table
  const filteredTickets = tickets.filter((t) => {
    // Assignment Tab Filter
    if (assignmentTab === 'MY' || subTabFilter === 'MY') {
      if (!isTicketAssignedToMe(t)) return false;
    } else if (assignmentTab === 'UNASSIGNED' || subTabFilter === 'UNASSIGNED') {
      if (!isTicketUnassigned(t)) return false;
    } else if (subTabFilter === 'OVERDUE') {
      if (t.status === 'CLOSED' || t.status === 'RESOLVED') return false;
    }

    // Status & priority dropdowns
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
    if (priorityFilter !== 'ALL' && t.priority?.toUpperCase() !== priorityFilter) return false;

    // Date range filter
    if (dateFrom || dateTo) {
      const ticketDate = t.createdAt ? new Date(t.createdAt) : null;
      if (ticketDate) {
        if (dateFrom && ticketDate < new Date(dateFrom)) return false;
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (ticketDate > toDate) return false;
        }
      }
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubj = (t.subject || '').toLowerCase().includes(q);
      const matchId = (t.ticketId || '').toLowerCase().includes(q);
      if (!matchSubj && !matchId) return false;
    }
    return true;
  });

  const handleStatusChange = async (ticketId: string | number, newStatus: string) => {
    try {
      await updateSupportTicketApi(ticketId, { status: newStatus as any });
      setTickets((prev) =>
        prev.map((t) => (String(t.id) === String(ticketId) ? { ...t, status: newStatus as any } : t))
      );
      if (selectedTicket && String(selectedTicket.id) === String(ticketId)) {
        setSelectedTicket((prev) => prev ? { ...prev, status: newStatus as any } : null);
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket status');
    }
  };

  const getPriorityBadge = (priority?: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return <span className="p-badge high">↑ High</span>;
    if (p === 'MEDIUM') return <span className="p-badge medium">Medium</span>;
    return <span className="p-badge low">Low</span>;
  };

  const getStatusBadge = (t: SupportTicket | null | undefined) => {
    if (!t) return null;
    const s = (t.status || '').toUpperCase();

    if (isSupportAgentRole && isTicketAssignedToMe(t)) {
      return (
        <select
          value={s}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleStatusChange(t.id, e.target.value)}
          style={{
            padding: '3px 8px',
            borderRadius: '6px',
            fontSize: '11.5px',
            fontWeight: 800,
            cursor: 'pointer',
            border: s === 'OPEN' ? '1px solid #FDE68A' : s === 'IN_PROGRESS' ? '1px solid #BFDBFE' : s === 'RESOLVED' ? '1px solid #A7F3D0' : '1px solid #CBD5E1',
            backgroundColor: s === 'OPEN' ? '#FEF3C7' : s === 'IN_PROGRESS' ? '#EFF6FF' : s === 'RESOLVED' ? '#DCFCE7' : '#F1F5F9',
            color: s === 'OPEN' ? '#D97706' : s === 'IN_PROGRESS' ? '#2563EB' : s === 'RESOLVED' ? '#15803D' : '#475569'
          }}
        >
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
      );
    }

    if (s === 'OPEN') return <span className="s-badge open">Open</span>;
    if (s === 'IN_PROGRESS') return <span className="s-badge in-progress">In Progress</span>;
    if (s === 'RESOLVED') return <span className="s-badge resolved">Resolved</span>;
    if (s === 'CLOSED') return <span className="s-badge closed">Closed</span>;
    return <span className="s-badge default">{t.status || '—'}</span>;
  };

  return (
    <div className="worker-support-layout animate-fade-in">
      {/* Main Left Content Column */}
      <div className="worker-support-left-col">
        {/* Header Bar */}
        <div className="worker-support-header">
          <div>
            <h1>Customer Support</h1>
            <p>Raise a ticket, track status and get help from our support team.</p>
          </div>

          <button
            className="raise-ticket-btn"
            onClick={() => {
              if (onOpenModal) {
                onOpenModal('create_ticket');
              }
              window.dispatchEvent(new CustomEvent('open-modal', { detail: 'create_ticket' }));
            }}
          >
            <Plus size={18} />
            <span>Raise New Ticket</span>
          </button>
        </div>

        {/* Assignment Filter Tabs Row (Reflected from DB) */}
        {isSupportAgentRole && (
          <div className="assignment-tabs-container">
            <button
              type="button"
              className={`assignment-tab-btn ${assignmentTab === 'ALL' ? 'active' : ''}`}
              onClick={() => setAssignmentTab('ALL')}
            >
              <Ticket size={16} />
              <span>All Tickets</span>
              <span className="assignment-count-badge purple">{tickets.length}</span>
            </button>

            <button
              type="button"
              className={`assignment-tab-btn ${assignmentTab === 'MY' ? 'active' : ''}`}
              onClick={() => setAssignmentTab('MY')}
            >
              <UserCheck size={16} />
              <span>My Tickets (Assigned)</span>
              <span className="assignment-count-badge green">{tickets.filter(isTicketAssignedToMe).length}</span>
            </button>

            <button
              type="button"
              className={`assignment-tab-btn ${assignmentTab === 'UNASSIGNED' ? 'active' : ''}`}
              onClick={() => setAssignmentTab('UNASSIGNED')}
            >
              <Clock size={16} />
              <span>Unassigned Tickets</span>
              <span className="assignment-count-badge orange">{tickets.filter(isTicketUnassigned).length}</span>
            </button>
          </div>
        )}

        {/* 5 Stat Filter Cards Bar */}
        <div className="support-stat-filter-row">
          <div
            className={`stat-card ${statusFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setStatusFilter('ALL')}
          >
            <div className="icon-box purple"><Ticket size={18} /></div>
            <div>
              <span className="card-lbl">All Tickets</span>
              <h3 className="card-val">{totalCount}</h3>
            </div>
          </div>

          <div
            className={`stat-card ${statusFilter === 'OPEN' ? 'active' : ''}`}
            onClick={() => setStatusFilter('OPEN')}
          >
            <div className="icon-box orange"><Clock size={18} /></div>
            <div>
              <span className="card-lbl">Open</span>
              <h3 className="card-val">{openCount}</h3>
            </div>
          </div>

          <div
            className={`stat-card ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
            onClick={() => setStatusFilter('IN_PROGRESS')}
          >
            <div className="icon-box blue"><TrendingUp size={18} /></div>
            <div>
              <span className="card-lbl">In Progress</span>
              <h3 className="card-val">{inProgressCount}</h3>
            </div>
          </div>

          <div
            className={`stat-card ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('RESOLVED')}
          >
            <div className="icon-box green"><CheckCircle2 size={18} /></div>
            <div>
              <span className="card-lbl">Resolved</span>
              <h3 className="card-val">{resolvedCount}</h3>
            </div>
          </div>

          <div
            className={`stat-card ${statusFilter === 'CLOSED' ? 'active' : ''}`}
            onClick={() => setStatusFilter('CLOSED')}
          >
            <div className="icon-box grey"><CheckCircle2 size={18} /></div>
            <div>
              <span className="card-lbl">Closed</span>
              <h3 className="card-val">{closedCount}</h3>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls Bar */}
        <div className="support-filter-controls">
          <div className="search-input-box">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="dropdown-filter-group">
            <select
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="ALL">All Status</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>

            <select
              className="filter-select"
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="ALL">All Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            <button className="icon-filter-btn" title="Filter Options">
              <Filter size={16} /> Filters
            </button>
          </div>
        </div>

        {/* Tickets Data Table */}
        <div className="support-tickets-table-card">
          <div className="table-responsive">
            <table className="worker-tickets-table">
              <thead>
                <tr>
                  <th>Ticket ID</th>
                  <th>Subject</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Last Updated</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#64748B' }}>
                      Loading tickets database...
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#94A3B8' }}>
                      No support tickets found in database matching criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => {
                    const isSelected = selectedTicket && String(selectedTicket.id) === String(t.id);
                    return (
                      <tr
                        key={t.id}
                        className={`ticket-row ${isSelected ? 'row-selected' : ''}`}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td className="ticket-id-code">{t.ticketId || `#TKT-${t.id}`}</td>
                        <td className="ticket-subject-title">{t.subject || '—'}</td>
                        <td>{getPriorityBadge(t.priority)}</td>
                        <td>{getStatusBadge(t)}</td>
                        <td className="last-updated-text">{t.createdAt || '10 mins ago'}</td>
                        <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {isSupportAgentRole && (
                            isTicketAssignedToMe(t) ? (
                              <>
                                <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, marginRight: '6px', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                                  ✓ Assigned to You
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => handleUnassignFromMe(t.id, e)}
                                  style={{
                                    backgroundColor: '#FEF2F2',
                                    color: '#DC2626',
                                    border: '1px solid #FCA5A5',
                                    borderRadius: '6px',
                                    padding: '3px 8px',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px',
                                    marginRight: '6px'
                                  }}
                                >
                                  <X size={11} /> Unassign
                                </button>
                              </>
                            ) : isTicketUnassigned(t) ? (
                              <button
                                type="button"
                                onClick={(e) => handleAssignToMe(t.id, e)}
                                style={{
                                  backgroundColor: '#2563EB',
                                  color: '#FFFFFF',
                                  border: 'none',
                                  borderRadius: '6px',
                                  padding: '4px 10px',
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  marginRight: '8px'
                                }}
                              >
                                <UserCheck size={13} /> Assign to Me
                              </button>
                            ) : (
                              <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, marginRight: '8px', backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px' }}>
                                Assigned: {typeof t.handledBy === 'object' && t.handledBy !== null ? (t.handledBy as any).name : String(t.handledBy || '')}
                              </span>
                            )
                          )}
                          <button
                            className="action-dots-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                            }}
                          >
                            <MoreVertical size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Pagination Footer */}
          <div className="table-pagination-footer">
            <span className="pagination-info">
              Showing 1 to {filteredTickets.length} of {tickets.length} tickets
            </span>
            <div className="pagination-pages">
              <button className="page-nav-btn">&lt;</button>
              <button className="page-num-btn active">1</button>
              <button className="page-num-btn">2</button>
              <button className="page-nav-btn">&gt;</button>
            </div>
          </div>
        </div>

        {/* Bottom Help Banner */}
        <div className="support-help-banner">
          <div className="banner-title-row">
            <h3>We are here to help you</h3>
          </div>
          <div className="help-cards-grid">
            <div className="help-card">
              <MessageSquare size={20} color="#2563eb" />
              <div>
                <h4>Quick Response</h4>
                <p>We reply as fast as we can</p>
              </div>
            </div>

            <div className="help-card">
              <Clock size={20} color="#2563eb" />
              <div>
                <h4>24/7 Support</h4>
                <p>Round the clock assistance</p>
              </div>
            </div>

            <div className="help-card">
              <Lock size={20} color="#10b981" />
              <div>
                <h4>Secure & Private</h4>
                <p>Your data is safe with us</p>
              </div>
            </div>

            <div className="help-card">
              <History size={20} color="#3b82f6" />
              <div>
                <h4>Track Anytime</h4>
                <p>Track your ticket anytime</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Ticket Details & Live Conversation Panel */}
      <div className="worker-support-right-col">
        {selectedTicket ? (
          <div className="ticket-detail-panel animate-fade-in">
            {/* Panel Top Header */}
            <div className="panel-header-row">
              <div className="panel-title-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3>Ticket Details</h3>
                {getStatusBadge(selectedTicket)}
                {isSupportAgentRole && (
                  isTicketAssignedToMe(selectedTicket) ? (
                    <>
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: 700, backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                        ✓ Assigned to You
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleUnassignFromMe(selectedTicket.id, e)}
                        style={{
                          backgroundColor: '#FEF2F2',
                          color: '#DC2626',
                          border: '1px solid #FCA5A5',
                          borderRadius: '6px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        <X size={11} /> Unassign from Me
                      </button>
                    </>
                  ) : isTicketUnassigned(selectedTicket) ? (
                    <button
                      type="button"
                      onClick={(e) => handleAssignToMe(selectedTicket.id, e)}
                      style={{
                        backgroundColor: '#2563EB',
                        color: '#FFFFFF',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <UserCheck size={12} /> Assign to Me
                    </button>
                  ) : (
                    <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: 600, backgroundColor: '#F3F4F6', padding: '3px 8px', borderRadius: '6px' }}>
                      Assigned: {typeof selectedTicket.handledBy === 'object' && selectedTicket.handledBy !== null ? (selectedTicket.handledBy as any).name : String(selectedTicket.handledBy || '')}
                    </span>
                  )
                )}
              </div>
              <button className="close-panel-btn" onClick={() => setSelectedTicket(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Ticket Subject & Meta */}
            <div className="ticket-header-meta">
              <div className="ticket-number-row">
                <span className="t-number">{selectedTicket.ticketId || `#TKT-${selectedTicket.id}`}</span>
                {getPriorityBadge(selectedTicket.priority)}
              </div>
              <h2 className="t-subject">{selectedTicket.subject}</h2>

              <div className="meta-info-grid">
                <div>
                  <span className="meta-lbl">Category</span>
                  <span className="meta-val">Payroll & Grievance</span>
                </div>
                <div>
                  <span className="meta-lbl">Created On</span>
                  <span className="meta-val">{selectedTicket.createdAt || 'May 21, 2026 09:15 AM'}</span>
                </div>
                <div>
                  <span className="meta-lbl">Last Updated</span>
                  <span className="meta-val">10 mins ago</span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="ticket-section-block">
              <span className="section-title">Description</span>
              <p className="description-text">
                {selectedTicket.description || 'My salary for the month of May has not been credited yet. Please check and resolve this issue.'}
              </p>
            </div>

            {/* Attachments Section */}
            {selectedTicket.attachmentUrl && (
              <div className="ticket-section-block">
                <span className="section-title">Attachments (1)</span>
                <div className="attachment-card">
                  <FileText size={22} color="#ef4444" />
                  <div className="attachment-info">
                    <span className="doc-name">May_Payslip_Proof.pdf</span>
                    <span className="doc-size">245 KB</span>
                  </div>
                  <a
                    href={selectedTicket.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-attachment-btn"
                    title="Download Proof Attachment"
                  >
                    <Download size={16} />
                  </a>
                </div>
              </div>
            )}

            {/* Conversation Stream */}
            <div className="conversation-section-block">
              <div className="conversation-header">
                <span>Conversation</span>
                <span className="live-pill"><span className="green-dot"></span> Live</span>
              </div>

              <div className="conversation-messages-list">
                {/* Initial Description as first message */}
                <div className="chat-bubble worker">
                  <div className="bubble-header">
                    <span className="user-name">
                      {(selectedTicket as any).createdByName || selectedTicket.workerName || (selectedTicket as any).userName || user?.name || 'Agent'}
                    </span>
                    <span className="time-text">{selectedTicket.createdAt || '09:15 AM'}</span>
                  </div>
                  <p>{selectedTicket.description || 'Safety equipment & PPE request'}</p>
                </div>

                {/* Official Support Agent Reply if available */}
                {selectedTicket.reply && (
                  <div className="chat-bubble agent">
                    <div className="bubble-header">
                      <span className="user-name">{selectedTicket.handledBy || 'Support Agent'}</span>
                      <span className="time-text">09:20 AM</span>
                    </div>
                    <p>{selectedTicket.reply}</p>
                  </div>
                )}

                {/* Additional Thread Comments */}
                {comments.map((c, idx) => {
                  const isUserMsg =
                    String((c as any).senderId || c.authorId) === String(user?.id) ||
                    (c as any).senderName === user?.name ||
                    c.authorName === user?.name ||
                    (c as any).senderRole === user?.role;
                  return (
                    <div className={`chat-bubble ${isUserMsg ? 'worker' : 'agent'}`} key={c.id || idx}>
                      <div className="bubble-header">
                        <span className="user-name">
                          {(c as any).senderName || c.authorName || (isUserMsg ? user?.name || 'Agent' : 'Support Agent')}
                        </span>
                        <span className="time-text">
                          {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        </span>
                      </div>
                      <p>{c.message}</p>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Live Chat Message Input Form */}
              <form className="chat-input-form" onSubmit={handleSendComment}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                />
                <button type="button" className="attach-btn" title="Attach file">
                  <Paperclip size={18} />
                </button>
                <button type="submit" className="send-btn" disabled={!newCommentText.trim() || isSubmittingComment}>
                  <Send size={16} />
                </button>
              </form>
            </div>

            {/* Bottom 5-Star Feedback Section */}
            <div className="feedback-rating-widget">
              <span className="feedback-title">How was your support experience?</span>
              <span className="feedback-sub">Your feedback helps us improve.</span>
              <div className="star-rating-row">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    size={22}
                    className={`star-icon ${star <= feedbackRating ? 'filled' : ''}`}
                    onClick={() => setFeedbackRating(star)}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="no-ticket-selected-card">
            <Headset size={40} color="#94A3B8" />
            <p>Select a support ticket from the table to view conversation history and reply in real-time.</p>
          </div>
        )}
      </div>
    </div>
  );
};
