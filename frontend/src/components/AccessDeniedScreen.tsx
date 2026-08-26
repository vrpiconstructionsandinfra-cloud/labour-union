import React from 'react';
import { ShieldOff, LayoutDashboard, ArrowLeft } from 'lucide-react';
import './AccessDeniedScreen.css';

interface AccessDeniedScreenProps {
  tabName: string;
  role: string;
  onGoToDashboard: () => void;
  onGoBack: () => void;
}

// Map tab IDs to readable labels
const TAB_LABELS: Record<string, string> = {
  sites: 'Sites',
  agents: 'Agents',
  workers: 'Workers',
  attendance: 'Attendance',
  leaves: 'Leaves',
  payroll: 'Payroll',
  wallet: 'Wallet',
  insurance: 'Insurance',
  tickets: 'Support Tickets',
  reports: 'Reports',
  settings: 'Settings',
  notifications: 'Notifications',
};

// Role-specific access explanations
const ROLE_MESSAGES: Record<string, string> = {
  WORKER: 'Workers have access to Attendance, Leaves, Wallet, Insurance, and Support Tickets.',
  AGENT: 'Agents have access to Workers, Attendance, Leaves, Payroll, Wallet, and Support Tickets.',
  SUPER_AGENT: 'Super Agents have full access to all modules.',
};

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  tabName,
  role,
  onGoToDashboard,
  onGoBack,
}) => {
  const tabLabel = TAB_LABELS[tabName] || tabName;
  const roleMessage = ROLE_MESSAGES[role] || 'Your role does not have access to this section.';

  return (
    <div className="access-denied-wrapper">
      <div className="access-denied-card" role="alert" aria-live="assertive">
        <div className="access-denied-icon-ring" aria-hidden="true">🚫</div>

        <div className="access-denied-badge">
          <ShieldOff size={11} />
          Access Denied
        </div>

        <h1 className="access-denied-title">You can't view {tabLabel}</h1>

        <p className="access-denied-subtitle">
          Your current role doesn't have permission to access the <strong>{tabLabel}</strong> section.
        </p>

        <div className="access-denied-role-tag">
          <span>Your role:</span>
          <strong>{role.replace('_', ' ')}</strong>
        </div>

        <p className="access-denied-subtitle" style={{ fontSize: '13px', marginBottom: '32px' }}>
          {roleMessage}
        </p>

        <div className="access-denied-actions">
          <button
            id="access-denied-dashboard-btn"
            className="access-denied-btn-primary"
            onClick={onGoToDashboard}
          >
            <LayoutDashboard size={15} />
            Go to Dashboard
          </button>
          <button
            id="access-denied-back-btn"
            className="access-denied-btn-secondary"
            onClick={onGoBack}
          >
            <ArrowLeft size={15} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};
