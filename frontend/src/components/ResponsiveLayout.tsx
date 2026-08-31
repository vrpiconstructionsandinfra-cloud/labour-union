import React, { useState, useEffect } from 'react';
import { ResponsiveNavbar } from './ResponsiveNavbar';
import { MobileMenu } from './MobileMenu';
import './ResponsiveLayout.css';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  activeNav?: string;
  onNavSelect?: (nav: string) => void;
  title?: string;
  unreadCount?: number;
  hideNavbar?: boolean;
}

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({
  children,
  activeNav = 'dashboard',
  onNavSelect,
  title = 'Labor Union Portal',
  unreadCount = 0,
  hideNavbar = false
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(() => typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const isMobile = windowWidth < 640;
  const isTablet = windowWidth >= 640 && windowWidth < 1024;

  return (
    <div className={`responsive-layout-wrapper ${isMobile ? 'is-mobile' : isTablet ? 'is-tablet' : 'is-desktop'}`}>
      {!hideNavbar && (
        <ResponsiveNavbar
          isMobileMenuOpen={isMobileMenuOpen}
          onToggleMobileMenu={() => setIsMobileMenuOpen(prev => !prev)}
          activeNav={activeNav}
          onNavSelect={onNavSelect}
          title={title}
          unreadCount={unreadCount}
        />
      )}

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        activeNav={activeNav}
        onNavSelect={onNavSelect || (() => {})}
        unreadCount={unreadCount}
      />

      <main className="responsive-main-content">
        <div className="responsive-container">
          {children}
        </div>
      </main>
    </div>
  );
};
