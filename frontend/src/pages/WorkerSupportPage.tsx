import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  X,
  Paperclip,
  Send,
  Download,
  AlertCircle,
  Wrench,
  MessageSquare,
  Headset,
  Calendar,
  User,
  ChevronRight,
  ArrowLeft,
  MoreVertical,
  FileText
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
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Ticket for Right Panel / Mobile Full-Screen
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [activeRightTab, setActiveRightTab] = useState<'conversation' | 'details' | 'attachments'>('conversation');

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;

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

      let scoped = data;
      if (user && !isSupportAgentRole) {
        const userIdStr = String(user.id || '');
        const userNumId = Number(userIdStr.replace(/\D/g, ''));
        const myEmpCode = (user.employeeCode || '').toUpperCase();
        const myName = (user.name || '').trim().toLowerCase();

        if (user.role === 'AGENT') {
          scoped = data.filter((t: any) => {
            const tickAgentId = String(t.workerId || t.agentId || t.userId || t.createdById || t.worker?.id || '');
            const tickAgentNum = Number(tickAgentId.replace(/\D/g, ''));
            const tickCreatorCode = (t.agentCode || t.workerCode || t.employeeCode || t.worker?.employeeCode || '').toUpperCase();
            const tickUserName = (t.agentName || t.createdByName || t.userName || t.worker?.name || '').trim().toLowerCase();

            if (tickAgentId !== '' && (tickAgentId === userIdStr || Number(tickAgentId) === userNumId || (userNumId > 0 && tickAgentNum === userNumId))) return true;
            if (myEmpCode !== '' && tickCreatorCode !== '' && (myEmpCode === tickCreatorCode || myEmpCode.replace(/\D/g, '') === tickCreatorCode.replace(/\D/g, ''))) return true;
            if (myName !== '' && tickUserName !== '' && (myName === tickUserName || myName.includes(tickUserName) || tickUserName.includes(myName))) return true;

            return false;
          });
        } else {
          // If other non-support role, no tickets accessible
          scoped = [];
        }
      }

      setTickets(scoped);
      if (scoped.length > 0) {
        setSelectedTicket((prev) => {
          if (prev && scoped.some((t: any) => String(t.id) === String(prev.id))) {
            return scoped.find((t: any) => String(t.id) === String(prev.id)) || prev;
          }
          if (window.innerWidth >= 900) {
            return scoped[0];
          }
          return null;
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

  // 30-second polling for live updates
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
        setTimeout(() => {
          chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
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

  // Helper functions for categorization and presentation
  const getTicketCategory = (t: SupportTicket): 'Emergency' | 'Equipment' | 'General' => {
    const subj = (t.subject || '').toLowerCase();
    const cat = ((t as any).category || '').toLowerCase();
    if (
      cat.includes('emergency') ||
      subj.includes('injured') ||
      subj.includes('emergency') ||
      subj.includes('safety') ||
      subj.includes('medical') ||
      subj.includes('accident') ||
      subj.includes('hazard')
    ) {
      return 'Emergency';
    }
    if (
      cat.includes('equip') ||
      cat.includes('tool') ||
      subj.includes('tool') ||
      subj.includes('equipment') ||
      subj.includes('machine') ||
      subj.includes('material') ||
      subj.includes('ppe')
    ) {
      return 'Equipment';
    }
    return 'General';
  };

  const getCategorySubtitle = (cat: 'Emergency' | 'Equipment' | 'General') => {
    if (cat === 'Emergency') return 'Safety, medical assistance';
    if (cat === 'Equipment') return 'Tools, machines, materials';
    return 'Other support requests';
  };

  const formatTicketCode = (t: SupportTicket) => {
    if (t.ticketId) {
      if (t.ticketId.startsWith('TK-') || t.ticketId.startsWith('TKT-')) return t.ticketId;
      return `TK-${t.ticketId.replace(/\D/g, '').padStart(3, '0')}`;
    }
    return `TK-${String(t.id).padStart(3, '0')}`;
  };

  const formatTicketDate = (dateStr?: string) => {
    if (!dateStr) return 'May 18, 2025';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  const formatTicketDateTime = (dateStr?: string) => {
    if (!dateStr) return 'May 18, 2025, 10:30 AM';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch {
      return dateStr;
    }
  };

  const getCreatorDisplayName = (t: SupportTicket) => {
    const name = (t as any).agentName || (t as any).createdByName || (t as any).userName || (t as any).worker?.name || (user?.role === 'AGENT' ? user.name : 'Field Agent');
    const code = (t as any).agentCode || (t as any).creatorCode || (t as any).workerCode || (t as any).employeeCode || (user?.role === 'AGENT' ? user.employeeCode : undefined) || `AGT-${String((t as any).workerId || (t as any).agentId || 1).padStart(3, '0')}`;
    return `${name} (Agent • ${code})`;
  };

  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'AG';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return nameStr.slice(0, 2).toUpperCase();
  };

  const handleOpenCreateModalWithCategory = (cat: 'Emergency' | 'Equipment' | 'General') => {
    sessionStorage.setItem('prefill_ticket_category', cat);
    if (onOpenModal) {
      onOpenModal('create_ticket');
    }
    window.dispatchEvent(new CustomEvent('open-modal', { detail: 'create_ticket' }));
  };

  const handleStatusChange = async (ticketId: string | number, newStatus: string) => {
    try {
      await updateSupportTicketApi(ticketId, { status: newStatus as any });
      setTickets((prev) =>
        prev.map((t) => (String(t.id) === String(ticketId) ? { ...t, status: newStatus as any } : t))
      );
      if (selectedTicket && String(selectedTicket.id) === String(ticketId)) {
        setSelectedTicket((prev) => (prev ? { ...prev, status: newStatus as any } : null));
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update ticket status');
    }
  };

  // Filtered Tickets
  const filteredTickets = tickets.filter((t) => {
    // Status Filter
    if (statusFilter !== 'ALL' && (t.status || '').toUpperCase() !== statusFilter) {
      return false;
    }

    // Category Filter
    if (categoryFilter !== 'ALL') {
      const cat = getTicketCategory(t);
      if (cat.toUpperCase() !== categoryFilter.toUpperCase()) return false;
    }

    // Assignment Tab Filter
    if (assignmentTab === 'MY' || subTabFilter === 'MY') {
      if (!isTicketAssignedToMe(t)) return false;
    } else if (assignmentTab === 'UNASSIGNED' || subTabFilter === 'UNASSIGNED') {
      if (!isTicketUnassigned(t)) return false;
    }

    // Date Range Filter
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

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSubj = (t.subject || '').toLowerCase().includes(q);
      const matchId = (t.ticketId || '').toLowerCase().includes(q);
      const matchCode = formatTicketCode(t).toLowerCase().includes(q);
      const matchCreator = ((t as any).agentName || (t as any).createdByName || '').toLowerCase().includes(q);
      if (!matchSubj && !matchId && !matchCode && !matchCreator) return false;
    }

    return true;
  });

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage));
  const paginatedTickets = filteredTickets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const renderStatusBadge = (status?: string) => {
    const s = (status || 'OPEN').toUpperCase();
    if (s === 'OPEN') return <span className="cs-badge cs-status-open">Open</span>;
    if (s === 'IN_PROGRESS' || s === 'IN PROGRESS') return <span className="cs-badge cs-status-in-progress">In Progress</span>;
    if (s === 'RESOLVED') return <span className="cs-badge cs-status-resolved">Resolved</span>;
    if (s === 'CLOSED') return <span className="cs-badge cs-status-closed">Closed</span>;
    return <span className="cs-badge cs-status-default">{status}</span>;
  };

  const renderCategoryBadge = (cat: 'Emergency' | 'Equipment' | 'General') => {
    if (cat === 'Emergency') return <span className="cs-badge cs-cat-emergency">Emergency</span>;
    if (cat === 'Equipment') return <span className="cs-badge cs-cat-equipment">Equipment</span>;
    return <span className="cs-badge cs-cat-general">General</span>;
  };

  return (
    <div className={`cs-page-container ${selectedTicket ? 'ticket-selected-mobile-view' : ''}`}>
      {/* LEFT COLUMN: Header, Category Cards, Filter Tabs, Search & Table */}
      <div className="cs-left-pane">
        {/* Main Page Header */}
        <div className="cs-header-row">
          <div className="cs-header-info">
            <h1 className="cs-main-title">Customer Support</h1>
            <p className="cs-main-subtitle">
              Raise a ticket, track status and get help from our support team.
            </p>
          </div>

          <button
            type="button"
            className="cs-create-ticket-btn"
            onClick={() => {
              sessionStorage.removeItem('prefill_ticket_category');
              if (onOpenModal) onOpenModal('create_ticket');
              window.dispatchEvent(new CustomEvent('open-modal', { detail: 'create_ticket' }));
            }}
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Create Ticket</span>
          </button>
        </div>

        {/* 3 Top Category Quick-Action Cards */}
        <div className="cs-category-cards-grid">
          {/* 1. Emergency Card */}
          <div
            className="cs-category-card emergency-card"
            onClick={() => handleOpenCreateModalWithCategory('Emergency')}
            role="button"
            tabIndex={0}
          >
            <div className="cs-cat-icon-wrap emergency-icon">
              <AlertCircle size={22} strokeWidth={2.2} />
            </div>
            <div className="cs-cat-text-wrap">
              <h3 className="cs-cat-title">Emergency</h3>
              <p className="cs-cat-desc">Safety, medical assistance</p>
            </div>
            <ChevronRight size={18} className="cs-cat-arrow" />
          </div>

          {/* 2. Equipment Required Card */}
          <div
            className="cs-category-card equipment-card"
            onClick={() => handleOpenCreateModalWithCategory('Equipment')}
            role="button"
            tabIndex={0}
          >
            <div className="cs-cat-icon-wrap equipment-icon">
              <Wrench size={20} strokeWidth={2.2} />
            </div>
            <div className="cs-cat-text-wrap">
              <h3 className="cs-cat-title">Equipment Required</h3>
              <p className="cs-cat-desc">Tools, machines, materials</p>
            </div>
            <ChevronRight size={18} className="cs-cat-arrow" />
          </div>

          {/* 3. General Card */}
          <div
            className="cs-category-card general-card"
            onClick={() => handleOpenCreateModalWithCategory('General')}
            role="button"
            tabIndex={0}
          >
            <div className="cs-cat-icon-wrap general-icon">
              <MessageSquare size={20} strokeWidth={2.2} />
            </div>
            <div className="cs-cat-text-wrap">
              <h3 className="cs-cat-title">General</h3>
              <p className="cs-cat-desc">Other support requests</p>
            </div>
            <ChevronRight size={18} className="cs-cat-arrow" />
          </div>
        </div>

        {/* Filter Pills & Search Bar Section */}
        <div className="cs-filters-and-search-row">
          {/* Status Filter Pills */}
          <div className="cs-filter-pills-wrap">
            <button
              type="button"
              className={`cs-filter-pill ${statusFilter === 'ALL' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
            >
              All
            </button>
            <button
              type="button"
              className={`cs-filter-pill ${statusFilter === 'OPEN' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('OPEN');
                setCurrentPage(1);
              }}
            >
              Open
            </button>
            <button
              type="button"
              className={`cs-filter-pill ${statusFilter === 'IN_PROGRESS' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('IN_PROGRESS');
                setCurrentPage(1);
              }}
            >
              In Progress
            </button>
            <button
              type="button"
              className={`cs-filter-pill ${statusFilter === 'RESOLVED' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('RESOLVED');
                setCurrentPage(1);
              }}
            >
              Resolved
            </button>
            <button
              type="button"
              className={`cs-filter-pill ${statusFilter === 'CLOSED' ? 'active' : ''}`}
              onClick={() => {
                setStatusFilter('CLOSED');
                setCurrentPage(1);
              }}
            >
              Closed
            </button>
          </div>

          {/* Search Input Box & Filter Button */}
          <div className="cs-search-filter-controls">
            <div className="cs-search-input-box">
              <Search size={16} className="cs-search-icon" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button
              type="button"
              className="cs-filter-action-btn"
              onClick={() => {
                setCategoryFilter((prev) => (prev === 'ALL' ? 'EMERGENCY' : prev === 'EMERGENCY' ? 'EQUIPMENT' : prev === 'EQUIPMENT' ? 'GENERAL' : 'ALL'));
                setCurrentPage(1);
              }}
              title="Filter by Category"
            >
              <Filter size={15} />
              <span>{categoryFilter !== 'ALL' ? categoryFilter : 'Filters'}</span>
            </button>
          </div>
        </div>

        {/* DESKTOP TABLE VIEW (≥ 900px) */}
        <div className="cs-table-card desktop-only">
          <div className="cs-table-container">
            <table className="cs-tickets-table">
              <thead>
                <tr>
                  <th style={{ width: '10%' }}>#</th>
                  <th style={{ width: '36%' }}>Subject</th>
                  <th style={{ width: '18%' }}>Category</th>
                  <th style={{ width: '16%' }}>Status</th>
                  <th style={{ width: '14%' }}>Created On</th>
                  <th style={{ width: '6%', textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="cs-empty-row">
                      Loading customer support tickets...
                    </td>
                  </tr>
                ) : paginatedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="cs-empty-row">
                      No support tickets found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  paginatedTickets.map((t) => {
                    const isSelected = selectedTicket && String(selectedTicket.id) === String(t.id);
                    const cat = getTicketCategory(t);
                    return (
                      <tr
                        key={t.id}
                        className={`cs-table-row ${isSelected ? 'row-selected' : ''}`}
                        onClick={() => setSelectedTicket(t)}
                      >
                        <td className="cs-ticket-code">{formatTicketCode(t)}</td>
                        <td className="cs-ticket-subj">
                          <span className="cs-subj-text">{t.subject || 'Support Inquiry'}</span>
                        </td>
                        <td>{renderCategoryBadge(cat)}</td>
                        <td>{renderStatusBadge(t.status)}</td>
                        <td className="cs-created-date">{formatTicketDate(t.createdAt)}</td>
                        <td style={{ textAlign: 'center' }}>
                          <button
                            type="button"
                            className="cs-dots-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTicket(t);
                            }}
                            title="View Ticket Conversation"
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
          <div className="cs-pagination-footer">
            <span className="cs-pagination-info">
              Showing {filteredTickets.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredTickets.length)} of {filteredTickets.length} tickets
            </span>

            <div className="cs-pagination-controls">
              <button
                type="button"
                className="cs-page-arrow-btn"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  className={`cs-page-num-btn ${currentPage === p ? 'active' : ''}`}
                  onClick={() => setCurrentPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                className="cs-page-arrow-btn"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                &gt;
              </button>
            </div>
          </div>
        </div>

        {/* MOBILE CARDS LIST VIEW (< 900px) */}
        <div className="cs-mobile-cards-list mobile-only">
          {loading ? (
            <div className="cs-empty-mobile-card">Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="cs-empty-mobile-card">No support tickets found matching criteria.</div>
          ) : (
            filteredTickets.map((t) => {
              const cat = getTicketCategory(t);
              return (
                <div
                  key={t.id}
                  className="cs-mobile-ticket-card"
                  onClick={() => setSelectedTicket(t)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="cs-mob-top-row">
                    <span className="cs-mob-code">{formatTicketCode(t)}</span>
                    <span className="cs-mob-date">{formatTicketDate(t.createdAt)}</span>
                  </div>

                  <h4 className="cs-mob-subj">{t.subject || 'Support Inquiry'}</h4>

                  <div className="cs-mob-bottom-row">
                    <div className="cs-mob-badges">
                      {renderCategoryBadge(cat)}
                      {renderStatusBadge(t.status)}
                    </div>
                    <ChevronRight size={18} className="cs-mob-chevron" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Bottom "We are here to help you" Card */}
        <div className="cs-bottom-help-card">
          <div className="cs-help-icon-box">
            <Headset size={24} strokeWidth={2.2} />
          </div>
          <div className="cs-help-text-box">
            <h4 className="cs-help-title">We are here to help you</h4>
            <p className="cs-help-subtitle">
              To keep your tickets safe we back them up on remote servers
            </p>
          </div>
          <ChevronRight size={20} className="cs-help-arrow" />
        </div>
      </div>

      {/* RIGHT COLUMN: Ticket Details & Live Conversation Panel */}
      <div className={`cs-right-pane ${selectedTicket ? 'cs-panel-open' : ''}`}>
        {selectedTicket ? (
          <div className="cs-ticket-detail-card animate-fade-in">
            {/* Mobile Back Button Header */}
            <div className="cs-mobile-back-header mobile-only">
              <button
                type="button"
                className="cs-mobile-back-btn"
                onClick={() => setSelectedTicket(null)}
              >
                <ArrowLeft size={18} />
                <span>Back to tickets</span>
              </button>
            </div>

            {/* Ticket Header (Code + Status + Close) */}
            <div className="cs-detail-header-row">
              <div className="cs-detail-code-wrap">
                <span className="cs-detail-ticket-id">{formatTicketCode(selectedTicket)}</span>
                {renderStatusBadge(selectedTicket.status)}
              </div>

              <div className="cs-detail-header-actions">
                {isSupportAgentRole && (
                  isTicketAssignedToMe(selectedTicket) ? (
                    <button
                      type="button"
                      className="cs-unassign-btn"
                      onClick={(e) => handleUnassignFromMe(selectedTicket.id, e)}
                    >
                      <X size={12} /> Unassign
                    </button>
                  ) : isTicketUnassigned(selectedTicket) ? (
                    <button
                      type="button"
                      className="cs-assign-btn"
                      onClick={(e) => handleAssignToMe(selectedTicket.id, e)}
                    >
                      <CheckCircle2 size={13} /> Assign to Me
                    </button>
                  ) : null
                )}

                <button
                  type="button"
                  className="cs-close-panel-btn"
                  onClick={() => setSelectedTicket(null)}
                  title="Close Panel"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Ticket Title & Category Subtitle */}
            <div className="cs-detail-title-block">
              <h2 className="cs-detail-subject">{selectedTicket.subject || 'Support Ticket'}</h2>
              <p className="cs-detail-subtitle">
                {getCategorySubtitle(getTicketCategory(selectedTicket))}
              </p>
            </div>

            {/* 2 Metadata Cards: Created On & Created By */}
            <div className="cs-detail-meta-grid">
              <div className="cs-meta-card">
                <div className="cs-meta-icon orange-tint">
                  <Calendar size={18} />
                </div>
                <div>
                  <span className="cs-meta-label">Created On</span>
                  <span className="cs-meta-value">{formatTicketDateTime(selectedTicket.createdAt)}</span>
                </div>
              </div>

              <div className="cs-meta-card">
                <div className="cs-meta-icon orange-tint">
                  <User size={18} />
                </div>
                <div>
                  <span className="cs-meta-label">Created By</span>
                  <span className="cs-meta-value">{getCreatorDisplayName(selectedTicket)}</span>
                </div>
              </div>
            </div>

            {/* Conversation / Details / Attachments Tabs */}
            <div className="cs-panel-nav-tabs">
              <button
                type="button"
                className={`cs-panel-tab-btn ${activeRightTab === 'conversation' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('conversation')}
              >
                Conversation
              </button>
              <button
                type="button"
                className={`cs-panel-tab-btn ${activeRightTab === 'details' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('details')}
              >
                Details
              </button>
              <button
                type="button"
                className={`cs-panel-tab-btn ${activeRightTab === 'attachments' ? 'active' : ''}`}
                onClick={() => setActiveRightTab('attachments')}
              >
                Attachments
              </button>
            </div>

            {/* Tab 1: Conversation View */}
            {activeRightTab === 'conversation' && (
              <div className="cs-conversation-container">
                <div className="cs-messages-scroll-area">
                  {/* Message 1: Initial Creator Description */}
                  <div className="cs-chat-message-row other-user">
                    <div className="cs-avatar-bubble">
                      {getInitials(
                        (selectedTicket as any).agentName || (selectedTicket as any).createdByName || 'Agent'
                      )}
                    </div>
                    <div className="cs-message-content-wrap">
                      <div className="cs-msg-header">
                        <span className="cs-msg-author">
                          {getCreatorDisplayName(selectedTicket)}
                        </span>
                        <span className="cs-msg-time">
                          {formatTicketDateTime(selectedTicket.createdAt)}
                        </span>
                      </div>
                      <div className="cs-msg-bubble light-bubble">
                        <p>{selectedTicket.description || selectedTicket.subject || 'Support assistance needed.'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Official Agent Reply if available */}
                  {selectedTicket.reply && (
                    <div className="cs-chat-message-row current-user">
                      <div className="cs-avatar-bubble agent-avatar">
                        {getInitials(selectedTicket.handledBy || 'Support Agent')}
                      </div>
                      <div className="cs-message-content-wrap">
                        <div className="cs-msg-header">
                          <span className="cs-msg-author">{selectedTicket.handledBy || 'Support Agent (CSA)'}</span>
                          <span className="cs-msg-time">Reply</span>
                        </div>
                        <div className="cs-msg-bubble blue-tint-bubble">
                          <p>{selectedTicket.reply}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Thread Comments */}
                  {comments.map((c, idx) => {
                    const isCurrentUser =
                      String((c as any).senderId || c.authorId) === String(user?.id) ||
                      (c as any).senderName === user?.name ||
                      c.authorName === user?.name;
                    
                    const code = (c as any).authorCode || ((c as any).authorRole === 'CUSTOMER_SUPPORT' ? `CSA-${c.authorId}` : `AGT-${c.authorId}`);
                    const roleLabel = (c as any).authorRole === 'CUSTOMER_SUPPORT' ? 'Support Agent' : 'Field Agent';
                    const authorName = (c as any).senderName || c.authorName || (isCurrentUser ? `${user?.name || 'You'} (${roleLabel})` : `${roleLabel} (${code})`);

                    return (
                      <div
                        key={c.id || idx}
                        className={`cs-chat-message-row ${isCurrentUser ? 'current-user' : 'other-user'}`}
                      >
                        <div className={`cs-avatar-bubble ${(c as any).authorRole === 'CUSTOMER_SUPPORT' ? 'agent-avatar' : ''}`}>
                          {getInitials(authorName)}
                        </div>
                        <div className="cs-message-content-wrap">
                          <div className="cs-msg-header">
                            <span className="cs-msg-author">{authorName}</span>
                            <span className="cs-msg-time">
                              {c.createdAt ? formatTicketDateTime(c.createdAt) : 'Just now'}
                            </span>
                          </div>
                          <div className={`cs-msg-bubble ${isCurrentUser ? 'blue-tint-bubble' : 'light-bubble'}`}>
                            <p>{c.message}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                {/* Message Input Form */}
                <form className="cs-chat-input-form" onSubmit={handleSendComment}>
                  <input
                    type="text"
                    placeholder="Type a message..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                  />
                  <button type="button" className="cs-attach-btn" title="Attach Document / Photo">
                    <Paperclip size={18} />
                  </button>
                  <button
                    type="submit"
                    className="cs-send-btn"
                    disabled={!newCommentText.trim() || isSubmittingComment}
                    title="Send Message"
                  >
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

            {/* Tab 2: Details View */}
            {activeRightTab === 'details' && (
              <div className="cs-tab-details-container">
                <div className="cs-details-block">
                  <h4 className="cs-details-section-title">Issue Description</h4>
                  <p className="cs-details-desc-text">
                    {selectedTicket.description || 'No detailed description provided.'}
                  </p>
                </div>

                <div className="cs-details-block">
                  <h4 className="cs-details-section-title">Ticket Information</h4>
                  <div className="cs-info-row">
                    <span className="cs-info-label">Category:</span>
                    <span className="cs-info-val">{getTicketCategory(selectedTicket)}</span>
                  </div>
                  <div className="cs-info-row">
                    <span className="cs-info-label">Priority:</span>
                    <span className="cs-info-val">{selectedTicket.priority || 'MEDIUM'}</span>
                  </div>
                  <div className="cs-info-row">
                    <span className="cs-info-label">Assigned Agent:</span>
                    <span className="cs-info-val">
                      {typeof selectedTicket.handledBy === 'object' && selectedTicket.handledBy !== null
                        ? (selectedTicket.handledBy as any).name
                        : String(selectedTicket.handledBy || 'Unassigned')}
                    </span>
                  </div>
                  {isSupportAgentRole && (
                    <div className="cs-info-row" style={{ marginTop: '12px' }}>
                      <span className="cs-info-label">Change Status:</span>
                      <select
                        className="cs-status-select"
                        value={(selectedTicket.status || 'OPEN').toUpperCase()}
                        onChange={(e) => handleStatusChange(selectedTicket.id, e.target.value)}
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Tab 3: Attachments View */}
            {activeRightTab === 'attachments' && (
              <div className="cs-tab-attachments-container">
                {selectedTicket.attachmentUrl ? (
                  <div className="cs-attachment-item">
                    <FileText size={22} className="cs-file-icon" />
                    <div className="cs-attachment-info">
                      <span className="cs-file-name">Support_Proof_Attachment.pdf</span>
                      <span className="cs-file-size">Attached Evidence</span>
                    </div>
                    <a
                      href={selectedTicket.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cs-download-btn"
                      title="Download Attachment"
                    >
                      <Download size={16} />
                    </a>
                  </div>
                ) : (
                  <div className="cs-no-attachments">
                    <Paperclip size={32} />
                    <p>No attachments uploaded for this support ticket.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="cs-no-selection-card desktop-only">
            <Headset size={44} className="cs-empty-icon" />
            <h3>Select a Support Ticket</h3>
            <p>
              Click any ticket from the list to inspect details, review worker grievances, and reply
              in real-time.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
