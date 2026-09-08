import React, { useState, useEffect } from 'react';
import {
  User,
  Briefcase,
  Building2,
  MapPin,
  Calendar as CalendarIcon,
  Edit3,
  AlertCircle,
  Camera,
  ArrowLeft,
  X,
  CreditCard,
  Phone,
  Mail,
  Save,
  Lock,
  Landmark,
  ShieldCheck,
  Hash,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchWorkerDetailsApi,
  updateUserApi,
  fetchWorkerSchedulesApi,
  fetchSitesApi,
  fetchAttendanceLogsApi
} from '../services/api';
import type { WorkerSiteScheduleItem, SiteItem, AttendanceRecordWithPhoto } from '../types';
import { WorkerCalendar } from '../components/WorkerCalendar';
import { LivePhotoCaptureModal } from '../components/LivePhotoCaptureModal';
import './WorkerDetailPage.css';

interface WorkerDetailPageProps {
  workerId?: string | number;
  onBack?: () => void;
}

export const WorkerDetailPage: React.FC<WorkerDetailPageProps> = ({ workerId: propWorkerId, onBack }) => {
  const { role } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const effectiveId = propWorkerId || urlParams.get('id') || '1';
  const isReadOnlyParam = urlParams.get('readOnly') === 'true';
  const isReadOnly = isReadOnlyParam || role === 'SUPER_AGENT';

  const [worker, setWorker] = useState<any>(null);
  const [attendanceList, setAttendanceList] = useState<AttendanceRecordWithPhoto[]>([]);
  const [schedules, setSchedules] = useState<WorkerSiteScheduleItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab - Default to Work History & Calendar
  const [activeTab, setActiveTab] = useState<'CALENDAR' | 'ADDRESS' | 'FINANCIAL' | 'OVERVIEW'>('CALENDAR');

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [photoModalType, setPhotoModalType] = useState<'SIGN_IN' | 'SIGN_OUT' | null>(null);

  // In-tab editing state
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);

  // Financial Form state
  const [financialForm, setFinancialForm] = useState({
    bankName: '',
    bankAccountNumber: '',
    bankIfsc: '',
    pfUanNumber: '',
    salary: 850,
  });

  // Address Form state
  const [addressForm, setAddressForm] = useState({
    phone: '',
    email: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  // Main Edit Form state
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    email: '',
    designation: '',
    salary: 850,
    employeeCode: '',
    siteName: '',
  });

  useEffect(() => {
    loadWorkerData();
  }, [effectiveId]);

  const loadWorkerData = async () => {
    setIsLoading(true);
    try {
      const [workerRes, schedsRes, sitesRes, attRes] = await Promise.all([
        fetchWorkerDetailsApi(effectiveId),
        fetchWorkerSchedulesApi(effectiveId).catch(() => []),
        fetchSitesApi().catch(() => []),
        fetchAttendanceLogsApi().catch(() => ({ logs: [] }))
      ]);

      setWorker(workerRes);
      setSchedules(schedsRes || []);
      setSites(sitesRes || []);

      const logs = Array.isArray(attRes) ? attRes : (attRes?.logs || []);
      const workerLogs = logs.filter((l: any) => 
        String(l.workerId) === String(effectiveId) || 
        (workerRes?.name && l.workerName?.toLowerCase() === workerRes.name.toLowerCase())
      );
      setAttendanceList(workerLogs);

      if (workerRes) {
        setEditForm({
          name: workerRes.name || '',
          phone: workerRes.phone || '',
          email: workerRes.email || '',
          designation: workerRes.designation || '',
          salary: workerRes.dailyWage || (workerRes.salary ? Math.round(workerRes.salary / 30) : 850),
          employeeCode: workerRes.employeeCode || '',
          siteName: workerRes.site?.siteName || workerRes.siteName || '',
        });

        setFinancialForm({
          bankName: workerRes.bankName || 'State Bank of India',
          bankAccountNumber: workerRes.bankAccountNumber || '30981234508',
          bankIfsc: workerRes.bankIfsc || 'SBIN0001234',
          pfUanNumber: workerRes.pfUanNumber || '10098472108',
          salary: workerRes.dailyWage || (workerRes.salary ? Math.round(workerRes.salary / 30) : 850),
        });

        setAddressForm({
          phone: workerRes.phone || '+91 9811111111',
          email: workerRes.email || 'worker@union.org',
          address: workerRes.address || 'Plot 42, Sector 12, Industrial Union Area',
          city: workerRes.city || 'Mumbai',
          state: workerRes.state || 'Maharashtra',
          pincode: workerRes.pincode || '400001',
        });
      }
    } catch (err: any) {
      console.error('Error loading worker details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/';
    }
  };

  const handleSaveProfile = async () => {
    try {
      await updateUserApi(effectiveId, editForm);
      setIsEditModalOpen(false);
      loadWorkerData();
    } catch (err: any) {
      alert(err.message || 'Failed to update worker details');
    }
  };

  const handleSaveAddressSection = async () => {
    try {
      await updateUserApi(effectiveId, addressForm);
      setWorker((prev: any) => ({ ...prev, ...addressForm }));
      setIsEditingAddress(false);
      alert('Address and contact details updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update address details');
    }
  };

  const handleSaveFinancialSection = async () => {
    try {
      await updateUserApi(effectiveId, financialForm);
      setWorker((prev: any) => ({ ...prev, ...financialForm }));
      setIsEditingFinancial(false);
      alert('Bank and financial details updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update financial details');
    }
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '40px', height: '40px', border: '4px solid #2563EB', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: '#64748B', fontSize: '14px', fontWeight: 600 }}>Loading worker profile details…</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <AlertCircle size={48} style={{ color: '#EF4444', margin: '0 auto 12px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A' }}>Worker Profile Not Found</h2>
          <p style={{ fontSize: '14px', color: '#64748B', marginTop: '8px' }}>The requested worker record could not be loaded from the system.</p>
          <button onClick={handleBack} className="worker-detail-back-btn" style={{ marginTop: '16px' }}>
            <ArrowLeft size={16} /> Return to Workers
          </button>
        </div>
      </div>
    );
  }

  const dailyWage = worker.dailyWage || (worker.salary ? Math.round(worker.salary / 30) : 850);
  const monthlyWage = dailyWage * 30;

  return (
    <div className="worker-detail-container">
      
      {/* Top Header Bar with Back Button */}
      <div className="worker-detail-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            type="button"
            onClick={handleBack}
            className="worker-detail-back-btn"
            title="Back to previous screen"
          >
            <ArrowLeft size={16} />
            <span>Back to Workers</span>
          </button>
          <span style={{ color: '#94A3B8', fontSize: '13.5px', fontWeight: 600, display: 'none' }} className="desktop-title">
            Labor Union Management • Worker Profile
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isReadOnly && (
            <button
              onClick={() => setIsEditModalOpen(true)}
              className="hero-action-btn btn-blue"
            >
              <Edit3 size={14} />
              <span>Edit Profile</span>
            </button>
          )}

          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                handleBack();
              }
            }}
            style={{ backgroundColor: 'rgba(255,255,255,0.1)', color: '#FFF', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
            title="Close View"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Main Container */}
      <div className="worker-detail-main">
        
        {/* Dark Hero Banner */}
        <div className="worker-hero-banner">
          <div className="worker-hero-top">
            <img
              src={worker.profileImage || worker.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${worker.name}`}
              alt={worker.name}
              className="worker-hero-avatar"
            />

            <div className="worker-hero-info">
              <div className="worker-hero-title-row">
                <h1 className="worker-hero-name">{worker.name}</h1>
                <span className="worker-hero-code">
                  {worker.employeeCode || `WRK-${worker.id}`}
                </span>
                <span className="worker-hero-status">
                  ACTIVE WORKER
                </span>
                {isReadOnly && (
                  <span style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#FCA5A5', padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 800, border: '1px solid rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <Lock size={12} /> READ-ONLY SUPER AGENT VIEW
                  </span>
                )}
              </div>

              <div className="worker-hero-meta-row">
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Briefcase size={15} style={{ color: '#60A5FA' }} /> {worker.designation || 'Worker'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={15} style={{ color: '#34D399' }} /> {worker.site?.siteName || worker.siteName || 'Highway Flyover Project'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} style={{ color: '#FBBF24' }} /> Agent: {worker.assignedAgent?.name || worker.agentName || 'Satish'}
                </span>
              </div>
            </div>

            <div className="worker-hero-actions">
              <button
                type="button"
                onClick={() => setPhotoModalType('SIGN_IN')}
                className="hero-action-btn btn-green"
              >
                <Camera size={14} />
                <span>Live Sign-In Photo</span>
              </button>

              <button
                type="button"
                onClick={() => setPhotoModalType('SIGN_OUT')}
                className="hero-action-btn btn-amber"
              >
                <Camera size={14} />
                <span>Live Sign-Out Photo</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="worker-tabs-bar">
            {[
              { id: 'CALENDAR', label: 'Work History & Calendar', icon: CalendarIcon },
              { id: 'ADDRESS', label: 'Address & Contact', icon: MapPin },
              { id: 'FINANCIAL', label: 'Bank & Financial Details', icon: Landmark },
              { id: 'OVERVIEW', label: 'Overview Profile', icon: User },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`worker-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon size={15} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 1: Work History & Calendar */}
        {activeTab === 'CALENDAR' && (
          <WorkerCalendar
            workerId={worker.id}
            workerName={worker.name}
            employeeCode={worker.employeeCode || `WRK-${worker.id}`}
            currentSiteName={worker.site?.siteName || worker.siteName || 'Downtown Site'}
            agentName={worker.assignedAgent?.name || worker.agentName || 'Satish'}
            attendanceList={attendanceList}
            scheduleList={schedules}
            availableSites={sites}
          />
        )}

        {/* Tab 2: Address & Contact Details */}
        {activeTab === 'ADDRESS' && (
          <div className="worker-detail-card">
            <div className="worker-detail-card-header">
              <div>
                <h3 className="worker-detail-card-title">Address & Contact Information</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', margin: '3px 0 0' }}>
                  Official residential address, mobile phone number, and union communication details.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsEditingAddress(!isEditingAddress)}
                  className="hero-action-btn btn-blue"
                >
                  <Edit3 size={14} />
                  <span>{isEditingAddress ? 'Cancel Edit' : 'Edit Contact Details'}</span>
                </button>
              )}
            </div>

            {/* In-tab Edit Form */}
            {isEditingAddress ? (
              <div style={{ backgroundColor: 'var(--bg-main, #EFF6FF)', padding: '20px', borderRadius: '12px', border: '1px solid #BFDBFE', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#1E40AF', margin: '0 0 14px' }}>Edit Contact & Address Details</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Phone Number</label>
                    <input
                      type="text"
                      value={addressForm.phone}
                      onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Email Address</label>
                    <input
                      type="email"
                      value={addressForm.email}
                      onChange={(e) => setAddressForm({ ...addressForm, email: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Residential Street Address</label>
                    <input
                      type="text"
                      value={addressForm.address}
                      onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>City</label>
                    <input
                      type="text"
                      value={addressForm.city}
                      onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>State</label>
                    <input
                      type="text"
                      value={addressForm.state}
                      onChange={(e) => setAddressForm({ ...addressForm, state: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Postal Pincode</label>
                    <input
                      type="text"
                      value={addressForm.pincode}
                      onChange={(e) => setAddressForm({ ...addressForm, pincode: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleSaveAddressSection}
                    className="hero-action-btn btn-green"
                  >
                    <Save size={14} />
                    <span>Save Contact Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingAddress(false)}
                    style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Readonly Display Grid */}
            <div className="worker-info-grid-2">
              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  <Phone size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Mobile Phone Number</span>
                  <span className="worker-info-value" style={{ color: '#2563EB' }}>{worker.phone || '+91 9811111111'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}>
                  <Mail size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Email Address</span>
                  <span className="worker-info-value">{worker.email || 'worker@union.org'}</span>
                </div>
              </div>

              <div className="worker-info-item" style={{ gridColumn: '1 / -1' }}>
                <div className="worker-info-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                  <MapPin size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Residential Address</span>
                  <span className="worker-info-value">{worker.address || 'Plot 42, Sector 12, Industrial Union Area'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
                  <Building2 size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">City & State</span>
                  <span className="worker-info-value">{worker.city || 'Mumbai'}, {worker.state || 'Maharashtra'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                  <Hash size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Postal Pincode</span>
                  <span className="worker-info-value" style={{ fontFamily: 'monospace' }}>{worker.pincode || '400001'}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Bank & Financial Details */}
        {activeTab === 'FINANCIAL' && (
          <div className="worker-detail-card">
            <div className="worker-detail-card-header">
              <div>
                <h3 className="worker-detail-card-title">Bank Account & Financial Details</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', margin: '3px 0 0' }}>
                  Direct salary disbursement bank account, IFSC code, PF/UAN record, and wage rate.
                </p>
              </div>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={() => setIsEditingFinancial(!isEditingFinancial)}
                  className="hero-action-btn btn-blue"
                >
                  <Edit3 size={14} />
                  <span>{isEditingFinancial ? 'Cancel Edit' : 'Edit Bank Details'}</span>
                </button>
              )}
            </div>

            {/* In-tab Edit Form */}
            {isEditingFinancial ? (
              <div style={{ backgroundColor: 'var(--bg-main, #F3E8FF)', padding: '20px', borderRadius: '12px', border: '1px solid #DDD6FE', marginBottom: '20px' }}>
                <h4 style={{ fontSize: '14.5px', fontWeight: 800, color: '#6B21A8', margin: '0 0 14px' }}>Edit Bank & Financial Information</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Bank Name</label>
                    <input
                      type="text"
                      value={financialForm.bankName}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankName: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Bank Account Number</label>
                    <input
                      type="text"
                      value={financialForm.bankAccountNumber}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankAccountNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>IFSC Code</label>
                    <input
                      type="text"
                      value={financialForm.bankIfsc}
                      onChange={(e) => setFinancialForm({ ...financialForm, bankIfsc: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>PF / UAN Number</label>
                    <input
                      type="text"
                      value={financialForm.pfUanNumber}
                      onChange={(e) => setFinancialForm({ ...financialForm, pfUanNumber: e.target.value })}
                      style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
                  <button
                    type="button"
                    onClick={handleSaveFinancialSection}
                    className="hero-action-btn btn-green"
                  >
                    <Save size={14} />
                    <span>Save Bank Details</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingFinancial(false)}
                    style={{ backgroundColor: '#64748B', color: '#FFF', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : null}

            {/* Readonly Display Grid */}
            <div className="worker-info-grid-2">
              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
                  <Landmark size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Bank Name</span>
                  <span className="worker-info-value">{worker.bankName || 'State Bank of India'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#ECFDF5', color: '#059669' }}>
                  <CreditCard size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Bank Account Number</span>
                  <span className="worker-info-value" style={{ fontFamily: 'monospace', color: '#059669' }}>
                    {worker.bankAccountNumber || '30981234508'}
                  </span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
                  <ShieldCheck size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">IFSC Code</span>
                  <span className="worker-info-value" style={{ fontFamily: 'monospace' }}>
                    {worker.bankIfsc || 'SBIN0001234'}
                  </span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#F3E8FF', color: '#9333EA' }}>
                  <Hash size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">PF / UAN Number</span>
                  <span className="worker-info-value" style={{ fontFamily: 'monospace' }}>
                    {worker.pfUanNumber || '10098472108'}
                  </span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                  <Coins size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Daily Wage Rate</span>
                  <span className="worker-info-value" style={{ color: '#15803D' }}>
                    ₹ {dailyWage.toLocaleString('en-IN')} / day
                  </span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-icon-box" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
                  <Coins size={20} />
                </div>
                <div className="worker-info-content">
                  <span className="worker-info-label">Estimated Monthly Wage</span>
                  <span className="worker-info-value" style={{ color: '#15803D' }}>
                    ₹ {monthlyWage.toLocaleString('en-IN')} / month
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Overview */}
        {activeTab === 'OVERVIEW' && (
          <div className="worker-detail-card">
            <div className="worker-detail-card-header">
              <div>
                <h3 className="worker-detail-card-title">Worker Profile Overview</h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary, #64748B)', margin: '3px 0 0' }}>
                  Summary profile overview and union registration status.
                </p>
              </div>
            </div>

            <div className="worker-info-grid-2">
              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Worker Full Name</span>
                  <span className="worker-info-value">{worker.name}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Employee Code ID</span>
                  <span className="worker-info-value" style={{ color: '#2563EB', fontFamily: 'monospace' }}>
                    {worker.employeeCode || `WRK-${worker.id}`}
                  </span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Designation / Skill</span>
                  <span className="worker-info-value" style={{ color: '#D97706' }}>{worker.designation || 'Worker'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Current Assigned Site</span>
                  <span className="worker-info-value">{worker.site?.siteName || worker.siteName || 'Highway Flyover Project'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Supervising Field Agent</span>
                  <span className="worker-info-value" style={{ color: '#7C3AED' }}>{worker.assignedAgent?.name || worker.agentName || 'Satish'}</span>
                </div>
              </div>

              <div className="worker-info-item">
                <div className="worker-info-content">
                  <span className="worker-info-label">Enrollment / Joining Date</span>
                  <span className="worker-info-value">
                    {worker.joiningDate ? new Date(worker.joiningDate).toISOString().split('T')[0] : '2024-03-01'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: '#FFF', borderRadius: '16px', padding: '24px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, margin: 0, color: '#0F172A' }}>Edit Worker Profile</h3>
              <button onClick={() => setIsEditModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Full Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Designation / Skill</label>
                <input
                  type="text"
                  value={editForm.designation}
                  onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Daily Wage Rate (₹)</label>
                <input
                  type="number"
                  value={editForm.salary}
                  onChange={(e) => setEditForm({ ...editForm, salary: Number(e.target.value) })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Mobile Phone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '12px', color: '#334155', marginBottom: '4px' }}>Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setIsEditModalOpen(false)} style={{ backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: '8px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveProfile} className="hero-action-btn btn-blue" style={{ padding: '9px 18px', fontSize: '13px' }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Live Photo Capture Modal */}
      {photoModalType && (
        <LivePhotoCaptureModal
          isOpen={!!photoModalType}
          onClose={() => setPhotoModalType(null)}
          worker={{
            id: Number(effectiveId),
            name: worker.name,
            employeeCode: worker.employeeCode,
            siteName: worker.site?.siteName || worker.siteName
          }}
          type={photoModalType}
          onSuccess={() => {
            setPhotoModalType(null);
            loadWorkerData();
          }}
        />
      )}

    </div>
  );
};

export default WorkerDetailPage;
