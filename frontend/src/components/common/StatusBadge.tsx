import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  CalendarCheck,
  CalendarX,
  Hourglass,
  Check,
  RefreshCw,
  MinusCircle,
  ArrowDownLeft,
  ArrowUpRight,
  ShieldCheck,
  HelpCircle
} from 'lucide-react';
import './StatusBadge.css';

export type StatusType =
  | 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'HOLIDAY' | 'ON_LEAVE'
  | 'COMPLETED' | 'IN_PROGRESS' | 'ON_HOLD' | 'CANCELLED'
  | 'PAID' | 'UNPAID' | 'PROCESSING'
  | 'OPEN' | 'CLOSED' | 'RESOLVED'
  | 'HIGH' | 'MEDIUM' | 'LOW' | 'URGENT'
  | 'CREDIT' | 'DEBIT'
  | string;

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  label,
  size = 'md',
  className = ''
}) => {
  const norm = (status || '').toString().toUpperCase().trim().replace(/ /g, '_');

  const getStatusConfig = () => {
    switch (norm) {
      // 1. User & Account Statuses
      case 'ACTIVE':
        return { text: label || 'Active', variant: 'badge-success', icon: CheckCircle2 };
      case 'INACTIVE':
        return { text: label || 'Inactive', variant: 'badge-neutral', icon: MinusCircle };
      case 'SUSPENDED':
        return { text: label || 'Suspended', variant: 'badge-danger', icon: ShieldAlert };
      case 'PENDING':
        return { text: label || 'Pending', variant: 'badge-warning', icon: Clock };
      case 'APPROVED':
        return { text: label || 'Approved', variant: 'badge-success', icon: Check };
      case 'REJECTED':
        return { text: label || 'Rejected', variant: 'badge-danger', icon: XCircle };

      // 2. Attendance Statuses
      case 'PRESENT':
        return { text: label || 'Present', variant: 'badge-success', icon: CalendarCheck };
      case 'ABSENT':
        return { text: label || 'Absent', variant: 'badge-danger', icon: CalendarX };
      case 'HALF_DAY':
      case 'HALFDAY':
        return { text: label || 'Half Day', variant: 'badge-amber', icon: Hourglass };
      case 'HOLIDAY':
        return { text: label || 'Holiday', variant: 'badge-purple', icon: CalendarCheck };
      case 'ON_LEAVE':
        return { text: label || 'On Leave', variant: 'badge-info', icon: Clock };

      // 3. Project / Site Statuses
      case 'COMPLETED':
        return { text: label || 'Completed', variant: 'badge-success', icon: CheckCircle2 };
      case 'IN_PROGRESS':
      case 'INPROGRESS':
        return { text: label || 'In Progress', variant: 'badge-info', icon: RefreshCw };
      case 'ON_HOLD':
      case 'ONHOLD':
        return { text: label || 'On Hold', variant: 'badge-warning', icon: AlertTriangle };
      case 'CANCELLED':
        return { text: label || 'Cancelled', variant: 'badge-neutral', icon: XCircle };

      // 4. Financial & Payment Statuses
      case 'PAID':
        return { text: label || 'Paid', variant: 'badge-success', icon: CheckCircle2 };
      case 'UNPAID':
        return { text: label || 'Unpaid', variant: 'badge-danger', icon: AlertTriangle };
      case 'PROCESSING':
        return { text: label || 'Processing', variant: 'badge-info', icon: RefreshCw };
      case 'CREDIT':
        return { text: label || '+ Credit', variant: 'badge-success', icon: ArrowDownLeft };
      case 'DEBIT':
        return { text: label || '- Debit', variant: 'badge-danger', icon: ArrowUpRight };

      // 5. Support Ticket Statuses & Priorities
      case 'OPEN':
        return { text: label || 'Open', variant: 'badge-warning', icon: Clock };
      case 'RESOLVED':
      case 'CLOSED':
        return { text: label || 'Resolved', variant: 'badge-success', icon: ShieldCheck };
      case 'URGENT':
      case 'HIGH':
        return { text: label || 'High Priority', variant: 'badge-danger', icon: AlertTriangle };
      case 'MEDIUM':
        return { text: label || 'Medium', variant: 'badge-amber', icon: Clock };
      case 'LOW':
        return { text: label || 'Low', variant: 'badge-neutral', icon: Check };

      default:
        return { text: label || status || 'Unknown', variant: 'badge-neutral', icon: HelpCircle };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span className={`status-badge ${config.variant} size-${size} ${className}`}>
      <Icon size={size === 'sm' ? 11 : size === 'lg' ? 14 : 12} className="status-badge-icon" />
      <span className="status-badge-text">{config.text}</span>
    </span>
  );
};
