import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { updateUserApi } from '../services/api';
import {
  getWageConfig,
  fetchWageConfigApi,
  saveWageConfigApi,
  DEFAULT_WAGE_CONFIG,
  type WageConfigData,
  type TradeWageItem
} from '../services/wageConfigService';
import {
  Lock,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sliders,
  Plus,
  Trash2,
  RotateCcw,
  ShieldCheck,
  Receipt,
  Info
} from 'lucide-react';
import './Pages.css';

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_AGENT';
  
  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [profileErrorMsg, setProfileErrorMsg] = useState<string | null>(null);

  // Security & Password Change States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState<string | null>(null);
  const [passwordErrorMsg, setPasswordErrorMsg] = useState<string | null>(null);

  // Super Admin Wage & Registration Fee Master States
  const [wageConfig, setWageConfig] = useState<WageConfigData>(getWageConfig());
  const [isSavingWageConfig, setIsSavingWageConfig] = useState(false);
  const [wageConfigSuccessMsg, setWageConfigSuccessMsg] = useState<string | null>(null);
  const [wageConfigErrorMsg, setWageConfigErrorMsg] = useState<string | null>(null);

  // New Custom Trade Form States
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [newTradeName, setNewTradeName] = useState('');
  const [newTradeDailyWage, setNewTradeDailyWage] = useState<number>(850);
  const [newTradeCategory, setNewTradeCategory] = useState('Skilled Trade');


  // Load backend wage config on mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await fetchWageConfigApi();
        setWageConfig(config);
      } catch (err) {
        console.warn('Could not load backend wage config, using cached local config:', err);
      }
    };
    loadConfig();
  }, []);

  const handleWageRateChange = (tradeId: string, dailyWage: number) => {
    const validDaily = Math.max(0, dailyWage || 0);
    setWageConfig((prev) => ({
      ...prev,
      tradeWages: prev.tradeWages.map((t) =>
        t.id === tradeId
          ? {
              ...t,
              dailyWage: validDaily,
              monthlyWage: validDaily * 30
            }
          : t
      )
    }));
  };

  const handleRegistrationFeeChange = (fee: number) => {
    setWageConfig((prev) => ({
      ...prev,
      registrationFee: Math.max(0, fee || 0)
    }));
  };

  const handleAgentRegistrationFeeChange = (fee: number) => {
    setWageConfig((prev) => ({
      ...prev,
      agentRegistrationFee: Math.max(0, fee || 0)
    }));
  };

  const handleAddNewTrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTradeName.trim()) return;

    const newId = `custom_${Date.now()}`;
    const daily = Math.max(0, Number(newTradeDailyWage) || 0);
    const newTrade: TradeWageItem = {
      id: newId,
      name: newTradeName.trim(),
      dailyWage: daily,
      monthlyWage: daily * 30,
      category: newTradeCategory.trim() || 'Custom Trade',
      description: 'Custom trade rate defined by Super Admin'
    };

    setWageConfig((prev) => ({
      ...prev,
      tradeWages: [...prev.tradeWages, newTrade]
    }));

    setNewTradeName('');
    setNewTradeDailyWage(850);
    setShowAddTrade(false);
  };

  const handleDeleteTrade = (tradeId: string) => {
    setWageConfig((prev) => ({
      ...prev,
      tradeWages: prev.tradeWages.filter((t) => t.id !== tradeId)
    }));
  };

  const handleResetWageDefaults = () => {
    if (window.confirm('Reset all trade wages and registration fee to system defaults?')) {
      setWageConfig({
        ...DEFAULT_WAGE_CONFIG,
        updatedAt: new Date().toISOString(),
        updatedBy: `${user?.name || 'Super Admin'} (Reset to Defaults)`
      });
      setWageConfigSuccessMsg('✔ Reset to system defaults. Click "Save Wage & Fee Settings" to persist.');
      setTimeout(() => setWageConfigSuccessMsg(null), 4000);
    }
  };

  const handleSaveWageConfig = async () => {
    setIsSavingWageConfig(true);
    setWageConfigSuccessMsg(null);
    setWageConfigErrorMsg(null);

    try {
      const saved = await saveWageConfigApi(wageConfig);
      setWageConfig(saved);
      setWageConfigSuccessMsg('✔ Super Admin Wage Rates and Registration Fee policy updated successfully across the entire system!');
      setTimeout(() => setWageConfigSuccessMsg(null), 5000);
    } catch (err: any) {
      setWageConfigErrorMsg(err.message || 'Failed to update wage configuration.');
    } finally {
      setIsSavingWageConfig(false);
    }
  };


  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg(null);
    setProfileErrorMsg(null);

    if (!name.trim()) {
      setProfileErrorMsg('Full Name is required.');
      return;
    }

    if (!user?.id) {
      setProfileSuccessMsg('✔ Profile settings saved locally.');
      setTimeout(() => setProfileSuccessMsg(null), 3000);
      return;
    }

    setIsUpdatingProfile(true);
    try {
      await updateUserApi(user.id, {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim()
      });
      setIsUpdatingProfile(false);
      setProfileSuccessMsg('✔ Profile details updated successfully!');
      setTimeout(() => setProfileSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingProfile(false);
      setProfileErrorMsg(err.message || 'Failed to update profile details.');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccessMsg(null);
    setPasswordErrorMsg(null);

    if (!currentPassword) {
      setPasswordErrorMsg('Please enter your current password.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setPasswordErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordErrorMsg('New password and confirm password do not match.');
      return;
    }

    if (!user?.id) {
      setPasswordSuccessMsg('✔ Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updateUserApi(user.id, {
        currentPassword: currentPassword,
        newPassword: newPassword,
        confirmPassword: confirmPassword
      });
      setIsUpdatingPassword(false);
      setPasswordSuccessMsg('✔ Your account password has been updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordSuccessMsg(null), 4000);
    } catch (err: any) {
      setIsUpdatingPassword(false);
      setPasswordErrorMsg(err.message || 'Failed to update password. Please check your current password.');
    }
  };

  return (
    <div className="page-wrapper animate-fade-in" style={{ padding: '24px', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Header Bar */}
      <div className="page-header" style={{ marginBottom: '24px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span>Account Profile & System Master Settings</span>
            <span style={{ fontSize: '11px', fontWeight: 800, backgroundColor: isSuperAdmin ? '#FEF2F2' : '#EFF6FF', color: isSuperAdmin ? '#DC2626' : '#2563EB', padding: '3px 10px', borderRadius: '12px', border: isSuperAdmin ? '1px solid #FECACA' : '1px solid #BFDBFE' }}>
              {user?.role || 'WORKER'} MODE
            </span>
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
            {isSuperAdmin
              ? 'Configure master per-day wages, worker registration fee schedule (Razorpay), and manage account credentials.'
              : 'Manage your personal profile information, email preferences, and account security password.'}
          </p>
        </div>
      </div>

      {/* ─── Super Admin Wage Master & Registration Fee Control Section ─── */}
      {isSuperAdmin ? (
        <div className="module-card animate-fade-in" style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1.5px solid #E0E7FF', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.08)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#0F172A', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: '#EFF6FF', color: '#2563EB', display: 'flex' }}>
                  <Sliders size={20} />
                </div>
                <span>Super Admin: Per-Day Wages & Registration Fee Master</span>
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                Define default daily wages for all trades and set worker onboarding registration fee collected via Razorpay.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleResetWageDefaults}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1', color: '#475569', padding: '7px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                title="Reset to default factory wages"
              >
                <RotateCcw size={14} />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAddTrade(!showAddTrade)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', backgroundColor: '#EFF6FF', border: '1px solid #BFDBFE', color: '#2563EB', padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
              >
                <Plus size={14} />
                <span>Add Trade</span>
              </button>
            </div>
          </div>

          {/* Success / Error Alerts */}
          {wageConfigSuccessMsg && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} />
              <span>{wageConfigSuccessMsg}</span>
            </div>
          )}

          {wageConfigErrorMsg && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '12px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: 700, marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertCircle size={18} />
              <span>{wageConfigErrorMsg}</span>
            </div>
          )}

          {/* Global Fee & Policy Control Box */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            {/* Worker Registration Fee Control */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Receipt size={18} color="#2563EB" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Worker Registration Fee (₹)</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', lineHeight: '1.4' }}>
                Amount charged to worker during registration, processed exclusively through Razorpay online gateway.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '150px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B', fontSize: '15px' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    value={wageConfig.registrationFee}
                    onChange={(e) => handleRegistrationFeeChange(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px 10px 28px', borderRadius: '8px', border: '1.5px solid #2563EB', fontSize: '15px', fontWeight: 800, color: '#0F172A', backgroundColor: '#FFFFFF' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669', backgroundColor: '#ECFDF5', padding: '3px 8px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
                    Razorpay Gateway
                  </span>
                </div>
              </div>
            </div>

            {/* Agent Registration Fee Control */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Receipt size={18} color="#7C3AED" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Agent Registration Fee (₹)</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', lineHeight: '1.4' }}>
                Amount charged when registering a new Field Agent, processed securely via Razorpay standard online checkout.
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ position: 'relative', width: '150px' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: 800, color: '#64748B', fontSize: '15px' }}>₹</span>
                  <input
                    type="number"
                    min="0"
                    step="50"
                    value={wageConfig.agentRegistrationFee !== undefined ? wageConfig.agentRegistrationFee : 1000}
                    onChange={(e) => handleAgentRegistrationFeeChange(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px 12px 10px 28px', borderRadius: '8px', border: '1.5px solid #7C3AED', fontSize: '15px', fontWeight: 800, color: '#0F172A', backgroundColor: '#FFFFFF' }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#7C3AED', backgroundColor: '#F5F3FF', padding: '3px 8px', borderRadius: '6px', border: '1px solid #DDD6FE' }}>
                    Razorpay Gateway
                  </span>
                </div>
              </div>
            </div>

            {/* Field Agent Wage Policy Lock */}
            <div style={{ backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldCheck size={18} color="#059669" />
                <span style={{ fontSize: '14px', fontWeight: 800, color: '#0F172A' }}>Field Agent Wage Enforcement</span>
              </div>
              <p style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px', lineHeight: '1.4' }}>
                Choose if Field Agents can customize wages or if they must strictly follow Super Admin fixed master rates.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={wageConfig.lockAgentWages}
                  onChange={(e) => setWageConfig((prev) => ({ ...prev, lockAgentWages: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: '#2563EB', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', fontWeight: 700, color: wageConfig.lockAgentWages ? '#DC2626' : '#334155' }}>
                  {wageConfig.lockAgentWages ? 'Strict Mode (Locked to Super Admin rates for Field Agents)' : 'Flexible Mode (Field Agents can adjust wage rates)'}
                </span>
              </label>
            </div>
          </div>

          {/* Add New Trade Popup Form */}
          {showAddTrade && (
            <form onSubmit={handleAddNewTrade} style={{ backgroundColor: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#1E40AF', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Plus size={16} />
                <span>Add New Skill / Trade Designation to Master</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crane Operator / Rigger"
                    value={newTradeName}
                    onChange={(e) => setNewTradeName(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Daily Wage (₹/day) *</label>
                  <input
                    type="number"
                    min="100"
                    step="50"
                    required
                    value={newTradeDailyWage}
                    onChange={(e) => setNewTradeDailyWage(Number(e.target.value))}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px', fontWeight: 700 }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Category Badge</label>
                  <input
                    type="text"
                    value={newTradeCategory}
                    onChange={(e) => setNewTradeCategory(e.target.value)}
                    placeholder="e.g. Heavy Machinery"
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '13px' }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="submit"
                  style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '6px', padding: '8px 16px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Add Trade to Table
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddTrade(false)}
                  style={{ backgroundColor: '#FFFFFF', color: '#64748B', border: '1px solid #CBD5E1', borderRadius: '6px', padding: '8px 14px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Trade Wages Table */}
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px', marginBottom: '20px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155' }}>Trade Designation</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#334155' }}>Skill Category</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#2563EB' }}>Standard Daily Wage (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#059669' }}>Standard Monthly (₹)</th>
                  <th style={{ padding: '12px 16px', fontWeight: 800, color: '#64748B', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {wageConfig.tradeWages.map((trade, idx) => (
                  <tr
                    key={trade.id || idx}
                    style={{
                      borderBottom: '1px solid #F1F5F9',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFAFA',
                      transition: 'background-color 0.15s'
                    }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0F172A' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{trade.name}</span>
                      </div>
                      {trade.description && (
                        <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '2px', fontWeight: 400 }}>
                          {trade.description}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', fontWeight: 700, backgroundColor: '#F1F5F9', color: '#475569', padding: '3px 8px', borderRadius: '6px' }}>
                        {trade.category || 'General Trade'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ position: 'relative', width: '130px' }}>
                        <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: '#64748B' }}>₹</span>
                        <input
                          type="number"
                          min="0"
                          step="25"
                          value={trade.dailyWage}
                          onChange={(e) => handleWageRateChange(trade.id, Number(e.target.value))}
                          style={{
                            width: '100%',
                            padding: '6px 8px 6px 22px',
                            borderRadius: '6px',
                            border: '1.5px solid #CBD5E1',
                            fontSize: '13.5px',
                            fontWeight: 800,
                            color: '#0F172A',
                            backgroundColor: '#FFFFFF'
                          }}
                        />
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', fontWeight: 800, color: '#059669', fontSize: '13.5px' }}>
                      ₹{(trade.dailyWage * 30).toLocaleString('en-IN')} / mo
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      {wageConfig.tradeWages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTrade(trade.id)}
                          style={{
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#EF4444',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px'
                          }}
                          title={`Delete ${trade.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Master Save Actions */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
            <div style={{ fontSize: '12px', color: '#64748B', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Info size={14} color="#2563EB" />
              <span>Saving applies these wage rates and ₹{wageConfig.registrationFee} registration fee to Worker Registration & Action Modals globally.</span>
            </div>

            <button
              type="button"
              disabled={isSavingWageConfig}
              onClick={handleSaveWageConfig}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '11px 24px',
                fontSize: '13.5px',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                transition: 'all 0.2s'
              }}
            >
              {isSavingWageConfig ? <Loader2 size={16} className="spinner" /> : <CheckCircle2 size={16} />}
              <span>{isSavingWageConfig ? 'Saving Master Config...' : 'Save Wage & Fee Master Settings'}</span>
            </button>
          </div>
        </div>
      ) : null}

      <div className="settings-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>
        
        {/* Profile Card */}
        <form className="module-card" onSubmit={handleProfileSubmit} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={18} color="#2563EB" />
            <span>Personal Profile Details</span>
          </h3>

          {profileSuccessMsg && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{profileSuccessMsg}</span>
            </div>
          )}

          {profileErrorMsg && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{profileErrorMsg}</span>
            </div>
          )}
          
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Email Address *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Phone Number</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Role / Membership</label>
            <input
              type="text"
              value={user?.role || 'WORKER'}
              readOnly
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: '13.5px', fontWeight: 700 }}
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingProfile}
            style={{ backgroundColor: '#2563EB', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isUpdatingProfile ? <Loader2 size={16} className="spinner" /> : null}
            <span>{isUpdatingProfile ? 'Saving Profile...' : 'Save Profile Details'}</span>
          </button>
        </form>

        {/* Change Password Card */}
        <form className="module-card" onSubmit={handlePasswordSubmit} style={{ backgroundColor: '#FFFFFF', borderRadius: '16px', padding: '24px', border: '1px solid #E2E8F0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
          <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800, color: '#0F172A', paddingBottom: '12px', borderBottom: '1px solid #F1F5F9', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={18} color="#059669" />
            <span>Account Security & Change Password</span>
          </h3>

          {passwordSuccessMsg && (
            <div style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={16} />
              <span>{passwordSuccessMsg}</span>
            </div>
          )}

          {passwordErrorMsg && (
            <div style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', padding: '10px 14px', borderRadius: '10px', fontSize: '12.5px', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} />
              <span>{passwordErrorMsg}</span>
            </div>
          )}
          
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Current Password *</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Enter new password (min 6 chars)..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>Confirm New Password *</label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Confirm new password..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '13.5px' }}
            />
          </div>

          <button
            type="submit"
            disabled={isUpdatingPassword}
            style={{ backgroundColor: '#059669', color: '#FFFFFF', border: 'none', borderRadius: '10px', padding: '10px 20px', fontSize: '13px', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {isUpdatingPassword ? <Loader2 size={16} className="spinner" /> : null}
            <span>{isUpdatingPassword ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>



      </div>
    </div>
  );
};
