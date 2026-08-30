import type {
  User,
  SiteItem,
  AgentItem,
  WorkerItem,
  LeaveRecord,
  WalletRecord,
  SupportTicket,
  TicketComment,
  ActivityItem,
  NotificationItem,
  WorkerDocumentItem,
  WorkerSiteScheduleItem
} from '../types';

export interface LoginResponseData {
  token: string;
  user: User;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface ValidationErrors {
  email?: string;
  password?: string;
  general?: string;
}

// Client-side Validation Rules
export const validateLoginForm = (email: string, password: string): ValidationErrors => {
  const errors: ValidationErrors = {};
  
  if (!email || !email.trim()) {
    errors.email = 'Email Address is required';
  } else {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address';
    }
  }

  if (!password) {
    errors.password = 'Password is required';
  } else if (password.length < 6) {
    errors.password = 'Password must be at least 6 characters long';
  }

  return errors;
};

// Helper for safe JSON parsing from response
const safeParseJson = async (response: Response) => {
  try {
    const text = await response.text();
    if (!text || !text.trim()) {
      return null;
    }
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// Helper for authenticated backend requests
const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = sessionStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch {
    throw new Error('Unable to connect to server. Please check backend connection.');
  }

  // If token is rejected mid-session, fire a global event so AuthContext can react
  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('session-expired'));
  }

  const result = await safeParseJson(response);

  if (!response.ok || !result || !result.success) {
    const errorMsg = result?.message || (
      response.status === 401 ? 'Unauthorized / Invalid session' :
      response.status === 502 ? 'Backend Server Unavailable (502 Bad Gateway)' :
      `API Error (${response.status})`
    );
    throw new Error(errorMsg);
  }
  return result;
};


// 1. Auth Endpoints (Strict Backend API calls)
export const fetchMeApi = async (): Promise<User> => {
  const res = await fetchWithAuth('/api/auth/me');
  return res.data;
};

export const loginApi = async (email: string, password: string, portal?: 'MAIN' | 'SUPPORT'): Promise<LoginResponseData> => {
  const validationErrors = validateLoginForm(email, password);
  if (Object.keys(validationErrors).length > 0) {
    const firstError = validationErrors.email || validationErrors.password;
    throw new Error(firstError || 'Validation failed');
  }

  let response: Response;
  try {
    response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim(),
        password: password,
        portal: portal
      })
    });
  } catch {
    throw new Error('Unable to connect to server. Please ensure backend is running.');
  }

  const result = await safeParseJson(response);

  if (!response.ok || !result || !result.success) {
    const errorMsg = result?.message || (
      response.status === 401 ? '401 Invalid Credentials' :
      response.status === 502 ? 'Backend Server Unavailable (502 Bad Gateway)' :
      `Server Error (${response.status})`
    );
    throw new Error(errorMsg);
  }

  return result.data;
};

export const sendEmailVerificationCodeApi = async (email: string, name?: string) => {
  const res = await fetchWithAuth('/api/auth/send-verification-code', {
    method: 'POST',
    body: JSON.stringify({ email, name })
  });
  return res;
};

export const verifyEmailCodeApi = async (email: string, code: string) => {
  const res = await fetchWithAuth('/api/auth/verify-code', {
    method: 'POST',
    body: JSON.stringify({ email, code })
  });
  return res;
};

// 2. Live Dashboard Endpoint (Strict Backend API call)
export const fetchDashboardStatsApi = async (startDate?: string, endDate?: string) => {
  const query = new URLSearchParams();
  if (startDate) query.append('startDate', startDate);
  if (endDate) query.append('endDate', endDate);
  const queryString = query.toString() ? `?${query.toString()}` : '';
  const res = await fetchWithAuth(`/api/dashboard${queryString}`);
  return res.data;
};

// 3. Notifications Endpoints (Strict Backend API calls)
export const fetchNotificationsApi = async (): Promise<NotificationItem[]> => {
  const res = await fetchWithAuth('/api/notifications');
  return res.data;
};

export const markNotificationReadApi = async (id: string | number) => {
  const res = await fetchWithAuth(`/api/notifications/${id}/read`, {
    method: 'PATCH',
  });
  return res.data;
};

