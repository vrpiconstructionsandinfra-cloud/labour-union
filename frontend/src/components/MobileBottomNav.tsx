import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  HardHat,
  Plus,
  UserPlus,
  Users,
  QrCode,
  Headphones,
  Building2,
  FileText,
  ClipboardList,
  MoreHorizontal,
  X
} from 'lucide-react';
import './MobileBottomNav.css';

export type BottomNavActionType =
  | 'ADD'
  | 'QR_SCAN'
  | 'REGISTER_WORKER'
  | 'REGISTER_AGENT'
  | 'REGISTER_SUPPORT_AGENT'
  | 'ADD_SITE'
  | 'APPLY_LEAVE'
  | 'CREATE_TICKET';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userRole?: string;
  isAnyModalActive?: boolean;
  onOpenCreate?: () => void;
  onOpenCreateWorker?: () => void;
  onOpenQrScanner?: () => void;
  onOpenCreateAgent?: () => void;
  onOpenCreateSupportAgent?: () => void;
  onOpenCreateSite?: () => void;
  onOpenApplyLeave?: () => void;
  onOpenCreateTicket?: () => void;
  onOpenMobileDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  userRole = 'AGENT',
  isAnyModalActive = false,
  onOpenCreate,
  onOpenCreateWorker,
  onOpenQrScanner,
  onOpenCreateAgent,
  onOpenCreateSupportAgent,
  onOpenCreateSite,
  onOpenApplyLeave,
  onOpenCreateTicket,
  onOpenMobileDrawer
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedAction, setSelectedAction] = useState<BottomNavActionType>('ADD');

  // When all modals are closed (after completion or cancel), reset Add icon back to its original state
  useEffect(() => {
    if (!isAnyModalActive) {
      setSelectedAction('ADD');
    }
  }, [isAnyModalActive]);

  // Action Triggers
  const handleSelectQrScanner = () => {
    setSelectedAction('QR_SCAN');
    setIsMenuOpen(false);
    if (onOpenQrScanner) onOpenQrScanner();
  };

  const handleSelectRegisterWorker = () => {
    setSelectedAction('REGISTER_WORKER');
    setIsMenuOpen(false);
    if (onOpenCreateWorker) onOpenCreateWorker();
    else if (onOpenCreate) onOpenCreate();
  };

  const handleSelectRegisterAgent = () => {
    setSelectedAction('REGISTER_AGENT');
    setIsMenuOpen(false);
    if (onOpenCreateAgent) onOpenCreateAgent();
    else if (onOpenCreate) onOpenCreate();
  };

  const handleSelectRegisterSupportAgent = () => {
    setSelectedAction('REGISTER_SUPPORT_AGENT');
    setIsMenuOpen(false);
    if (onOpenCreateSupportAgent) onOpenCreateSupportAgent();
  };

  const handleSelectAddSite = () => {
    setSelectedAction('ADD_SITE');
    setIsMenuOpen(false);
    if (onOpenCreateSite) onOpenCreateSite();
  };

  const handleSelectApplyLeave = () => {
    setSelectedAction('APPLY_LEAVE');
    setIsMenuOpen(false);
    if (onOpenApplyLeave) onOpenApplyLeave();
  };

  const handleSelectCreateTicket = () => {
    setSelectedAction('CREATE_TICKET');
    setIsMenuOpen(false);
    if (onOpenCreateTicket) onOpenCreateTicket();
  };

  const handleCenterButtonClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isMenuOpen) {
      setIsMenuOpen(false);
      return;
    }
    // If an action is already actively in-progress, execute it; otherwise open the 2-option popup menu
    if (selectedAction === 'QR_SCAN' && onOpenQrScanner) {
      onOpenQrScanner();
    } else if (selectedAction === 'REGISTER_WORKER' && onOpenCreateWorker) {
      onOpenCreateWorker();
    } else if (selectedAction === 'REGISTER_AGENT' && onOpenCreateAgent) {
      onOpenCreateAgent();
    } else if (selectedAction === 'REGISTER_SUPPORT_AGENT' && onOpenCreateSupportAgent) {
      onOpenCreateSupportAgent();
    } else if (selectedAction === 'ADD_SITE' && onOpenCreateSite) {
      onOpenCreateSite();
    } else {
      setIsMenuOpen(true);
    }
  };

  // Render role-based 2 options in popup menu
  const renderRoleOptions = () => {
    if (userRole === 'SUPER_AGENT') {
      return (
        <>
          {/* Option 1: Register New Agent */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'REGISTER_AGENT' ? 'selected' : ''}`}
            onClick={handleSelectRegisterAgent}
          >
            <div className="mobile-popup-icon-box agent">
              <Users size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Register New Agent</span>
              <span className="mobile-popup-sub">Add field agent to workforce</span>
            </div>
          </button>

          {/* Option 2: Register New Customer Support Agent */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'REGISTER_SUPPORT_AGENT' ? 'selected' : ''}`}
            onClick={handleSelectRegisterSupportAgent}
          >
            <div className="mobile-popup-icon-box csa">
              <Headphones size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Register New Support Agent</span>
              <span className="mobile-popup-sub">Add customer support agent (CSA)</span>
            </div>
          </button>
        </>
      );
    }

    if (userRole === 'CUSTOMER_SUPPORT' || userRole === 'SUPPORT_AGENT') {
      return (
        <>
          {/* Option 1: Register New Agent */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'REGISTER_AGENT' ? 'selected' : ''}`}
            onClick={handleSelectRegisterAgent}
          >
            <div className="mobile-popup-icon-box agent">
              <Users size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Register New Agent</span>
              <span className="mobile-popup-sub">Add field agent to workforce</span>
            </div>
          </button>

          {/* Option 2: Add New Working Site */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'ADD_SITE' ? 'selected' : ''}`}
            onClick={handleSelectAddSite}
          >
            <div className="mobile-popup-icon-box site">
              <Building2 size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Add New Working Site</span>
              <span className="mobile-popup-sub">Create project location & assign agent</span>
            </div>
          </button>
        </>
      );
    }

    if (userRole === 'WORKER') {
      return (
        <>
          {/* Option 1: Apply Leave */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'APPLY_LEAVE' ? 'selected' : ''}`}
            onClick={handleSelectApplyLeave}
          >
            <div className="mobile-popup-icon-box leave">
              <FileText size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Apply Leave Request</span>
              <span className="mobile-popup-sub">Submit personal leave application</span>
            </div>
          </button>

          {/* Option 2: Support Grievance Ticket */}
          <button
            type="button"
            className={`mobile-nav-popup-item ${selectedAction === 'CREATE_TICKET' ? 'selected' : ''}`}
            onClick={handleSelectCreateTicket}
          >
            <div className="mobile-popup-icon-box ticket">
              <Headphones size={20} />
            </div>
            <div className="mobile-popup-text">
              <span className="mobile-popup-title">Support Grievance Ticket</span>
              <span className="mobile-popup-sub">Submit equipment or safety ticket</span>
            </div>
          </button>
        </>
      );
    }

    // Default: Field Agent (AGENT) or ADMIN
    return (
      <>
        {/* Option 1: Scan QR for Attendance */}
        <button
          type="button"
          className={`mobile-nav-popup-item ${selectedAction === 'QR_SCAN' ? 'selected' : ''}`}
          onClick={handleSelectQrScanner}
        >
          <div className="mobile-popup-icon-box qr">
            <QrCode size={20} />
          </div>
          <div className="mobile-popup-text">
            <span className="mobile-popup-title">Scan QR for Attendance</span>
            <span className="mobile-popup-sub">Mark daily attendance via QR code</span>
          </div>
        </button>

        {/* Option 2: Register New Worker */}
        <button
          type="button"
          className={`mobile-nav-popup-item ${selectedAction === 'REGISTER_WORKER' ? 'selected' : ''}`}
          onClick={handleSelectRegisterWorker}
        >
          <div className="mobile-popup-icon-box worker">
            <UserPlus size={20} />
          </div>
          <div className="mobile-popup-text">
            <span className="mobile-popup-title">Register New Worker</span>
            <span className="mobile-popup-sub">Add a new worker to the roster</span>
          </div>
        </button>
      </>
    );
  };

  // Dynamic FAB Icon based on selectedAction
  const renderFabIcon = () => {
    switch (selectedAction) {
      case 'QR_SCAN':
        return <QrCode size={22} strokeWidth={2.5} />;
      case 'REGISTER_WORKER':
        return <UserPlus size={22} strokeWidth={2.5} />;
      case 'REGISTER_AGENT':
        return <Users size={22} strokeWidth={2.5} />;
      case 'REGISTER_SUPPORT_AGENT':
        return <Headphones size={22} strokeWidth={2.5} />;
      case 'ADD_SITE':
        return <Building2 size={22} strokeWidth={2.5} />;
      case 'APPLY_LEAVE':
        return <FileText size={22} strokeWidth={2.5} />;
      case 'CREATE_TICKET':
        return <Headphones size={22} strokeWidth={2.5} />;
      default:
        return <Plus size={24} strokeWidth={2.5} />;
    }
  };

  const getFabLabel = () => {
    switch (selectedAction) {
      case 'QR_SCAN':
        return 'Scan QR';
      case 'REGISTER_WORKER':
        return 'Worker';
      case 'REGISTER_AGENT':
        return 'Agent';
      case 'REGISTER_SUPPORT_AGENT':
        return 'CSA';
      case 'ADD_SITE':
        return 'Site';
      case 'APPLY_LEAVE':
        return 'Leave';
      case 'CREATE_TICKET':
        return 'Ticket';
      default:
        return 'Add';
    }
  };

  return (
    <>
      {/* Backdrop for popup menu */}
      {isMenuOpen && (
        <div
          className="mobile-nav-popup-backdrop"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Role-Based 2-Option Popup Menu */}
      {isMenuOpen && (
        <div className="mobile-nav-action-popup" role="dialog" aria-label="Action Menu">
          <div className="mobile-nav-popup-header">
            <span className="mobile-nav-popup-header-title">Choose Action</span>
            <button
              type="button"
              className="mobile-nav-popup-close"
              onClick={() => setIsMenuOpen(false)}
            >
              <X size={16} />
            </button>
          </div>

          <div className="mobile-nav-popup-options">
            {renderRoleOptions()}
          </div>
        </div>
      )}

      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        {/* 1. Dashboard Tab */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => {
            setIsMenuOpen(false);
            setActiveTab('dashboard');
          }}
        >
          <LayoutDashboard size={20} className="mobile-nav-icon" />
          <span className="mobile-nav-label">Dashboard</span>
        </button>

        {/* 2. Workers / Agents Tab based on role */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'workers' || activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => {
            setIsMenuOpen(false);
            if (userRole === 'SUPER_AGENT' || userRole === 'CUSTOMER_SUPPORT') {
              setActiveTab('agents');
            } else {
              setActiveTab('workers');
            }
          }}
        >
          {userRole === 'SUPER_AGENT' || userRole === 'CUSTOMER_SUPPORT' ? (
            <Users size={20} className="mobile-nav-icon" />
          ) : (
            <HardHat size={20} className="mobile-nav-icon" />
          )}
          <span className="mobile-nav-label">
            {userRole === 'SUPER_AGENT' || userRole === 'CUSTOMER_SUPPORT' ? 'Agents' : 'Workers'}
          </span>
        </button>

        {/* 3. Center Elevated Dynamic Action Button */}
        <div className="mobile-nav-center-wrap">
          <button
            type="button"
            className={`mobile-nav-fab-btn ${selectedAction.toLowerCase()} ${isMenuOpen ? 'open' : ''}`}
            onClick={handleCenterButtonClick}
            aria-label={getFabLabel()}
          >
            {renderFabIcon()}
          </button>
          <button
            type="button"
            className="mobile-nav-fab-label-btn"
            onClick={() => setIsMenuOpen(true)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <span className="mobile-nav-fab-label">
              {getFabLabel()}
            </span>
          </button>
        </div>

        {/* 4. Requests / Support Tab */}
        <button
          type="button"
          className={`mobile-nav-btn ${activeTab === 'leaves' || activeTab === 'enquiries' || activeTab === 'support' ? 'active' : ''}`}
          onClick={() => {
            setIsMenuOpen(false);
            setActiveTab('leaves');
          }}
        >
          <ClipboardList size={20} className="mobile-nav-icon" />
          <span className="mobile-nav-label">Requests</span>
        </button>

        {/* 5. More Tab */}
        <button
          type="button"
          className="mobile-nav-btn"
          onClick={() => {
            setIsMenuOpen(false);
            onOpenMobileDrawer();
          }}
          aria-label="Open more menu"
        >
          <MoreHorizontal size={20} className="mobile-nav-icon" />
          <span className="mobile-nav-label">More</span>
        </button>
      </nav>
    </>
  );
};
