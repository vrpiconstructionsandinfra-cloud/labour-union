import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  fetchNotificationsApi,
  updateUserApi,
  fetchWorkersApi,
  fetchAgentsApi,
  fetchSitesApi,
  fetchSupportTicketsApi
} from '../services/api';
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
  LayoutDashboard,
  Building2,
  Users,
  UserCheck,
  CalendarCheck,
  FileText,
  CreditCard,
  Wallet,
  ShieldCheck,
  Headset,
  FileSpreadsheet,
  ArrowRight,
  CornerDownLeft,
  Loader2,
  KeyRound
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import './Header.css';

interface HeaderProps {
  toggleSidebar: () => void;
  darkMode: boolean;
  setDarkMode: (val: boolean | ((prev: boolean) => boolean)) => void;
  onOpenSearch?: () => void;
  onOpenNotifications: () => void;
  onOpenQrScanner?: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

interface NavCommandItem {
  id: string;
  label: string;
  description: string;
  icon: any;
  tabKey: string;
  badge?: string;
}

interface RecordSearchResult {
  id: string;
  name: string;
  subtext: string;
  category: 'Worker' | 'Agent' | 'Site' | 'Ticket';
  tabKey: string;
}

export const Header: React.FC<HeaderProps> = ({
  toggleSidebar,
  darkMode,
  setDarkMode,
  onOpenNotifications,
  onOpenQrScanner,
  activeTab,
  setActiveTab
}) => {
  const { user, role, logout, hasPermission } = useAuth();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [records, setRecords] = useState<RecordSearchResult[]>([]);
  const [hasLoadedRecords, setHasLoadedRecords] = useState(false);
  const searchWrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Change Password Modal States
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  // Exact Sidebar Navigation Items matching the sidebar component
  const allSidebarNavItems: NavCommandItem[] = [
    { id: 'dashboard', label: 'Dashboard', description: 'Main analytics, live stats and metrics', icon: LayoutDashboard, tabKey: 'dashboard' },
    { id: 'sites', label: 'Sites', description: 'Working project sites, locations and supervisors', icon: Building2, tabKey: 'sites' },
    { id: 'agents', label: 'Agents', description: 'Field agents directory and site assignments', icon: Users, tabKey: 'agents' },
    { id: 'workers', label: 'Workers', description: 'Complete workers roster, trade and wages', icon: UserCheck, tabKey: 'workers' },
    { id: 'enquiries', label: 'Enquired', description: 'Candidate leads, applications and follow-ups', icon: FileSpreadsheet, tabKey: 'enquiries' },
    { id: 'attendance', label: 'Attendance', description: 'Daily attendance logs & overtime records', icon: CalendarCheck, tabKey: 'attendance' },
    { id: 'leaves', label: 'Leave Requests', description: 'Leave requests, applications and approvals', icon: FileText, tabKey: 'leaves' },
    { id: 'my_leaves', label: 'My Leaves', description: 'Personal leave applications and status', icon: FileText, tabKey: 'my_leaves' },
    { id: 'wallet', label: 'Wallet', description: 'Digital wallet balances and payout claims', icon: Wallet, tabKey: 'wallet' },
    { id: 'insurance', label: 'Insurance', description: 'Active policy coverage and benefits', icon: ShieldCheck, tabKey: 'insurance' },
    { id: 'agent_salary', label: 'Agent Salaries', description: 'Agent base salaries, bonuses and payouts', icon: CreditCard, tabKey: 'agent_salary' },
    { id: 'tickets', label: 'Customer Support', description: 'Customer support agents and ticket queue', icon: Headset, tabKey: (role as string) === 'SUPER_AGENT' ? 'support_agents' : 'tickets' },
    { id: 'my_details', label: 'My Details', description: 'QR code and personal account information', icon: QrCode, tabKey: 'my_details' },
    { id: 'notifications', label: 'Notifications', description: 'System alerts, messages and broadcasts', icon: Bell, tabKey: 'notifications' }
  ];

  // Navigation Items strictly filtered to match active sidebar tabs
  const getRoleNavItems = (): NavCommandItem[] => {
    return allSidebarNavItems.filter((item) => hasPermission(item.id) || item.id === 'notifications');
  };

  const getNavSectionTitle = () => {
    switch (role as string) {
      case 'AGENT':
        return 'Field Agent Sidebar Tabs';
      case 'CUSTOMER_SUPPORT':
      case 'SUPPORT_AGENT':
        return 'Customer Support Sidebar Tabs';
      case 'WORKER':
        return 'Worker Portal Sidebar Tabs';
      case 'SUPER_AGENT':
      default:
        return 'Super Agent Sidebar Tabs';
    }
  };

  const navItems = getRoleNavItems();

  // Filter Navigation Items by Search Query
  const filteredNavItems = navItems.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return item.label.toLowerCase().includes(q) || item.description.toLowerCase().includes(q);
  });

  // Lazy Load Records on First Search Focus
  const loadSearchRecords = async () => {
    if (hasLoadedRecords) return;
    try {
      const [workers, agents, sites, tickets] = await Promise.all([
        fetchWorkersApi().catch(() => []),
        fetchAgentsApi().catch(() => []),
        fetchSitesApi().catch(() => []),
        fetchSupportTicketsApi().catch(() => [])
      ]);

      const formatted: RecordSearchResult[] = [];

      (workers || []).forEach((w: any) => {
        formatted.push({
          id: `w-${w.id}`,
          name: w.name,
          subtext: `${w.employeeCode || `WRK-${w.id}`} · ${w.trade || 'Worker'} · ${w.phone || ''}`,
          category: 'Worker',
          tabKey: 'workers'
        });
      });

      (agents || []).forEach((a: any) => {
        formatted.push({
          id: `a-${a.id}`,
          name: a.name,
          subtext: `${a.employeeCode || `AGT-${a.id}`} · Field Agent · ${a.phone || ''}`,
          category: 'Agent',
          tabKey: 'agents'
        });
      });

      (sites || []).forEach((s: any) => {
        formatted.push({
          id: `s-${s.id}`,
          name: s.siteName,
          subtext: `${s.siteCode || `SITE-${s.id}`} · ${s.location || 'Construction'}`,
          category: 'Site',
          tabKey: 'sites'
        });
      });

      (tickets || []).forEach((t: any) => {
        formatted.push({
          id: `t-${t.id}`,
          name: t.subject || t.title || 'Support Inquiry',
          subtext: `Ticket #${t.id} · ${t.status || 'OPEN'} · ${t.creatorName || ''}`,
          category: 'Ticket',
          tabKey: 'tickets'
        });
      });

      setRecords(formatted);
      setHasLoadedRecords(true);
    } catch {
      // Ignore network errors in search cache
    }
  };

  // Filter Live Records by Query
  const filteredRecords = searchQuery.trim()
    ? records.filter((r) => {
        const q = searchQuery.toLowerCase();
        return r.name.toLowerCase().includes(q) || r.subtext.toLowerCase().includes(q);
      }).slice(0, 8)
    : [];

  const totalResultsCount = filteredNavItems.length + filteredRecords.length;

  // Handle Global Shortcuts (Ctrl+K or Ctrl+/)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === '/')) {
        e.preventDefault();
        setIsSearchOpen(true);
        loadSearchRecords();
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && isSearchOpen) {
        setIsSearchOpen(false);
        searchInputRef.current?.blur();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, hasLoadedRecords]);

  // Click Outside to Dismiss Search Dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchWrapperRef.current && !searchWrapperRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectItem = (tabKey: string) => {
    if (tabKey === 'notifications') {
      onOpenNotifications();
    } else {
      setActiveTab(tabKey);
    }
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const handleClearSearch = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSearchQuery('');
    searchInputRef.current?.focus();
  };

  // Change Password Submission
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

  // Notification Sync
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
      case 'leaves': return 'Leave Requests';
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
      {/* Left Section: Sidebar Toggle & Breadcrumbs */}
      <div className="header-left">
        <button className="icon-btn sidebar-toggle-btn" onClick={toggleSidebar} title="Toggle Sidebar">
          <Menu size={20} />
        </button>

        <div className="header-breadcrumb">
          <span className="bc-home" onClick={() => setActiveTab('dashboard')}>Dashboard</span>
          {activeTab !== 'dashboard' && (
            <>
              <ChevronRight size={14} className="bc-separator" />
              <span className="bc-current">{getBreadcrumbTitle()}</span>
            </>
          )}
        </div>

        {/* Mobile Brand Logo & Name (Shown on mobile navbar) */}
        <div className="header-mobile-brand" onClick={() => setActiveTab('dashboard')}>
          <div className="header-mobile-logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M17 5.13C17.8631 5.35049 18.6282 5.85244 19.1733 6.55589C19.7185 7.25934 20.0145 8.12353 20.0145 9.0145C20.0145 9.90547 19.7185 10.7697 19.1733 11.4731C18.6282 12.1766 17.8631 12.6785 17 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 21V19C2.0007 18.1137 2.29562 17.2528 2.83863 16.5523C3.38164 15.8519 4.14187 15.3516 5 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M7 5.13C6.13692 5.35049 5.37177 5.85244 4.82665 6.55589C4.28153 7.25934 3.98555 8.12353 3.98555 9.0145C3.98555 9.90547 4.28153 10.7697 4.82665 11.4731C5.37177 12.1766 6.13692 12.6785 7 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className="header-mobile-brand-text">
            <span className="header-mobile-brand-title">Labour Union</span>
            <span className="header-mobile-brand-sub">Management System</span>
          </div>
        </div>
      </div>

      {/* Right Section: Expandable Global Search + Action Buttons + Profile Menu */}
      <div className="header-right">
        {/* Global Search Bar with Role-Based Command Dropdown */}
        <div className="header-search-wrapper" ref={searchWrapperRef}>
          <div
            className={`search-bar ${isSearchOpen ? 'is-focused' : ''}`}
            onClick={() => {
              setIsSearchOpen(true);
              loadSearchRecords();
              searchInputRef.current?.focus();
            }}
          >
            <Search size={16} className="search-icon" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search workers, agents, sites, tickets..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (!isSearchOpen) setIsSearchOpen(true);
              }}
              onFocus={() => {
                setIsSearchOpen(true);
                loadSearchRecords();
              }}
            />
            {searchQuery ? (
              <button
                type="button"
                className="search-clear-btn"
                onClick={handleClearSearch}
                title="Clear Search"
              >
                <X size={14} />
              </button>
            ) : (
              <kbd className="search-kbd">Ctrl K</kbd>
            )}
          </div>

          {/* Interactive Role-Based Command Menu Dropdown */}
          {isSearchOpen && (
            <div className="search-dropdown-menu animate-fade-in">
              {/* 1. Sidebar Navigation Quick Jump Items */}
              {filteredNavItems.length > 0 && (
                <div className="search-dropdown-section">
                  <div className="search-section-header">
                    <span>{getNavSectionTitle()}</span>
                    <span className="search-section-count">{filteredNavItems.length}</span>
                  </div>
                  {filteredNavItems.map((item) => {
                    const IconComp = item.icon;
                    return (
                      <div
                        key={item.id}
                        className={`search-nav-item ${activeTab === item.tabKey ? 'is-selected' : ''}`}
                        onClick={() => handleSelectItem(item.tabKey)}
                      >
                        <div className="search-nav-left">
                          <div className="search-nav-icon-wrap">
                            <IconComp size={16} />
                          </div>
                          <div className="search-nav-details">
                            <span className="search-nav-title">{item.label}</span>
                            <span className="search-nav-desc">{item.description}</span>
                          </div>
                        </div>
                        <div className="search-nav-right">
                          <ArrowRight size={13} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Live Record Search Results */}
              {filteredRecords.length > 0 && (
                <div className="search-dropdown-section" style={{ borderTop: '1px solid var(--border-color, #e2e8f0)' }}>
                  <div className="search-section-header">
                    <span>Records & Directory</span>
                    <span className="search-section-count">{filteredRecords.length}</span>
                  </div>
                  {filteredRecords.map((rec) => (
                    <div
                      key={rec.id}
                      className="search-nav-item"
                      onClick={() => handleSelectItem(rec.tabKey)}
                    >
                      <div className="search-nav-left">
                        <div className="search-nav-icon-wrap" style={{ backgroundColor: '#FEF3C7', color: '#B45309', borderColor: '#FDE68A' }}>
                          {rec.category === 'Worker' ? <UserCheck size={16} /> : rec.category === 'Agent' ? <Users size={16} /> : rec.category === 'Site' ? <Building2 size={16} /> : <Headset size={16} />}
                        </div>
                        <div className="search-nav-details">
                          <span className="search-nav-title">{rec.name}</span>
                          <span className="search-nav-desc">{rec.subtext}</span>
                        </div>
                      </div>
                      <div className="search-nav-right">
                        <span className="search-role-badge">{rec.category}</span>
                        <ArrowRight size={13} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {totalResultsCount === 0 && (
                <div className="search-empty-results">
                  <span>No matching pages or records found for "<strong>{searchQuery}</strong>"</span>
                </div>
              )}

              {/* Footer with Keyboard Hints */}
              <div className="search-dropdown-footer">
                <span className="search-footer-hint">
                  <CornerDownLeft size={11} /> Press <strong>Enter</strong> to jump
                </span>
                <span className="search-footer-hint">
                  <strong>Esc</strong> to close
                </span>
              </div>
            </div>
          )}
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

      {/* Change Password Modal */}
      {isChangePasswordOpen && (
        <div className="header-modal-overlay animate-fade-in" onClick={() => setIsChangePasswordOpen(false)}>
          <div className="header-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="header-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={20} color="#2563EB" />
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>Change Password</h3>
              </div>
              <button
                type="button"
                className="header-modal-close"
                onClick={() => setIsChangePasswordOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="header-modal-body">
              {passwordError && (
                <div className="header-modal-alert error">
                  <span>{passwordError}</span>
                </div>
              )}
              {passwordSuccess && (
                <div className="header-modal-alert success">
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <div className="form-group">
                <label>Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>New Password</label>
                <input
                  type="password"
                  required
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div className="header-modal-footer">
                <button
                  type="button"
                  className="list-btn list-btn-outline"
                  onClick={() => setIsChangePasswordOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="list-btn list-btn-primary"
                  disabled={isSubmittingPassword}
                >
                  {isSubmittingPassword ? (
                    <>
                      <Loader2 size={15} className="spinner" />
                      <span>Updating...</span>
                    </>
                  ) : (
                    <span>Update Password</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
};
