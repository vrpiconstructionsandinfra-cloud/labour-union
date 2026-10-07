import React, { useState, useEffect } from 'react';
import { X, Users, Mail, Lock, Phone, User, Building2, Briefcase, IndianRupee, Loader2 } from 'lucide-react';
import { adminCreateAgentApi, fetchSitesApi } from '../services/api';
import type { SiteItem } from '../types';

interface AdminAgentCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  adminName?: string;
  adminId?: string | number;
}

export const AdminAgentCreateModal: React.FC<AdminAgentCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  adminName,
  adminId,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    employeeCode: '',
    designation: 'Field Supervisor',
    siteId: '',
    salary: '45000',
  });

  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSitesApi()
        .then((data) => setSites(data || []))
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      setErrorMsg('Agent Name is required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await adminCreateAgentApi({
        adminId: adminId ? Number(adminId) : undefined,
        name: formData.name,
        email: formData.email || undefined,
        password: formData.password || undefined,
        phone: formData.phone || undefined,
        employeeCode: formData.employeeCode || undefined,
        designation: formData.designation || undefined,
        siteId: formData.siteId ? Number(formData.siteId) : undefined,
        salary: formData.salary ? Number(formData.salary) : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register field agent');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="action-modal-backdrop animate-fade-in" style={{ zIndex: 1100 }}>
      <div
        className="action-modal-card animate-scale-up"
        style={{ maxWidth: '540px', width: '92%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="action-modal-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '18px 24px',
            borderBottom: '1px solid var(--border-color, #E2E8F0)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                Register Supervised Agent
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary, #64748B)' }}>
                {adminName ? `Agent will report directly to Administrator: ${adminName}` : 'Agent will report under your administrator supervision'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="action-modal-close-btn"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="off" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMsg && (
            <div
              style={{
                background: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FCA5A5',
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '13px',
              }}
            >
              {errorMsg}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Agent Full Name *
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <User size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="e.g. Sunil Patil"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Employee Code (Optional)
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Briefcase size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="e.g. AGT-102 (Auto if empty)"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Email Address
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Mail size={15} color="#94A3B8" />
                <input
                  type="email"
                  placeholder="agent@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="off"
                  name="new_agent_supervised_email"
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Login Password
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Lock size={15} color="#94A3B8" />
                <input
                  type="password"
                  placeholder="Defaults to Agent@123"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                  name="new_agent_supervised_password"
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Phone Number
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Phone size={15} color="#94A3B8" />
                <input
                  type="tel"
                  placeholder="+91 9876543210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Monthly Salary (₹)
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <IndianRupee size={15} color="#94A3B8" />
                <input
                  type="number"
                  placeholder="45000"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Designation
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Briefcase size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="Field Supervisor"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Assign Initial Site
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Building2 size={15} color="#94A3B8" />
                <select
                  style={{ border: 'none', background: 'transparent', width: '100%', outline: 'none', fontSize: '13px' }}
                  value={formData.siteId}
                  onChange={(e) => setFormData({ ...formData, siteId: e.target.value })}
                >
                  <option value="">-- Select Working Site --</option>
                  {sites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.siteName} ({site.siteCode}) - {site.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '10px',
              borderTop: '1px solid var(--border-color, #E2E8F0)',
              paddingTop: '16px',
            }}
          >
            <button
              type="button"
              className="btn-secondary-admin"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary-admin"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Registering Agent...</span>
                </>
              ) : (
                'Register Field Agent'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
