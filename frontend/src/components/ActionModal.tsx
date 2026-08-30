import React, { useState, useEffect } from 'react';
import { X, Check, Search, AlertCircle, Loader2, Bell, Send, CheckCheck, Megaphone, Calendar, DollarSign, Wallet, MessageSquare, Paperclip, UploadCloud, Trash2, Clock, Building2, FileSpreadsheet, Camera, Eye, EyeOff, RefreshCw, CheckCircle2, Copy, QrCode, CreditCard } from 'lucide-react';
import {
  registerUserApi,
  updateUserApi,
  assignAgentToSiteApi,
  generatePayrollApi,
  fetchWorkersApi,
  fetchAgentsApi,
  fetchSitesApi,
  assignWorkerToAgentApi,
  applyLeaveApi,
  createSiteApi,
  markAttendanceApi,
  createSupportTicketApi,
  replySupportTicketApi,
  closeSupportTicketApi,
  updateSupportTicketApi,
  fetchTicketCommentsApi,
  addTicketCommentApi,
  createInsuranceApi,
  updateInsuranceApi,
  fetchNotificationsApi,
  markNotificationReadApi,
  markAllNotificationsReadApi,
  sendNotificationApi,
  triggerSaturdayAuditNotificationApi,
  clearAllNotificationsApi,
  deleteNotificationApi,
  sendEmailVerificationCodeApi,
  verifyEmailCodeApi,
  createRazorpayOrderApi
} from '../services/api';
import type { WorkerItem, AgentItem, SiteItem, SupportTicket, TicketComment, NotificationItem } from '../types';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import { UserAvatar } from './UserAvatar';
import './ActionModal.css';

interface ActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
  targetAgentId?: string;
  targetAgentName?: string;
  targetSiteId?: string;
  targetSiteName?: string;
  targetWorker?: WorkerItem | null;
  targetTicket?: SupportTicket | null;
  targetInsurance?: any | null;
  onSuccessRefresh?: () => void;
  onApplyDateRange?: (startDate: string, endDate: string, label: string) => void;
}

