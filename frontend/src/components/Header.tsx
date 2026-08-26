import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchNotificationsApi, updateUserApi } from '../services/api';
import { getSocket, joinUserRoom } from '../services/socket';
import {
  Menu,
  Search,
  Bell,
  Moon,
  Sun,
  ChevronRight,
  User,
  Lock,
  LogOut,
  ChevronDown,
  QrCode,
  X,
  KeyRound,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import './Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenSearch: () => void;
  onOpenNotifications: () => void;
  onOpenQrScanner?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  darkMode,
  setDarkMode,
  onOpenSearch,
  onOpenNotifications,
  onOpenQrScanner,
  activeTab,
  setActiveTab
}) => {
  const { user, logout } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Change Password Modal States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      if (!user?.id) throw new Error('User not authenticated');
      await updateUserApi(user.id, {
        currentPassword,
        newPassword
      });

      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        setPasswordSuccess(null);
        setIsChangePasswordOpen(false);
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please check your current password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      joinUserRoom(user.id, user.role);
    }

    const loadUnread = () => {
      fetchNotificationsApi()
        .then((list) => {
          const unread = list.filter((n) => !n.isRead && n.unread !== false).length;
          setUnreadCount(unread);
        })
        .catch(() => {});
    };

    loadUnread();

    const socket = getSocket();
    const handleNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user]);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard Overview';
      case 'sites': return 'Sites Directory';
      case 'agents': return 'Agent Roster';
      case 'support_agents': return 'Customer Support > Support Agents';
      case 'workers': return 'Worker Directory';
      case 'attendance': return 'Daily Attendance Logs';
      case 'leaves': return 'Leave Management';
      case 'payroll': return 'Payroll & Wages';
      case 'wallet': return 'Digital Wallet';
      case 'insurance': return 'Insurance Policies';
      case 'tickets': return 'Support Tickets';
      case 'my_details': return 'My Details';
      default: return activeTab.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  };

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="icon-btn sidebar-toggle-btn" onClick={toggleSidebar} title="Toggle Sidebar">
          <Menu size={20} />
        </button>

        {/* Breadcrumb Navigation */}
        <div className="header-breadcrumb">
          <span className="bc-home" onClick={() => setActiveTab('dashboard')}>Dashboard</span>
          {activeTab !== 'dashboard' && (
            <>
              <ChevronRight size={14} className="bc-separator" />
              <span className="bc-current">{getBreadcrumbTitle()}</span>
            </>
          )}
        </div>
      </div>

      <div className="header-right">
        {/* Search Bar */}
        <div className="search-bar" onClick={onOpenSearch}>
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search workers, agents, sites, tickets..."
            readOnly
          />
          <kbd className="search-kbd">Ctrl /</kbd>
        </div>

        {/* Action Controls */}
        <div className="header-actions">
          {/* Scan Worker QR Code Button for Agents */}
          {user?.role === 'AGENT' && onOpenQrScanner && (
            <button
              className="header-qr-btn"
              onClick={onOpenQrScanner}
              title="Scan Worker QR Code for Attendance"
              style={{
                backgroundColor: darkMode ? 'rgba(37, 99, 235, 0.2)' : '#EFF6FF',
                color: darkMode ? '#60A5FA' : '#2563EB',
                border: darkMode ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid #BFDBFE',
                borderRadius: '8px',
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <QrCode size={15} />
              <span>Scan QR</span>
            </button>
          )}

          {/* Notification Bell */}
          <button className="icon-btn notification-btn" onClick={onOpenNotifications} title="Notifications">
            <Bell size={19} />
            {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
          </button>

          {/* Dark Mode Toggle */}
          <button
            className="icon-btn theme-btn"
            onClick={() => setDarkMode(prev => !prev)}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {darkMode ? <Sun size={19} /> : <Moon size={19} />}
          </button>

          {/* Profile Menu Dropdown */}
          <div className="user-profile-dropdown-wrap">
            <div className="user-profile-widget" onClick={() => setShowProfileMenu(prev => !prev)}>
              <UserAvatar
                src={(user as any)?.profileImage || user?.avatar}
                name={user?.name || 'User'}
                className="user-avatar"
                size={38}
              />
              <div className="user-details">
                <span className="user-name">{user?.name || 'Super Agent'}</span>
                <span className="user-role">{user?.role || 'SUPER_AGENT'}</span>
              </div>
              <ChevronDown size={14} className="profile-chevron" />
            </div>

            {showProfileMenu && (
              <div className="profile-menu-dropdown animate-fade-in">
                <div className="dropdown-user-header">
                  <span className="d-name">{user?.name}</span>
                  <span className="d-email">{user?.email}</span>
                </div>

                <div className="dropdown-divider"></div>

                <button onClick={() => { setActiveTab('my_details'); setShowProfileMenu(false); }}>
                  <User size={15} /> My Profile
                </button>
                <button onClick={() => { setIsChangePasswordOpen(true); setShowProfileMenu(false); }}>
                  <Lock size={15} /> Change Password
                </button>

                <div className="dropdown-divider"></div>

                <button className="d-logout-btn" onClick={() => { setShowProfileMenu(false); logout(); }}>
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Change Password Interactive Modal */}
      {isChangePasswordOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => {
            setIsChangePasswordOpen(false);
            setPasswordError(null);
            setPasswordSuccess(null);
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              borderRadius: '16px',
              maxWidth: '420px',
              width: '90%',
              padding: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--border-color)',
              position: 'relative'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ backgroundColor: '#EFF6FF', padding: '8px', borderRadius: '10px', color: '#2563EB' }}>
                  <KeyRound size={20} />
                </div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)' }}>Change Password</h3>
              </div>
              <button
                onClick={() => {
                  setIsChangePasswordOpen(false);
                  setPasswordError(null);
                  setPasswordSuccess(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', color: 'var(--text-secondary)' }}
              >
                <X size={18} />
              </button>
            </div>

            {passwordError && (
              <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} color="#DC2626" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#047857', padding: '10px 12px', borderRadius: '8px', fontSize: '12.5px', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} color="#059669" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Current Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangePasswordOpen(false);
                    setPasswordError(null);
                    setPasswordSuccess(null);
                  }}
                  style={{ padding: '9px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', color: 'var(--text-primary)', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  style={{ padding: '9px 18px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: '#FFF', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {isSubmittingPassword ? <Loader2 size={16} className="spinner" /> : null}
                  {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
