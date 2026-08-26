import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Calendar,
  MessageSquare,
  Send,
  Paperclip,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchTicketCommentsApi,
  addTicketCommentApi,
  updateSupportTicketApi,
  replySupportTicketApi,
  closeSupportTicketApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { SupportTicket, TicketComment } from '../types';
import './TicketDetailModal.css';

interface TicketDetailModalProps {
  isOpen: boolean;
  ticket: SupportTicket | null;
  onClose: () => void;
  onRefresh?: () => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  isOpen,
  ticket,
  onClose,
  onRefresh
}) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>('OPEN');
  const [replyText, setReplyText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isTicketAssignedToMe = () => {
    if (!user || !ticket) return false;
    const userIdStr = String(user.id || '');
    const myName = (user.name || '').trim().toLowerCase();
    const hId = (ticket as any).handledById !== undefined && (ticket as any).handledById !== null ? String((ticket as any).handledById) : '';
    const hByObj = (ticket as any).handledBy;
    const hByName = typeof hByObj === 'object' && hByObj !== null ? (hByObj.name || '').trim().toLowerCase() : (typeof hByObj === 'string' ? hByObj.trim().toLowerCase() : '');

    if (hId !== '' && (hId === userIdStr || Number(hId) === Number(user.id))) return true;
    if (hByName !== '' && myName !== '' && (hByName === myName || hByName.includes(myName) || myName.includes(hByName))) return true;
    return false;
  };

  useEffect(() => {
    if (ticket) {
      setCurrentStatus(ticket.status || 'OPEN');
      setReplyText(ticket.reply || '');
      loadComments(ticket.id);
    }
  }, [ticket]);

  useEffect(() => {
    if (!ticket) return;

    const socket = getSocket();
    const handleComment = (data: any) => {
      if (String(data.ticketId) === String(ticket.id)) {
        loadComments(ticket.id);
      }
    };
    const handleUpdate = (data: any) => {
      if (String(data.id) === String(ticket.id)) {
        if (data.status) setCurrentStatus(data.status);
        if (data.reply) setReplyText(data.reply);
      }
    };

    socket.on('ticket:comment', handleComment);
    socket.on('ticket:updated', handleUpdate);

    return () => {
      socket.off('ticket:comment', handleComment);
      socket.off('ticket:updated', handleUpdate);
    };
  }, [ticket]);

  const loadComments = async (ticketId: number | string) => {
    try {
      const data = await fetchTicketCommentsApi(ticketId);
      setComments(data || []);
    } catch {
      setComments([]);
    }
  };

  if (!isOpen || !ticket) return null;

  const getPriorityBadgeClass = (priority?: string) => {
    const p = (priority || '').toUpperCase();
    if (p === 'HIGH' || p === 'URGENT') return 'ticket-priority-badge high';
    if (p === 'MEDIUM') return 'ticket-priority-badge medium';
    return 'ticket-priority-badge low';
  };

  const getStatusBadgeClass = (status?: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'OPEN') return 'ticket-status-badge open';
    if (s === 'IN_PROGRESS') return 'ticket-status-badge in-progress';
    if (s === 'CLOSED' || s === 'RESOLVED') return 'ticket-status-badge closed';
    return 'ticket-status-badge default';
  };

  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    setStatusMessage(null);
    try {
      await addTicketCommentApi(ticket.id, newComment.trim());
      setNewComment('');
      loadComments(ticket.id);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to send comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      if (newStatus === 'CLOSED') {
        await closeSupportTicketApi(ticket.id);
      } else {
        await updateSupportTicketApi(ticket.id, { status: newStatus as any });
      }
      setCurrentStatus(newStatus);
      setStatusMessage(`Ticket status updated to ${newStatus}`);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to update ticket status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendOfficialReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsUpdatingStatus(true);
    setStatusMessage(null);
    try {
      await replySupportTicketApi(ticket.id, replyText.trim());
      setCurrentStatus('IN_PROGRESS');
      setStatusMessage('Official reply added and ticket marked In Progress');
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setStatusMessage(err?.message || 'Failed to send official reply');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const ticketNumberStr = (ticket as any).ticketNumber || ticket.ticketId || (ticket.id ? `#TKT-${ticket.id}` : 'TCK-10');
  const workerName = ticket.workerName || (ticket as any).worker?.name || 'Ramesh Kumar';
  const workerPhone = (ticket as any).worker?.phone || '—';
  const workerEmail = (ticket as any).worker?.email || '—';
  const createdDateStr = ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : '12/8/2026';

  return (
    <div className="ticket-modal-backdrop" onClick={onClose}>
      <div className="ticket-modal-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="ticket-modal-header">
          <div className="header-left-title">
            <span className="ticket-modal-number">{ticketNumberStr}</span>
            {isTicketAssignedToMe() ? (
              <select
                value={(currentStatus || 'OPEN').toUpperCase()}
                onChange={(e) => handleUpdateStatus(e.target.value)}
                disabled={isUpdatingStatus}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  border: '1px solid #CBD5E1',
                  backgroundColor: currentStatus === 'OPEN' ? '#FEF3C7' : currentStatus === 'IN_PROGRESS' ? '#EFF6FF' : currentStatus === 'RESOLVED' ? '#DCFCE7' : '#F1F5F9',
                  color: currentStatus === 'OPEN' ? '#D97706' : currentStatus === 'IN_PROGRESS' ? '#2563EB' : currentStatus === 'RESOLVED' ? '#15803D' : '#475569'
                }}
              >
                <option value="OPEN">OPEN</option>
                <option value="IN_PROGRESS">IN_PROGRESS</option>
                <option value="RESOLVED">RESOLVED</option>
                <option value="CLOSED">CLOSED</option>
              </select>
            ) : (
              <span className={getStatusBadgeClass(currentStatus)}>{currentStatus}</span>
            )}
            <span className={getPriorityBadgeClass(ticket.priority)}>
              {ticket.priority || 'MEDIUM'} PRIORITY
            </span>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="ticket-modal-body">
          {statusMessage && (
            <div className="modal-status-banner">
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Ticket Subject & Description Card */}
          <div className="ticket-detail-card">
            <h2 className="ticket-subject-title">{ticket.subject}</h2>
            <div className="ticket-meta-info">
              <span><Calendar size={14} /> Created: {createdDateStr}</span>
              {ticket.handledBy && <span><User size={14} /> Assigned: {(ticket as any).handledBy?.name || 'Support Agent'}</span>}
            </div>

            <div className="ticket-description-box">
              <h4>Description</h4>
              <p>{ticket.description || 'No detailed description provided.'}</p>
            </div>

            {ticket.attachmentUrl && (
              <div className="ticket-attachment-box">
                <Paperclip size={16} />
                <span>Attachment Proof:</span>
                <a href={ticket.attachmentUrl} target="_blank" rel="noopener noreferrer" className="attachment-link">
                  View Attachment File <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>

          {/* Customer / Worker Information */}
          <div className="customer-info-card">
            <h4>Customer / Worker Details</h4>
            <div className="customer-details-grid">
              <div className="info-item">
                <User size={16} className="info-icon" />
                <div>
                  <span className="info-label">Name</span>
                  <span className="info-value">{workerName}</span>
                </div>
              </div>

              <div className="info-item">
                <Phone size={16} className="info-icon" />
                <div>
                  <span className="info-label">Phone</span>
                  <span className="info-value">{workerPhone}</span>
                </div>
              </div>

              <div className="info-item">
                <Mail size={16} className="info-icon" />
                <div>
                  <span className="info-label">Email</span>
                  <span className="info-value">{workerEmail}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Agent Action Controls */}
          <div className="agent-controls-card">
            <h4>Support Agent Controls</h4>
            <div className="action-buttons-row">
              <button
                className={`status-btn btn-open ${currentStatus === 'OPEN' ? 'active' : ''}`}
                onClick={() => handleUpdateStatus('OPEN')}
                disabled={isUpdatingStatus}
              >
                Mark Open
              </button>
              <button
                className={`status-btn btn-progress ${currentStatus === 'IN_PROGRESS' ? 'active' : ''}`}
                onClick={() => handleUpdateStatus('IN_PROGRESS')}
                disabled={isUpdatingStatus}
              >
                Mark In Progress
              </button>
              <button
                className={`status-btn btn-close ${currentStatus === 'CLOSED' || currentStatus === 'RESOLVED' ? 'active' : ''}`}
                onClick={() => handleUpdateStatus('CLOSED')}
                disabled={isUpdatingStatus}
              >
                Resolve & Close Ticket
              </button>
            </div>

            <form onSubmit={handleSendOfficialReply} className="official-reply-form">
              <label>Official Agent Reply / Solution</label>
              <div className="reply-input-group">
                <input
                  type="text"
                  placeholder="Type official response to worker..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                />
                <button type="submit" disabled={isUpdatingStatus || !replyText.trim()}>
                  Submit Reply
                </button>
              </div>
            </form>
          </div>

          {/* Comments & Discussion Thread */}
          <div className="comments-thread-card">
            <h4>
              <MessageSquare size={18} /> Discussion & Activity Comments ({comments.length})
            </h4>

            <div className="comments-list">
              {comments.length === 0 ? (
                <div className="no-comments-msg">
                  No comments yet on this ticket. Start the conversation below.
                </div>
              ) : (
                comments.map((c) => (
                  <div className={`comment-bubble ${c.authorRole === 'AGENT' || c.authorRole === 'SUPER_AGENT' ? 'agent-comment' : 'worker-comment'}`} key={c.id}>
                    <div className="comment-header">
                      <span className="author-name">{c.authorName || 'User'}</span>
                      <span className="author-role-badge">{c.authorRole || 'WORKER'}</span>
                      <span className="comment-time">
                        {c.createdAt ? new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                    <p className="comment-body">{c.message}</p>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={handleSendComment} className="add-comment-form">
              <input
                type="text"
                placeholder="Write a comment or update note..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <button type="submit" disabled={isSubmittingComment || !newComment.trim()}>
                {isSubmittingComment ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
