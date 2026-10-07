import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Shield, ShieldCheck, X, Loader2, Search, Check, AlertCircle, Users, MapPin, UserX } from 'lucide-react';
import type { SiteItem, AdminItem } from '../types';
import { UserAvatar } from './UserAvatar';
import { assignSiteToAdminApi, updateSiteApi } from '../services/api';
import { queryClient, QUERY_KEYS } from '../services/queryClient';

interface AssignAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  site: SiteItem | null;
  admins: AdminItem[];
  onAssigned?: (updatedSite: SiteItem) => void;
}

export const AssignAdminModal: React.FC<AssignAdminModalProps> = ({
  isOpen,
  onClose,
  site,
  admins,
  onAssigned
}) => {
  const [selectedAdminId, setSelectedAdminId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize selected admin from site
  useEffect(() => {
    if (site) {
      if (site.adminId && site.adminRole === 'ADMIN') {
        setSelectedAdminId(String(site.adminId));
      } else if (site.createdBy?.role === 'ADMIN') {
        setSelectedAdminId(String(site.createdBy.id));
      } else {
        setSelectedAdminId('');
      }
      setErrorMsg(null);
      setSuccessMsg(null);
      setSearchQuery('');
    }
  }, [site, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen || !site) return null;

  const currentAdmin = admins.find(
    (a) => String(a.id) === String(site.adminId || site.createdBy?.id)
  ) || (site.adminName && site.adminRole === 'ADMIN' ? {
    id: site.adminId || site.createdBy?.id || '',
    name: site.adminName,
    employeeCode: site.adminCode || 'ADM',
    email: site.createdBy?.email || '',
    designation: site.createdBy?.designation || 'Area Administrator',
    role: 'ADMIN' as const,
    status: 'ACTIVE',
    active: true,
    totalAgents: 0,
    totalWorkers: 0,
    totalSites: 0
  } : null);

  const filteredAdmins = admins.filter((admin) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      admin.name.toLowerCase().includes(q) ||
      (admin.employeeCode || '').toLowerCase().includes(q) ||
      (admin.email || '').toLowerCase().includes(q) ||
      (admin.designation || '').toLowerCase().includes(q)
    );
  });

  const handleAssign = async () => {
    if (!selectedAdminId) {
      setErrorMsg('Please select an Area Administrator to assign to this site.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await assignSiteToAdminApi(site.id, selectedAdminId);
      const chosenAdmin = admins.find((a) => String(a.id) === String(selectedAdminId));

      const updatedSite: SiteItem = {
        ...site,
        adminId: selectedAdminId,
        adminName: chosenAdmin?.name || res?.createdBy?.name || 'Area Admin',
        adminCode: chosenAdmin?.employeeCode || res?.createdBy?.employeeCode,
        adminRole: 'ADMIN',
        createdById: Number(selectedAdminId),
        createdBy: res?.createdBy || {
          id: Number(selectedAdminId),
          name: chosenAdmin?.name || 'Area Admin',
          role: 'ADMIN',
          employeeCode: chosenAdmin?.employeeCode,
          email: chosenAdmin?.email,
          designation: chosenAdmin?.designation
        }
      };

      setSuccessMsg(`Site successfully assigned to ${chosenAdmin?.name || 'Admin'}!`);
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sites });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });

      if (onAssigned) {
        onAssigned(updatedSite);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to assign site to administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnassign = async () => {
    if (!window.confirm(`Unassign Area Administrator from "${site.siteName}"? The site will revert to unassigned supervision.`)) {
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    try {
      // Reassign to Super Admin (ID 1)
      await updateSiteApi(site.id, { createdById: 1 });

      const updatedSite: SiteItem = {
        ...site,
        adminId: undefined,
        adminName: undefined,
        adminCode: undefined,
        adminRole: undefined,
        createdById: 1,
        createdBy: undefined
      };

      setSuccessMsg('Administrator unassigned successfully.');
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sites });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.dashboardStats });

      if (onAssigned) {
        onAssigned(updatedSite);
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to unassign administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  const modalMarkup = (
    <div
      className="modal-backdrop animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      onClick={() => !isLoading && onClose()}
    >
      <div
        className="modal-container animate-fade-in"
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '540px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, #F5F3FF 0%, #FFFFFF 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(124, 58, 237, 0.3)'
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#0F172A' }}>
                Assign to Area Admin
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748B' }}>
                Allocate working site supervision to a Regional Administrator
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '6px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {/* Target Site Info Card */}
          <div
            style={{
              backgroundColor: '#F8FAFC',
              borderRadius: '12px',
              padding: '14px',
              border: '1px solid #E2E8F0',
              marginBottom: '18px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="code-badge" style={{ fontSize: '11px', fontWeight: 800 }}>
                  {site.siteCode || 'SITE'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>
                  {site.siteName}
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  padding: '2px 8px',
                  borderRadius: '6px'
                }}
              >
                {site.companyName || 'Labor Union Site'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#64748B', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={13} color="#64748B" />
                <span>{site.city}{site.state ? `, ${site.state}` : ''}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={13} color="#2563EB" />
                <span>{site.totalWorkers || 0} Workers Registered</span>
              </div>
            </div>

            {/* Current Admin Status Banner */}
            <div
              style={{
                marginTop: '10px',
                paddingTop: '10px',
                borderTop: '1px dashed #CBD5E1',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                fontSize: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ color: '#64748B', fontWeight: 600 }}>Currently Assigned:</span>
                {currentAdmin ? (
                  <span style={{ fontWeight: 700, color: '#7C3AED', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Shield size={13} /> {currentAdmin.name} ({currentAdmin.employeeCode || `ADM-${currentAdmin.id}`})
                  </span>
                ) : (
                  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>
                    Not assigned to any Area Admin
                  </span>
                )}
              </div>
              {currentAdmin && (
                <button
                  type="button"
                  onClick={handleUnassign}
                  disabled={isLoading}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: '#DC2626',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  title="Remove current administrator assignment"
                >
                  <UserX size={12} /> Unassign
                </button>
              )}
            </div>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div
              style={{
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              style={{
                backgroundColor: '#ECFDF5',
                color: '#059669',
                border: '1px solid #A7F3D0',
                borderRadius: '8px',
                padding: '10px 14px',
                fontSize: '12.5px',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '14px'
              }}
            >
              <Check size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Admin Selection Section */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '12.5px',
                fontWeight: 700,
                color: '#0F172A',
                marginBottom: '8px'
              }}
            >
              Select Area Administrator *
            </label>

            {/* Quick search input */}
            <div style={{ position: 'relative', marginBottom: '10px' }}>
              <Search
                size={15}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8'
                }}
              />
              <input
                type="text"
                placeholder="Search admin by name, ID code, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  height: '38px',
                  paddingLeft: '36px',
                  paddingRight: '12px',
                  borderRadius: '8px',
                  border: '1px solid #CBD5E1',
                  fontSize: '13px',
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            {/* Administrators List */}
            {admins.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px 16px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  border: '1px dashed #CBD5E1',
                  color: '#64748B',
                  fontSize: '13px'
                }}
              >
                No Area Administrators registered in the system yet. Please create an Admin first in the Admins tab.
              </div>
            ) : filteredAdmins.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '20px 14px',
                  backgroundColor: '#F8FAFC',
                  borderRadius: '10px',
                  color: '#64748B',
                  fontSize: '12.5px'
                }}
              >
                No administrators match "{searchQuery}".
              </div>
            ) : (
              <div
                style={{
                  maxHeight: '230px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  paddingRight: '2px'
                }}
              >
                {filteredAdmins.map((admin) => {
                  const isSelected = String(selectedAdminId) === String(admin.id);
                  const adminEmpCode = admin.employeeCode || `ADM-${String(admin.id).padStart(3, '0')}`;

                  return (
                    <div
                      key={admin.id}
                      onClick={() => setSelectedAdminId(String(admin.id))}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #7C3AED' : '1px solid #E2E8F0',
                        backgroundColor: isSelected ? '#F5F3FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <UserAvatar
                          src={admin.profileImage}
                          name={admin.name}
                          size={38}
                        />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                              {admin.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10.5px',
                                fontWeight: 700,
                                backgroundColor: '#EDE9FE',
                                color: '#6D28D9',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}
                            >
                              {adminEmpCode}
                            </span>
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748B', marginTop: '2px' }}>
                            {admin.designation || 'Area Administrator'} • {admin.totalAgents ?? (admin.agents?.length || 0)} Agents
                          </div>
                        </div>
                      </div>

                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '2px solid #7C3AED' : '2px solid #CBD5E1',
                          backgroundColor: isSelected ? '#7C3AED' : '#FFFFFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px'
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAssign}
            disabled={isLoading || !selectedAdminId}
            style={{
              padding: '8px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: selectedAdminId ? '#7C3AED' : '#CBD5E1',
              color: '#FFFFFF',
              fontSize: '13px',
              fontWeight: 700,
              cursor: selectedAdminId ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: selectedAdminId ? '0 2px 6px rgba(124, 58, 237, 0.3)' : 'none'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="spinner" />
                <span>Assigning...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={15} />
                <span>Confirm Assignment</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalMarkup, document.body) : null;
};
