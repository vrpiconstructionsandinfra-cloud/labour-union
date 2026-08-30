import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, User, Mail, Phone, MapPin, Briefcase, Send, Building2 } from 'lucide-react';
import { submitEnquiryApi } from '../services/api';

interface EnquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EnquiryModal: React.FC<EnquiryModalProps> = ({ isOpen, onClose }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [designation, setDesignation] = useState<'WORKER' | 'AGENT'>('WORKER');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setDesignation('WORKER');
    setErrorMsg(null);
    setIsSuccess(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Please enter your full name.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Please enter your contact phone number.');
      return;
    }
    if (phone.trim().length < 10) {
      setErrorMsg('Please enter a valid 10-digit contact number.');
      return;
    }

    setIsLoading(true);
    try {
      await submitEnquiryApi({
        name: name.trim(),
        email: email.trim() || undefined,
        phone: phone.trim(),
        address: address.trim() || undefined,
        designation: designation,
      });

      setIsLoading(false);
      setIsSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err.message || 'Failed to submit enquiry. Please try again.');
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
      onClick={handleClose}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '560px',
          maxHeight: '92vh',
          overflowY: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInScale 0.2s ease-out forwards',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Google Form Style Top Accent Bar */}
        <div
          style={{
            height: '10px',
            background: 'linear-gradient(90deg, #2563EB 0%, #3B82F6 50%, #60A5FA 100%)',
            borderTopLeftRadius: '15px',
            borderTopRightRadius: '15px',
          }}
        />

        {/* Modal Header */}
        <div
          style={{
            padding: '24px 28px 16px 28px',
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '16px',
          }}
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 100%)',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #BFDBFE',
                flexShrink: 0,
              }}
            >
              <Building2 size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em' }}>
                Join Labor Union
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748B', fontWeight: 500 }}>
                Submit your enquiry details. Our team will get in touch with you shortly.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748B',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = '#E2E8F0';
              e.currentTarget.style.color = '#0F172A';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        {isSuccess ? (
          <div style={{ padding: '40px 28px', textAlign: 'center' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#ECFDF5',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px auto',
                border: '2px solid #A7F3D0',
              }}
            >
              <CheckCircle2 size={40} />
            </div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '22px', fontWeight: 800, color: '#0F172A' }}>
              Enquiry Submitted Successfully!
            </h3>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#64748B', lineHeight: '1.5', maxWidth: '420px', marginInline: 'auto' }}>
              Thank you, <strong>{name}</strong>! Your enquiry for the <strong>{designation === 'WORKER' ? 'Worker' : 'Agent'}</strong> role has been recorded. Our union supervisor will contact you at <strong>{phone}</strong> soon.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={handleReset}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#334155',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Submit Another Enquiry
              </button>
              <button
                type="button"
                onClick={handleClose}
                style={{
                  padding: '10px 24px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                }}
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: '24px 28px' }}>
            {errorMsg && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FECACA',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  color: '#DC2626',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Field: Full Name */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <User size={15} color="#2563EB" />
                <span>Full Name <span style={{ color: '#DC2626' }}>*</span></span>
              </label>
              <input
                type="text"
                placeholder="Enter your complete name (e.g. Ramesh Kumar)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  color: '#0F172A',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  backgroundColor: '#F8FAFC',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563EB';
                  e.target.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.backgroundColor = '#F8FAFC';
                }}
                disabled={isLoading}
              />
            </div>

            {/* Field: Designation Dropdown */}
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <Briefcase size={15} color="#2563EB" />
                <span>Interested Role / Designation <span style={{ color: '#DC2626' }}>*</span></span>
              </label>
              <div style={{ position: 'relative' }}>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value as 'WORKER' | 'AGENT')}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#0F172A',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                    cursor: 'pointer',
                  }}
                  disabled={isLoading}
                >
                  <option value="WORKER">👷 Worker (Field Labor, Construction, Skilled/Unskilled)</option>
                  <option value="AGENT">👔 Agent (Union Field Representative, Site Supervisor)</option>
                </select>
              </div>
            </div>

            {/* Two Column Row: Phone & Email */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '18px' }}>
              {/* Field: Contact Number */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  <Phone size={15} color="#2563EB" />
                  <span>Contact Number <span style={{ color: '#DC2626' }}>*</span></span>
                </label>
                <input
                  type="tel"
                  placeholder="e.g. 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.backgroundColor = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.backgroundColor = '#F8FAFC';
                  }}
                  disabled={isLoading}
                />
              </div>

              {/* Field: Email Address (Optional) */}
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  <Mail size={15} color="#2563EB" />
                  <span>Email Address <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>(Optional)</span></span>
                </label>
                <input
                  type="email"
                  placeholder="e.g. name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '14px',
                    color: '#0F172A',
                    outline: 'none',
                    backgroundColor: '#F8FAFC',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#2563EB';
                    e.target.style.backgroundColor = '#FFFFFF';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#CBD5E1';
                    e.target.style.backgroundColor = '#F8FAFC';
                  }}
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Field: Residential Address */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                <MapPin size={15} color="#2563EB" />
                <span>Full Residential Address <span style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}>(Optional)</span></span>
              </label>
              <textarea
                rows={2}
                placeholder="Enter your village/city, district, state or full address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{
                  width: '100%',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '14px',
                  color: '#0F172A',
                  outline: 'none',
                  backgroundColor: '#F8FAFC',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#2563EB';
                  e.target.style.backgroundColor = '#FFFFFF';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#CBD5E1';
                  e.target.style.backgroundColor = '#F8FAFC';
                }}
                disabled={isLoading}
              />
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '8px', borderTop: '1px solid #F1F5F9' }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isLoading}
                style={{
                  padding: '11px 20px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  backgroundColor: '#FFFFFF',
                  color: '#475569',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '11px 26px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#2563EB',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  transition: 'all 0.2s ease',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    <span>Submitting Enquiry...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>Submit Enquiry</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