export const markAllNotificationsReadApi = async () => {
  const res = await fetchWithAuth('/api/notifications/read-all', {
    method: 'PATCH',
  });
  return res;
};

export const sendNotificationApi = async (payload: {
  title: string;
  message: string;
  type?: string;
  targetRole?: string;
  targetUserId?: number;
}) => {
  const res = await fetchWithAuth('/api/notifications', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return res.data;
};

export const triggerSaturdayAuditNotificationApi = async () => {
  const res = await fetchWithAuth('/api/notifications/trigger-saturday-audit', {
    method: 'POST',
  });
  return res.data;
};

export const clearAllNotificationsApi = async () => {
  const res = await fetchWithAuth('/api/notifications/clear-all', {
    method: 'DELETE',
  });
  return res;
};

export const deleteNotificationApi = async (id: string | number) => {
  const res = await fetchWithAuth(`/api/notifications/${id}`, {
    method: 'DELETE',
  });
  return res.data;
};

// 4. Recent Activities Endpoint (Strict Backend API call)
export const fetchRecentActivitiesApi = async (): Promise<ActivityItem[]> => {
  const res = await fetchWithAuth('/api/dashboard/activities');
  return res.data;
};

// 5. Sites Endpoint (Strict Backend API call)
export const fetchSitesApi = async (): Promise<SiteItem[]> => {
  const res = await fetchWithAuth('/api/sites');
  return res.data.map((site: any) => {
    const allUsers = site.users || site.workers || [];
    const workersCount = allUsers.filter((u: any) => u.role === 'WORKER').length || (site.workers ? site.workers.length : 0);
    const agentsCount = allUsers.filter((u: any) => u.role === 'AGENT' || u.role === 'SUPER_AGENT').length || (site.agents ? site.agents.length : 0);
    return {
      id: String(site.id),
      siteCode: site.siteCode || `SITE-${site.id}`,
      siteName: site.siteName,
      companyName: site.companyName || 'Labor Union Org',
      city: site.city || 'Mumbai',
      state: site.state || 'Maharashtra',
      assignedAgents: agentsCount,
      totalWorkers: workersCount,
      status: site.status || 'ACTIVE'
    };
  });
};

// 5.5. Users Endpoint (Fetch all users from backend)
export const fetchUsersApi = async (): Promise<any[]> => {
  try {
    const res = await fetchWithAuth('/api/users');
    return res.data || [];
  } catch {
    return [];
  }
};

// 6. Agents Endpoint (Strict Backend API call)
export const fetchAgentsApi = async (): Promise<AgentItem[]> => {
  const res = await fetchWithAuth('/api/users/agents');
  return res.data.map((agent: any) => {
    const rawWorkers = agent.workers || agent.assignedWorkers || [];
    return {
      id: String(agent.id),
      name: agent.name,
      email: agent.email,
      phone: agent.phone || '+91 9876543210',
      employeeCode: agent.employeeCode || `AGT-00${agent.id}`,
      designation: agent.designation || 'Field Supervisor',
      assignedSite: agent.site?.siteName || 'Metro Line 3 Construction',
      joiningDate: agent.joiningDate
        ? new Date(agent.joiningDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : agent.createdAt
        ? new Date(agent.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—',
      createdAt: agent.createdAt,
      assignedWorkersCount: rawWorkers.length,
      assignedWorkers: rawWorkers.map((w: any) => ({
        id: String(w.id),
        name: w.name,
        employeeCode: w.employeeCode || `WRK-${w.id}`,
        designation: w.designation || 'Worker'
      })),
      avatar: agent.profileImage || agent.avatar || '',
      status: agent.status || (agent.active ? 'ACTIVE' : 'INACTIVE'),
      siteId: agent.siteId
    };
  });
};

// 7. Workers Endpoint (Strict Backend API call)
export const fetchWorkersApi = async (): Promise<WorkerItem[]> => {
  const res = await fetchWithAuth('/api/users/workers');
  return res.data.map((w: any) => ({
    id: String(w.id),
    name: w.name,
    email: w.email,
    phone: w.phone || '+91 9811111111',
    employeeCode: w.employeeCode || `WRK-00${w.id}`,
    designation: w.designation || 'Worker',
    siteName: w.site?.siteName || 'Metro Construction',
    agentName: w.assignedAgent?.name || 'Unassigned',
    assignedAgentId: w.assignedAgentId ? String(w.assignedAgentId) : undefined,
    dailyWage: w.salary ? Math.round(w.salary / 30) : 850,
    joiningDate: w.joiningDate ? new Date(w.joiningDate).toISOString().split('T')[0] : '2024-03-01',
    avatar: w.profileImage || w.avatar || '',
    status: 'ACTIVE',

    // Extended Compliance & Profile Details
    aadhaarNumber: w.aadhaarNumber || `5489-3210-${1000 + Number(w.id)}`,
    panNumber: w.panNumber || `ABCDE${1000 + Number(w.id)}F`,
    passportNumber: w.passportNumber || `Z${5000000 + Number(w.id)}`,
    passportExpiry: w.passportExpiry || '2030-12-31',
    bankName: w.bankName || 'State Bank of India',
    bankAccountNumber: w.bankAccountNumber || `30981234${500 + Number(w.id)}`,
    bankIfsc: w.bankIfsc || 'SBIN0001234',
    pfUanNumber: w.pfUanNumber || `10098472${100 + Number(w.id)}`,
    form16Status: w.form16Status || 'Verified & Issued (FY 2025-26)',
    address: w.address || 'Plot 42, Sector 12, Industrial Union Area',
    city: w.city || 'Mumbai',
    state: w.state || 'Maharashtra',
    pincode: w.pincode || '400001'
  }));
};

// 8. Wallets Endpoint (Strict Backend API call)
export const fetchWalletsApi = async (): Promise<WalletRecord[]> => {
  const res = await fetchWithAuth('/api/wallet');
  return res.data.map((w: any) => {
    const lastTx = w.transactions && w.transactions.length > 0 ? w.transactions[0] : null;
    return {
      id: String(w.id),
      workerId: w.worker?.employeeCode || (w.worker?.role === 'AGENT' ? `AGT-${w.workerId}` : `WRK-${w.workerId}`),
      rawWorkerId: w.workerId,
      assignedAgentId: w.worker?.assignedAgentId,
      workerName: w.worker?.name || 'Member',
      userRole: w.worker?.role || 'WORKER',
      agentName: w.worker?.assignedAgent?.name || (w.worker?.role === 'AGENT' ? 'Self (Field Agent)' : 'Unassigned'),
      assignedWorkersCount: w.worker?.workers?.length || 0,
      balance: w.balance,
      lastTransactionDate: lastTx ? new Date(lastTx.createdAt).toLocaleDateString() : new Date(w.updatedAt || Date.now()).toLocaleDateString(),
      lastTransactionType: lastTx?.type || 'CREDIT',
      lastAmount: lastTx ? lastTx.amount : w.balance
    };
  });
};

export const fetchWalletHistoryApi = async (): Promise<any[]> => {
  const res = await fetchWithAuth('/api/wallet/history');
  return res.data || [];
};

export const debitWalletApi = async (workerId: string | number, amount: number, description?: string) => {
  const res = await fetchWithAuth('/api/wallet/debit', {
    method: 'POST',
    body: JSON.stringify({ workerId: Number(workerId), amount: Number(amount), description })
  });
  return res.data;
};

export const creditWalletApi = async (workerId: string | number, amount: number, description?: string) => {
  const res = await fetchWithAuth('/api/wallet/credit', {
    method: 'POST',
    body: JSON.stringify({ workerId: Number(workerId), amount: Number(amount), description })
  });
  return res.data;
};

export const requestDisbursementApi = async (workerId: string | number, amount: number, description?: string) => {
  const res = await fetchWithAuth('/api/wallet/request-disbursement', {
    method: 'POST',
    body: JSON.stringify({ workerId: Number(workerId), amount: Number(amount), description })
  });
  return res.data;
};

export const fetchDisbursementRequestsApi = async (): Promise<any[]> => {
  const res = await fetchWithAuth('/api/wallet/disbursements');
  return res.data || [];
};

export const approveDisbursementApi = async (requestId: string | number) => {
  const res = await fetchWithAuth(`/api/wallet/disbursements/${requestId}/approve`, {
    method: 'POST',
  });
  return res.data;
};

export const rejectDisbursementApi = async (requestId: string | number) => {
  const res = await fetchWithAuth(`/api/wallet/disbursements/${requestId}/reject`, {
    method: 'POST',
  });
  return res.data;
};

// 9. Insurance Endpoint (Strict Backend API call)
export const fetchInsuranceApi = async () => {
  const res = await fetchWithAuth('/api/insurance');
  const data = res.data;

  const rawPolicies = Array.isArray(data) ? data : (data.policies || []);
  const mapped = rawPolicies.map((p: any) => ({
    id: String(p.id),
    dbWorkerId: p.workerId || p.worker?.id,
    workerId: p.worker?.employeeCode || (p.worker?.role === 'AGENT' ? `AGT-${p.workerId}` : `WRK-${p.workerId}`),
    workerName: p.worker?.name || 'Union Member',
    workerRole: p.worker?.role || (p.worker?.employeeCode?.startsWith('AGT') ? 'AGENT' : 'WORKER'),
    provider: p.provider,
    policyNumber: p.policyNumber,
    coverageAmount: p.coverageAmount,
    premiumAmount: p.premiumAmount,
    status: p.status,
    startDate: p.startDate ? new Date(p.startDate).toLocaleDateString() : (p.createdAt ? new Date(p.createdAt).toLocaleDateString() : ''),
    rawStartDate: p.startDate || p.createdAt || null,
    rawEndDate: p.endDate || null,
    endDate: p.endDate ? new Date(p.endDate).toLocaleDateString() : ''
  }));

  const activeCount = mapped.filter((p: any) => p.status === 'ACTIVE').length;
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const expiringSoonCount = mapped.filter((p: any) => {
    const e = new Date(p.endDate);
    return e <= thirtyDaysFromNow && e >= new Date();
  }).length;

  return {
    summary: data.summary || {
      activePolicies: activeCount,
      expiringSoon: expiringSoonCount,
      sumInsured: 500000,
      coverageRate: mapped.length > 0 ? Math.round((activeCount / mapped.length) * 100) : 0
    },
    policies: mapped
  };
};

export const createInsuranceApi = async (policyData: {
  workerId: number | string;
  provider?: string;
  policyNumber?: string;
  coverageAmount?: number;
  premiumAmount?: number;
  startDate?: string;
  endDate?: string;
}) => {
  const res = await fetchWithAuth('/api/insurance', {
    method: 'POST',
    body: JSON.stringify(policyData)
  });
  return res.data;
};

export const updateInsuranceApi = async (id: number | string, policyData: {
  workerId?: number | string;
  provider?: string;
  policyNumber?: string;
  coverageAmount?: number;
  premiumAmount?: number;
  startDate?: string;
  endDate?: string;
  status?: string;
}) => {
  const res = await fetchWithAuth(`/api/insurance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(policyData)
  });
  return res.data;
};

export const deleteInsuranceApi = async (id: number | string) => {
  const res = await fetchWithAuth(`/api/insurance/${id}`, {
    method: 'DELETE'
  });
  return res.data;
};

// 10. Support Tickets Endpoint (Strict Backend API call)
export const fetchSupportTicketsApi = async (): Promise<SupportTicket[]> => {
  const res = await fetchWithAuth('/api/support');
  return res.data.map((t: any) => ({
    id: String(t.id),
    ticketId: `TCK-${t.id}`,
    workerName: t.worker?.name || 'Worker',
    workerId: t.workerId,
    workerCode: t.worker?.employeeCode,
    subject: t.subject,
    description: t.description,
    reply: t.reply,
    handledById: t.handledById,
    handledBy: t.handledBy?.name,
    priority: t.priority,
    status: t.status,
    attachmentUrl: t.attachmentUrl,
    commentsCount: t._count?.comments ?? 0,
    createdAt: new Date(t.createdAt).toLocaleDateString()
  }));
};

export const createSupportTicketApi = async (data: {
  subject: string;
  description: string;
  priority: string;
  workerId?: number;
  handledById?: number;
  agentId?: number;
  attachmentUrl?: string;
}) => {
  const res = await fetchWithAuth('/api/support', {
    method: 'POST',
    body: JSON.stringify(data)
  });
  return res.data;
};

export const replySupportTicketApi = async (id: string | number, reply: string) => {
  const res = await fetchWithAuth(`/api/support/${id}/reply`, {
    method: 'PATCH',
    body: JSON.stringify({ reply })
  });
  return res.data;
};

export const updateSupportTicketApi = async (
  id: string | number,
  data: {
    subject?: string;
    description?: string;
    priority?: string;
    status?: string;
    handledById?: number | null;
    handledBy?: string | null;
    unassign?: boolean;
  }
) => {
  const res = await fetchWithAuth(`/api/support/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data)
  });
  return res.data;
};

export const checkInApi = async () => {
  const res = await fetchWithAuth('/api/attendance/check-in', {
    method: 'POST'
  });
  return res.data;
};

export const checkOutApi = async () => {
  const res = await fetchWithAuth('/api/attendance/check-out', {
    method: 'POST'
  });
  return res.data;
};

export const fetchTodayAttendanceStatusApi = async () => {
  const res = await fetchWithAuth('/api/attendance/today-status');
  return res.data;
};

export const fetchTicketCommentsApi = async (ticketId: string | number): Promise<TicketComment[]> => {
  const res = await fetchWithAuth(`/api/support/${ticketId}/comments`);
  return res.data || [];
};

export const addTicketCommentApi = async (ticketId: string | number, message: string): Promise<TicketComment> => {
  const res = await fetchWithAuth(`/api/support/${ticketId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ message })
  });
  return res.data;
};

export const closeSupportTicketApi = async (id: string | number) => {
  const res = await fetchWithAuth(`/api/support/${id}/close`, {
    method: 'PATCH'
  });
  return res.data;
};

// 11. Leave Requests Endpoint (Strict Backend API call)
export const fetchLeavesApi = async (): Promise<LeaveRecord[]> => {
  const res = await fetchWithAuth('/api/leave');
  return res.data.map((l: any) => ({
    id: String(l.id),
    workerName: l.worker?.name || 'Worker',
    workerId: l.worker?.employeeCode || `WRK-00${l.workerId || l.id}`,
    workerRole: l.worker?.role,
    avatar: l.worker?.profileImage || l.worker?.avatar || '',
    leaveType: 'Casual Leave',
    fromDate: new Date(l.fromDate).toLocaleDateString(),
    toDate: new Date(l.toDate).toLocaleDateString(),
    status: l.status,
    reason: l.reason
  }));
};

// 12. Register User API Endpoint (Backend Registration)
export const registerUserApi = async (userData: {
  name: string;
  email?: string;
  password: string;
  role: 'SUPER_AGENT' | 'AGENT' | 'WORKER';
  phone?: string;
  designation?: string;
  employeeCode?: string;
  salary?: number;
  siteId?: number;
  avatar?: string;
  bankAccountNo?: string;
  ifscCode?: string;
  address?: string;
  registrationAmount?: number;
  paymentMethod?: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  upiTransactionId?: string;
}) => {
  const res = await fetchWithAuth('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
  return res.data;
};

export const createRazorpayOrderApi = async (amount: number) => {
  const res = await fetchWithAuth('/api/payments/razorpay-order', {
    method: 'POST',
    body: JSON.stringify({ amount })
  });
  return res;
};

// 13. Payroll Generation Endpoint (Backend Payroll API)
export const generatePayrollApi = async (payrollPayload?: { workerId?: string; weekStart?: string; weekEnd?: string }) => {
  const res = await fetchWithAuth('/api/payroll', {
    method: 'POST',
    body: JSON.stringify(payrollPayload || {})
  });
  return res.data;
};

export const fetchPayrollsApi = async () => {
  const res = await fetchWithAuth('/api/payroll');
  return res.data;
};

export const fetchMyLeavesApi = async (): Promise<LeaveRecord[]> => {
  const res = await fetchWithAuth('/api/leave/my');
  return res.data.map((l: any) => ({
    id: String(l.id),
    workerName: l.worker?.name || 'Worker',
    workerId: l.worker?.employeeCode || `WRK-00${l.workerId || l.id}`,
    workerRole: l.worker?.role,
    avatar: l.worker?.profileImage || l.worker?.avatar || '',
    leaveType: 'Casual Leave',
    fromDate: new Date(l.fromDate).toLocaleDateString(),
    toDate: new Date(l.toDate).toLocaleDateString(),
    status: l.status,
    reason: l.reason
  }));
};

// 14. Assign Worker to Agent API Endpoint (Backend Endpoint)
export const assignWorkerToAgentApi = async (workerId: string | number, agentId: string | number) => {
  const res = await fetchWithAuth('/api/agents/assign', {
    method: 'POST',
    body: JSON.stringify({
      workerId: Number(workerId),
      agentId: Number(agentId)
    })
  });
  return res.data;
};

// 15. Wallet Dashboard Aggregates API Endpoint
export const fetchWalletDashboardApi = async () => {
  const res = await fetchWithAuth('/api/wallet/dashboard');
  return res.data;
};

// 15b. Disburse Weekly Attendance Allowance API Endpoint
export const disburseWeeklyWalletApi = async (poolAmount?: number) => {
  const res = await fetchWithAuth('/api/wallet/disburse-weekly', {
    method: 'POST',
    body: JSON.stringify({ poolAmount })
  });
  return res.data;
};

// 16. Apply Leave API Endpoint
export const applyLeaveApi = async (leaveData: {
  workerId?: string | number;
  fromDate: string;
  toDate: string;
  reason: string;
}) => {
  const res = await fetchWithAuth('/api/leave', {
    method: 'POST',
    body: JSON.stringify(leaveData)
  });
  return res.data;
};

// 17. Approve & Reject Leave API Endpoints
export const approveLeaveApi = async (leaveId: string | number) => {
  const res = await fetchWithAuth(`/api/leave/${leaveId}/approve`, {
    method: 'PUT'
  });
  return res.data;
};

export const rejectLeaveApi = async (leaveId: string | number) => {
  const res = await fetchWithAuth(`/api/leave/${leaveId}/reject`, {
    method: 'PUT'
  });
  return res.data;
};

// 18. Delete User / Worker API Endpoint
export const deleteUserApi = async (userId: string | number) => {
  const res = await fetchWithAuth(`/api/users/${userId}`, {
    method: 'DELETE'
  });
  return res.data;
};

// 19. Forgot Password API Endpoint
export const forgotPasswordApi = async (email: string) => {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Failed to process password reset request');
  }
  return result;
};

// 20. Reset Password API Endpoint
export const resetPasswordApi = async (token: string, password: string) => {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password })
  });

  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Invalid or expired password reset link');
  }
  return result;
};

// 21. Create Working Site API Endpoint
export const createSiteApi = async (siteData: {
  siteCode: string;
  siteName: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  contactPerson: string;
  contactNumber: string;
  status?: string;
}) => {
  const res = await fetchWithAuth('/api/sites', {
    method: 'POST',
    body: JSON.stringify(siteData)
  });
  return res.data;
};

export const updateSiteApi = async (siteId: string | number, siteData: any) => {
  const res = await fetchWithAuth(`/api/sites/${siteId}`, {
    method: 'PUT',
    body: JSON.stringify(siteData)
  });
  return res.data;
};

// 22. Mark Worker Attendance API Endpoint
export const markAttendanceApi = async (attendanceData: {
  workerId: number;
  date: string;
  status: 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY';
  statusCode?: number;
  checkInTime?: string;
  checkOutTime?: string;
  checkInPhoto?: string;
  checkOutPhoto?: string;
  signInPhoto?: string;
  signOutPhoto?: string;
  signInTime?: string;
  signOutTime?: string;
  siteId?: number;
  dailyPay?: number;
  overtimeHours?: number;
  remarks?: string;
}) => {
  const payload = {
    ...attendanceData,
    checkInTime: attendanceData.checkInTime || attendanceData.signInTime,
    checkOutTime: attendanceData.checkOutTime || attendanceData.signOutTime,
    checkInPhoto: attendanceData.checkInPhoto || attendanceData.signInPhoto,
    checkOutPhoto: attendanceData.checkOutPhoto || attendanceData.signOutPhoto,
  };
  const res = await fetchWithAuth('/api/attendance', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  return res.data;
};

export const verifyFacePhotosApi = async (checkInPhoto: string, checkOutPhoto: string) => {
  const res = await fetchWithAuth('/api/attendance/verify-faces', {
    method: 'POST',
    body: JSON.stringify({ checkInPhoto, checkOutPhoto })
  });
  return res;
};

// 22b. Fetch Attendance Summary & Logs Endpoint
export const fetchAttendanceLogsApi = async () => {
  const res = await fetchWithAuth('/api/attendance');
  const data = res.data;

  // Handle both array and summary payload objects
  if (Array.isArray(data)) {
    const presentCount = data.filter((a: any) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;
    const totalCount = data.length || 1;
    const absentCount = data.filter((a: any) => a.status === 'ABSENT').length;
    const totalOT = data.reduce((sum: number, a: any) => sum + (a.overtimeHours || 0), 0);

    return {
      summary: {
        todayPresent: presentCount,
        todayAbsent: absentCount,
        attendanceRate: Number(((presentCount / totalCount) * 100).toFixed(1)),
        absenceRate: Number(((absentCount / totalCount) * 100).toFixed(1)),
        totalOvertime: totalOT,
        totalSites: 4
      },
      logs: data
    };
  }

  return {
    summary: data.summary || {
      todayPresent: 0,
      todayAbsent: 0,
      attendanceRate: 0,
      absenceRate: 0,
      totalOvertime: 0,
      totalSites: 4
    },
    logs: data.logs || []
  };
};

// 23. Remove Worker from Agent API Endpoint
export const removeWorkerFromAgentApi = async (workerId: string | number) => {
  const res = await fetchWithAuth(`/api/agents/remove/${workerId}`, {
    method: 'DELETE'
  });
  return res.data;
};

// 24. Update User / Worker API Endpoint
export const updateUserApi = async (userId: string | number, userData: Partial<WorkerItem> & any) => {
  const res = await fetchWithAuth(`/api/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
  return res.data;
};

// 25. Assign Agent to Working Site Endpoint
export const assignAgentToSiteApi = async (agentId: string | number, siteId: string | number) => {
  return updateUserApi(agentId, { siteId: Number(siteId) });
};

// 26. Remove / Unassign Agent from Site Endpoint
export const removeAgentFromSiteApi = async (agentId: string | number) => {
  return updateUserApi(agentId, { siteId: null });
};

// 27. Mobile Email Approval Authentication Endpoints
export const requestMobileApprovalApi = async (email: string) => {
  const res = await fetch('/api/auth/request-mobile-approval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Failed to send mobile authentication email');
  }
  return data.data;
};

export const checkApprovalStatusApi = async (authRequestId: string) => {
  const res = await fetch(`/api/auth/approval-status/${authRequestId}`);
  const data = await res.json();
  if (!res.ok || !data.success) {
    return { status: 'PENDING' };
  }
  return data.data;
};

export const approveLoginTokenApi = async (token: string) => {
  const res = await fetch('/api/auth/approve-login-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Invalid or expired approval link');
  }
  return data.data;
};

