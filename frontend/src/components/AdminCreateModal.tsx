import React, { useState } from 'react';
import { X, Shield, Mail, Lock, Phone, User, MapPin, Briefcase, IndianRupee, Loader2 } from 'lucide-react';
import { createAdminApi } from '../services/api';

interface AdminCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminCreateModal: React.FC<AdminCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    employeeCode: '',
    designation: 'Regional Administrator',
    address: '',
    salary: '65000',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.password) {
      setErrorMsg('Name, email, and password are required.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    try {
      await createAdminApi({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        phone: formData.phone || undefined,
        employeeCode: formData.employeeCode || undefined,
        designation: formData.designation || undefined,
        address: formData.address || undefined,
        salary: formData.salary ? Number(formData.salary) : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create administrator');
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
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: 'var(--text-primary, #0F172A)' }}>
                Create New Administrator
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '12.5px', color: 'var(--text-secondary, #64748B)' }}>
                Admin will supervise Field Agents and local area sites
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
                Full Name *
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <User size={15} color="#94A3B8" />
                <input
                  type="text"
                  placeholder="e.g. Ramesh Verma"
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
                  placeholder="e.g. ADM-001 (Auto if empty)"
                  value={formData.employeeCode}
                  onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Email Address *
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Mail size={15} color="#94A3B8" />
                <input
                  type="email"
                  placeholder="admin@domain.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                Password *
              </label>
              <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
                <Lock size={15} color="#94A3B8" />
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
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
                  placeholder="65000"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Designation / Title
            </label>
            <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
              <Briefcase size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="Regional Administrator / Area Head"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
              Local Area Jurisdiction / Office Address
            </label>
            <div className="search-input-wrap" style={{ padding: '8px 12px' }}>
              <MapPin size={15} color="#94A3B8" />
              <input
                type="text"
                placeholder="e.g. North Zone Office, Pune, Maharashtra"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
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
                  <span>Creating Admin...</span>
                </>
              ) : (
                'Create Administrator'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
