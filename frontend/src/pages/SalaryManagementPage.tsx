import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import type { TradeWageItem, WageConfigData } from '../services/wageConfigService';
import {
  getWageConfig,
  fetchWageConfigApi,
  saveWageConfigApi,
  DEFAULT_WAGE_CONFIG
} from '../services/wageConfigService';
import {
  Banknote,
  DollarSign,
  Plus,
  Save,
  RotateCcw,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Search,
  Briefcase,
  Users,
  UserCheck,
  Edit3,
  Trash2,
  Check,
  X,
  CreditCard,
  ShieldAlert,
  Shield
} from 'lucide-react';
import './SalaryManagementPage.css';

export const SalaryManagementPage: React.FC = () => {
  const { user, role } = useAuth();
  const isSuperAdmin = role === 'SUPER_AGENT';

  // State
  const [config, setConfig] = useState<WageConfigData>(getWageConfig());
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Custom Role Modal State
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleName, setRoleName] = useState('');
  const [roleCategory, setRoleCategory] = useState('Skilled Trade');
  const [roleDailyWage, setRoleDailyWage] = useState('900');
  const [roleMonthlySalary, setRoleMonthlySalary] = useState('27000');
  const [roleDescription, setRoleDescription] = useState('');

  // Fetch initial config from backend API
  useEffect(() => {
    let isMounted = true;
    fetchWageConfigApi()
      .then((data) => {
        if (isMounted && data) {
          setConfig(data);
        }
      })
      .catch((err) => {
        console.warn('Using local wage configuration:', err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ type, message });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  // Helper to mark changes
  const updateLocalConfig = (updater: (prev: WageConfigData) => WageConfigData) => {
    setConfig((prev) => {
      const updated = updater(prev);
      setHasChanges(true);
      return updated;
    });
  };

  // Inline wage change
  const handleDailyWageChange = (id: string, newWage: number) => {
    const safeWage = Math.max(100, isNaN(newWage) ? 100 : newWage);
    updateLocalConfig((prev) => ({
      ...prev,
      tradeWages: prev.tradeWages.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            dailyWage: safeWage,
            monthlyWage: safeWage * 30
          };
        }
        return t;
      })
    }));
  };

  const handleMonthlyWageChange = (id: string, newMonthly: number) => {
    const safeMonthly = Math.max(1000, isNaN(newMonthly) ? 3000 : newMonthly);
    updateLocalConfig((prev) => ({
      ...prev,
      tradeWages: prev.tradeWages.map((t) => {
        if (t.id === id) {
          return {
            ...t,
            monthlyWage: safeMonthly
          };
        }
        return t;
      })
    }));
  };

  const handleStepDailyWage = (id: string, step: number) => {
    const item = config.tradeWages.find((t) => t.id === id);
    if (!item) return;
    handleDailyWageChange(id, item.dailyWage + step);
  };

  // Custom Role Actions
  const handleOpenAddRole = () => {
    setEditingRoleId(null);
    setRoleName('');
    setRoleCategory('Skilled Trade');
    setRoleDailyWage('900');
    setRoleMonthlySalary('27000');
    setRoleDescription('');
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRole = (item: TradeWageItem) => {
    setEditingRoleId(item.id);
    setRoleName(item.name);
    setRoleCategory(item.category || 'Skilled Trade');
    setRoleDailyWage(String(item.dailyWage));
    setRoleMonthlySalary(String(item.monthlyWage || item.dailyWage * 30));
    setRoleDescription(item.description || '');
    setIsRoleModalOpen(true);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) {
      showToast('Please enter a role name', 'error');
      return;
    }

    const daily = Math.max(100, Number(roleDailyWage) || 800);
    const monthly = Math.max(1000, Number(roleMonthlySalary) || daily * 30);

    if (editingRoleId) {
      // Edit existing
      updateLocalConfig((prev) => ({
        ...prev,
        tradeWages: prev.tradeWages.map((t) =>
          t.id === editingRoleId
            ? {
                ...t,
                name: roleName.trim(),
                category: roleCategory,
                dailyWage: daily,
                monthlyWage: monthly,
                description: roleDescription.trim()
              }
            : t
        )
      }));
      showToast(`Role "${roleName.trim()}" updated successfully`);
    } else {
      // Create new custom role
      const newRole: TradeWageItem = {
        id: `custom_${Date.now()}`,
        name: roleName.trim(),
        category: roleCategory,
        dailyWage: daily,
        monthlyWage: monthly,
        description: roleDescription.trim() || 'Custom trade role defined by Super Admin',
        isCustom: true
      };
      updateLocalConfig((prev) => ({
        ...prev,
        tradeWages: [...prev.tradeWages, newRole]
      }));
      showToast(`New custom role "${roleName.trim()}" added to master list!`);
    }

    setIsRoleModalOpen(false);
  };

  const handleDeleteRole = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to remove the role "${name}"?`)) return;

    updateLocalConfig((prev) => ({
      ...prev,
      tradeWages: prev.tradeWages.filter((t) => t.id !== id)
    }));
    showToast(`Role "${name}" removed`);
  };

  // Save all changes to backend & local store
  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      const payload: WageConfigData = {
        ...config,
        updatedAt: new Date().toISOString(),
        updatedBy: user?.name ? `${user.name} (Super Admin)` : 'Super Admin'
      };

      const result = await saveWageConfigApi(payload);
      setConfig(result);
      setHasChanges(false);
      showToast('All wage, salary & fee configurations saved successfully!');
    } catch (err: any) {
      console.error('Failed to save wage config:', err);
      showToast('Failed to save configuration to server. Saved locally.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to default
  const handleResetToDefaults = () => {
    if (!window.confirm('Reset all daily wages, monthly salaries, and registration fees to initial master system defaults?')) {
      return;
    }
    updateLocalConfig(() => ({
      ...DEFAULT_WAGE_CONFIG,
      updatedAt: new Date().toISOString()
    }));
    showToast('Reset to system baseline defaults. Click "Save Changes" to commit.');
  };

  // Filtered Roles
  const filteredRoles = useMemo(() => {
    return config.tradeWages.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchesSearch) return false;

      if (selectedCategory === 'ALL') return true;
      if (selectedCategory === 'CUSTOM') return item.isCustom;
      if (selectedCategory === 'SKILLED') return item.category?.toLowerCase().includes('skilled');
      if (selectedCategory === 'TECHNICAL') return item.category?.toLowerCase().includes('technical');
      return true;
    });
  }, [config.tradeWages, searchQuery, selectedCategory]);

  // Statistics
  const totalRoles = config.tradeWages.length;
  const avgDailyWage = Math.round(
    config.tradeWages.reduce((acc, curr) => acc + (curr.dailyWage || 0), 0) / (totalRoles || 1)
  );
  const minDailyWage = config.tradeWages.length > 0 ? Math.min(...config.tradeWages.map((t) => t.dailyWage)) : 0;
  const maxDailyWage = config.tradeWages.length > 0 ? Math.max(...config.tradeWages.map((t) => t.dailyWage)) : 0;

  if (!isSuperAdmin) {
    return (
      <div className="page-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', background: 'var(--bg-card)', padding: '32px 24px', borderRadius: '16px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: '#FEF2F2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <ShieldAlert size={28} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>Super Admin Access Required</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
            Only Super Administrators can configure fixed daily wages, monthly salaries, custom roles, and onboarding registration fees.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-wrapper salary-mgmt-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`salary-toast ${toast.type}`}>
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="salary-mgmt-header">
        <div className="salary-mgmt-header-top">
          <div className="salary-mgmt-title-group">
            <div className="salary-mgmt-icon-wrap">
              <Banknote size={28} />
            </div>
            <div>
              <h1>Salary & Wage Management</h1>
              <p>Configure fixed daily wages, monthly salaries, custom trade roles, and onboarding registration fees.</p>
            </div>
          </div>

          <div className="salary-mgmt-header-actions">
            <button
              type="button"
              className="salary-btn-secondary"
              onClick={handleResetToDefaults}
              title="Reset configuration to factory standard"
            >
              <RotateCcw size={15} />
              <span>Reset Defaults</span>
            </button>

            <button
              type="button"
              className="salary-btn-primary"
              onClick={handleSaveAll}
              disabled={isSaving}
            >
              <Save size={16} />
              <span>{isSaving ? 'Saving Changes...' : hasChanges ? 'Save Changes *' : 'Save Configuration'}</span>
            </button>
          </div>
        </div>

        <div className="salary-mgmt-meta-bar">
          <div className="salary-mgmt-meta-left">
            <span className="salary-meta-chip">
              <ShieldCheck size={13} />
              Super Admin Master Console
            </span>
            <span>Policy Version: Active Master Standard</span>
            {hasChanges && (
              <span style={{ color: '#FCD34D', fontWeight: 700 }}>• Unsaved modifications pending</span>
            )}
          </div>
          <div>
            <span>
              Last Updated: {new Date(config.updatedAt || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              {config.updatedBy ? ` by ${config.updatedBy}` : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="salary-stats-grid">
        <div className="salary-stat-card">
          <div className="salary-stat-icon blue">
            <Briefcase size={22} />
          </div>
          <div className="salary-stat-content">
            <span className="salary-stat-label">Active Trade Roles</span>
            <span className="salary-stat-value">{totalRoles}</span>
            <span className="salary-stat-hint">{config.tradeWages.filter((t) => t.isCustom).length} custom user-defined</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="salary-stat-icon emerald">
            <DollarSign size={22} />
          </div>
          <div className="salary-stat-content">
            <span className="salary-stat-label">Average Daily Wage</span>
            <span className="salary-stat-value">₹ {avgDailyWage.toLocaleString('en-IN')}</span>
            <span className="salary-stat-hint">Range: ₹{minDailyWage} – ₹{maxDailyWage} / day</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="salary-stat-icon purple">
            <UserCheck size={22} />
          </div>
          <div className="salary-stat-content">
            <span className="salary-stat-label">Worker Reg. Fee</span>
            <span className="salary-stat-value">₹ {config.registrationFee.toLocaleString('en-IN')}</span>
            <span className="salary-stat-hint">{config.isRegistrationFeeMandatory ? 'Mandatory for Onboarding' : 'Optional / Waiver Allowed'}</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="salary-stat-icon amber">
            <Users size={22} />
          </div>
          <div className="salary-stat-content">
            <span className="salary-stat-label">Agent Reg. Fee</span>
            <span className="salary-stat-value">₹ {(config.agentRegistrationFee ?? 1000).toLocaleString('en-IN')}</span>
            <span className="salary-stat-hint">{config.isAgentRegistrationFeeMandatory !== false ? 'Mandatory via Razorpay' : 'Optional'}</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="salary-stat-icon indigo">
            <Shield size={22} />
          </div>
          <div className="salary-stat-content">
            <span className="salary-stat-label">Admin Reg. Fee</span>
            <span className="salary-stat-value">₹ {(config.adminRegistrationFee ?? 2500).toLocaleString('en-IN')}</span>
            <span className="salary-stat-hint">{config.isAdminRegistrationFeeMandatory !== false ? 'Mandatory for Onboarding' : 'Optional / Waived'}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Registration Fees & Wage Lock Policies */}
      <div className="salary-section-card">
        <div className="salary-section-header">
          <div className="salary-section-title-wrap">
            <CreditCard size={20} color="#4F46E5" />
            <div>
              <h2>Registration Fee & Wage Enforcement Rules</h2>
              <p>Configure custom registration fees charged during worker, agent, and administrator enrollment, and lock wages.</p>
            </div>
          </div>
        </div>

        <div className="salary-fees-grid">
          {/* Worker Registration Fee */}
          <div className="fee-config-box">
            <div className="fee-config-top">
              <div>
                <span className="fee-config-title">
                  <UserCheck size={18} color="#059669" /> Worker Registration Fee
                </span>
                <p className="fee-config-desc">
                  Set the standard registration fee charged when a new worker is added to the union platform.
                </p>
              </div>
            </div>

            <div className="fee-input-row">
              <div className="currency-input-wrap">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="50"
                  className="currency-input"
                  value={config.registrationFee}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    updateLocalConfig((prev) => ({ ...prev, registrationFee: val }));
                  }}
                />
              </div>

              <div className="quick-presets">
                {[0, 250, 500, 750, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`quick-preset-btn ${config.registrationFee === preset ? 'active' : ''}`}
                    onClick={() => updateLocalConfig((prev) => ({ ...prev, registrationFee: preset }))}
                  >
                    {preset === 0 ? 'Free' : `₹${preset}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={config.isRegistrationFeeMandatory}
                  onChange={(e) =>
                    updateLocalConfig((prev) => ({ ...prev, isRegistrationFeeMandatory: e.target.checked }))
                  }
                />
                <span>Mandatory Worker Registration Fee (Enforce payment collection)</span>
              </label>
            </div>
          </div>

          {/* Agent Registration Fee */}
          <div className="fee-config-box">
            <div className="fee-config-top">
              <div>
                <span className="fee-config-title">
                  <Users size={18} color="#2563EB" /> Agent Registration Fee
                </span>
                <p className="fee-config-desc">
                  Set the onboarding fee charged when creating a field agent. Handled online via Razorpay Gateway.
                </p>
              </div>
            </div>

            <div className="fee-input-row">
              <div className="currency-input-wrap">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="100"
                  className="currency-input"
                  value={config.agentRegistrationFee ?? 1000}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    updateLocalConfig((prev) => ({ ...prev, agentRegistrationFee: val }));
                  }}
                />
              </div>

              <div className="quick-presets">
                {[500, 1000, 1500, 2000, 2500].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`quick-preset-btn ${(config.agentRegistrationFee ?? 1000) === preset ? 'active' : ''}`}
                    onClick={() => updateLocalConfig((prev) => ({ ...prev, agentRegistrationFee: preset }))}
                  >
                    ₹{preset}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={config.isAgentRegistrationFeeMandatory !== false}
                  onChange={(e) =>
                    updateLocalConfig((prev) => ({ ...prev, isAgentRegistrationFeeMandatory: e.target.checked }))
                  }
                />
                <span>Mandatory Agent Registration Fee (Require Razorpay checkout)</span>
              </label>
            </div>
          </div>

          {/* Admin Registration Fee */}
          <div className="fee-config-box">
            <div className="fee-config-top">
              <div>
                <span className="fee-config-title">
                  <Shield size={18} color="#4F46E5" /> Admin Registration Fee
                </span>
                <p className="fee-config-desc">
                  Set the onboarding fee charged when enrolling an Area Administrator into the union system.
                </p>
              </div>
            </div>

            <div className="fee-input-row">
              <div className="currency-input-wrap">
                <span className="currency-symbol">₹</span>
                <input
                  type="number"
                  min="0"
                  step="250"
                  className="currency-input"
                  value={config.adminRegistrationFee ?? 2500}
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    updateLocalConfig((prev) => ({ ...prev, adminRegistrationFee: val }));
                  }}
                />
              </div>

              <div className="quick-presets">
                {[0, 1000, 2500, 5000, 10000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`quick-preset-btn ${(config.adminRegistrationFee ?? 2500) === preset ? 'active' : ''}`}
                    onClick={() => updateLocalConfig((prev) => ({ ...prev, adminRegistrationFee: preset }))}
                  >
                    {preset === 0 ? 'Free' : `₹${preset.toLocaleString('en-IN')}`}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={config.isAdminRegistrationFeeMandatory !== false}
                  onChange={(e) =>
                    updateLocalConfig((prev) => ({ ...prev, isAdminRegistrationFeeMandatory: e.target.checked }))
                  }
                />
                <span>Mandatory Admin Registration Fee (Enforce enrollment fee)</span>
              </label>
            </div>
          </div>

          {/* Master Wage Lock Policy */}
          <div className="fee-config-box" style={{ background: config.lockAgentWages ? '#FFFBEB' : undefined }}>
            <div className="fee-config-top">
              <div>
                <span className="fee-config-title">
                  {config.lockAgentWages ? <Lock size={18} color="#D97706" /> : <Unlock size={18} color="#64748B" />}
                  Fixed Wage Enforcement Lock
                </span>
                <p className="fee-config-desc">
                  {config.lockAgentWages
                    ? 'Field agents and site managers are LOCKED to these exact fixed daily wages and cannot alter rates.'
                    : 'Field agents can manually customize daily rates per worker if needed during onboarding.'}
                </p>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid #E2E8F0' }}>
              <label className="toggle-switch-label">
                <input
                  type="checkbox"
                  className="switch-input"
                  checked={config.lockAgentWages}
                  onChange={(e) =>
                    updateLocalConfig((prev) => ({ ...prev, lockAgentWages: e.target.checked }))
                  }
                />
                <span>{config.lockAgentWages ? 'Strictly Lock Fixed Wages' : 'Allow Agent Wage Adjustments'}</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Fixed Daily Wages, Salaries & Custom Roles */}
      <div className="salary-section-card">
        <div className="salary-section-header">
          <div className="salary-section-title-wrap">
            <Briefcase size={20} color="#4F46E5" />
            <div>
              <h2>Standard Trade Roles & Fixed Daily Wages</h2>
              <p>Set daily wages, 30-day fixed salaries, and add custom roles that appear across worker & agent modules.</p>
            </div>
          </div>

          <button
            type="button"
            className="salary-btn-primary"
            onClick={handleOpenAddRole}
            style={{ background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)', boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)' }}
          >
            <Plus size={16} />
            <span>Add Custom Role</span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="salary-toolbar">
          <div className="salary-search-box">
            <Search size={16} color="#94A3B8" />
            <input
              type="text"
              placeholder="Search trade, skill or role title..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="salary-filter-chips">
            <button
              type="button"
              className={`filter-chip ${selectedCategory === 'ALL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('ALL')}
            >
              All Roles ({config.tradeWages.length})
            </button>
            <button
              type="button"
              className={`filter-chip ${selectedCategory === 'SKILLED' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('SKILLED')}
            >
              Skilled Trades
            </button>
            <button
              type="button"
              className={`filter-chip ${selectedCategory === 'TECHNICAL' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('TECHNICAL')}
            >
              Technical
            </button>
            <button
              type="button"
              className={`filter-chip ${selectedCategory === 'CUSTOM' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('CUSTOM')}
            >
              Custom Roles ({config.tradeWages.filter((t) => t.isCustom).length})
            </button>
          </div>
        </div>

        {/* Roles Table */}
        <div className="salary-table-wrap">
          <table className="salary-table">
            <thead>
              <tr>
                <th>Trade / Role Title</th>
                <th>Category</th>
                <th>Fixed Daily Wage (₹/day)</th>
                <th>Fixed Monthly Salary (₹/mo)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRoles.map((item) => {
                const isCustom = !!item.isCustom;
                const categoryClass = isCustom
                  ? 'custom'
                  : item.category?.toLowerCase().includes('technical')
                  ? 'technical'
                  : item.category?.toLowerCase().includes('semi')
                  ? 'semi-skilled'
                  : 'skilled';

                return (
                  <tr key={item.id}>
                    <td>
                      <div className="role-name-cell">
                        <span className="role-primary-name">
                          {item.name}
                          {isCustom && (
                            <span style={{ fontSize: '10px', background: '#FEF3C7', color: '#B45309', padding: '2px 6px', borderRadius: '4px', fontWeight: 800 }}>
                              CUSTOM
                            </span>
                          )}
                        </span>
                        <span className="role-desc">{item.description || 'Standard union trade category'}</span>
                      </div>
                    </td>

                    <td>
                      <span className={`category-badge ${categoryClass}`}>
                        {item.category || 'General'}
                      </span>
                    </td>

                    <td>
                      <div className="wage-input-cell">
                        <input
                          type="number"
                          min="100"
                          step="25"
                          className="wage-inline-input"
                          value={item.dailyWage}
                          onChange={(e) => handleDailyWageChange(item.id, Number(e.target.value))}
                        />
                        <div className="step-btn-group">
                          <button
                            type="button"
                            className="step-btn"
                            onClick={() => handleStepDailyWage(item.id, 50)}
                            title="Increase by ₹50"
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="step-btn"
                            onClick={() => handleStepDailyWage(item.id, -50)}
                            title="Decrease by ₹50"
                          >
                            ▼
                          </button>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="monthly-calc-cell">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#64748B' }}>₹</span>
                          <input
                            type="number"
                            min="1000"
                            step="500"
                            className="wage-inline-input"
                            style={{ width: '110px' }}
                            value={item.monthlyWage || item.dailyWage * 30}
                            onChange={(e) => handleMonthlyWageChange(item.id, Number(e.target.value))}
                          />
                        </div>
                        <span className="monthly-calc-sub">
                          30 days @ ₹{item.dailyWage}/day
                        </span>
                      </div>
                    </td>

                    <td>
                      <div className="table-action-btns" style={{ justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="icon-action-btn"
                          onClick={() => handleOpenEditRole(item)}
                          title="Edit role details"
                        >
                          <Edit3 size={15} />
                        </button>

                        {isCustom ? (
                          <button
                            type="button"
                            className="icon-action-btn delete"
                            onClick={() => handleDeleteRole(item.id, item.name)}
                            title="Delete custom role"
                          >
                            <Trash2 size={15} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="icon-action-btn"
                            onClick={() => {
                              const standard = DEFAULT_WAGE_CONFIG.tradeWages.find((d) => d.id === item.id);
                              if (standard) {
                                handleDailyWageChange(item.id, standard.dailyWage);
                                handleMonthlyWageChange(item.id, standard.monthlyWage);
                                showToast(`Reset ${item.name} to default ₹${standard.dailyWage}/day`);
                              }
                            }}
                            title="Reset this role to default rate"
                          >
                            <RotateCcw size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredRoles.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px 16px', color: '#64748B' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                      <Briefcase size={28} color="#94A3B8" />
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>No trade roles found matching your search.</span>
                      <button
                        type="button"
                        className="salary-btn-primary"
                        onClick={handleOpenAddRole}
                        style={{ fontSize: '12px', padding: '6px 14px', marginTop: '6px' }}
                      >
                        <Plus size={14} /> Add as New Custom Role
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {isRoleModalOpen && (
        <div className="salary-modal-overlay" onClick={() => setIsRoleModalOpen(false)}>
          <div className="salary-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="salary-modal-header">
              <div>
                <h3>{editingRoleId ? 'Edit Trade Role' : 'Add New Custom Role'}</h3>
                <p>Define role title, daily wage, monthly salary and skill category for the union roster.</p>
              </div>
              <button
                type="button"
                className="salary-modal-close"
                onClick={() => setIsRoleModalOpen(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRole}>
              <div className="salary-modal-body">
                <div className="form-field">
                  <label>Role / Trade Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Tower Crane Operator, Senior Safety Supervisor"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label>Trade Skill Category *</label>
                  <select
                    value={roleCategory}
                    onChange={(e) => setRoleCategory(e.target.value)}
                  >
                    <option value="Skilled Trade">Skilled Trade</option>
                    <option value="Certified Skilled">Certified Skilled</option>
                    <option value="Specialized Technical">Specialized Technical</option>
                    <option value="Technical Specialist">Technical Specialist</option>
                    <option value="Unskilled / Semi-skilled">Unskilled / Semi-skilled</option>
                    <option value="Supervisory">Supervisory / Agent Role</option>
                    <option value="Custom Specialty">Custom Specialty</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div className="form-field">
                    <label>Fixed Daily Wage (₹/day) *</label>
                    <input
                      type="number"
                      required
                      min="100"
                      step="25"
                      value={roleDailyWage}
                      onChange={(e) => {
                        const val = e.target.value;
                        setRoleDailyWage(val);
                        const num = Number(val) || 0;
                        setRoleMonthlySalary(String(num * 30));
                      }}
                    />
                  </div>

                  <div className="form-field">
                    <label>Fixed Monthly Salary (₹/mo)</label>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      value={roleMonthlySalary}
                      onChange={(e) => setRoleMonthlySalary(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Role Scope & Description</label>
                  <textarea
                    rows={3}
                    placeholder="Describe main responsibilities, safety precautions, certifications required..."
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                  />
                </div>

                {/* Preview Box */}
                <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '10px', padding: '12px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Worker Onboarding Preview
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#0F172A' }}>
                      {roleName.trim() || 'New Role'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#059669' }}>
                      ₹{roleDailyWage || '0'}/day (₹{roleMonthlySalary || '0'}/mo)
                    </span>
                  </div>
                </div>
              </div>

              <div className="salary-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-outline"
                  onClick={() => setIsRoleModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="salary-btn-primary"
                >
                  <Check size={16} />
                  <span>{editingRoleId ? 'Update Role' : 'Add to Master Roster'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