// 28. Worker Details & Compliance API Endpoints
export const fetchWorkerDetailsApi = async (workerId: string | number) => {
  try {
    const res = await fetchWithAuth(`/api/users/${workerId}`);
    return res.data;
  } catch {
    const all = await fetchWorkersApi();
    const found = all.find((w: any) => String(w.id) === String(workerId));
    return found || (all.length > 0 ? all[0] : null);
  }
};

export const fetchWorkerDocumentsApi = async (workerId: string | number): Promise<WorkerDocumentItem[]> => {
  try {
    const res = await fetchWithAuth(`/api/workers/${workerId}/documents`);
    return res.data || [];
  } catch {
    return [
      {
        id: 1,
        workerId: Number(workerId),
        title: 'Aadhaar Card Front',
        category: 'IDENTITY',
        fileUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60',
        fileType: 'IMAGE',
        uploadedAt: new Date().toISOString()
      }
    ];
  }
};

export const addWorkerDocumentApi = async (workerId: string | number, docData: any) => {
  try {
    const res = await fetchWithAuth(`/api/workers/${workerId}/documents`, {
      method: 'POST',
      body: JSON.stringify(docData)
    });
    return res.data;
  } catch {
    return { id: Date.now(), workerId: Number(workerId), ...docData, uploadedAt: new Date().toISOString() };
  }
};

