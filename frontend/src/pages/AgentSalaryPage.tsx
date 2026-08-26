import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Search,
  Edit2,
  CheckCircle2,
  TrendingUp,
  CreditCard,
  X,
  Save,
  UserCheck,
  Headset
} from 'lucide-react';
import { fetchAgentsApi, fetchUsersApi, updateUserApi } from '../services/api';
import { UserAvatar } from '../components/UserAvatar';
import './AgentSalaryPage.css';

export const AgentSalaryPage: React.FC = () => {
  const [agentsList, setAgentsList] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL'); // ALL, FIELD_AGENT, SUPPORT_AGENT
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Edit Modal State
  const [editingAgent, setEditingAgent] = useState<any | null>(null);
  const [editBaseSalary, setEditBaseSalary] = useState<string>('');
  const [editBonus, setEditBonus] = useState<string>('');
  const [editDesignation, setEditDesignation] = useState<string>('');
  const [editPhone, setEditPhone] = useState<string>('');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadSalaryData = async () => {
    setLoading(true);
    try {
      const [usersData, agentsData] = await Promise.all([
        fetchUsersApi().catch(() => []),
        fetchAgentsApi().catch(() => [])
      ]);

      const combined = [...usersData, ...agentsData];
      const mappedAgents: any[] = [];

      combined.forEach((u: any) => {
        const code = (u.employeeCode || '').toUpperCase();
        const des = (u.designation || '').toLowerCase();
        const role = (u.role || '').toUpperCase();

        const isFieldAgent = role === 'AGENT' || code.startsWith('AGT');
        const isSupportAgent = (
          code.startsWith('CSA') ||
          des.includes('support') ||
          role === 'CUSTOMER_SUPPORT' ||
          role === 'SUPPORT_AGENT'
        ) && role !== 'SUPER_AGENT' && !code.startsWith('SA-');

        if ((isFieldAgent || isSupportAgent) && u.role !== 'WORKER' && !code.startsWith('WRK')) {
          if (!mappedAgents.some(m => String(m.id) === String(u.id) || (u.email && m.email.toLowerCase() === u.email.toLowerCase()))) {
            const rawSalary = u.salary ? Number(u.salary) : (isSupportAgent ? 38000 : 35000);
            const rawBonus = u.bonus ? Number(u.bonus) : 3500;
            const agentCategory = isSupportAgent ? 'SUPPORT_AGENT' : 'FIELD_AGENT';

            mappedAgents.push({
              id: String(u.id),
              numericId: u.id,
              name: u.name || 'Agent User',
              employeeCode: u.employeeCode || (isSupportAgent ? `CSA-10${u.id}` : `AGT-00${u.id}`),
              email: u.email || `${(u.name || 'agent').toLowerCase().replace(/\s+/g, '.')}@union.com`,
              phone: u.phone || '+91 98765 43210',
              category: agentCategory,
              designation: u.designation || (isSupportAgent ? 'Customer Support Agent' : 'Field Supervisor'),
              siteName: u.site?.siteName || (isSupportAgent ? 'HQ Support Center' : 'Metro Construction Site Block A'),
              baseSalary: rawSalary,
              allowances: rawBonus,
              netSalary: rawSalary + rawBonus,
              status: u.status || 'ACTIVE',
              avatar: u.avatar || u.profileImage || ''
            });
          }
        }
      });

      setAgentsList(mappedAgents);
    } catch (err) {
      console.error('Failed to load agent salary data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSalaryData();
  }, []);

  const handleOpenEditModal = (agent: any) => {
    setEditingAgent(agent);
    setEditBaseSalary(String(agent.baseSalary || 35000));
    setEditBonus(String(agent.allowances || 3500));
    setEditDesignation(agent.designation || '');
    setEditPhone(agent.phone || '');
    setEditStatus(agent.status || 'ACTIVE');
  };

  const handleSaveSalaryDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAgent) return;

    setIsSubmitting(true);
    try {
      const baseNum = Number(editBaseSalary) || 0;
      const bonusNum = Number(editBonus) || 0;
      const targetId = Number(editingAgent.numericId || editingAgent.id) || editingAgent.id;

      await updateUserApi(targetId, {
        salary: baseNum,
        designation: editDesignation.trim(),
        phone: editPhone.trim(),
        status: editStatus
      } as any);

      // Local state update
      setAgentsList((prev) =>
        prev.map((a) =>
          String(a.id) === String(editingAgent.id)
            ? {
                ...a,
                baseSalary: baseNum,
                allowances: bonusNum,
                netSalary: baseNum + bonusNum,
                designation: editDesignation.trim(),
                phone: editPhone.trim(),
                status: editStatus
              }
            : a
        )
      );

      setToastMsg(`✔ Salary & details updated successfully for ${editingAgent.name}!`);
      setTimeout(() => setToastMsg(null), 4000);
      setEditingAgent(null);
    } catch (err: any) {
      alert(err?.message || 'Failed to update salary details in backend database');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered Agents List
  const filteredAgents = agentsList.filter((a) => {
    if (roleFilter === 'FIELD_AGENT' && a.category !== 'FIELD_AGENT') return false;
    if (roleFilter === 'SUPPORT_AGENT' && a.category !== 'SUPPORT_AGENT') return false;
    if (statusFilter !== 'ALL' && a.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (a.name || '').toLowerCase().includes(q);
      const matchCode = (a.employeeCode || '').toLowerCase().includes(q);
      const matchDes = (a.designation || '').toLowerCase().includes(q);
      if (!matchName && !matchCode && !matchDes) return false;
    }
    return true;
  });

  // Calculate live summary card metrics
  const totalPayroll = agentsList.reduce((sum, a) => sum + (a.netSalary || 0), 0);
  const fieldAgentsCount = agentsList.filter((a) => a.category === 'FIELD_AGENT').length;
  const supportAgentsCount = agentsList.filter((a) => a.category === 'SUPPORT_AGENT').length;
  const avgSalary = agentsList.length > 0 ? Math.round(totalPayroll / agentsList.length) : 0;

  return (
    <div className="agent-salary-page-container animate-fade-in">
      {/* Header Bar */}
      <div className="salary-page-header">
        <div>
          <h1>Agent Salary & Payroll Directory</h1>
          <p>Manage monthly base salaries, allowances, and designations for Field & Support Agents.</p>
        </div>
      </div>

      {/* Success Toast Banner */}
      {toastMsg && (
        <div className="salary-toast-success animate-fade-in">
          <CheckCircle2 size={18} />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="salary-stats-grid">
        <div className="salary-stat-card">
          <div className="card-icon-wrap blue"><DollarSign size={20} /></div>
          <div>
            <span className="card-lbl">Total Agent Monthly Payroll</span>
            <h3 className="card-val">₹{totalPayroll.toLocaleString('en-IN')}</h3>
            <span className="card-sub green">↑ System Live Sync</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="card-icon-wrap purple"><UserCheck size={20} /></div>
          <div>
            <span className="card-lbl">Field Agents</span>
            <h3 className="card-val">{fieldAgentsCount}</h3>
            <span className="card-sub">Active Field Supervisors</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="card-icon-wrap orange"><Headset size={20} /></div>
          <div>
            <span className="card-lbl">Support Agents</span>
            <h3 className="card-val">{supportAgentsCount}</h3>
            <span className="card-sub">Customer Support Team</span>
          </div>
        </div>

        <div className="salary-stat-card">
          <div className="card-icon-wrap green"><TrendingUp size={20} /></div>
          <div>
            <span className="card-lbl">Average Net Salary</span>
            <h3 className="card-val">₹{avgSalary.toLocaleString('en-IN')}</h3>
            <span className="card-sub">Per Month / Agent</span>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="salary-filter-bar">
        <div className="search-box-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            placeholder="Search agent by name, code or designation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-dropdown-group">
          <select
            className="salary-select-filter"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="ALL">All Agent Roles</option>
            <option value="FIELD_AGENT">Field Agents Only</option>
            <option value="SUPPORT_AGENT">Customer Support Agents Only</option>
          </select>

          <select
            className="salary-select-filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
      </div>

      {/* Salary Data Table Card */}
      <div className="salary-table-card">
        <div className="table-responsive">
          <table className="salary-data-table">
            <thead>
              <tr>
                <th>Agent Details</th>
                <th>Role Category</th>
                <th>Designation & Site</th>
                <th>Base Salary (₹)</th>
                <th>Allowances / Bonus (₹)</th>
                <th>Net Payable (₹)</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#64748B' }}>
                    Loading agent salary records from database...
                  </td>
                </tr>
              ) : filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '32px', color: '#94A3B8' }}>
                    No agent salary records found matching criteria.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="salary-table-row">
                    <td>
                      <div className="agent-user-cell">
                        <UserAvatar src={agent.avatar} name={agent.name} size={36} />
                        <div>
                          <span className="agent-name">{agent.name}</span>
                          <span className="agent-code">{agent.employeeCode}</span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {agent.category === 'SUPPORT_AGENT' ? (
                        <span className="role-pill support-pill"><Headset size={12} /> Support Agent</span>
                      ) : (
                        <span className="role-pill field-pill"><UserCheck size={12} /> Field Agent</span>
                      )}
                    </td>

                    <td>
                      <div className="designation-cell">
                        <span className="des-title">{agent.designation}</span>
                        <span className="des-site">{agent.siteName}</span>
                      </div>
                    </td>

                    <td className="amount-cell base-num">₹{agent.baseSalary.toLocaleString('en-IN')}</td>
                    <td className="amount-cell bonus-num">+₹{agent.allowances.toLocaleString('en-IN')}</td>
                    <td className="amount-cell net-num">₹{agent.netSalary.toLocaleString('en-IN')}</td>

                    <td>
                      {agent.status === 'ACTIVE' ? (
                        <span className="status-pill active-pill">Active</span>
                      ) : (
                        <span className="status-pill inactive-pill">Inactive</span>
                      )}
                    </td>

                    <td style={{ textAlign: 'right' }}>
                      <button
                        className="edit-salary-btn"
                        onClick={() => handleOpenEditModal(agent)}
                        title="Edit Salary & Details"
                      >
                        <Edit2 size={14} />
                        <span>Edit Salary</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Agent Salary & Details Interactive Modal */}
      {editingAgent && (
        <div className="modal-backdrop-overlay">
          <div className="edit-salary-modal animate-scale-in">
            <div className="modal-top-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CreditCard size={20} color="#2563EB" />
                <h3>Edit Agent Salary & Details</h3>
              </div>
              <button className="close-modal-x" onClick={() => setEditingAgent(null)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveSalaryDetails} className="edit-salary-form">
              <div className="agent-info-summary-box">
                <UserAvatar src={editingAgent.avatar} name={editingAgent.name} size={42} />
                <div>
                  <h4>{editingAgent.name}</h4>
                  <p>{editingAgent.employeeCode} • {editingAgent.email}</p>
                </div>
              </div>

              <div className="form-grid-row">
                <div className="form-field-group">
                  <label>Monthly Base Salary (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editBaseSalary}
                    onChange={(e) => setEditBaseSalary(e.target.value)}
                    placeholder="e.g. 40000"
                  />
                </div>

                <div className="form-field-group">
                  <label>Allowances & Bonus (₹)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editBonus}
                    onChange={(e) => setEditBonus(e.target.value)}
                    placeholder="e.g. 3500"
                  />
                </div>
              </div>

              <div className="form-field-group">
                <label>Designation / Role Title</label>
                <input
                  type="text"
                  required
                  value={editDesignation}
                  onChange={(e) => setEditDesignation(e.target.value)}
                  placeholder="e.g. Senior Support Specialist"
                />
              </div>

              <div className="form-grid-row">
                <div className="form-field-group">
                  <label>Phone Number</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div className="form-field-group">
                  <label>Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              <div className="modal-actions-footer">
                <button
                  type="button"
                  className="cancel-modal-btn"
                  onClick={() => setEditingAgent(null)}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-modal-btn"
                  disabled={isSubmitting}
                >
                  <Save size={16} />
                  <span>{isSubmitting ? 'Saving...' : 'Save & Sync Backend'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
