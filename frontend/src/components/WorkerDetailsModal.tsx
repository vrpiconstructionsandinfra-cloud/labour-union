import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  ShieldCheck,
  CreditCard,
  Building2,
  FileText,
  MapPin,
  Phone,
  Mail,
  Briefcase,
  CheckCircle2,
  Download,
  Edit
} from 'lucide-react';
import type { WorkerItem } from '../types';
import { UserAvatar } from './UserAvatar';
import './ActionModal.css';

interface WorkerDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  worker: WorkerItem | null;
  onEdit?: (worker: WorkerItem) => void;
}

export const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({
  isOpen,
  onClose,
  worker,
  onEdit
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'identity' | 'financial' | 'address'>('overview');

  useEffect(() => {
    if (isOpen) {
      setActiveTab('overview');
    }
  }, [isOpen, worker?.id]);

  if (!isOpen || !worker) return null;

  const handleDownloadDoc = (docName: string) => {
    const content = `UNION WORKER COMPLIANCE DOCUMENT\nWorker: ${worker.name} (${worker.employeeCode})\nDocument: ${docName}\nIssued Date: ${new Date().toLocaleDateString()}\nStatus: VERIFIED & CONFIRMED BY LABOR UNION MANAGEMENT SYSTEM\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${worker.name.toLowerCase().replace(/\s+/g, '_')}_${docName.toLowerCase().replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 1100 }}>
      <div className="modal-container" style={{ maxWidth: '780px', width: '92%', borderRadius: '16px', overflow: 'hidden' }}>
        
        {/* Header Profile Hero Card */}
        <div style={{ backgroundColor: '#0F172A', color: '#FFFFFF', padding: '24px', position: 'relative' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
            <UserAvatar src={worker.avatar} name={worker.name} size={80} />

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: '#FFFFFF' }}>{worker.name}</h2>
                <span className="code-badge" style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#93C5FD', padding: '4px 10px' }}>
                  {worker.employeeCode}
                </span>
                <span className="badge badge-approved" style={{ backgroundColor: '#059669', color: '#FFF' }}>
                  {worker.status} WORKER
                </span>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#94A3B8', flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={14} style={{ color: '#60A5FA' }} /> {worker.designation}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} style={{ color: '#34D399' }} /> {worker.siteName}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} style={{ color: '#FBBF24' }} /> Agent: {worker.agentName}
                </span>
              </div>
            </div>

            {onEdit && (
              <button
                type="button"
                className="secondary-btn"
                style={{ backgroundColor: '#2563EB', color: '#FFF', border: 'none', padding: '8px 16px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={() => {
                  onClose();
                  onEdit(worker);
                }}
              >
                <Edit size={15} />
                <span>Edit Profile</span>
              </button>
            )}
          </div>

          {/* Modal Tabs Navigation */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '20px', borderBottom: '2px solid rgba(255,255,255,0.15)', paddingBottom: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('overview');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                color: activeTab === 'overview' ? '#FFFFFF' : '#94A3B8',
                backgroundColor: activeTab === 'overview' ? '#2563EB' : 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <User size={15} /> Overview
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('identity');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                color: activeTab === 'identity' ? '#FFFFFF' : '#94A3B8',
                backgroundColor: activeTab === 'identity' ? '#2563EB' : 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <ShieldCheck size={15} /> Govt & Identity Docs
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('financial');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                color: activeTab === 'financial' ? '#FFFFFF' : '#94A3B8',
                backgroundColor: activeTab === 'financial' ? '#2563EB' : 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <CreditCard size={15} /> Bank, PF & Form 16
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveTab('address');
              }}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 700,
                borderRadius: '8px',
                color: activeTab === 'address' ? '#FFFFFF' : '#94A3B8',
                backgroundColor: activeTab === 'address' ? '#2563EB' : 'rgba(255,255,255,0.08)',
                border: 'none',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <MapPin size={15} /> Address & Contact
            </button>
          </div>
        </div>

        {/* Modal Body Content */}
        <div style={{ padding: '24px', maxHeight: '420px', overflowY: 'auto', backgroundColor: '#FFFFFF' }}>
          
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Worker Full Name</span>
                <strong style={{ fontSize: '15px', color: '#0F172A' }}>{worker.name}</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Employee Code ID</span>
                <strong style={{ fontSize: '15px', color: '#2563EB' }}>{worker.employeeCode}</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Skill / Designation</span>
                <strong style={{ fontSize: '15px', color: '#D97706' }}>{worker.designation}</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Daily Wage Rate</span>
                <strong style={{ fontSize: '15px', color: '#059669' }}>₹ {worker.dailyWage} / day</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Monthly Estimated Wage</span>
                <strong style={{ fontSize: '15px', color: '#059669' }}>₹ {(worker.dailyWage * 30).toLocaleString('en-IN')} / mo</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Assigned Working Site</span>
                <strong style={{ fontSize: '15px', color: '#0F172A' }}>{worker.siteName}</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Supervising Field Agent</span>
                <strong style={{ fontSize: '15px', color: '#7C3AED' }}>{worker.agentName}</strong>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '12px', color: '#64748B', display: 'block' }}>Joining / Enrollment Date</span>
                <strong style={{ fontSize: '15px', color: '#0F172A' }}>{worker.joiningDate}</strong>
              </div>
            </div>
          )}

          {/* TAB 2: IDENTITY & GOVT DOCS */}
          {activeTab === 'identity' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Aadhaar Card */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ backgroundColor: '#EFF6FF', padding: '12px', borderRadius: '10px', color: '#2563EB' }}>
                    <ShieldCheck size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Aadhaar Card Number</span>
                    <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#0F172A', fontWeight: 700 }}>
                      {worker.aadhaarNumber || '5489-3210-1008'}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <CheckCircle2 size={12} /> Aadhaar Verified & Linked with UIDAI
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => handleDownloadDoc('Aadhaar_Card')}
                >
                  <Download size={13} />
                  <span>Download Doc</span>
                </button>
              </div>

              {/* PAN Card */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '10px', color: '#059669' }}>
                    <FileText size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>PAN Card Number</span>
                    <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#0F172A', fontWeight: 700 }}>
                      {worker.panNumber || 'ABCDE1008F'}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <CheckCircle2 size={12} /> Active Taxpayer Identification PAN
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => handleDownloadDoc('PAN_Card')}
                >
                  <Download size={13} />
                  <span>Download Doc</span>
                </button>
              </div>

              {/* Passport Details */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ backgroundColor: '#F5F3FF', padding: '12px', borderRadius: '10px', color: '#7C3AED' }}>
                    <User size={24} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Passport Details</span>
                    <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#0F172A', fontWeight: 700 }}>
                      Number: {worker.passportNumber || 'Z5000008'}
                    </h4>
                    <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                      Expiry Date: {worker.passportExpiry || '2030-12-31'}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => handleDownloadDoc('Passport_Details')}
                >
                  <Download size={13} />
                  <span>Download Doc</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 3: FINANCIAL & PF */}
          {activeTab === 'financial' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Bank Account Details */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={18} style={{ color: '#2563EB' }} /> Direct Salary Bank Account
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Bank Name</span>
                    <strong style={{ fontSize: '14px', color: '#0F172A' }}>{worker.bankName || 'State Bank of India'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>Account Number</span>
                    <strong style={{ fontSize: '14px', color: '#2563EB' }}>{worker.bankAccountNumber || '30981234508'}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block' }}>IFSC Code</span>
                    <strong style={{ fontSize: '14px', color: '#D97706' }}>{worker.bankIfsc || 'SBIN0001234'}</strong>
                  </div>
                </div>
              </div>

              {/* PF UAN Details */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Provident Fund (PF) UAN Number</span>
                  <h4 style={{ fontSize: '16px', margin: '2px 0 0 0', color: '#7C3AED', fontWeight: 700 }}>
                    {worker.pfUanNumber || '10098472108'}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#059669', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                    <CheckCircle2 size={12} /> Active EPFO Union Member Account
                  </span>
                </div>
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                  onClick={() => handleDownloadDoc('PF_UAN_Statement')}
                >
                  <Download size={13} />
                  <span>PF Passbook</span>
                </button>
              </div>

              {/* Form 16 Tax Certificate */}
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', fontWeight: 600 }}>Form 16 Income Tax Certificate</span>
                  <h4 style={{ fontSize: '15px', margin: '2px 0 0 0', color: '#059669', fontWeight: 700 }}>
                    {worker.form16Status || 'Verified & Issued (FY 2025-26)'}
                  </h4>
                  <span style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', display: 'block' }}>
                    Annual Salary Tax Deduction Certificate
                  </span>
                </div>
                <button
                  type="button"
                  className="primary-btn"
                  style={{ fontSize: '12px', padding: '6px 14px', backgroundColor: '#059669' }}
                  onClick={() => handleDownloadDoc('Form_16_Certificate')}
                >
                  <Download size={13} />
                  <span>Download Form 16</span>
                </button>
              </div>

            </div>
          )}

          {/* TAB 4: ADDRESS & CONTACT */}
          {activeTab === 'address' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
                <h4 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px 0', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={18} style={{ color: '#DC2626' }} /> Residential Permanent Address
                </h4>
                <p style={{ margin: 0, fontSize: '14px', color: '#334155', lineHeight: 1.5 }}>
                  {worker.address || 'Plot 42, Sector 12, Industrial Union Area'},<br />
                  {worker.city || 'Mumbai'}, {worker.state || 'Maharashtra'} - {worker.pincode || '400001'}
                </p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} style={{ color: '#059669' }} /> Mobile Phone Number
                  </span>
                  <strong style={{ fontSize: '15px', color: '#0F172A', display: 'block', marginTop: '4px' }}>
                    {worker.phone}
                  </strong>
                </div>

                <div>
                  <span style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} style={{ color: '#2563EB' }} /> Email Address
                  </span>
                  <strong style={{ fontSize: '15px', color: '#0F172A', display: 'block', marginTop: '4px' }}>
                    {worker.email}
                  </strong>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div style={{ backgroundColor: '#F8FAFC', padding: '16px 24px', borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            className="btn-cancel"
            onClick={onClose}
          >
            Close Profile
          </button>
        </div>

      </div>
    </div>
  );
};