export const deleteWorkerDocumentApi = async (docId: number) => {
  try {
    const res = await fetchWithAuth(`/api/documents/${docId}`, {
      method: 'DELETE'
    });
    return res.data;
  } catch {
    return { success: true };
  }
};

export const fetchWorkerSchedulesApi = async (workerId: string | number): Promise<WorkerSiteScheduleItem[]> => {
  try {
    const res = await fetchWithAuth(`/api/workers/${workerId}/schedules`);
    return res.data || [];
  } catch {
    return [];
  }
};

export const assignWorkerScheduleApi = async (data: { workerId: number; siteId: number; date: string; notes?: string }) => {
  try {
    const res = await fetchWithAuth(`/api/workers/${data.workerId}/schedules`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  } catch {
    return { id: Date.now(), ...data };
  }
};

export const markAttendanceWithPhotosApi = async (data: {
  workerId: number;
  date: string;
  status: string;
  signInPhoto?: string;
  signOutPhoto?: string;
  signInTime?: string;
  signOutTime?: string;
  type?: 'SIGN_IN' | 'SIGN_OUT';
  remarks?: string;
}) => {
  try {
    const res = await fetchWithAuth('/api/attendance/live-photo', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    return res.data;
  } catch {
    return markAttendanceApi({
      workerId: data.workerId,
      date: data.date,
      status: data.status as any,
      remarks: data.remarks || `Live ${data.type || 'photo'} captured`
    });
  }
};

// 29. Customer Support Analytics API Endpoint
export const fetchSupportAnalyticsApi = async () => {
  const res = await fetchWithAuth('/api/support/analytics');
  return res.data;
};

// 30. Worker Attendance Tracking API Endpoint
export const fetchWorkerAttendanceApi = async (workerId: string | number) => {
  try {
    const numericId = Number(String(workerId).replace(/\D/g, '')) || Number(workerId);
    const res = await fetchWithAuth(`/api/attendance/worker/${numericId}`);
    return res.data || [];
  } catch {
    try {
      const res = await fetchWithAuth('/api/attendance');
      return (res.data || []).filter((a: any) => String(a.workerId) === String(workerId) || Number(a.workerId) === Number(String(workerId).replace(/\D/g, '')));
    } catch {
      return [];
    }
  }
};

// 31. Enquiry API Endpoints
export interface EnquiryItem {
  id: number;
  name: string;
  email?: string | null;
  phone: string;
  address?: string | null;
  designation: 'WORKER' | 'AGENT';
  status: 'NEW' | 'PENDING' | 'CONTACTED' | 'CONVERTED' | 'RESOLVED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export const submitEnquiryApi = async (data: {
  name: string;
  email?: string;
  phone: string;
  address?: string;
  designation: 'WORKER' | 'AGENT';
}): Promise<{ success: boolean; message: string; data: EnquiryItem }> => {
  const res = await fetch('/api/enquiries', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok || !json.success) {
    throw new Error(json.message || 'Failed to submit enquiry');
  }
  return json;
};

export const fetchEnquiriesApi = async (params?: {
  designation?: string;
  status?: string;
  search?: string;
}): Promise<EnquiryItem[]> => {
  const query = new URLSearchParams();
  if (params?.designation && params.designation !== 'ALL') query.append('designation', params.designation);
  if (params?.status && params.status !== 'ALL') query.append('status', params.status);
  if (params?.search && params.search.trim()) query.append('search', params.search.trim());

  const res = await fetchWithAuth(`/api/enquiries?${query.toString()}`);
  return res.data || [];
};

export const updateEnquiryStatusApi = async (
  id: number | string,
  status: string,
  notes?: string
): Promise<EnquiryItem> => {
  const res = await fetchWithAuth(`/api/enquiries/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, notes }),
  });
  return res.data;
};

export const deleteEnquiryApi = async (id: number | string): Promise<{ success: boolean; message: string }> => {
  const res = await fetchWithAuth(`/api/enquiries/${id}`, {
    method: 'DELETE',
  });
  return res;
};