export const ActionModal: React.FC<ActionModalProps> = ({
  isOpen,
  onClose,
  type,
  targetAgentId,
  targetAgentName,
  targetSiteId,
  targetSiteName,
  targetWorker,
  targetTicket,
  targetInsurance,
  onSuccessRefresh,
  onApplyDateRange
}) => {
  const { user, role } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Notification modal states
  const [notifTab, setNotifTab] = useState<'inbox' | 'send'>('inbox');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifs, setIsLoadingNotifs] = useState(false);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType, setNotifType] = useState('ANNOUNCEMENT');
  const [notifTargetRole, setNotifTargetRole] = useState('ALL');
  const [isSendingNotif, setIsSendingNotif] = useState(false);

  // Loaded list of workers, agents & sites for dropdowns
  const [workersList, setWorkersList] = useState<WorkerItem[]>([]);
  const [agentsList, setAgentsList] = useState<AgentItem[]>([]);
  const [sitesList, setSitesList] = useState<SiteItem[]>([]);
  const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [workerSearchQuery, setWorkerSearchQuery] = useState<string>('');
  const [isWorkerSearchOpen, setIsWorkerSearchOpen] = useState<boolean>(false);

  // Worker Photo & Camera States
  const [workerAvatar, setWorkerAvatar] = useState<string>('');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  // Attendance Live Photo & 8-Hour Rule States
  const [signInPhoto, setSignInPhoto] = useState<string>('');
  const [signOutPhoto, setSignOutPhoto] = useState<string>('');
  const [signInTime, setSignInTime] = useState<string>('08:00 AM');
  const [signOutTime, setSignOutTime] = useState<string>('05:00 PM');
  const [signInTimestamp, setSignInTimestamp] = useState<number | null>(null);
  const [activePhotoCaptureType, setActivePhotoCaptureType] = useState<'SIGN_IN' | 'SIGN_OUT' | null>(null);
  const [bypass8HourCheck, setBypass8HourCheck] = useState<boolean>(false);

  // Email Verification State for Register Worker/Agent
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);

  const startAttendancePhotoCamera = async (type: 'SIGN_IN' | 'SIGN_OUT') => {
    setActivePhotoCaptureType(type);
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert('Unable to access camera. Please allow webcam permissions or upload photo.');
      setIsCameraActive(false);
      setActivePhotoCaptureType(null);
    }
  };

  const captureAttendancePhotoSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 320;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 320, 320);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (activePhotoCaptureType === 'SIGN_IN') {
        setSignInPhoto(dataUrl);
        setSignInTime(nowStr);
        setSignInTimestamp(Date.now());
      } else if (activePhotoCaptureType === 'SIGN_OUT') {
        setSignOutPhoto(dataUrl);
        setSignOutTime(nowStr);
      }
    }
    stopCamera();
    setActivePhotoCaptureType(null);
  };

  const startCamera = async () => {
    setIsCameraActive(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      alert('Unable to access camera. Please allow camera permissions or upload photo from device gallery.');
      setIsCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const captureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 300, 300);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      setWorkerAvatar(dataUrl);
    }
    stopCamera();
  };

  const handleGalleryFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setWorkerAvatar(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Form states for Register Agent / Register Worker / Add Site
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [designation, setDesignation] = useState('');
  const [salary, setSalary] = useState('');
  const [password, setPassword] = useState('');

  // New Agent Registration Bank & Payment States
  const [bankAccountNo, setBankAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [agentAddress, setAgentAddress] = useState('');
  const [registrationAmount, setRegistrationAmount] = useState('500');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI'>('CASH');
  const [upiTransactionId, setUpiTransactionId] = useState('');
  const [copiedUpiId, setCopiedUpiId] = useState(false);

  const handleCopyUpiId = () => {
    try {
      navigator.clipboard.writeText('laborunion@upi');
      setCopiedUpiId(true);
      setTimeout(() => setCopiedUpiId(false), 2000);
    } catch (e) {}
  };

  // Agent OTP & Temp Password States
  const [showPassword, setShowPassword] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);

  const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Agent#${randStr}`;
  };

  const generateWorkerTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randStr = '';
    for (let i = 0; i < 6; i++) {
      randStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Worker#${randStr}`;
  };

  // Site Form States
  const [siteName, setSiteName] = useState('');
  const [siteCode, setSiteCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [siteStatus, setSiteStatus] = useState('IN_PROGRESS');

  // Attendance Form States
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceStatus, setAttendanceStatus] = useState<'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY'>('PRESENT');
  const [overtimeHours, setOvertimeHours] = useState('2');
  const [attendanceRemarks, setAttendanceRemarks] = useState('Regular shift completed');

  // Payroll states
  const [payrollScope, setPayrollScope] = useState('ALL');
  const [weekStart, setWeekStart] = useState('2025-05-15');
  const [weekEnd, setWeekEnd] = useState('2025-05-21');

  // Leave Form States
  const [leaveCategory, setLeaveCategory] = useState('');
  const [leaveFromDate, setLeaveFromDate] = useState('');
  const [leaveToDate, setLeaveToDate] = useState('');
  const [leaveReason, setLeaveReason] = useState('');

  // Insurance Form States
  const [insuranceProvider, setInsuranceProvider] = useState('');
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState('');
  const [insuranceCoverage, setInsuranceCoverage] = useState('');
  const [insurancePremium, setInsurancePremium] = useState('');
  const [insuranceEndDate, setInsuranceEndDate] = useState('');
  const [insuranceStatus, setInsuranceStatus] = useState('ACTIVE');

  // Date Range Module States
  const [rangePreset, setRangePreset] = useState<'custom' | 'today' | 'last_7_days' | 'last_30_days' | 'this_month'>('last_7_days');
  const [rangeStart, setRangeStart] = useState<string>(() => {
    const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [rangeEnd, setRangeEnd] = useState<string>(() => new Date().toISOString().split('T')[0]);

  const applyPreset = (preset: 'today' | 'last_7_days' | 'last_30_days' | 'this_month') => {
    setRangePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setRangeEnd(todayStr);

    if (preset === 'today') {
      setRangeStart(todayStr);
    } else if (preset === 'last_7_days') {
      const d = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      setRangeStart(d.toISOString().split('T')[0]);
    } else if (preset === 'last_30_days') {
      const d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      setRangeStart(d.toISOString().split('T')[0]);
    } else if (preset === 'this_month') {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      setRangeStart(d.toISOString().split('T')[0]);
    }
  };

  // Support Ticket Form States
  const [ticketSubject, setTicketSubject] = useState('Safety Equipment & PPE Request');
  const [ticketPriority, setTicketPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [ticketDescription, setTicketDescription] = useState('');
  const [ticketWorkerId, setTicketWorkerId] = useState('');
  const [ticketAgentId, setTicketAgentId] = useState('');
  const [ticketReplyText, setTicketReplyText] = useState('');
  const [closeOnReply, setCloseOnReply] = useState(false);

  // Edit & Comment Ticket States
  const [editTicketStatus, setEditTicketStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'>('OPEN');
  const [commentsList, setCommentsList] = useState<TicketComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // File Attachment States
  const [attachmentDataUrl, setAttachmentDataUrl] = useState<string>('');
  const [attachmentName, setAttachmentName] = useState<string>('');
  const [attachmentSize, setAttachmentSize] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setErrorMsg('File size exceeds 5MB limit');
        return;
      }
      setAttachmentName(file.name);
      setAttachmentSize(`${(file.size / 1024).toFixed(1)} KB`);

      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachmentDataUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAttachment = () => {
    setAttachmentDataUrl('');
    setAttachmentName('');
    setAttachmentSize('');
  };

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setTicketSubject('Safety Equipment & PPE Request');
      setTicketPriority('MEDIUM');
      setTicketDescription('');
      setTicketAgentId('');
      setTicketReplyText('');
      setCloseOnReply(false);
      removeAttachment();

      if ((type === 'edit_ticket' || type === 'edit') && targetTicket) {
        setTicketSubject(targetTicket.subject || '');
        setTicketPriority(targetTicket.priority || 'MEDIUM');
        setTicketDescription(targetTicket.description || '');
        setEditTicketStatus(targetTicket.status || 'OPEN');
      }

      if ((type === 'comment_ticket' || type === 'comment') && targetTicket) {
        setIsLoadingComments(true);
        setCommentsList([]);
        setNewCommentText('');
        fetchTicketCommentsApi(targetTicket.id)
          .then((data) => {
            setCommentsList(data);
            setIsLoadingComments(false);
          })
          .catch(() => setIsLoadingComments(false));
      }

      if (type === 'edit_worker' && targetWorker) {
        setName(targetWorker.name || '');
        setEmail(targetWorker.email || '');
        setPhone(targetWorker.phone || '');
        setEmployeeCode(targetWorker.employeeCode || '');
        setDesignation(targetWorker.designation || '');
        setSalary(targetWorker.dailyWage ? String(targetWorker.dailyWage * 30) : '');
        setWorkerAvatar(targetWorker.avatar || '');
        setPassword('');
      } else {
        setName('');
        setEmail('');
        setEmployeeCode('');
        setPhone('');
        setSalary('');
        setPassword(
          type === 'add_agent' || type === 'agents'
            ? generateTempPassword()
            : type === 'add_worker' || type === 'workers'
            ? generateWorkerTempPassword()
            : ''
        );
        setDesignation('');
        setWorkerAvatar('');
        setSelectedSiteId('');
        setIsEmailVerified(false);
        setVerificationOtp('');
        setIsSendingOtp(false);
        setIsVerifyingOtp(false);
        setOtpSentMessage(null);
        setShowPassword(false);
        setBankAccountNo('');
        setIfscCode('');
        setAgentAddress('');
        setRegistrationAmount('500');
        setPaymentMethod('CASH');
        setUpiTransactionId('');
      }
      setSiteName('');
      setSiteCode('');
      setCompanyName('');
      setAddress('');
      setCity('');
      setState('');
      setPincode('');
      setContactPerson('');
      setContactNumber('');
      setLeaveCategory('');
      setLeaveFromDate('');
      setLeaveToDate('');
      setLeaveReason('');
      setInsuranceProvider('');
      setInsurancePolicyNumber('');
      setInsuranceCoverage('');
      setInsurancePremium('');
      setInsuranceEndDate('');
    }

    if (isOpen && (type === 'assign_agent' || type === 'add_agent' || type === 'agents' || type === 'add_worker' || type === 'workers' || type === 'add_site' || type === 'sites')) {
      fetchSitesApi().then((sites) => {
        setSitesList(sites);
        if (targetSiteId) {
          setSelectedSiteId(targetSiteId);
        }
      }).catch(() => {});
    }

    if (isOpen && (type === 'add_insurance' || type === 'insurance' || type === 'edit_insurance')) {
      Promise.all([fetchWorkersApi(), fetchAgentsApi()]).then(([workers, agents]) => {
        const combined = [
          ...workers.map(w => ({ ...w, memberRole: 'WORKER' })),
          ...agents.map(a => ({ ...a, memberRole: 'AGENT' }))
        ];
        setWorkersList(combined as any);

        if (type === 'edit_insurance' && targetInsurance) {
          setSelectedWorkerId(String(targetInsurance.dbWorkerId || targetInsurance.workerId || targetInsurance.worker?.id || ''));
          setInsuranceProvider(targetInsurance.provider || '');
          setInsurancePolicyNumber(targetInsurance.policyNumber || '');
          setInsuranceCoverage(targetInsurance.coverageAmount ? String(targetInsurance.coverageAmount) : '');
          setInsurancePremium(targetInsurance.premiumAmount ? String(targetInsurance.premiumAmount) : '');
          setInsuranceStatus(targetInsurance.status || 'ACTIVE');
          if (targetInsurance.rawEndDate) {
            try {
              const d = new Date(targetInsurance.rawEndDate);
              if (!isNaN(d.getTime())) setInsuranceEndDate(d.toISOString().split('T')[0]);
            } catch (e) {}
          } else if (targetInsurance.endDate) {
            try {
              const d = new Date(targetInsurance.endDate);
              if (!isNaN(d.getTime())) setInsuranceEndDate(d.toISOString().split('T')[0]);
            } catch (e) {}
          }
        } else {
          if (combined.length > 0) {
            setSelectedWorkerId(combined[0].id);
          }
          setInsuranceProvider('');
          setInsurancePolicyNumber('');
          setInsuranceCoverage('');
          setInsurancePremium('');
          setInsuranceEndDate('');
          setInsuranceStatus('ACTIVE');
        }
      }).catch(() => {});
    }

    if (isOpen && (type === 'assign_agent' || type === 'assign_worker' || type === 'add_worker' || type === 'edit_worker' || type === 'mark_attendance' || type === 'attendance' || type === 'create_ticket' || type === 'apply_leave' || type === 'leaves')) {
      fetchWorkersApi().then((list) => {
        setWorkersList(list);
        if (list.length > 0) {
          setSelectedWorkerId(list[0].id);
          setTicketWorkerId(role === 'WORKER' && user?.id ? String(user.id) : list[0].id);
        }
        if (type === 'add_worker') {
          const existingNums = list
            .map(w => Number(String(w.employeeCode || w.id).replace(/\D/g, '')))
            .filter(n => !isNaN(n) && n > 0);
          const maxNum = existingNums.length > 0 ? Math.max(...existingNums) : list.length;
          const freshCode = `WRK-${(maxNum + 1).toString().padStart(3, '0')}`;
          setEmployeeCode(freshCode);
        }
      }).catch(() => {});

      fetchAgentsApi().then((list) => {
        setAgentsList(list);
        if (list.length > 0) setSelectedAgentId(targetAgentId || list[0].id);
      }).catch(() => {});
    }
  }, [isOpen, type, targetAgentId, targetWorker, targetTicket]);

  useEffect(() => {
    if (isOpen && type === 'notifications') {
      setIsLoadingNotifs(true);
      fetchNotificationsApi()
        .then((data) => setNotifications(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingNotifs(false));

      const socket = getSocket();
      const handleNewNotification = (newNotif: NotificationItem) => {
        setNotifications((prev) => [newNotif, ...prev]);
      };
      socket.on('notification', handleNewNotification);
      return () => {
        socket.off('notification', handleNewNotification);
      };
    }
  }, [isOpen, type]);

  const handleMarkRead = async (notifId: string | number) => {
    try {
      await markNotificationReadApi(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true, unread: false } : n))
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsReadApi();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, isRead: true, unread: false }))
      );
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      await clearAllNotificationsApi();
      setNotifications([]);
    } catch (err: any) {
      console.error('Failed to clear all notifications:', err);
    }
  };

  const handleSendAgentOtp = async () => {
    if (!email || !email.trim() || !email.includes('@')) {
      setErrorMsg('Please enter a valid agent email address first.');
      return;
    }
    setIsSendingOtp(true);
    setErrorMsg(null);
    try {
      await sendEmailVerificationCodeApi(email.trim(), name.trim() || 'Agent');
      setOtpSentMessage(`Verification code sent to ${email.trim()}`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyAgentOtp = async () => {
    if (!verificationOtp || verificationOtp.trim().length !== 6) {
      setErrorMsg('Please enter 6-digit verification code.');
      return;
    }
    setIsVerifyingOtp(true);
    setErrorMsg(null);
    try {
      await verifyEmailCodeApi(email.trim(), verificationOtp.trim());
      setIsEmailVerified(true);
      setOtpSentMessage(null);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Invalid or expired verification code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const handleDeleteNotification = async (notifId: number | string) => {
    try {
      await deleteNotificationApi(notifId);
      setNotifications((prev) => prev.filter((n) => String(n.id) !== String(notifId)));
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleTriggerSaturdayAudit = async () => {
    try {
      await triggerSaturdayAuditNotificationApi();
      const fresh = await fetchNotificationsApi();
      setNotifications(fresh);
    } catch (err: any) {
      console.error('Failed to trigger Saturday audit notification:', err);
    }
  };

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setErrorMsg('Please provide both title and message.');
      return;
    }
    setIsSendingNotif(true);
    setErrorMsg(null);
    try {
      await sendNotificationApi({
        title: notifTitle,
        message: notifMessage,
        type: notifType,
        targetRole: notifTargetRole,
      });
      setNotifTitle('');
      setNotifMessage('');
      setNotifTab('inbox');
      const fresh = await fetchNotificationsApi();
      setNotifications(fresh);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send notification');
    } finally {
      setIsSendingNotif(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (type === 'date_range') {
      let label = `${rangeStart} to ${rangeEnd}`;
      if (rangePreset === 'today') label = 'Today';
      else if (rangePreset === 'last_7_days') label = 'Last 7 Days';
      else if (rangePreset === 'last_30_days') label = 'Last 30 Days';
      else if (rangePreset === 'this_month') label = 'This Month';
      else {
        const s = new Date(rangeStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const e = new Date(rangeEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        label = `${s} - ${e}`;
      }

      if (onApplyDateRange) {
        onApplyDateRange(rangeStart, rangeEnd, label);
      }
      onClose();
      return;
    }

    if (type === 'assign_agent') {
      const activeSiteId = targetSiteId || selectedSiteId;
      if (!activeSiteId) {
        setErrorMsg('Please select a target working site');
        return;
      }
      if (!selectedAgentId) {
        setErrorMsg('Please select a field agent to assign to this site');
        return;
      }

      setIsLoading(true);
      try {
        await assignAgentToSiteApi(selectedAgentId, activeSiteId);
        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to assign agent to working site');
      }
      return;
    }

    if (type === 'add_site' || type === 'sites') {
      if (!siteName || siteName.trim().length < 3) {
        setErrorMsg('Please enter a valid site name (at least 3 characters)');
        return;
      }

      setIsLoading(true);
      try {
        await createSiteApi({
          siteCode: siteCode || `SITE-${Date.now().toString().slice(-4)}`,
          siteName: siteName.trim(),
          companyName: companyName || 'Labor Union Org',
          address: address || 'Main Site Rd',
          city: city || 'Mumbai',
          state: state || 'Maharashtra',
          pincode: pincode || '400001',
          contactPerson: contactPerson || 'Site Supervisor',
          contactNumber: contactNumber || '9876543210',
          status: siteStatus || 'IN_PROGRESS'
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to create site');
      }
    } else if (type === 'mark_attendance' || type === 'attendance') {
      const targetWorker = selectedWorkerId || (workersList.length > 0 ? workersList[0].id : '');
      if (!targetWorker) {
        setErrorMsg('Please select a valid worker to mark attendance');
        return;
      }

      const numericWorkerId = Number(String(targetWorker).replace(/\D/g, '')) || Number(targetWorker) || 1;

      setIsLoading(true);
      try {
        await markAttendanceApi({
          workerId: numericWorkerId,
          date: attendanceDate,
          status: attendanceStatus,
          overtimeHours: Number(overtimeHours) || 0,
          remarks: attendanceRemarks,
          signInPhoto,
          signOutPhoto,
          signInTime,
          signOutTime
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to mark attendance');
      }
    } else if (type === 'apply_agent_leave' || type === 'apply_leave' || type === 'leaves') {
      if (!leaveFromDate || !leaveToDate) {
        setErrorMsg('Please select both From Date and To Date for leave');
        return;
      }
      if (!leaveReason || leaveReason.trim().length < 3) {
        setErrorMsg('Please enter a valid reason for leave (at least 3 characters)');
        return;
      }

      setIsLoading(true);
      try {
        await applyLeaveApi({
          workerId: type === 'apply_agent_leave' ? undefined : (selectedWorkerId || undefined),
          fromDate: leaveFromDate,
          toDate: leaveToDate,
          reason: leaveReason.trim()
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to submit leave application');
      }
    } else if (type === 'add_insurance' || type === 'insurance') {
      if (!selectedWorkerId) {
        setErrorMsg('Please select a union member (worker or field agent)');
        return;
      }

      setIsLoading(true);
      try {
        await createInsuranceApi({
          workerId: selectedWorkerId,
          provider: insuranceProvider.trim() || undefined,
          policyNumber: insurancePolicyNumber.trim() || undefined,
          coverageAmount: insuranceCoverage ? Number(insuranceCoverage) : undefined,
          premiumAmount: insurancePremium ? Number(insurancePremium) : undefined,
          endDate: insuranceEndDate || undefined
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to enroll insurance policy');
      }
    } else if (type === 'edit_insurance' && targetInsurance) {
      if (!selectedWorkerId) {
        setErrorMsg('Please select a union member');
        return;
      }

      setIsLoading(true);
      try {
        await updateInsuranceApi(targetInsurance.id, {
          workerId: selectedWorkerId,
          provider: insuranceProvider.trim() || undefined,
          policyNumber: insurancePolicyNumber.trim() || undefined,
          coverageAmount: insuranceCoverage ? Number(insuranceCoverage) : undefined,
          premiumAmount: insurancePremium ? Number(insurancePremium) : undefined,
          endDate: insuranceEndDate || undefined,
          status: insuranceStatus || undefined
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to update insurance policy');
      }
    } else if (type === 'assign_worker') {
      if (role === 'SUPER_AGENT') {
        setErrorMsg('Super Agents cannot modify worker assignments.');
        return;
      }
      const activeWorkerId = targetWorker?.id || selectedWorkerId;
      const activeAgentId = targetAgentId || selectedAgentId;

      if (!activeWorkerId || !activeAgentId) {
        setErrorMsg('Please select a valid worker and agent');
        return;
      }

      setIsLoading(true);
      try {
        await assignWorkerToAgentApi(activeWorkerId, activeAgentId);
        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to assign worker');
      }
    } else if (type === 'add_worker' || type === 'workers') {
      if (role === 'SUPER_AGENT') {
        setErrorMsg('Super Agents cannot modify worker information.');
        return;
      }
      if (!name.trim()) { setErrorMsg('Worker Full Name is required.'); return; }
      if (!employeeCode.trim()) { setErrorMsg('Employee Code is required.'); return; }
      if (!phone.trim()) { setErrorMsg('Phone Number is required.'); return; }
      if (phone.trim().length < 10) { setErrorMsg('Phone Number must contain at least 10 digits.'); return; }
      if (!password) { setErrorMsg('Password is required.'); return; }
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters long.'); return; }

      setIsLoading(true);
      try {
        await registerUserApi({
          name: name.trim(),
          email: email.trim() || undefined,
          password: password,
          role: 'WORKER',
          phone: phone.trim(),
          designation: designation,
          employeeCode: employeeCode.trim(),
          salary: Number(salary) || 25500,
          siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
          avatar: workerAvatar || undefined,
          bankAccountNo: bankAccountNo.trim() || undefined,
          ifscCode: ifscCode.trim().toUpperCase() || undefined,
          address: agentAddress.trim() || undefined,
          registrationAmount: registrationAmount ? Number(registrationAmount) : 500,
          paymentMethod: paymentMethod,
          upiTransactionId: upiTransactionId.trim() || undefined
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to register worker');
      }
    } else if (type === 'edit_worker') {
      if (role === 'SUPER_AGENT') {
        setErrorMsg('Super Agents cannot modify worker information.');
        return;
      }
      if (!targetWorker?.id) {
        setErrorMsg('Invalid worker selected for update');
        return;
      }

      setIsLoading(true);
      try {
        await updateUserApi(targetWorker.id, {
          name: name.trim(),
          email: email.trim(),
          phone: phone,
          designation: designation,
          employeeCode: employeeCode,
          salary: Number(salary) || 25500,
          avatar: workerAvatar || undefined
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to update worker details');
      }
    } else if (type === 'add_agent' || type === 'agents') {
      if (!name.trim()) { setErrorMsg('Agent Full Name is required.'); return; }
      if (!email.trim()) { setErrorMsg('Email Address is required.'); return; }
      if (!isEmailVerified) { setErrorMsg('Please verify agent email address with OTP code before registering.'); return; }
      if (!employeeCode.trim()) { setErrorMsg('Employee Code is required.'); return; }
      if (!phone.trim()) { setErrorMsg('Phone Number is required.'); return; }
      if (phone.trim().length < 10) { setErrorMsg('Phone Number must contain at least 10 digits.'); return; }
      if (!password) { setErrorMsg('Password is required.'); return; }
      if (password.length < 6) { setErrorMsg('Password must be at least 6 characters long.'); return; }

      const executeAgentRegistration = async (paymentDetails?: { razorpayPaymentId?: string; razorpayOrderId?: string }) => {
        setIsLoading(true);
        try {
          await registerUserApi({
            name: name.trim(),
            email: email.trim(),
            password: password,
            role: 'AGENT',
            phone: phone.trim(),
            designation: designation || 'Field Supervisor',
            employeeCode: employeeCode.trim(),
            siteId: selectedSiteId ? Number(selectedSiteId) : undefined,
            avatar: workerAvatar || undefined,
            bankAccountNo: bankAccountNo.trim() || undefined,
            ifscCode: ifscCode.trim() || undefined,
            address: agentAddress.trim() || undefined,
            registrationAmount: registrationAmount ? Number(registrationAmount) : 500,
            paymentMethod: paymentMethod,
            razorpayPaymentId: paymentDetails?.razorpayPaymentId,
            razorpayOrderId: paymentDetails?.razorpayOrderId,
            upiTransactionId: upiTransactionId.trim() || undefined,
          });

          setIsLoading(false);
          setSubmitted(true);
          if (onSuccessRefresh) onSuccessRefresh();

          setTimeout(() => {
            setSubmitted(false);
            onClose();
          }, 1500);
        } catch (err: any) {
          setIsLoading(false);
          setErrorMsg(err.message || 'Failed to register agent');
        }
      };

      if (paymentMethod === 'UPI') {
        setIsLoading(true);
        try {
          // Load Razorpay Checkout SDK dynamically if not loaded
          if (!(window as any).Razorpay) {
            await new Promise((resolve, reject) => {
              const script = document.createElement('script');
              script.src = 'https://checkout.razorpay.com/v1/checkout.js';
              script.onload = resolve;
              script.onerror = () => reject(new Error('Failed to load Razorpay SDK'));
              document.body.appendChild(script);
            });
          }

          const orderRes = await createRazorpayOrderApi(Number(registrationAmount) || 500);
          const orderData = orderRes.data || orderRes;

          const options: any = {
            key: orderData.keyId || 'rzp_test_TUlG2PT9HSDHcY',
            amount: orderData.amount || Math.round((Number(registrationAmount) || 500) * 100),
            currency: orderData.currency || 'INR',
            name: 'Labor Union Management System',
            description: 'New Agent Registration Fee',
            prefill: {
              name: name.trim(),
              email: email.trim(),
              contact: phone.trim()
            },
            theme: {
              color: '#2563EB'
            },
            handler: async function (response: any) {
              await executeAgentRegistration({
                razorpayPaymentId: response.razorpay_payment_id || `pay_${Date.now()}`,
                razorpayOrderId: response.razorpay_order_id || orderData.orderId
              });
            },
            modal: {
              ondismiss: function () {
                setIsLoading(false);
                setErrorMsg('Payment cancelled by user. Agent registration requires completed payment.');
              }
            }
          };

          if (orderData.orderId && !orderData.isMock && !String(orderData.orderId).includes('mock') && !String(orderData.orderId).includes('fallback')) {
            options.order_id = orderData.orderId;
          }

          const rzp = new (window as any).Razorpay(options);
          rzp.open();
        } catch (err: any) {
          setIsLoading(false);
          setErrorMsg(err.message || 'Failed to initiate Razorpay UPI payment');
        }
      } else {
        await executeAgentRegistration({});
      }
    } else if (type === 'generate_payroll' || type === 'payroll') {
      setIsLoading(true);
      try {
        await generatePayrollApi({
          workerId: payrollScope === 'ALL' ? undefined : payrollScope,
          weekStart: weekStart,
          weekEnd: weekEnd
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to generate payroll');
      }
    } else if (type === 'create_ticket') {
      if (!ticketSubject || ticketSubject.trim().length < 3) {
        setErrorMsg('Please enter a valid ticket subject/title');
        return;
      }
      if (!ticketDescription || ticketDescription.trim().length < 5) {
        setErrorMsg('Please enter a detailed description of the issue');
        return;
      }

      setIsLoading(true);
      try {
        await createSupportTicketApi({
          subject: ticketSubject.trim() || 'Safety Equipment & PPE Request',
          description: ticketDescription.trim(),
          priority: ticketPriority,
          agentId: user?.id ? Number(user.id) : undefined,
          workerId: ticketWorkerId && !isNaN(Number(ticketWorkerId)) && Number(ticketWorkerId) > 0 ? Number(ticketWorkerId) : undefined,
          handledById: ticketAgentId ? Number(ticketAgentId) : undefined,
          attachmentUrl: attachmentDataUrl || undefined
        });

        setIsLoading(false);
        setSubmitted(true);
        window.dispatchEvent(new Event('refresh-data'));
        window.dispatchEvent(new CustomEvent('ticket:created'));
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to create support ticket');
      }
    } else if (type === 'respond_ticket' || type === 'reply_ticket') {
      if (!targetTicket?.id) {
        setErrorMsg('No valid ticket selected to respond');
        return;
      }

      setIsLoading(true);
      try {
        if (ticketReplyText && ticketReplyText.trim().length > 0) {
          await replySupportTicketApi(targetTicket.id, ticketReplyText.trim());
        }

        if (closeOnReply) {
          await closeSupportTicketApi(targetTicket.id);
        }

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to submit response to ticket');
      }
    } else if (type === 'edit_ticket' || type === 'edit') {
      if (!targetTicket?.id) {
        setErrorMsg('No valid ticket selected to edit');
        return;
      }

      setIsLoading(true);
      try {
        await updateSupportTicketApi(targetTicket.id, {
          subject: ticketSubject.trim(),
          description: ticketDescription.trim(),
          priority: ticketPriority,
          ...(role !== 'WORKER' ? { status: editTicketStatus } : {})
        });

        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1500);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to update support ticket');
      }
    } else if (type === 'comment_ticket' || type === 'comment') {
      if (!targetTicket?.id) {
        setErrorMsg('No valid ticket selected');
        return;
      }
      if (!newCommentText.trim()) {
        setErrorMsg('Please enter a comment message');
        return;
      }

      setIsLoading(true);
      try {
        const created = await addTicketCommentApi(targetTicket.id, newCommentText.trim());
        setCommentsList((prev) => [...prev, created]);
        setNewCommentText('');
        setIsLoading(false);
        setSubmitted(true);
        if (onSuccessRefresh) onSuccessRefresh();

        setTimeout(() => {
          setSubmitted(false);
          onClose();
        }, 1200);
      } catch (err: any) {
        setIsLoading(false);
        setErrorMsg(err.message || 'Failed to post comment');
      }
    } else {
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 1200);
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'add_site':
      case 'sites':
        return 'Add New Working Site';
      case 'add_agent':
      case 'agents':
        return 'Register New Agent';
      case 'add_worker':
      case 'workers':
        return 'Register New Worker';
      case 'add_insurance':
      case 'insurance':
        return 'Enroll Member Insurance Policy';
      case 'edit_insurance':
        return 'Edit Enrolled Insurance Policy';
      case 'edit_worker':
        return 'Edit Worker Details';
      case 'mark_attendance':
      case 'attendance':
        return 'Mark Worker Attendance';
      case 'apply_agent_leave':
        return 'Apply Agent Leave Request';
      case 'apply_leave':
      case 'leaves':
        return 'Apply Worker Leave';
      case 'assign_worker':
        return targetAgentName ? `Assign Worker to ${targetAgentName}` : 'Assign Worker to Agent';
      case 'assign_agent':
        return targetSiteName ? `Assign Field Agent to ${targetSiteName}` : 'Assign Field Agent to Working Site';
      case 'generate_payroll':
      case 'payroll':
        return 'Generate Weekly Payroll';
      case 'create_ticket':
        return 'Create Support & Grievance Ticket';
      case 'respond_ticket':
      case 'reply_ticket':
        return targetTicket ? `Respond to Ticket ${targetTicket.ticketId}` : 'Respond to Support Ticket';
      case 'edit_ticket':
      case 'edit':
        return targetTicket ? `Edit Ticket #${targetTicket.ticketId}` : 'Edit Support Ticket';
      case 'comment_ticket':
      case 'comment':
        return targetTicket ? `Ticket Discussion (${targetTicket.ticketId})` : 'Ticket Comments';
      case 'view_reports':
      case 'reports':
        return 'System & Financial Reports';
      case 'date_range':
        return 'Select Dashboard Date Range';
      case 'search':
        return 'Global Search';
      case 'notifications':
        return 'Notifications';
      default:
        return `${type.charAt(0).toUpperCase() + type.slice(1)} Module`;
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container animate-fade-in" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{getTitle()}</h3>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {submitted ? (
          <div className="modal-success-state">
            <div className="success-icon-circle">
              <Check size={28} />
            </div>
            <h4>
              {type === 'add_site' || type === 'sites'
                ? 'Working Site Added Successfully!'
                : type === 'mark_attendance' || type === 'attendance'
                ? 'Worker Attendance Marked Successfully!'
                : type === 'apply_leave' || type === 'leaves'
                ? 'Leave Application Submitted Successfully!'
                : type === 'assign_worker'
                ? 'Worker Assigned to Agent Successfully!'
                : type === 'assign_agent'
                ? 'Field Agent Assigned to Working Site Successfully!'
                : type === 'add_worker' || type === 'workers'
                ? 'Worker Registered Successfully!'
                : type === 'edit_worker'
                ? 'Worker Details Updated Successfully!'
                : type === 'add_agent' || type === 'agents'
                ? 'Agent Registered Successfully!'
                : type === 'generate_payroll' || type === 'payroll'
                ? 'Weekly Payroll Generated & Processed!'
                : type === 'create_ticket'
                ? 'Support Ticket Submitted Successfully!'
                : type === 'edit_ticket' || type === 'edit'
                ? 'Ticket Details Updated Successfully!'
                : type === 'comment_ticket' || type === 'comment'
                ? 'Comment Posted Successfully!'
                : type === 'respond_ticket' || type === 'reply_ticket'
                ? 'Ticket Response & Status Saved!'
                : 'Action Completed Successfully!'}
            </h4>
            <p>The record has been saved and updated into the backend database.</p>
          </div>
        ) : (
          <form className="modal-body" onSubmit={handleSubmit} autoComplete="off">
            {errorMsg && (
              <div className="toast-banner toast-error mb-12">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {type === 'add_site' || type === 'sites' ? (
              <>
                <div className="form-group">
                  <label>Working Site Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Metro Line 3 Extension Site"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Site Code</label>
                    <input
                      type="text"
                      placeholder="e.g. SITE-005"
                      value={siteCode}
                      onChange={(e) => setSiteCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Contracting Company</label>
                    <input
                      type="text"
                      placeholder="e.g. Metro Construction Corp"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Full Site Address</label>
                  <input
                    type="text"
                    placeholder="e.g. Sector 15, Construction Zone"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>City</label>
                    <input
                      type="text"
                      placeholder="e.g. Mumbai"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>State</label>
                    <input
                      type="text"
                      placeholder="e.g. Maharashtra"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Pincode</label>
                    <input
                      type="text"
                      placeholder="e.g. 400001"
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Contact Person</label>
                    <input
                      type="text"
                      placeholder="e.g. Rajesh Sharma"
                      value={contactPerson}
                      onChange={(e) => setContactPerson(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Contact Phone Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={contactNumber}
                      onChange={(e) => setContactNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Initial Site Project Status *</label>
                  <select
                    value={siteStatus}
                    onChange={(e) => setSiteStatus(e.target.value)}
                  >
                    <option value="IN_PROGRESS">IN PROGRESS (Active Construction)</option>
                    <option value="COMPLETED">COMPLETED (Project Finished)</option>
                    <option value="ON_HOLD">ON HOLD (Temporarily Suspended)</option>
                    <option value="ACTIVE">ACTIVE</option>
                  </select>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Creating Site...
                      </span>
                    ) : (
                      'Create Working Site'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'assign_agent' ? (
              <>
                {targetSiteName ? (
                  <div className="form-group">
                    <label>Target Working Site</label>
                    <input type="text" disabled value={targetSiteName} style={{ backgroundColor: '#F1F5F9' }} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Select Target Working Site *</label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                    >
                      <option value="">-- Select Working Site --</option>
                      {sitesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteName} ({s.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Select Field Agent to Assign *</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                  >
                    <option value="">-- Select Field Agent --</option>
                    {agentsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.employeeCode}) - {a.designation || 'Field Agent'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Assigning Agent...
                      </span>
                    ) : (
                      'Assign Agent to Site'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'mark_attendance' || type === 'attendance' ? (
              <>
                <div className="form-group" style={{ position: 'relative' }}>
                  <label>Select Worker to Mark Attendance * (Search Worker)</label>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={16} style={{ position: 'absolute', left: '12px', color: '#64748B', pointerEvents: 'none' }} />
                    <input
                      type="text"
                      placeholder="Type worker name, code (e.g. Suresh G, WRK-008)..."
                      value={workerSearchQuery}
                      onChange={(e) => {
                        setWorkerSearchQuery(e.target.value);
                        setIsWorkerSearchOpen(true);
                      }}
                      onFocus={() => setIsWorkerSearchOpen(true)}
                      style={{
                        paddingLeft: '36px',
                        paddingRight: '12px',
                        width: '100%',
                        height: '42px',
                        borderRadius: '8px',
                        border: '1.5px solid #2563EB',
                        fontSize: '14px',
                        fontWeight: 600,
                        backgroundColor: '#FFFFFF',
                        color: '#0F172A'
                      }}
                    />
                  </div>

                  {isWorkerSearchOpen && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      zIndex: 100,
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #CBD5E1',
                      borderRadius: '8px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.15)',
                      marginTop: '4px'
                    }}>
                      {workersList
                        .filter(w =>
                          w.name.toLowerCase().includes((workerSearchQuery || '').toLowerCase()) ||
                          w.employeeCode.toLowerCase().includes((workerSearchQuery || '').toLowerCase()) ||
                          w.designation.toLowerCase().includes((workerSearchQuery || '').toLowerCase())
                        )
                        .map((w) => (
                          <div
                            key={w.id}
                            onClick={() => {
                              setSelectedWorkerId(w.id);
                              setWorkerSearchQuery(`${w.name} (${w.employeeCode}) - ${w.designation}`);
                              setIsWorkerSearchOpen(false);
                            }}
                            style={{
                              padding: '10px 14px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #F1F5F9',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              backgroundColor: selectedWorkerId === w.id ? '#EFF6FF' : '#FFFFFF'
                            }}
                          >
                            <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '13.5px' }}>{w.name}</span>
                            <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600, fontFamily: 'monospace' }}>{w.employeeCode} • {w.designation}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  <select
                    style={{ marginTop: '8px', fontSize: '13px' }}
                    value={selectedWorkerId}
                    onChange={(e) => {
                      setSelectedWorkerId(e.target.value);
                      const matched = workersList.find(w => w.id === e.target.value);
                      if (matched) {
                        setWorkerSearchQuery(`${matched.name} (${matched.employeeCode}) - ${matched.designation}`);
                      }
                    }}
                  >
                    <option value="">-- Or Select from Worker Dropdown --</option>
                    {workersList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeCode}) - {w.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Attendance Date *</label>
                    <input
                      type="date"
                      required
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Attendance Status *</label>
                    <select
                      value={attendanceStatus}
                      onChange={(e) => setAttendanceStatus(e.target.value as any)}
                    >
                      <option value="PRESENT">PRESENT (Full Day)</option>
                      <option value="HALF_DAY">HALF DAY</option>
                      <option value="ABSENT">ABSENT</option>
                      <option value="HOLIDAY">HOLIDAY / PAID LEAVE</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Overtime Hours (OT)</label>
                    <input
                      type="number"
                      min="0"
                      max="12"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Supervisor Remarks</label>
                    <input
                      type="text"
                      value={attendanceRemarks}
                      onChange={(e) => setAttendanceRemarks(e.target.value)}
                    />
                  </div>
                </div>

                {/* LIVE CHECK-IN & CHECK-OUT PHOTO SECTION WITH 8-HOUR RULE */}
                {(() => {
                  const todayStr = new Date().toISOString().split('T')[0];
                  const isPastDate = attendanceDate < todayStr;
                  const hoursElapsed = signInTimestamp ? (Date.now() - signInTimestamp) / (1000 * 60 * 60) : 0;
                  const isCheckOutUnlocked = (signInPhoto || signInTime) && (hoursElapsed >= 8 || bypass8HourCheck || isPastDate);

                  return (
                    <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '14px' }}>
                      <h4 style={{ fontSize: '13.5px', fontWeight: 800, color: '#0F172A', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        📷 Live Worker Attendance Sign-In & Sign-Out Photos
                      </h4>

                      {/* WEBCAM CAMERA PREVIEW IN MODAL */}
                      {isCameraActive && activePhotoCaptureType ? (
                        <div style={{ backgroundColor: '#000000', borderRadius: '12px', padding: '12px', textAlign: 'center', marginBottom: '14px' }}>
                          <p style={{ color: '#60A5FA', fontSize: '12px', fontWeight: 700, margin: '0 0 8px' }}>
                            Live Webcam Stream • {activePhotoCaptureType === 'SIGN_IN' ? 'Check-In Photo' : 'Check-Out Photo'}
                          </p>
                          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', maxHeight: '200px', borderRadius: '8px', objectFit: 'cover', border: '2px solid #2563EB' }} />
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '10px' }}>
                            <button
                              type="button"
                              onClick={captureAttendancePhotoSnapshot}
                              style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 800, cursor: 'pointer' }}
                            >
                              📸 Capture Photo
                            </button>
                            <button
                              type="button"
                              onClick={() => { stopCamera(); setActivePhotoCaptureType(null); }}
                              style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : null}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                        
                        {/* CHECK IN PHOTO SECTION */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#059669', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Check-In Photo</span>
                          
                          {signInPhoto ? (
                            <div style={{ position: 'relative', width: '84px', height: '84px', margin: '4px 0 8px' }}>
                              <img src={signInPhoto} alt="Check In" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', border: '2px solid #059669' }} />
                              <span style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: '#059669', color: '#FFF', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{signInTime}</span>
                            </div>
                          ) : (
                            <div style={{ width: '84px', height: '84px', borderRadius: '10px', backgroundColor: '#ECFDF5', border: '1.5px dashed #059669', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#059669', margin: '4px 0 8px' }}>
                              <Clock size={20} />
                              <span style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>No Photo</span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => startAttendancePhotoCamera('SIGN_IN')}
                            style={{ backgroundColor: '#059669', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}
                          >
                            📷 {signInPhoto ? 'Re-take Check-In' : 'Capture Check-In Photo'}
                          </button>
                        </div>

                        {/* CHECK OUT PHOTO SECTION WITH 8-HOUR RULE */}
                        <div style={{ backgroundColor: '#FFFFFF', padding: '12px', borderRadius: '10px', border: '1px solid #CBD5E1', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                          <span style={{ fontSize: '11px', color: '#D97706', fontWeight: 800, textTransform: 'uppercase', marginBottom: '6px' }}>Check-Out Photo</span>

                          {isCheckOutUnlocked ? (
                            <>
                              {signOutPhoto ? (
                                <div style={{ position: 'relative', width: '84px', height: '84px', margin: '4px 0 8px' }}>
                                  <img src={signOutPhoto} alt="Check Out" style={{ width: '100%', height: '100%', borderRadius: '10px', objectFit: 'cover', border: '2px solid #D97706' }} />
                                  <span style={{ position: 'absolute', bottom: '2px', right: '2px', backgroundColor: '#D97706', color: '#FFF', padding: '1px 5px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{signOutTime}</span>
                                </div>
                              ) : (
                                <div style={{ width: '84px', height: '84px', borderRadius: '10px', backgroundColor: '#FEF3C7', border: '1.5px dashed #D97706', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#D97706', margin: '4px 0 8px' }}>
                                  <Clock size={20} />
                                  <span style={{ fontSize: '10px', fontWeight: 700, marginTop: '4px' }}>Ready (8h+)</span>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => startAttendancePhotoCamera('SIGN_OUT')}
                                style={{ backgroundColor: '#D97706', color: '#FFF', border: 'none', borderRadius: '6px', padding: '6px 12px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginTop: 'auto' }}
                              >
                                📷 {signOutPhoto ? 'Re-take Check-Out' : 'Capture Check-Out Photo'}
                              </button>
                            </>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '4px 0' }}>
                              <div style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', padding: '8px', borderRadius: '6px', border: '1px solid #BFDBFE', fontSize: '10.5px', fontWeight: 600, marginBottom: '8px', lineHeight: 1.3 }}>
                                🔒 Check-Out unlocks 8 hours after Check-In (Check-In at {signInTime || '08:00 AM'})
                              </div>
                              <button
                                type="button"
                                onClick={() => setBypass8HourCheck(true)}
                                style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}
                                title="Click to instantly test Check-Out for demo"
                              >
                                ⚡ Instant Unlock for Demo / Test
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Saving Attendance...
                      </span>
                    ) : (
                      'Save Attendance Record'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'apply_agent_leave' || type === 'apply_leave' || type === 'leaves' ? (
              <>
                {type !== 'apply_agent_leave' && workersList.length > 0 && (
                  <div className="form-group">
                    <label>Select Worker</label>
                    <select
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                    >
                      <option value="">-- Select Worker (Or Self) --</option>
                      {workersList.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name} ({w.employeeCode}) - {w.designation}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Leave Category</label>
                  <select
                    value={leaveCategory}
                    onChange={(e) => setLeaveCategory(e.target.value)}
                  >
                    <option value="">-- Select Leave Category --</option>
                    <option value="Casual Leave">Casual Leave</option>
                    <option value="Sick Leave">Sick Leave</option>
                    <option value="Earned Leave">Earned Leave</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>From Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveFromDate}
                      onChange={(e) => setLeaveFromDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>To Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveToDate}
                      onChange={(e) => setLeaveToDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason for Leave *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Enter detailed reason for leave application..."
                    value={leaveReason}
                    onChange={(e) => setLeaveReason(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Submitting...
                      </span>
                    ) : (
                      'Submit Leave Request'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'add_insurance' || type === 'insurance' || type === 'edit_insurance' ? (
              <>
                {type === 'edit_insurance' ? (
                  <div className="form-group">
                    <label>Union Member (Worker / Field Agent)</label>
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={`${targetInsurance?.workerName || 'Member'} (${targetInsurance?.workerId || ''})`}
                      style={{ backgroundColor: '#F1F5F9', color: '#334155', cursor: 'not-allowed', fontWeight: 600 }}
                    />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Select Union Member (Worker or Field Agent) *</label>
                    <select
                      required
                      value={selectedWorkerId}
                      onChange={(e) => setSelectedWorkerId(e.target.value)}
                    >
                      <option value="">-- Select Union Member --</option>
                      {workersList.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.employeeCode || `ID: ${m.id}`}) - {m.memberRole === 'AGENT' ? 'Field Agent' : (m.designation || 'Worker')}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Insurance Provider</label>
                    <input
                      type="text"
                      placeholder="e.g. Star Health Insurance & Union Care"
                      value={insuranceProvider}
                      onChange={(e) => setInsuranceProvider(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Policy Number</label>
                    <input
                      type="text"
                      placeholder="e.g. POL-301791"
                      value={insurancePolicyNumber}
                      onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Coverage Amount (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 500000"
                      value={insuranceCoverage}
                      onChange={(e) => setInsuranceCoverage(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Monthly Premium (₹)</label>
                    <input
                      type="number"
                      placeholder="e.g. 450"
                      value={insurancePremium}
                      onChange={(e) => setInsurancePremium(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Policy Expiry Date</label>
                    <input
                      type="date"
                      value={insuranceEndDate}
                      onChange={(e) => setInsuranceEndDate(e.target.value)}
                    />
                  </div>
                  {type === 'edit_insurance' && (
                    <div className="form-group flex-1">
                      <label>Policy Status</label>
                      <select
                        value={insuranceStatus}
                        onChange={(e) => setInsuranceStatus(e.target.value)}
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="EXPIRED">EXPIRED</option>
                        <option value="PENDING">PENDING</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> {type === 'edit_insurance' ? 'Updating Policy...' : 'Enrolling Policy...'}
                      </span>
                    ) : (
                      type === 'edit_insurance' ? 'Update Insurance Policy' : 'Enroll Policy'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'assign_worker' ? (
              <>
                {targetAgentName ? (
                  <div className="form-group">
                    <label>Target Agent</label>
                    <input type="text" disabled value={`${targetAgentName}`} style={{ backgroundColor: '#F1F5F9' }} />
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Select Target Agent *</label>
                    <select
                      value={selectedAgentId}
                      onChange={(e) => setSelectedAgentId(e.target.value)}
                    >
                      {agentsList.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.employeeCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Select Worker to Assign *</label>
                  <select
                    value={selectedWorkerId}
                    onChange={(e) => setSelectedWorkerId(e.target.value)}
                  >
                    {workersList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeCode}) - {w.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Assigning Worker...
                      </span>
                    ) : (
                      'Assign Worker'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'add_worker' || type === 'edit_worker' || type === 'workers' ? (
              <>
                {/* Photo Upload & Live Camera Capture */}
                <div className="form-group" style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '20px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A', marginBottom: '10px', display: 'block' }}>
                    Worker Profile Photo (Camera or Gallery)
                  </label>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                      <UserAvatar src={workerAvatar} name={name || 'Worker'} size={70} />
                      {workerAvatar && (
                        <button
                          type="button"
                          onClick={() => setWorkerAvatar('')}
                          style={{ position: 'absolute', top: '-4px', right: '-4px', backgroundColor: '#EF4444', color: '#FFF', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                          title="Remove Photo"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <input
                          type="file"
                          accept="image/*"
                          id="worker-gallery-input"
                          style={{ display: 'none' }}
                          onChange={handleGalleryFileUpload}
                        />
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                          onClick={() => document.getElementById('worker-gallery-input')?.click()}
                        >
                          <UploadCloud size={14} />
                          <span>Choose from Gallery</span>
                        </button>

                        {!isCameraActive ? (
                          <button
                            type="button"
                            className="primary-btn"
                            style={{ fontSize: '12px', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: '#059669' }}
                            onClick={startCamera}
                          >
                            📷 <span>Take Photo (Camera)</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn-cancel"
                            style={{ fontSize: '12px', padding: '6px 12px' }}
                            onClick={stopCamera}
                          >
                            Close Camera
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>
                        Upload photo from phone device gallery or capture live using camera.
                      </span>
                    </div>
                  </div>

                  {/* Live Camera Viewfinder Card */}
                  {isCameraActive && (
                    <div style={{ marginTop: '14px', backgroundColor: '#0F172A', padding: '12px', borderRadius: '10px', textAlign: 'center' }}>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        style={{ width: '100%', maxHeight: '220px', borderRadius: '8px', objectFit: 'cover', backgroundColor: '#000' }}
                      />
                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ backgroundColor: '#DC2626', fontSize: '12.5px', padding: '6px 16px' }}
                          onClick={captureSnapshot}
                        >
                          🔴 Snap Photo Now
                        </button>
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ fontSize: '12.5px', padding: '6px 12px', color: '#FFF' }}
                          onClick={stopCamera}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Worker Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ramesh Kumar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Email Address (Optional)</label>
                  <input
                    type="email"
                    autoComplete="off"
                    placeholder="e.g. ramesh.worker@laborunion.com (Optional)"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Employee Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. WRK-005"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Skill / Designation</label>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    >
                      <option value="">-- Select Skill / Designation --</option>
                      <option value="Mason / Carpenter">Mason / Carpenter</option>
                      <option value="Electrician">Electrician</option>
                      <option value="Scaffolder">Scaffolder</option>
                      <option value="Plumber">Plumber</option>
                      <option value="Welder">Welder</option>
                      <option value="Site Technician">Site Technician</option>
                      <option value="General Helper">General Helper</option>
                      <option value="Helper">Helper</option>
                    </select>
                  </div>
                </div>

                {sitesList.length > 0 && (
                  <div className="form-group">
                    <label>Assigned Working Site</label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                    >
                      <option value="">-- Select Working Site --</option>
                      {sitesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteName} ({s.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Phone Number *</label>
                    <input
                      type="text"
                      required
                      minLength={10}
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  {type !== 'edit_worker' && (
                    <div className="form-group flex-1">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0 }}>Password *</label>
                        <button
                          type="button"
                          onClick={() => setPassword(generateWorkerTempPassword())}
                          title="Generate New Auto Temp Password"
                          style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <RefreshCw size={12} /> Refresh Temp
                        </button>
                      </div>
                      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter login password..."
                          style={{ paddingRight: '38px', width: '100%' }}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Banking & Residential Address Section */}
                <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '12px', border: '1px solid #E2E8F0', marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E293B', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <CreditCard size={15} color="#2563EB" />
                    <span>Banking & Residential Address</span>
                  </div>

                  <div className="form-row" style={{ marginBottom: '10px' }}>
                    <div className="form-group flex-1">
                      <label>Bank Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 98765432101234"
                        value={bankAccountNo}
                        onChange={(e) => setBankAccountNo(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Full Residential Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, MG Road, Landmark, City, State"
                      value={agentAddress}
                      onChange={(e) => setAgentAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Worker Registration Fee & Payment Method Section */}
                <div style={{ backgroundColor: '#EFF6FF', padding: '14px', borderRadius: '12px', border: '1px solid #BFDBFE', marginTop: '10px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 800, color: '#1E40AF', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={15} color="#2563EB" />
                    <span>Worker Registration Fee & Payment Method</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label style={{ color: '#1E3A8A' }}>Registration Amount (INR) *</label>
                      <input
                        type="number"
                        required
                        value={registrationAmount}
                        onChange={(e) => setRegistrationAmount(e.target.value)}
                        placeholder="500"
                        style={{ fontWeight: 700, color: '#0F172A' }}
                      />
                    </div>

                    <div className="form-group flex-1">
                      <label style={{ color: '#1E3A8A' }}>Payment Method *</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CASH')}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: paymentMethod === 'CASH' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                            backgroundColor: paymentMethod === 'CASH' ? '#FFFFFF' : '#F8FAFC',
                            color: paymentMethod === 'CASH' ? '#2563EB' : '#64748B',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          💵 Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('UPI')}
                          style={{
                            flex: 1,
                            padding: '9px 12px',
                            borderRadius: '8px',
                            border: paymentMethod === 'UPI' ? '2px solid #2563EB' : '1px solid #CBD5E1',
                            backgroundColor: paymentMethod === 'UPI' ? '#FFFFFF' : '#F8FAFC',
                            color: paymentMethod === 'UPI' ? '#2563EB' : '#64748B',
                            fontWeight: 800,
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          📱 UPI / Razorpay
                        </button>
                      </div>
                    </div>
                  </div>

                  {paymentMethod === 'UPI' && (
                    <div style={{ marginTop: '12px', padding: '14px', backgroundColor: '#FFFFFF', borderRadius: '10px', border: '1px solid #DBEAFE', textAlign: 'center' }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Scan & Pay via UPI App (Google Pay / PhonePe / Paytm / BHIM)
                      </div>
                      <div style={{ margin: '10px auto', width: '130px', height: '130px', padding: '6px', backgroundColor: '#FFF', border: '2px dashed #2563EB', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                            `upi://pay?pa=laborunion@upi&pn=Labor%20Union%20Management&am=${registrationAmount || 500}&cu=INR`
                          )}`}
                          alt="UPI QR Code"
                          style={{ width: '100%', height: '100%', borderRadius: '6px' }}
                        />
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 700, color: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <span>UPI VPA: <strong>laborunion@upi</strong></span>
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', padding: '2px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, cursor: 'pointer' }}
                        >
                          {copiedUpiId ? '✓ Copied' : 'Copy UPI ID'}
                        </button>
                      </div>

                      <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '10px', backgroundColor: '#ECFDF5', color: '#047857', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>GPay</span>
                        <span style={{ fontSize: '10px', backgroundColor: '#EFF6FF', color: '#1D4ED8', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>PhonePe</span>
                        <span style={{ fontSize: '10px', backgroundColor: '#F0F9FF', color: '#0284C7', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>Paytm</span>
                        <span style={{ fontSize: '10px', backgroundColor: '#FFF7ED', color: '#C2410C', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>BHIM UPI</span>
                      </div>

                      <div style={{ marginTop: '12px', textAlign: 'left' }}>
                        <label style={{ fontSize: '11.5px', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '4px' }}>
                          Enter UPI Transaction ID / UTR No. (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 423891028491 or UTR-98765"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          style={{ width: '100%', fontSize: '12px', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> {type === 'edit_worker' ? 'Updating...' : 'Registering...'}
                      </span>
                    ) : (
                      type === 'edit_worker' ? 'Update Worker Details' : 'Register Worker'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'add_agent' || type === 'agents' ? (
              <>
                {/* Agent Profile Photo Section */}
                <div className="form-group" style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Agent Profile Photo
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', background: 'var(--bg-main)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', overflow: 'hidden', backgroundColor: 'rgba(37, 99, 235, 0.1)', border: '2px solid #2563EB', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {workerAvatar ? (
                        <img src={workerAvatar} alt="Agent Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <UserAvatar name={name || 'Agent'} size={56} />
                      )}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <label style={{ backgroundColor: '#2563EB', color: '#FFFFFF', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                          <UploadCloud size={14} />
                          <span>Upload Photo</span>
                          <input type="file" accept="image/*" onChange={handleGalleryFileUpload} style={{ display: 'none' }} />
                        </label>

                        {!isCameraActive ? (
                          <button type="button" onClick={startCamera} style={{ backgroundColor: '#10B981', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            <Camera size={14} />
                            <span>Take Photo (Camera)</span>
                          </button>
                        ) : (
                          <button type="button" onClick={stopCamera} style={{ backgroundColor: '#EF4444', color: '#FFFFFF', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                            Close Camera
                          </button>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>JPG, PNG or Live Camera Snapshot</span>
                    </div>
                  </div>

                  {isCameraActive && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', background: '#000', padding: '12px', borderRadius: '10px' }}>
                      <video ref={videoRef} autoPlay playsInline style={{ width: '220px', height: '220px', borderRadius: '8px', objectFit: 'cover' }} />
                      <button type="button" onClick={captureSnapshot} style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', padding: '8px 18px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Camera size={15} /> Capture Snapshot
                      </button>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Agent Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suresh Patil"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                {/* Email Address & Verification Code Section */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ margin: 0 }}>Email Address *</label>
                    {isEmailVerified && (
                      <span style={{ color: '#059669', fontSize: '12px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <CheckCircle2 size={14} /> Email Verified
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="email"
                      required
                      disabled={isEmailVerified}
                      placeholder="e.g. agent.suresh@laborunion.com"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setIsEmailVerified(false); setOtpSentMessage(null); }}
                      style={{ flex: 1 }}
                    />
                    {!isEmailVerified && (
                      <button
                        type="button"
                        onClick={handleSendAgentOtp}
                        disabled={isSendingOtp || !email.trim()}
                        style={{
                          backgroundColor: '#2563EB',
                          color: '#FFFFFF',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '0 14px',
                          fontSize: '12.5px',
                          fontWeight: 600,
                          cursor: isSendingOtp || !email.trim() ? 'not-allowed' : 'pointer',
                          whiteSpace: 'nowrap',
                          opacity: isSendingOtp || !email.trim() ? 0.6 : 1
                        }}
                      >
                        {isSendingOtp ? 'Sending Code...' : 'Send Verification Code'}
                      </button>
                    )}
                  </div>

                  {!isEmailVerified && otpSentMessage && (
                    <div style={{ marginTop: '10px', background: 'rgba(37, 99, 235, 0.08)', border: '1px solid rgba(37, 99, 235, 0.2)', padding: '12px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>{otpSentMessage}</span>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter 6-digit verification code"
                          value={verificationOtp}
                          onChange={(e) => setVerificationOtp(e.target.value.replace(/\D/g, ''))}
                          style={{ flex: 1, letterSpacing: '4px', fontWeight: 700, textAlign: 'center' }}
                        />
                        <button
                          type="button"
                          onClick={handleVerifyAgentOtp}
                          disabled={isVerifyingOtp || verificationOtp.length !== 6}
                          style={{
                            backgroundColor: '#059669',
                            color: '#FFFFFF',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '0 16px',
                            fontSize: '12.5px',
                            fontWeight: 700,
                            cursor: isVerifyingOtp || verificationOtp.length !== 6 ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {isVerifyingOtp ? 'Verifying...' : 'Verify OTP'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Employee Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. AGT-003"
                      value={employeeCode}
                      onChange={(e) => setEmployeeCode(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Agent Designation</label>
                    <select
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                    >
                      <option value="">-- Select Agent Designation --</option>
                      <option value="Field Supervisor">Field Supervisor</option>
                      <option value="Site Supervisor">Site Supervisor</option>
                      <option value="Union Representative">Union Representative</option>
                      <option value="Safety Officer">Safety Officer</option>
                      <option value="Labor Operations Manager">Labor Operations Manager</option>
                    </select>
                  </div>
                </div>

                {sitesList.length > 0 && (
                  <div className="form-group">
                    <label>Assigned Working Site</label>
                    <select
                      value={selectedSiteId}
                      onChange={(e) => setSelectedSiteId(e.target.value)}
                    >
                      <option value="">-- Select Working Site --</option>
                      {sitesList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.siteName} ({s.siteCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Phone Number *</label>
                    <input
                      type="text"
                      required
                      minLength={10}
                      placeholder="e.g. +91 9876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  
                  {/* Auto-generated Temporary Password Section */}
                  <div className="form-group flex-1">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Password *</label>
                      <button
                        type="button"
                        onClick={() => setPassword(generateTempPassword())}
                        title="Generate New Auto Temp Password"
                        style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                      >
                        <RefreshCw size={12} /> Refresh Temp
                      </button>
                    </div>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter login password..."
                        style={{ paddingRight: '38px', width: '100%' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ position: 'absolute', right: '10px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banking & Personal Address Details */}
                <div style={{ marginTop: '16px', marginBottom: '16px', padding: '14px', borderRadius: '10px', background: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} style={{ color: '#2563EB' }} />
                    <span>Banking & Residential Address</span>
                  </div>

                  <div className="form-row" style={{ marginBottom: '12px' }}>
                    <div className="form-group flex-1" style={{ margin: 0 }}>
                      <label>Bank Account Number</label>
                      <input
                        type="text"
                        placeholder="e.g. 98765432101234"
                        value={bankAccountNo}
                        onChange={(e) => setBankAccountNo(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1" style={{ margin: 0 }}>
                      <label>IFSC Code</label>
                      <input
                        type="text"
                        placeholder="e.g. SBIN0001234"
                        value={ifscCode}
                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Full Residential Address</label>
                    <input
                      type="text"
                      placeholder="e.g. Flat 302, MG Road, Landmark, City, State"
                      value={agentAddress}
                      onChange={(e) => setAgentAddress(e.target.value)}
                    />
                  </div>
                </div>

                {/* Registration Fee & Payment Method Section */}
                <div style={{ marginBottom: '18px', padding: '14px', borderRadius: '10px', background: 'rgba(37, 99, 235, 0.04)', border: '1px solid rgba(37, 99, 235, 0.15)' }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: '#2563EB', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <DollarSign size={16} />
                    <span>Agent Registration Fee & Payment Method</span>
                  </div>

                  <div className="form-row">
                    <div className="form-group flex-1">
                      <label>Registration Amount (INR) *</label>
                      <input
                        type="number"
                        required
                        min={1}
                        placeholder="e.g. 500"
                        value={registrationAmount}
                        onChange={(e) => setRegistrationAmount(e.target.value)}
                      />
                    </div>
                    <div className="form-group flex-1">
                      <label>Payment Method *</label>
                      <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('CASH')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: paymentMethod === 'CASH' ? '2px solid #2563EB' : '1px solid var(--border-color)',
                            backgroundColor: paymentMethod === 'CASH' ? '#EFF6FF' : 'var(--bg-card)',
                            color: paymentMethod === 'CASH' ? '#2563EB' : 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          💵 Cash
                        </button>
                        <button
                          type="button"
                          onClick={() => setPaymentMethod('UPI')}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '8px',
                            border: paymentMethod === 'UPI' ? '2px solid #059669' : '1px solid var(--border-color)',
                            backgroundColor: paymentMethod === 'UPI' ? '#ECFDF5' : 'var(--bg-card)',
                            color: paymentMethod === 'UPI' ? '#059669' : 'var(--text-primary)',
                            fontWeight: 700,
                            fontSize: '13px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px'
                          }}
                        >
                          📱 UPI / Razorpay
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic UPI QR Code Panel (Visible when UPI is selected) */}
                  {paymentMethod === 'UPI' && (
                    <div style={{
                      marginTop: '14px',
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 100%)',
                      border: '1.5px dashed #059669',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13.5px', fontWeight: 800, color: '#047857', marginBottom: '10px' }}>
                        <QrCode size={18} />
                        <span>Scan & Pay via UPI QR Code</span>
                      </div>

                      {/* Interactive QR Code Image */}
                      <div style={{
                        padding: '10px',
                        background: '#FFFFFF',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(5, 150, 105, 0.15)',
                        border: '1px solid #A7F3D0',
                        marginBottom: '10px'
                      }}>
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`upi://pay?pa=laborunion@upi&pn=Labor%20Union%20Management&am=${registrationAmount || 500}&cu=INR`)}`}
                          alt="UPI Payment QR Code"
                          style={{ width: '160px', height: '160px', display: 'block', borderRadius: '6px' }}
                        />
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#065F46', marginBottom: '6px' }}>
                        Amount to Pay: <span style={{ fontSize: '16px', color: '#047857', fontWeight: 900 }}>₹{registrationAmount || 500}</span>
                      </div>

                      {/* Official UPI ID / VPA Row with Copy Button */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#FFFFFF',
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #A7F3D0',
                        marginBottom: '12px'
                      }}>
                        <span style={{ fontSize: '12px', color: '#4B5563' }}>UPI ID:</span>
                        <strong style={{ fontSize: '13px', color: '#047857', fontFamily: 'monospace' }}>laborunion@upi</strong>
                        <button
                          type="button"
                          onClick={handleCopyUpiId}
                          style={{
                            background: copiedUpiId ? '#059669' : '#ECFDF5',
                            color: copiedUpiId ? '#FFFFFF' : '#059669',
                            border: '1px solid #059669',
                            borderRadius: '12px',
                            padding: '3px 8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Copy size={11} /> {copiedUpiId ? 'Copied!' : 'Copy'}
                        </button>
                      </div>

                      {/* Supported App Badges */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap', fontSize: '11px', color: '#065F46', fontWeight: 600, marginBottom: '14px' }}>
                        <span style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>📱 Google Pay</span>
                        <span style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>🟣 PhonePe</span>
                        <span style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>💙 Paytm</span>
                        <span style={{ background: '#FFFFFF', padding: '3px 8px', borderRadius: '12px', border: '1px solid #D1FAE5' }}>🇮🇳 BHIM UPI</span>
                      </div>

                      {/* Enter UPI Transaction ID / UTR Field */}
                      <div className="form-group" style={{ width: '100%', margin: 0, textAlign: 'left' }}>
                        <label style={{ color: '#047857', fontWeight: 700, fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
                          <CheckCheck size={14} /> Enter UPI Transaction ID / UTR No. (Optional)
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 12-digit UTR No. (e.g. 423456789012)"
                          value={upiTransactionId}
                          onChange={(e) => setUpiTransactionId(e.target.value)}
                          style={{
                            background: '#FFFFFF',
                            border: '1px solid #A7F3D0',
                            borderRadius: '8px',
                            padding: '9px 12px',
                            fontSize: '13px',
                            color: '#065F46',
                            fontWeight: 600,
                            width: '100%'
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-submit"
                    disabled={isLoading || !isEmailVerified}
                    title={!isEmailVerified ? "Please verify agent email address with OTP code before registering" : ""}
                  >
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Registering Agent...
                      </span>
                    ) : (
                      'Register Agent'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'generate_payroll' || type === 'payroll' ? (
              <>
                <div className="form-group">
                  <label>Worker Disbursal Scope</label>
                  <select
                    value={payrollScope}
                    onChange={(e) => setPayrollScope(e.target.value)}
                  >
                    <option value="ALL">All Active Workers (Bulk Disbursal)</option>
                    {workersList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Pay Period Start</label>
                    <input
                      type="date"
                      required
                      value={weekStart}
                      onChange={(e) => setWeekStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>Pay Period End</label>
                    <input
                      type="date"
                      required
                      value={weekEnd}
                      onChange={(e) => setWeekEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Processing Payroll...
                      </span>
                    ) : (
                      'Generate Payroll'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'date_range' ? (
              <>
                <div className="form-group mb-16">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>Quick Preset Ranges</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    <button
                      type="button"
                      className={`preset-pill-btn ${rangePreset === 'today' ? 'active' : ''}`}
                      onClick={() => applyPreset('today')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: rangePreset === 'today' ? '#4F46E5' : '#F8FAFC',
                        color: rangePreset === 'today' ? '#FFFFFF' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Today
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${rangePreset === 'last_7_days' ? 'active' : ''}`}
                      onClick={() => applyPreset('last_7_days')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: rangePreset === 'last_7_days' ? '#4F46E5' : '#F8FAFC',
                        color: rangePreset === 'last_7_days' ? '#FFFFFF' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Last 7 Days
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${rangePreset === 'last_30_days' ? 'active' : ''}`}
                      onClick={() => applyPreset('last_30_days')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: rangePreset === 'last_30_days' ? '#4F46E5' : '#F8FAFC',
                        color: rangePreset === 'last_30_days' ? '#FFFFFF' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      Last 30 Days
                    </button>
                    <button
                      type="button"
                      className={`preset-pill-btn ${rangePreset === 'this_month' ? 'active' : ''}`}
                      onClick={() => applyPreset('this_month')}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '20px',
                        border: '1px solid #E2E8F0',
                        backgroundColor: rangePreset === 'this_month' ? '#4F46E5' : '#F8FAFC',
                        color: rangePreset === 'this_month' ? '#FFFFFF' : '#334155',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      This Month
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Start Date</label>
                    <input
                      type="date"
                      required
                      value={rangeStart}
                      onChange={(e) => {
                        setRangeStart(e.target.value);
                        setRangePreset('custom');
                      }}
                    />
                  </div>
                  <div className="form-group flex-1">
                    <label>End Date</label>
                    <input
                      type="date"
                      required
                      value={rangeEnd}
                      onChange={(e) => {
                        setRangeEnd(e.target.value);
                        setRangePreset('custom');
                      }}
                    />
                  </div>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Apply Date Range
                  </button>
                </div>
              </>
            ) : type === 'create_ticket' ? (
              <>
                {role === 'AGENT' ? (
                  <div className="form-group">
                    <label>Support Ticket Creator (Logged-in Agent)</label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.name || 'Agent'} (${(user as any)?.employeeCode || 'AGT-002'}) - ${(user as any)?.designation || 'Field Agent'}`}
                      style={{ backgroundColor: '#EFF6FF', color: '#1E40AF', fontWeight: 800, border: '1px solid #BFDBFE' }}
                    />
                  </div>
                ) : role === 'SUPER_AGENT' ? (
                  workersList.length > 0 && (
                    <div className="form-group">
                      <label>Select Worker (Optional for Super-Agents)</label>
                      <select
                        value={ticketWorkerId}
                        onChange={(e) => setTicketWorkerId(e.target.value)}
                      >
                        {workersList.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name} ({w.employeeCode}) - {w.designation}
                          </option>
                        ))}
                      </select>
                    </div>
                  )
                ) : (
                  <div className="form-group">
                    <label>Worker Application (Logged-in User)</label>
                    <input
                      type="text"
                      disabled
                      value={`${user?.name || 'Worker'} (${(user as any)?.employeeCode || `WRK-00${user?.id || 1}`}) - ${(user as any)?.designation || 'Worker'}`}
                      style={{ backgroundColor: '#F1F5F9', color: '#334155', fontWeight: 600 }}
                    />
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group flex-1">
                    <label>Subject / Category Title *</label>
                    <select
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                    >
                      <option value="Safety Equipment & PPE Request">Safety Equipment & PPE Request</option>
                      <option value="Wage & Salary Payment Dispute">Wage & Salary Payment Dispute</option>
                      <option value="Site Working Conditions & Safety Grievance">Site Working Conditions & Safety Grievance</option>
                      <option value="Medical & Insurance Claim Assistance">Medical & Insurance Claim Assistance</option>
                      <option value="Leave & Attendance Discrepancy Query">Leave & Attendance Discrepancy Query</option>
                      <option value="Overtime (OT) Rate Calculation">Overtime (OT) Rate Calculation</option>
                      <option value="General Inquiry & Union Support">General Inquiry & Union Support</option>
                    </select>
                  </div>
                  <div className="form-group flex-1">
                    <label>Priority Level *</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                    >
                      <option value="LOW">Low Priority</option>
                      <option value="MEDIUM">Medium Priority</option>
                      <option value="HIGH">High Priority</option>
                      <option value="URGENT">Urgent / Emergency</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Issue Description *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Provide detailed description of the grievance, safety issue, or request..."
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="form-group">
                  <label>Attach Supporting File / Photo Proof (Optional)</label>
                  {attachmentName ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Paperclip size={18} style={{ color: '#4F46E5' }} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#0F172A' }}>{attachmentName}</div>
                          <div style={{ fontSize: '11.5px', color: '#64748B' }}>{attachmentSize} • Attached</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={removeAttachment}
                        style={{ border: 'none', background: 'transparent', color: '#EF4444', cursor: 'pointer', padding: '4px' }}
                        title="Remove attachment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <div style={{ border: '2px dashed #CBD5E1', borderRadius: '8px', padding: '16px', textAlign: 'center', backgroundColor: '#FAFAFA', cursor: 'pointer', position: 'relative' }}>
                      <input
                        type="file"
                        accept=".jpg,.jpeg,.png,.pdf"
                        onChange={handleFileChange}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                      />
                      <UploadCloud size={24} style={{ color: '#4F46E5', marginBottom: '6px' }} />
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#334155' }}>
                        Click to upload or drag & drop photo proof / document
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94A3B8', marginTop: '2px' }}>
                        Supports JPG, PNG, PDF (Max 5MB)
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Creating Ticket...
                      </span>
                    ) : (
                      'Submit Support Ticket'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'respond_ticket' || type === 'reply_ticket' ? (
              <>
                {targetTicket && (
                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="code-badge">{targetTicket.ticketId}</span>
                      <span className={`badge ${targetTicket.priority === 'HIGH' || targetTicket.priority === 'URGENT' ? 'badge-rejected' : 'badge-casual'}`}>
                        {targetTicket.priority} Priority
                      </span>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>{targetTicket.subject}</div>
                    <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>Worker: <strong>{targetTicket.workerName}</strong></div>
                    {targetTicket.description && (
                      <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '8px', fontStyle: 'italic', borderTop: '1px dashed #CBD5E1', paddingTop: '6px' }}>
                        "{targetTicket.description}"
                      </div>
                    )}
                    {targetTicket.reply && (
                      <div style={{ fontSize: '12.5px', color: '#1E293B', marginTop: '8px', padding: '8px', backgroundColor: '#EFF6FF', borderRadius: '6px' }}>
                        <strong>Previous Response:</strong> {targetTicket.reply} {targetTicket.handledBy && `(by ${targetTicket.handledBy})`}
                      </div>
                    )}
                  </div>
                )}

                <div className="form-group">
                  <label>Official Response / Update *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="Enter your response, instructions, or resolution details for the worker..."
                    value={ticketReplyText}
                    onChange={(e) => setTicketReplyText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    id="closeTicketCheck"
                    checked={closeOnReply}
                    onChange={(e) => setCloseOnReply(e.target.checked)}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <label htmlFor="closeTicketCheck" style={{ margin: 0, cursor: 'pointer', fontSize: '13.5px', fontWeight: 500 }}>
                    Mark Ticket as CLOSED / RESOLVED after sending reply
                  </label>
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Submitting...
                      </span>
                    ) : (
                      'Send Response'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'edit_ticket' || type === 'edit' ? (
              <>
                {targetTicket && (
                  <div style={{ backgroundColor: '#F8FAFC', padding: '10px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="code-badge">{targetTicket.ticketId}</span>
                      <span style={{ fontSize: '13px', color: '#475569', marginLeft: '8px' }}>Worker: <strong>{targetTicket.workerName}</strong></span>
                    </div>
                    <span className={`badge ${targetTicket.priority === 'HIGH' || targetTicket.priority === 'URGENT' ? 'badge-rejected' : 'badge-casual'}`}>
                      {targetTicket.priority} Priority
                    </span>
                  </div>
                )}

                <div className="form-group">
                  <label>Subject *</label>
                  <input
                    type="text"
                    required
                    value={ticketSubject}
                    onChange={(e) => setTicketSubject(e.target.value)}
                    placeholder="Enter ticket subject"
                  />
                </div>

                <div className="form-group">
                  <label>Description *</label>
                  <textarea
                    rows={4}
                    required
                    value={ticketDescription}
                    onChange={(e) => setTicketDescription(e.target.value)}
                    placeholder="Describe the issue or request details..."
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Priority Level *</label>
                    <select
                      value={ticketPriority}
                      onChange={(e) => setTicketPriority(e.target.value as any)}
                    >
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>

                  {role !== 'WORKER' && (
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Status *</label>
                      <select
                        value={editTicketStatus}
                        onChange={(e) => setEditTicketStatus(e.target.value as any)}
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="IN_PROGRESS">IN_PROGRESS</option>
                        <option value="RESOLVED">RESOLVED</option>
                        <option value="CLOSED">CLOSED</option>
                      </select>
                    </div>
                  )}
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Saving Changes...
                      </span>
                    ) : (
                      'Save Ticket Changes'
                    )}
                  </button>
                </div>
              </>
            ) : type === 'comment_ticket' || type === 'comment' ? (
              <>
                {targetTicket && (
                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px 14px', borderRadius: '8px', marginBottom: '14px', border: '1px solid #E2E8F0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span className="code-badge">{targetTicket.ticketId}</span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <span className={`badge ${targetTicket.priority === 'HIGH' || targetTicket.priority === 'URGENT' ? 'badge-rejected' : 'badge-casual'}`}>
                          {targetTicket.priority} Priority
                        </span>
                        <span className="badge badge-casual">{targetTicket.status}</span>
                      </div>
                    </div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: '#0F172A' }}>{targetTicket.subject}</div>
                    <div style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>Worker: <strong>{targetTicket.workerName}</strong></div>
                  </div>
                )}

                <div style={{ maxHeight: '240px', overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, color: '#64748B', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                    Activity & Discussion ({commentsList.length})
                  </label>

                  {isLoadingComments ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#64748B' }}>
                      <Loader2 size={18} className="spinner" style={{ display: 'inline', marginRight: '6px' }} />
                      Loading comments history...
                    </div>
                  ) : commentsList.length === 0 ? (
                    <div style={{ backgroundColor: '#F1F5F9', borderRadius: '8px', padding: '16px', textAlign: 'center', color: '#64748B', fontSize: '13px' }}>
                      No comments yet on this ticket. Post a comment below to start the conversation!
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {commentsList.map((c) => (
                        <div
                          key={c.id}
                          style={{
                            backgroundColor: c.authorRole === 'WORKER' ? '#FFFFFF' : '#EFF6FF',
                            border: `1px solid ${c.authorRole === 'WORKER' ? '#E2E8F0' : '#BFDBFE'}`,
                            borderRadius: '8px',
                            padding: '10px 12px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, fontSize: '13px', color: '#0F172A' }}>{c.authorName}</span>
                              <span
                                style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: c.authorRole === 'WORKER' ? '#F1F5F9' : '#2563EB',
                                  color: c.authorRole === 'WORKER' ? '#475569' : '#FFFFFF'
                                }}
                              >
                                {c.authorRole}
                              </span>
                            </div>
                            <span style={{ fontSize: '11px', color: '#94A3B8', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <Clock size={11} />
                              {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#334155', whiteSpace: 'pre-wrap' }}>
                            {c.message}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Add New Comment / Reply *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Write your update or reply here..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-color)',
                      fontFamily: 'inherit',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="modal-footer mt-12">
                  <button type="button" className="btn-cancel" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit" disabled={isLoading || !newCommentText.trim()}>
                    {isLoading ? (
                      <span className="btn-loading-content">
                        <Loader2 size={16} className="spinner" /> Posting...
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Send size={14} /> Post Comment
                      </span>
                    )}
                  </button>
                </div>
              </>
            ) : type === 'notifications' ? (
              <div className="notifications-modal-container">
                {(role === 'SUPER_AGENT' || role === 'AGENT') && (
                  <div className="notifications-tabs">
                    <button
                      type="button"
                      className={`notif-tab-btn ${notifTab === 'inbox' ? 'active' : ''}`}
                      onClick={() => setNotifTab('inbox')}
                    >
                      <Bell size={15} />
                      Inbox / Alerts ({notifications.filter((n) => !n.isRead && n.unread !== false).length})
                    </button>
                    <button
                      type="button"
                      className={`notif-tab-btn ${notifTab === 'send' ? 'active' : ''}`}
                      onClick={() => setNotifTab('send')}
                    >
                      <Send size={15} />
                      Send Notification
                    </button>
                  </div>
                )}

                {notifTab === 'inbox' ? (
                  <>
                    <div className="notif-header-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Recent Notifications
                      </span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {user?.role === 'SUPER_AGENT' && (
                          <button
                            type="button"
                            onClick={handleTriggerSaturdayAudit}
                            title="Trigger Test Saturday Audit Notification"
                            style={{
                              backgroundColor: '#ECFDF5',
                              color: '#047857',
                              border: '1px solid #A7F3D0',
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
                            <FileSpreadsheet size={13} />
                            <span>Test Audit Notif</span>
                          </button>
                        )}
                        {notifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearAllNotifications}
                            title="Clear all notifications"
                            style={{
                              backgroundColor: 'transparent',
                              color: '#EF4444',
                              border: '1px solid #FCA5A5',
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
                            <Trash2 size={13} />
                            <span>Clear all</span>
                          </button>
                        )}
                        {notifications.some((n) => !n.isRead && n.unread !== false) && (
                          <button type="button" className="btn-mark-all-read" onClick={handleMarkAllRead}>
                            <CheckCheck size={14} /> Mark all read
                          </button>
                        )}
                      </div>
                    </div>

                    {isLoadingNotifs ? (
                      <div className="notif-empty-state">
                        <Loader2 size={24} className="spinner" />
                        <span>Loading notifications...</span>
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="notif-empty-state">
                        <Bell size={32} opacity={0.4} />
                        <span>No notifications right now</span>
                      </div>
                    ) : (
                      <div className="notifications-modal-list">
                        {notifications.map((item) => {
                          const isUnread = !item.isRead && item.unread !== false;
                          const t = (item.type || item.category || '').toUpperCase();
                          
                          let Icon = Bell;
                          if (t.includes('LEAVE')) Icon = Calendar;
                          else if (t.includes('PAYROLL')) Icon = DollarSign;
                          else if (t.includes('WALLET')) Icon = Wallet;
                          else if (t.includes('SUPPORT')) Icon = MessageSquare;
                          else if (t.includes('ANNOUNCEMENT')) Icon = Megaphone;
                          else if (t.includes('SITE')) Icon = Building2;
                          else if (t.includes('REPORT')) Icon = FileSpreadsheet;

                          const timeFormatted = item.createdAt
                            ? new Date(item.createdAt).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : item.time || 'Just now';

                          return (
                            <div
                              key={item.id}
                              className={`notification-item ${isUnread ? 'unread' : ''}`}
                            >
                              <div className="notif-item-header">
                                <div className="notif-item-title-group">
                                  <div className="notif-icon-badge">
                                    <Icon size={15} />
                                  </div>
                                  <span className="notif-title">{item.title}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span className="notif-time">{timeFormatted}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteNotification(item.id)}
                                    title="Delete notification"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      color: 'var(--text-secondary)',
                                      opacity: 0.6,
                                      cursor: 'pointer',
                                      padding: '2px'
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = '#EF4444'; e.currentTarget.style.opacity = '1'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.opacity = '0.6'; }}
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              </div>

                              <div className="notif-desc">{item.message || item.description}</div>

                              {isUnread && (
                                <button
                                  type="button"
                                  className="btn-mark-single-read"
                                  onClick={() => handleMarkRead(item.id)}
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <form onSubmit={handleSendNotification}>
                    <div className="form-group">
                      <label>Notification Title *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Site Maintenance Schedule / Union Meeting"
                        value={notifTitle}
                        onChange={(e) => setNotifTitle(e.target.value)}
                      />
                    </div>

                    <div className="form-row">
                      <div className="form-group flex-1">
                        <label>Target Role</label>
                        <select
                          value={notifTargetRole}
                          onChange={(e) => setNotifTargetRole(e.target.value)}
                        >
                          <option value="ALL">All Users (Broadcast)</option>
                          <option value="WORKER">Workers Only</option>
                          <option value="AGENT">Agents Only</option>
                        </select>
                      </div>

                      <div className="form-group flex-1">
                        <label>Notification Category</label>
                        <select
                          value={notifType}
                          onChange={(e) => setNotifType(e.target.value)}
                        >
                          <option value="ANNOUNCEMENT">Announcement</option>
                          <option value="INFO">General Info</option>
                          <option value="SYSTEM">System Alert</option>
                        </select>
                      </div>
                    </div>

                    <div className="form-group">
                      <label>Message Details *</label>
                      <textarea
                        required
                        rows={3}
                        placeholder="Type the notification message to broadcast..."
                        value={notifMessage}
                        onChange={(e) => setNotifMessage(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '10px',
                          borderRadius: '8px',
                          border: '1px solid #D1D5DB',
                          fontSize: '13.5px',
                        }}
                      />
                    </div>

                    <div className="modal-footer mt-12">
                      <button
                        type="button"
                        className="btn-cancel"
                        onClick={() => setNotifTab('inbox')}
                        disabled={isSendingNotif}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn-submit" disabled={isSendingNotif}>
                        {isSendingNotif ? (
                          <span className="btn-loading-content">
                            <Loader2 size={16} className="spinner" /> Sending...
                          </span>
                        ) : (
                          'Broadcast Notification'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            ) : type === 'search' ? (
              <div className="search-modal-content">
                <div className="search-modal-input-wrap">
                  <Search size={20} className="search-modal-icon" />
                  <input
                    type="text"
                    placeholder="Type a worker name, ID, site or agent..."
                    autoFocus
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="form-group">
                  <label>Name / Title</label>
                  <input
                    type="text"
                    required
                    placeholder="Enter name or title..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="modal-footer">
                  <button type="button" className="btn-cancel" onClick={onClose}>
                    Cancel
                  </button>
                  <button type="submit" className="btn-submit">
                    Save Changes
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
};
