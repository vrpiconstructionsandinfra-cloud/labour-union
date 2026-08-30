import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User, UserRole } from '../types';
import { fetchMeApi } from '../services/api';

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isValidating: boolean;     // true while backend token check is in progress on app load
  sessionExpired: boolean;   // true when a 401 fires mid-session
  role: UserRole;
  login: (token: string, user: User) => void;
  logout: () => void;
  clearExpired: () => void;  // resets the sessionExpired flag
  refreshUser: () => Promise<void>;
  hasPermission: (module: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(sessionStorage.getItem('token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = sessionStorage.getItem('user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // true while we're verifying the stored token with the backend on first load
  const [isValidating, setIsValidating] = useState<boolean>(!!sessionStorage.getItem('token'));
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);

  const isAuthenticated = !!token && !!user && !isValidating;
  const role: UserRole = user?.role || 'SUPER_AGENT';

  const login = (newToken: string, newUser: User) => {
    setToken(newToken);
    setUser(newUser);
    setSessionExpired(false);
    sessionStorage.setItem('token', newToken);
    sessionStorage.setItem('user', JSON.stringify(newUser));
  };

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setIsValidating(false);
    setSessionExpired(false);
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
  }, []);

  const clearExpired = () => {
    setSessionExpired(false);
    logout();
  };

  const refreshUser = async () => {
    if (token) {
      try {
        const freshUser = await fetchMeApi();
        setUser(freshUser);
        sessionStorage.setItem('user', JSON.stringify(freshUser));
      } catch (err: any) {
        if (err?.message?.includes('Unauthorized') || err?.message?.includes('401')) {
          logout();
        }
      }
    }
  };

  // ── Validate stored token against the backend on every app load ──────────────
  useEffect(() => {
    const storedToken = sessionStorage.getItem('token');
    if (!storedToken) {
      setIsValidating(false);
      return;
    }

    setIsValidating(true);
    fetchMeApi()
      .then((freshUser) => {
        setUser(freshUser);
        sessionStorage.setItem('user', JSON.stringify(freshUser));
      })
      .catch(() => {
        // Token is invalid or expired — clear everything and show login
        setToken(null);
        setUser(null);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      })
      .finally(() => {
        setIsValidating(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for session-expired events fired by fetchWithAuth on 401 ──────────
  useEffect(() => {
    const handleSessionExpired = () => {
      // Only trigger if the user was actively authenticated (not on login page)
      if (sessionStorage.getItem('token')) {
        setSessionExpired(true);
      }
    };

    window.addEventListener('session-expired', handleSessionExpired);
    return () => {
      window.removeEventListener('session-expired', handleSessionExpired);
    };
  }, []);

  // Role Based Permission Check
  const hasPermission = (module: string): boolean => {
    if (!isAuthenticated) return false;

    switch (role as string) {
      case 'SUPER_AGENT':
        return module !== 'wallet' && module !== 'my_leaves' && module !== 'insurance' && module !== 'attendance';
      case 'AGENT':
        return ['dashboard', 'sites', 'workers', 'leaves', 'my_leaves', 'insurance', 'tickets', 'profile', 'my_details', 'settings'].includes(module);
      case 'WORKER':
        return ['dashboard', 'leaves', 'insurance', 'profile', 'my_details', 'settings'].includes(module);
      case 'CUSTOMER_SUPPORT':
      case 'SUPPORT_AGENT':
        return ['dashboard', 'tickets', 'my_tickets', 'unassigned', 'my_leaves', 'leaves', 'profile', 'my_details', 'notifications', 'settings'].includes(module);
      default:
        return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        isAuthenticated,
        isValidating,
        sessionExpired,
        role,
        login,
        logout,
        clearExpired,
        refreshUser,
        hasPermission
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
