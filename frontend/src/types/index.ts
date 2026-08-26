export type UserRole = 'SUPER_AGENT' | 'AGENT' | 'WORKER' | 'CUSTOMER_SUPPORT';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  employeeCode?: string;
  designation?: string;
  avatar?: string;
  profileImage?: string;
  siteId?: string;
  assignedAgentId?: string;
}

export interface MetricData {
  id: string;
  title: string;
  value: string;
  change: string;
  isPositive: boolean;
  type: 'workers' | 'agents' | 'sites' | 'active' | 'attendance' | 'wallet' | 'insurance' | 'tickets';
  comparisonPeriod: string;
}

export interface AttendanceDataPoint {
  date: string;
  present: number;
  absent: number;
}

export interface SiteWorkerDistribution {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface QuickActionItem {
  id: string;
  title: string;
  description: string;
  iconType: 'site' | 'agent' | 'worker' | 'attendance' | 'payroll' | 'leave' | 'ticket' | 'report';
  actionKey: string;
  allowedRoles?: UserRole[];
}

export interface LeaveRecord {
  id: string;
  workerName: string;
  workerId: string;
  workerRole?: string;
  avatar: string;
  leaveType: 'Casual Leave' | 'Sick Leave' | 'Earned Leave';
  fromDate: string;
  toDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
}

export interface PayrollData {
  total: number;
  paid: number;
  pending: number;
  percentagePaid: number;
}

export interface SystemOverviewItem {
  id: string;
  label: string;
  value: string | number;
  color: 'orange' | 'blue' | 'purple' | 'green';
  iconType: 'calendar' | 'credit-card' | 'ticket' | 'wallet';
  isCurrency?: boolean;
}

export interface ActivityItem {
  id: string;
  type: 'worker_joined' | 'attendance_marked' | 'leave_approved' | 'payroll_generated' | 'insurance_added' | 'wallet_updated';
  title: string;
  description: string;
  timestamp: string;
  iconColor: string;
}

export interface NotificationItem {
  id: string | number;
  title: string;
  message?: string;
  description?: string;
  time?: string;
  createdAt?: string;
  isRead?: boolean;
  unread?: boolean;
  type?: string;
  category?: string;
  role?: string;
  userId?: number;
}

export interface SiteItem {
  id: string;
  siteCode: string;
  siteName: string;
  companyName: string;
  city: string;
  state: string;
  assignedAgents: number;
  totalWorkers: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'ACTIVE' | 'INACTIVE' | string;
}

export interface AgentItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeCode: string;
  designation: string;
  assignedSite: string;
  assignedWorkersCount: number;
  assignedWorkers?: { id: string; name: string; employeeCode: string; designation: string }[];
  workers?: any[];
  totalWorkers?: number;
  avatar: string;
  joiningDate?: string;
  createdAt?: string;
  profileImage?: string;

  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  pfUanNumber?: string;
  form16Status?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface WorkerItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  employeeCode: string;
  designation: string;
  siteName: string;
  agentName: string;
  assignedAgentId?: string;
  dailyWage: number;
  joiningDate: string;
  avatar: string;
  status: 'ACTIVE' | 'INACTIVE';

  // Detailed Compliance & Profile Fields
  aadhaarNumber?: string;
  panNumber?: string;
  passportNumber?: string;
  passportExpiry?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankIfsc?: string;
  pfUanNumber?: string;
  form16Status?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface WalletRecord {
  id: string;
  workerId: string;
  rawWorkerId?: number;
  workerName: string;
  userRole?: 'SUPER_AGENT' | 'AGENT' | 'WORKER';
  assignedAgentId?: string | number;
  agentName?: string;
  assignedWorkersCount?: number;
  balance: number;
  lastTransactionDate: string;
  lastTransactionType: 'CREDIT' | 'DEBIT';
  lastAmount: number;
}

export interface WalletTransaction {
  id: string | number;
  walletId: string | number;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description?: string;
  createdAt: string;
}

export interface InsurancePolicy {
  id: string;
  workerId: string;
  workerName: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  premiumAmount: number;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  endDate: string;
}

export interface TicketComment {
  id: string | number;
  ticketId: string | number;
  authorId?: string | number;
  authorName?: string;
  authorRole?: string;
  senderId?: string | number;
  senderName?: string;
  senderRole?: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  ticketNumber?: string;
  workerName: string;
  workerId?: string | number;
  subject: string;
  description?: string;
  reply?: string;
  handledBy?: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  attachmentUrl?: string;
  commentsCount?: number;
  comments?: TicketComment[];
  createdAt: string;
}

export interface WorkerDocumentItem {
  id: number;
  workerId: number;
  title: string;
  category: string;
  fileUrl: string;
  fileType: string;
  uploadedAt: string;
}

export interface WorkerSiteScheduleItem {
  id: number;
  workerId: number;
  siteId: number;
  date: string;
  notes?: string;
  site?: SiteItem;
}

export interface AttendanceRecordWithPhoto {
  id: number;
  workerId: number;
  date: string;
  status: 'PRESENT' | 'HALF_DAY' | 'ABSENT' | 'HOLIDAY';
  signInPhoto?: string;
  signOutPhoto?: string;
  signInTime?: string;
  signOutTime?: string;
  overtimeHours?: number;
  remarks?: string;
}

