import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Send,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Building2,
  AlertCircle,
  Loader2,
  Headphones
} from 'lucide-react';
import {
  fetchSupportMessagesApi,
  sendSupportMessageApi,
  raiseTicketFromChatApi,
  type SupportAgentMessageItem
} from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType } from '../types';
import './SupportFieldAgentsView.css';

interface AgentSupportChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserType | null;
  workingSiteName?: string;
}

export const AgentSupportChatDrawer: React.FC<AgentSupportChatDrawerProps> = ({
  isOpen,
  onClose,
  user,
  workingSiteName = 'Active Working Site'
}) => {
  const [messages, setMessages] = useState<SupportAgentMessageItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatMessageType, setChatMessageType] = useState<'TEXT' | 'EQUIPMENT_REQUEST' | 'EMERGENCY'>('TEXT');
  const [isSendingMessage, setIsSendingMessage] = useState<boolean>(false);

  // Raise Ticket Modal State
  const [isRaiseTicketOpen, setIsRaiseTicketOpen] = useState<boolean>(false);
  const [ticketSubject, setTicketSubject] = useState<string>('Emergency / Equipment Issue at Field');
  const [ticketDescription, setTicketDescription] = useState<string>('');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [isRaisingTicket, setIsRaisingTicket] = useState<boolean>(false);
  const [ticketSuccessMsg, setTicketSuccessMsg] = useState<string | null>(null);
  const [ticketErrorMsg, setTicketErrorMsg] = useState<string | null>(null);
  const [onlineUserIds, setOnlineUserIds] = useState<Set<number>>(new Set());

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const supportAgentName = (user as any)?.managedBySupport?.name || 'Customer Support Desk';
  const supportAgentCode =
    (user as any)?.managedBySupport?.employeeCode ||
    ((user as any)?.managedBySupportId ? `CSA-${String((user as any).managedBySupportId).padStart(3, '0')}` : 'CSA-001');
  const agentCode = user?.employeeCode || (user?.id ? `AGT-${String(user.id).padStart(3, '0')}` : 'AGT');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadMessages = async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const msgs = await fetchSupportMessagesApi(user.id);
      setMessages(Array.isArray(msgs) ? msgs : []);
    } catch (err) {
      console.error('Failed to load support messages:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Load messages when drawer opens
  useEffect(() => {
    if (isOpen && user?.id) {
      loadMessages();
    }
  }, [isOpen, user?.id]);

  // Scroll on new messages
  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Socket.io Real-Time Listener
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
      if (user?.id && (Number(msg.fieldAgentId) === Number(user.id) || Number(msg.senderId) === Number(user.id))) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
    };

    socket.on('users:online', handleOnlineUsers);
    socket.on('user:status:changed', handleUserStatusChange);
    socket.on('support_message', handleNewMessage);
    socket.on('ticket:created', () => {
      if (isOpen && user?.id) loadMessages();
    });
    socket.emit('get:online_users');

    return () => {
      socket.off('users:online', handleOnlineUsers);
      socket.off('user:status:changed', handleUserStatusChange);
      socket.off('support_message', handleNewMessage);
      socket.off('ticket:created');
    };
  }, [user?.id, isOpen]);

  // Send Message Handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || !user?.id || isSendingMessage) return;

    const messageText = chatInput.trim();
    const currentType = chatMessageType;
    setChatInput('');
    setIsSendingMessage(true);

    try {
      const supportAgentId = (user as any)?.managedBySupportId || 1;
      const newMsg = await sendSupportMessageApi({
        supportAgentId: Number(supportAgentId),
        fieldAgentId: Number(user.id),
        message: messageText,
        messageType: currentType,
      });

      if (newMsg) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
      setChatMessageType('TEXT');
    } catch (err) {
      console.error('Failed to send support message:', err);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Raise Ticket Handler
  const handleRaiseTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDescription.trim() || !user?.id || isRaisingTicket) return;

    setIsRaisingTicket(true);
    setTicketErrorMsg(null);
    try {
      await raiseTicketFromChatApi({
        fieldAgentId: user.id,
        subject: ticketSubject.trim(),
        description: ticketDescription.trim(),
        priority: ticketPriority,
      });

      setTicketSuccessMsg('Support ticket raised successfully!');
      setTimeout(() => {
        setIsRaiseTicketOpen(false);
        setTicketSuccessMsg(null);
        setTicketDescription('');
        loadMessages();
      }, 1200);
    } catch (err: any) {
      setTicketErrorMsg(err.message || 'Failed to raise ticket');
    } finally {
      setIsRaisingTicket(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Viewport Fixed Full Screen Backdrop */}
      <div className="sfa-drawer-backdrop" onClick={onClose}>
        <div
          className="sfa-chat-panel animate-slide-in-right"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Pinned Header */}
          <div
            className="sfa-chat-header"
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#FFFFFF',
              flexShrink: 0,
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '12px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '16px',
                  border: '1.5px solid #BFDBFE',
                  flexShrink: 0
                }}
              >
                {supportAgentName.charAt(0).toUpperCase() || 'C'}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <h4
                    style={{
                      margin: 0,
                      fontSize: '15px',
                      fontWeight: 800,
                      color: '#0F172A',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    {supportAgentName}
                  </h4>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: '#F1F5F9',
                      color: '#475569',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    {supportAgentCode}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#64748B',
                    marginTop: '2px',
                    flexWrap: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {(() => {
                    const supportId = (user as any)?.managedBySupportId;
                    const isOnline = supportId ? onlineUserIds.has(Number(supportId)) : onlineUserIds.size > 0;
                    return (
                      <span
                        style={{
                          color: isOnline ? '#16A34A' : '#64748B',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
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
                            backgroundColor: isOnline ? '#16A34A' : '#94A3B8',
                            display: 'inline-block'
                          }}
                        />
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    );
                  })()}
                  <span>•</span>
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontWeight: 500,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    <Building2 size={12} /> {workingSiteName || 'Site Location'}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <button
                type="button"
                onClick={() => setIsRaiseTicketOpen(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #FECACA',
                  backgroundColor: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <ShieldAlert size={14} />
                <span>Raise Ticket</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="sfa-drawer-close"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  cursor: 'pointer',
                  padding: '6px',
                  borderRadius: '8px'
                }}
                title="Close chat"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Chat Messages Body (Scrollable) */}
          <div
            className="sfa-chat-messages"
            style={{
              flex: 1,
              padding: '18px 20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
              backgroundColor: '#F8FAFC'
            }}
          >
            {isLoading ? (
              <div style={{ padding: '40px 16px', textAlign: 'center', color: '#64748B' }}>
                <Loader2 size={28} className="spinner" style={{ margin: '0 auto 10px auto', display: 'block' }} />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Loading support conversation...</span>
              </div>
            ) : messages.length === 0 ? (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: '#64748B',
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px solid #E2E8F0',
                  margin: 'auto 0'
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: '#EFF6FF',
                    color: '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px auto'
                  }}
                >
                  <Headphones size={24} />
                </div>
                <h5 style={{ margin: '0 0 6px 0', fontSize: '15px', fontWeight: 800, color: '#0F172A' }}>
                  Support Desk Coordinator
                </h5>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: '#64748B' }}>
                  Direct communication with Customer Support ({supportAgentCode}). Send notes, report equipment requirements,
                  alert emergencies, or raise official tickets.
                </p>
              </div>
            ) : (
              messages.map((m) => {
                const isMe = Number(m.senderId) === Number(user?.id);

                const senderInfo = isMe
                  ? {
                      name: user?.name || m.sender?.name || 'Agent',
                      code: m.sender?.employeeCode || agentCode,
                      role: 'Field Agent',
                      headerLabel: `${user?.name || m.sender?.name || 'Agent'} (Field Agent • ${m.sender?.employeeCode || agentCode})`,
                    }
                  : {
                      name: m.sender?.name || supportAgentName,
                      code: m.sender?.employeeCode || supportAgentCode,
                      role: 'Support Agent',
                      headerLabel: `${m.sender?.name || supportAgentName} (Support Agent • ${m.sender?.employeeCode || supportAgentCode})`,
                    };

                // 1. TICKET CREATED BANNER
                if (m.messageType === 'TICKET_RAISED') {
                  return (
                    <div
                      key={m.id}
                      style={{
                        backgroundColor: '#ECFDF5',
                        border: '1.5px solid #10B981',
                        borderRadius: '14px',
                        padding: '14px 16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                        width: '100%'
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          color: '#065F46',
                          fontSize: '11px',
                          fontWeight: 800,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase'
                        }}
                      >
                        <CheckCircle2 size={15} />
                        <span>TICKET CREATED</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#064E3B', lineHeight: 1.4 }}>
                        {m.message}
                      </p>
                      <span
                        style={{
                          fontSize: '10.5px',
                          color: '#047857',
                          textAlign: 'right',
                          fontWeight: 600,
                          marginTop: '2px'
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                }

                // 2. EQUIPMENT REQUEST CARD (Clear Amber Card)
                if (m.messageType === 'EQUIPMENT_REQUEST') {
                  return (
                    <div
                      key={m.id}
                      className={`sfa-msg-row ${isMe ? 'outgoing' : 'incoming'}`}
                      style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}
                    >
                      <div
                        style={{
                          maxWidth: '88%',
                          backgroundColor: '#FEF3C7',
                          border: '1.5px solid #F59E0B',
                          borderRadius: '14px',
                          padding: '12px 16px',
                          boxShadow: '0 2px 5px rgba(217, 119, 6, 0.1)',
                          borderBottomRightRadius: isMe ? '2px' : '14px',
                          borderBottomLeftRadius: isMe ? '14px' : '2px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '6px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: '#92400E',
                              letterSpacing: '0.04em'
                            }}
                          >
                            <Wrench size={13} />
                            <span>Equipment Request</span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#B45309' }}>
                            {senderInfo.name} ({senderInfo.role} • {senderInfo.code})
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            color: '#78350F',
                            fontSize: '13.5px',
                            fontWeight: 600,
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                          }}
                        >
                          {m.message}
                        </p>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10.5px',
                            color: '#B45309',
                            marginTop: '6px',
                            textAlign: 'right',
                            fontWeight: 600
                          }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                }

                // 3. EMERGENCY NOTICE CARD (Clear Crimson Card)
                if (m.messageType === 'EMERGENCY') {
                  return (
                    <div
                      key={m.id}
                      className={`sfa-msg-row ${isMe ? 'outgoing' : 'incoming'}`}
                      style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}
                    >
                      <div
                        style={{
                          maxWidth: '88%',
                          backgroundColor: '#FEE2E2',
                          border: '1.5px solid #EF4444',
                          borderRadius: '14px',
                          padding: '12px 16px',
                          boxShadow: '0 2px 5px rgba(220, 38, 38, 0.1)',
                          borderBottomRightRadius: isMe ? '2px' : '14px',
                          borderBottomLeftRadius: isMe ? '14px' : '2px'
                        }}
                      >
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                            marginBottom: '6px',
                            flexWrap: 'wrap'
                          }}
                        >
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              fontSize: '11px',
                              fontWeight: 800,
                              textTransform: 'uppercase',
                              color: '#B91C1C',
                              letterSpacing: '0.04em'
                            }}
                          >
                            <ShieldAlert size={13} />
                            <span>Emergency Notice</span>
                          </div>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#DC2626' }}>
                            {senderInfo.name} ({senderInfo.role} • {senderInfo.code})
                          </span>
                        </div>
                        <p
                          style={{
                            margin: 0,
                            color: '#991B1B',
                            fontSize: '13.5px',
                            fontWeight: 700,
                            lineHeight: 1.45,
                            wordBreak: 'break-word'
                          }}
                        >
                          {m.message}
                        </p>
                        <span
                          style={{
                            display: 'block',
                            fontSize: '10.5px',
                            color: '#DC2626',
                            marginTop: '6px',
                            textAlign: 'right',
                            fontWeight: 600
                          }}
                        >
                          {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  );
                }

                // 4. STANDARD DIRECT TEXT NOTE
                return (
                  <div
                    key={m.id}
                    className={`sfa-msg-row ${isMe ? 'outgoing' : 'incoming'}`}
                    style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', width: '100%' }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        padding: '12px 16px',
                        borderRadius: '14px',
                        fontSize: '13.5px',
                        lineHeight: 1.45,
                        backgroundColor: isMe ? '#2563EB' : '#FFFFFF',
                        color: isMe ? '#FFFFFF' : '#0F172A',
                        border: isMe ? 'none' : '1px solid #E2E8F0',
                        borderBottomRightRadius: isMe ? '2px' : '14px',
                        borderBottomLeftRadius: isMe ? '14px' : '2px',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.04)'
                      }}
                    >
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
                          {senderInfo.name}
                        </span>
                        <span>•</span>
                        <span>{senderInfo.role} ({senderInfo.code})</span>
                      </div>

                      <p style={{ margin: 0, wordBreak: 'break-word' }}>{m.message}</p>
                      <span
                        style={{
                          display: 'block',
                          fontSize: '10.5px',
                          opacity: isMe ? 0.85 : 0.65,
                          marginTop: '5px',
                          textAlign: 'right',
                          fontWeight: 500
                        }}
                      >
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Pinned Footer (Pills & Input) */}
          <form
            onSubmit={handleSendMessage}
            style={{
              padding: '14px 20px',
              backgroundColor: '#FFFFFF',
              borderTop: '1px solid #E2E8F0',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              flexShrink: 0
            }}
          >
            {/* Quick Action Pills */}
            <div
              className="sfa-tag-pills"
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                whiteSpace: 'nowrap',
                paddingBottom: '2px'
              }}
            >
              <button
                type="button"
                onClick={() => setChatMessageType('TEXT')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: chatMessageType === 'TEXT' ? '#2563EB' : '#CBD5E1',
                  backgroundColor: chatMessageType === 'TEXT' ? '#2563EB' : '#FFFFFF',
                  color: chatMessageType === 'TEXT' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                💬 Note
              </button>

              <button
                type="button"
                onClick={() => setChatMessageType('EQUIPMENT_REQUEST')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: chatMessageType === 'EQUIPMENT_REQUEST' ? '#D97706' : '#CBD5E1',
                  backgroundColor: chatMessageType === 'EQUIPMENT_REQUEST' ? '#D97706' : '#FFFFFF',
                  color: chatMessageType === 'EQUIPMENT_REQUEST' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                🛠️ Equipment
              </button>

              <button
                type="button"
                onClick={() => setChatMessageType('EMERGENCY')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '16px',
                  fontSize: '12px',
                  fontWeight: 700,
                  border: '1px solid',
                  borderColor: chatMessageType === 'EMERGENCY' ? '#DC2626' : '#CBD5E1',
                  backgroundColor: chatMessageType === 'EMERGENCY' ? '#DC2626' : '#FFFFFF',
                  color: chatMessageType === 'EMERGENCY' ? '#FFFFFF' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                🚨 Emergency
              </button>
            </div>

            {/* Input & Send Button */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                placeholder={
                  chatMessageType === 'EQUIPMENT_REQUEST'
                    ? 'Specify tools/equipment needed at site...'
                    : chatMessageType === 'EMERGENCY'
                    ? 'Describe emergency situation at site...'
                    : 'Type a message to Customer Support (CSA)...'
                }
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13.5px',
                  outline: 'none',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  minWidth: 0
                }}
              />
              <button
                type="submit"
                disabled={isSendingMessage || !chatInput.trim()}
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isSendingMessage || !chatInput.trim() ? '#94A3B8' : '#2563EB',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: isSendingMessage || !chatInput.trim() ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                  flexShrink: 0
                }}
              >
                {isSendingMessage ? <Loader2 size={18} className="spinner" /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          In-Drawer Modal: Raise Support Ticket
         ───────────────────────────────────────────────────────────────────────────── */}
      {isRaiseTicketOpen && (
        <div
          className="sfa-modal-backdrop"
          onClick={() => setIsRaiseTicketOpen(false)}
        >
          <div
            className="sfa-modal-box"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '500px', maxWidth: '100%', backgroundColor: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.2)' }}
          >
            <div className="sfa-modal-header" style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#F8FAFC' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#DC2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldAlert size={18} />
                <span>Raise Support Ticket to CSA</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsRaiseTicketOpen(false)}
                className="sfa-drawer-close"
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRaiseTicket} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {ticketSuccessMsg && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle2 size={16} />
                  <span>{ticketSuccessMsg}</span>
                </div>
              )}

              {ticketErrorMsg && (
                <div style={{ padding: '12px 14px', borderRadius: '8px', backgroundColor: '#FEF2F2', color: '#991B1B', fontSize: '13px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={16} />
                  <span>{ticketErrorMsg}</span>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Subject / Issue Title <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  required
                  value={ticketSubject}
                  onChange={(e) => setTicketSubject(e.target.value)}
                  placeholder="e.g. Concrete Mixer Failure at North Block"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Priority Level
                  </label>
                  <select
                    value={ticketPriority}
                    onChange={(e) => setTicketPriority(e.target.value as any)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13px', outline: 'none', backgroundColor: '#FFFFFF' }}
                  >
                    <option value="LOW">🟢 Low</option>
                    <option value="MEDIUM">🟡 Medium</option>
                    <option value="HIGH">🟠 High</option>
                    <option value="URGENT">🔴 Urgent (Emergency)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                    Reporting Agent
                  </label>
                  <input
                    type="text"
                    disabled
                    value={`${user?.name || 'Agent'} (${agentCode})`}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '13px', backgroundColor: '#F1F5F9', color: '#64748B' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '6px' }}>
                  Detailed Description & Site Context <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={ticketDescription}
                  onChange={(e) => setTicketDescription(e.target.value)}
                  placeholder="Provide complete breakdown of the site equipment failure, required safety equipment, or field escalation..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1.5px solid #CBD5E1', fontSize: '13.5px', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsRaiseTicketOpen(false)}
                  style={{ padding: '10px 18px', borderRadius: '8px', border: '1px solid #CBD5E1', backgroundColor: '#FFFFFF', color: '#475569', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRaisingTicket || !ticketDescription.trim()}
                  style={{
                    padding: '10px 20px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: isRaisingTicket ? '#94A3B8' : '#DC2626',
                    color: '#FFFFFF',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: isRaisingTicket ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {isRaisingTicket ? <Loader2 size={16} className="spinner" /> : <ShieldAlert size={16} />}
                  <span>Submit Ticket</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>,
    document.body
  );
};
