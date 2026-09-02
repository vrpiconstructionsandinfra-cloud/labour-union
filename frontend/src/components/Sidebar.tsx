import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchNotificationsApi } from '../services/api';
import { getSocket } from '../services/socket';
import {
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
  Bell,
  Phone,
  LogOut,
  ChevronRight,
  QrCode,
  FileSpreadsheet,
  X,
  Settings,
  HelpCircle
} from 'lucide-react';
import { UserAvatar } from './UserAvatar';
import './Sidebar.css';

interface SidebarProps {
  collapsed: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenModal: (modalType: string) => void;
  setSidebarCollapsed?: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  collapsed,
  activeTab,
  setActiveTab,
  onOpenModal,
  setSidebarCollapsed
}) => {
  const { user, role, logout, hasPermission } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    fetchNotificationsApi()
      .then((data) => {
        const unread = (data || []).filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    const socket = getSocket();
    const handleNotification = () => {
      setUnreadCount((prev) => prev + 1);
    };

    socket.on('notification', handleNotification);
    return () => {
      socket.off('notification', handleNotification);
    };
  }, [user]);

  const allManagementNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, isDashboard: true },
    { id: 'sites', label: 'Sites', icon: Building2 },
    { id: 'agents', label: 'Agents', icon: Users },
    { id: 'workers', label: 'Workers', icon: UserCheck },
    { id: 'enquiries', label: 'Enquired', icon: FileSpreadsheet },
    { id: 'attendance', label: 'Attendance', icon: CalendarCheck },
    { id: 'leaves', label: 'Leave Requests', icon: FileText },
    { id: 'my_leaves', label: 'My Leaves', icon: FileText },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'insurance', label: 'Insurance', icon: ShieldCheck },
    { id: 'agent_salary', label: 'Agent Salaries', icon: CreditCard },
    { id: 'tickets', label: 'Customer Support', icon: Headset },
    { id: 'my_details', label: 'My Details', icon: QrCode }
  ];

  const allMoreNav = [
    { id: 'notifications', label: 'Notifications', icon: Bell, badge: unreadCount > 0 ? String(unreadCount) : undefined },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle }
  ];

  // Role Based Navigation Filtering
  const managementNav = allManagementNav.filter(item => hasPermission(item.id));
  const moreNav = allMoreNav.filter(item => item.id === 'settings' || item.id === 'help' || hasPermission(item.id));

  const handleNavClick = (id: string) => {
    if (id === 'tickets' && role === 'SUPER_AGENT') {
      setActiveTab('support_agents');
    } else if (id === 'help') {
      onOpenModal('help');
    } else if (id === 'notifications') {
      onOpenModal('notifications');
    } else {
      setActiveTab(id);
    }

    if (window.innerWidth <= 768 && setSidebarCollapsed) {
      setSidebarCollapsed(true);
    }
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand Header (Desktop & Mobile Drawer) */}
      <div className="sidebar-brand">
        <div className="brand-logo">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M16 21V19C16 17.9391 15.5786 16.9217 14.8284 16.1716C14.0783 15.4214 13.0609 15 12 15C10.9391 15 9.92172 15.4214 9.17157 16.1716C8.42143 16.9217 8 17.9391 8 19V21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 11C13.6569 11 15 9.65685 15 8C15 6.34315 13.6569 5 12 5C10.3431 5 9 6.34315 9 8C9 9.65685 10.3431 11 12 11Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M22 21V19C21.9993 18.1137 21.7044 17.2528 21.1614 16.5523C20.6184 15.8519 19.8581 15.3516 19 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 5.13C17.8631 5.35049 18.6282 5.85244 19.1733 6.55589C19.7185 7.25934 20.0145 8.12353 20.0145 9.0145C20.0145 9.90547 19.7185 10.7697 19.1733 11.4731C18.6282 12.1766 17.8631 12.6785 17 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 21V19C2.0007 18.1137 2.29562 17.2528 2.83863 16.5523C3.38164 15.8519 4.14187 15.3516 5 15.13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M7 5.13C6.13692 5.35049 5.37177 5.85244 4.82665 6.55589C4.28153 7.25934 3.98555 8.12353 3.98555 9.0145C3.98555 9.90547 4.28153 10.7697 4.82665 11.4731C5.37177 12.1766 6.13692 12.6785 7 12.9" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        {(!collapsed || window.innerWidth <= 768) && (
          <div className="brand-text">
            <h2>Labour Union</h2>
            <p>Management System</p>
          </div>
        )}
        <button
          className="sidebar-mobile-close-btn"
          onClick={() => setSidebarCollapsed?.(true)}
          title="Close Navigation Menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="sidebar-nav-container">
        {/* MANAGEMENT Section */}
        <div className="nav-section">
          {(!collapsed || window.innerWidth <= 768) && <span className="section-title">MANAGEMENT</span>}
          <ul className="nav-list">
            {managementNav.map((item) => {
              const Icon = item.icon;
              const isCustomerSupport = item.id === 'tickets';
              const isChildActive = ['tickets', 'support_agents', 'ticket_calendar', 'support_reports'].includes(activeTab);
              const isActive = activeTab === item.id || (isCustomerSupport && isChildActive);

              return (
                <li key={item.id}>
                  <button
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => handleNavClick(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <div className="nav-item-left">
                      <Icon className="nav-icon" size={18} />
                      {(!collapsed || window.innerWidth <= 768) && <span className="nav-label">{item.label}</span>}
                    </div>
                    {(!collapsed || window.innerWidth <= 768) && !item.isDashboard && (
                      <ChevronRight className="nav-arrow" size={16} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* MORE / SETTINGS Section */}
        {moreNav.length > 0 && (
          <div className="nav-section">
            <div className="sidebar-nav-divider"></div>
            {(!collapsed || window.innerWidth <= 768) && <span className="section-title desktop-only">MORE</span>}
            <ul className="nav-list">
              {moreNav.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <li key={item.id}>
                    <button
                      className={`nav-item ${isActive ? 'active' : ''}`}
                      onClick={() => handleNavClick(item.id)}
                      title={collapsed ? item.label : undefined}
                    >
                      <div className="nav-item-left">
                        <Icon className="nav-icon" size={18} />
                        {(!collapsed || window.innerWidth <= 768) && <span className="nav-label">{item.label}</span>}
                      </div>
                      {(!collapsed || window.innerWidth <= 768) && (
                        <div className="nav-item-right">
                          {item.badge && <span className="nav-badge-red">{item.badge}</span>}
                          <ChevronRight className="nav-arrow" size={16} />
                        </div>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Assigned Agent & Working Site Cards for Worker Role */}
        {!collapsed && role === 'WORKER' && (
          <div className="sidebar-worker-cards-container desktop-only">
            <div className="sidebar-info-card">
              <span className="info-card-title">Assigned Agent</span>
              <div className="info-card-body">
                <UserAvatar
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80"
                  name="Suresh Patel"
                  size={36}
                />
                <div className="info-text">
                  <span className="name">Suresh Patel</span>
                  <span className="code">AGT-1002</span>
                </div>
              </div>
              <button className="contact-agent-btn">
                <Phone size={13} />
                <span>Contact Agent</span>
              </button>
            </div>

            <div className="sidebar-info-card site-card">
              <span className="info-card-title">Working Site</span>
              <div className="info-card-body">
                <div className="site-icon-box">
                  <Building2 size={18} color="#2563EB" />
                </div>
                <div className="info-text">
                  <span className="name">Industrial Area Site</span>
                  <span className="code">Block A, Unit 3</span>
                  <span className="sub-address">Bengaluru, Karnataka</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sign Out Widget */}
      <div className="sidebar-footer-container">
        <button
          className="sidebar-logout-btn"
          onClick={() => logout()}
          title="Sign Out to Login Screen"
        >
          <LogOut size={16} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
