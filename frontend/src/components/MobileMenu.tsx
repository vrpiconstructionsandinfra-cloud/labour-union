import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  X,
  LayoutDashboard,
  Building2,
  Users,
  HardHat,
  CalendarCheck,
  FileSpreadsheet,
  Wallet,
  Shield,
  CreditCard,
  Headphones,
  FileText,
  Settings,
  LogOut
} from 'lucide-react';
import './MobileMenu.css';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  activeNav: string;
  onNavSelect: (nav: string) => void;
  unreadCount?: number;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  activeNav,
  onNavSelect,
  unreadCount = 0
}) => {
  const { user, role, logout } = useAuth();

  if (!isOpen) return null;

  const handleSelect = (navKey: string) => {
    onNavSelect(navKey);
    onClose();
  };

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['SUPER_AGENT', 'AGENT', 'WORKER', 'CUSTOMER_SUPPORT'] },
    { key: 'sites', label: 'Working Sites', icon: Building2, roles: ['SUPER_AGENT', 'AGENT'] },
    { key: 'agents', label: 'Field Agents', icon: Users, roles: ['SUPER_AGENT', 'CUSTOMER_SUPPORT'] },
    { key: 'workers', label: 'Workers Roster', icon: HardHat, roles: ['SUPER_AGENT', 'AGENT'] },
    { key: 'attendance', label: 'Daily Attendance', icon: CalendarCheck, roles: ['SUPER_AGENT', 'AGENT', 'WORKER'] },
    { key: 'leaves', label: 'Leave Requests', icon: FileText, roles: ['SUPER_AGENT', 'AGENT', 'WORKER', 'CUSTOMER_SUPPORT'] },
    { key: 'payroll', label: 'Payroll & Wages', icon: FileSpreadsheet, roles: ['SUPER_AGENT', 'AGENT'] },
    { key: 'wallet', label: 'Worker Wallet', icon: Wallet, roles: ['SUPER_AGENT', 'AGENT', 'WORKER'] },
    { key: 'insurance', label: 'Insurance & Claims', icon: Shield, roles: ['SUPER_AGENT', 'AGENT', 'WORKER'] },
    { key: 'salary', label: 'Agent Salaries', icon: CreditCard, roles: ['SUPER_AGENT'] },
    { key: 'support', label: 'Customer Support', icon: Headphones, roles: ['SUPER_AGENT', 'AGENT', 'CUSTOMER_SUPPORT'] },
    { key: 'reports', label: 'Reports & Audits', icon: FileText, roles: ['SUPER_AGENT', 'CUSTOMER_SUPPORT'] },
    { key: 'settings', label: 'System Settings', icon: Settings, roles: ['SUPER_AGENT'] },
  ];

  const allowedItems = navItems.filter(item => !role || item.roles.includes(role));

  return (
    <div className="mobile-menu-overlay" onClick={onClose}>
      <div className="mobile-menu-drawer animate-slide-in-left" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="mobile-menu-header">
          <div className="mobile-menu-brand">
            <div className="mobile-menu-logo">
              <Users size={18} color="#2563EB" />
            </div>
            <div>
              <h3 className="mobile-menu-title">Labour Union</h3>
              <span className="mobile-menu-subtitle">Management System</span>
            </div>
          </div>
          <button
            type="button"
            className="mobile-menu-close-btn touch-target"
            onClick={onClose}
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="mobile-menu-user-card">
            <div className="mobile-user-avatar">
              {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="mobile-user-info">
              <span className="mobile-user-name">{user.name}</span>
              <span className="mobile-user-email">{user.email || user.phone || 'Union Member'}</span>
              <span className="mobile-user-role-badge">{role || 'USER'}</span>
            </div>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="mobile-menu-nav">
          {allowedItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`mobile-nav-item touch-target ${isActive ? 'active' : ''}`}
                onClick={() => handleSelect(item.key)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {item.key === 'support' && unreadCount > 0 && (
                  <span className="mobile-nav-badge">{unreadCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="mobile-menu-footer">
          <button
            type="button"
            className="mobile-menu-logout-btn touch-target"
            onClick={() => {
              onClose();
              logout();
            }}
          >
            <LogOut size={16} />
            <span>Sign Out / Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
};
