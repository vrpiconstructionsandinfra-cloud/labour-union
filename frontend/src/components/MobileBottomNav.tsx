import React from 'react';
import {
  LayoutDashboard,
  HardHat,
  Plus,
  ClipboardList,
  MoreHorizontal
} from 'lucide-react';
import './MobileBottomNav.css';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreate?: () => void;
  onOpenMobileDrawer: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenCreate,
  onOpenMobileDrawer
}) => {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      {/* 1. Dashboard Tab */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => setActiveTab('dashboard')}
      >
        <LayoutDashboard size={20} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Dashboard</span>
      </button>

      {/* 2. Workers Tab */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'workers' ? 'active' : ''}`}
        onClick={() => setActiveTab('workers')}
      >
        <HardHat size={20} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Workers</span>
      </button>

      {/* 3. Center Elevated Add Button */}
      <div className="mobile-nav-center-wrap">
        <button
          type="button"
          className="mobile-nav-fab-btn"
          onClick={onOpenCreate ? onOpenCreate : () => onOpenMobileDrawer()}
          aria-label="Add new record"
        >
          <Plus size={24} strokeWidth={2.5} />
        </button>
        <span className="mobile-nav-fab-label">Add</span>
      </div>

      {/* 4. Requests Tab */}
      <button
        type="button"
        className={`mobile-nav-btn ${activeTab === 'leaves' || activeTab === 'enquiries' ? 'active' : ''}`}
        onClick={() => setActiveTab('leaves')}
      >
        <ClipboardList size={20} className="mobile-nav-icon" />
        <span className="mobile-nav-label">Requests</span>
      </button>

      {/* 5. More Tab */}
      <button
        type="button"
        className="mobile-nav-btn"
        onClick={onOpenMobileDrawer}
        aria-label="Open more menu"
      >
        <MoreHorizontal size={20} className="mobile-nav-icon" />
        <span className="mobile-nav-label">More</span>
      </button>
    </nav>
  );
};
