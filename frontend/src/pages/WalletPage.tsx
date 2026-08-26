import React, { useState, useEffect } from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, CalendarCheck, Loader2, UserCheck, Users, Send, X, CreditCard, CheckCircle2, Clock, PlusCircle } from 'lucide-react';
import { 
  fetchWalletsApi, 
  fetchWalletDashboardApi, 
  disburseWeeklyWalletApi, 
  fetchWorkersApi,
  fetchAgentsApi,
  fetchWalletHistoryApi,
  debitWalletApi,
  creditWalletApi,
  requestDisbursementApi,
  fetchDisbursementRequestsApi,
  approveDisbursementApi,
  rejectDisbursementApi
} from '../services/api';
import { getSocket } from '../services/socket';
import type { User as UserType, WalletRecord } from '../types';
import './Pages.css';

interface WalletPageProps {
  user?: UserType | null;
  onOpenModal: (type: string) => void;
}

export const WalletPage: React.FC<WalletPageProps> = ({ user, onOpenModal }) => {
  const isAgent = user?.role === 'AGENT';
  const isSuperAgent = user?.role === 'SUPER_AGENT';
  const isAgentOrAdmin = isAgent || isSuperAgent;

  const [activeTab, setActiveTab] = useState<'personal' | 'workers' | 'disbursements'>(
    isSuperAgent ? 'workers' : 'personal'
  );
  
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [personalHistory, setPersonalHistory] = useState<any[]>([]);
  const [personalWalletBalance, setPersonalWalletBalance] = useState<number>(0);
  
  const [isDisbursing, setIsDisbursing] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Disbursement Requests State
  const [disbursementRequests, setDisbursementRequests] = useState<any[]>([]);
  const [processingReqId, setProcessingReqId] = useState<number | null>(null);

  // Modal State for Agent Withdrawal / Transfer
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('Bank Wire Transfer');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Modal State for Agent Requesting Worker Disbursement Approval
  const [showDisburseReqModal, setShowDisburseReqModal] = useState(false);
  const [reqWorkerId, setReqWorkerId] = useState('');
  const [reqAmount, setReqAmount] = useState('');
  const [reqDescription, setReqDescription] = useState('');
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);
  const [workersList, setWorkersList] = useState<any[]>([]);

  // Modal State for Super Agent Assigning Funds to Agent
  const [showAssignAgentModal, setShowAssignAgentModal] = useState(false);
  const [targetAgentId, setTargetAgentId] = useState('');
  const [assignAmount, setAssignAmount] = useState('');
  const [assignDescription, setAssignDescription] = useState('Super Agent Fund Allocation');
  const [isSubmittingAssign, setIsSubmittingAssign] = useState(false);
  const [agentsList, setAgentsList] = useState<any[]>([]);

  const [dashboard, setDashboard] = useState<{
    totalWallets: number;
    totalBalance: number;
    todayCredits: number;
    todayDebits: number;
  }>({
    totalWallets: 0,
    totalBalance: 0,
    todayCredits: 0,
    todayDebits: 0
  });

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      fetchWalletsApi().catch(() => []),
      fetchWalletDashboardApi().catch(() => null),
      fetchWorkersApi().catch(() => []),
      fetchWalletHistoryApi().catch(() => []),
      fetchDisbursementRequestsApi().catch(() => []),
      fetchAgentsApi().catch(() => [])
    ]).then(([walletData, dashData, workerData, historyData, disburseReqData, agentData]) => {
      setWorkersList(workerData);
      setAgentsList(agentData);
      setDisbursementRequests(disburseReqData);

      // Identify Agent's personal wallet
      const myWallet = walletData.find(
        (w: any) => String(w.rawWorkerId || w.workerId) === String(user?.id) || w.workerName === user?.name
      );

      if (myWallet) {
        setPersonalWalletBalance(myWallet.balance || 0);
      } else {
        setPersonalWalletBalance(0);
      }

      setPersonalHistory(historyData);

      let assignedWorkerIds = new Set<string>();
      let assignedWorkerNames = new Set<string>();

      if (isAgent && user?.id) {
        const myWorkers = workerData.filter(
          (w: any) => String(w.assignedAgentId || w.agentId) === String(user.id) || w.agentName === user.name
        );
        assignedWorkerIds = new Set(myWorkers.map((w: any) => String(w.id)));
        assignedWorkerNames = new Set(myWorkers.map((w: any) => (w.name || '').toLowerCase()));
      }

      // Filter worker wallets (excluding agent's own wallet for the worker table)
      const workerWalletsOnly = walletData.filter((w: any) => {
        const wId = String(w.rawWorkerId || w.workerId || '');
        const isAgentSelf = String(user?.id) === wId || w.workerName === user?.name;
        if (isAgentSelf) return false;

        if (isAgent && user?.id && assignedWorkerIds.size > 0) {
          const wName = (w.workerName || '').toLowerCase();
          const agtId = String(w.assignedAgentId || '');
          return String(user.id) === agtId || assignedWorkerIds.has(wId) || assignedWorkerNames.has(wName);
        }
        return true;
      });

      setWallets(workerWalletsOnly.length > 0 ? workerWalletsOnly : walletData);

      // Dynamic summary stat cards for assigned workers
      const activeWallets = workerWalletsOnly.length > 0 ? workerWalletsOnly : walletData;
      const totalBalanceSum = activeWallets.reduce((sum, w) => sum + (w.balance || 0), 0);
      const todayCreditsSum = activeWallets.reduce((sum, w) => sum + (w.lastTransactionType === 'CREDIT' ? w.lastAmount || 0 : 0), 0);
      const todayDebitsSum = activeWallets.reduce((sum, w) => sum + (w.lastTransactionType === 'DEBIT' ? w.lastAmount || 0 : 0), 0);

      setDashboard({
        totalWallets: activeWallets.length,
        totalBalance: dashData?.totalBalance && !isAgent ? dashData.totalBalance : totalBalanceSum,
        todayCredits: dashData?.todayCredits && !isAgent ? dashData.todayCredits : todayCreditsSum,
        todayDebits: dashData?.todayDebits && !isAgent ? dashData.todayDebits : todayDebitsSum
      });

      setIsLoading(false);
    });
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
    };

    socket.on('wallet:updated', handleUpdate);
    socket.on('payroll:updated', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('wallet:updated', handleUpdate);
      socket.off('payroll:updated', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, [user]);

  const handleWeeklyDisbursal = async () => {
    if (!window.confirm('Distribute Total System Balance equally to workers and field agents based on their weekly attendance?')) {
      return;
    }

    setIsDisbursing(true);
    try {
      const res = await disburseWeeklyWalletApi(62500);
      alert(`Weekly allowance distributed successfully!\n\nDisbursed: ₹${res.totalPoolDisbursed.toLocaleString('en-IN')} across ${res.totalUsersDisbursed} members based on attendance.`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to disburse weekly allowance');
    } finally {
      setIsDisbursing(false);
    }
  };

  const handleAgentWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid withdrawal amount.');
      return;
    }
    if (amountNum > personalWalletBalance) {
      alert(`Insufficient funds! Your current personal balance is ₹${personalWalletBalance.toLocaleString('en-IN')}`);
      return;
    }
    if (!user?.id) {
      alert('User session not found.');
      return;
    }

    setIsSubmittingWithdraw(true);
    try {
      await debitWalletApi(user.id, amountNum, `${withdrawDescription} (${withdrawAccount || 'Bank Payout'})`);
      alert(`Successfully withdrew ₹${amountNum.toLocaleString('en-IN')} to ${withdrawAccount || 'Bank Account'}`);
      setShowWithdrawModal(false);
      setWithdrawAmount('');
      setWithdrawAccount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to process withdrawal transfer');
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  const handleRequestDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(reqAmount);
    if (!reqWorkerId) {
      alert('Please select a valid worker');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid disbursement amount');
      return;
    }

    setIsSubmittingReq(true);
    try {
      await requestDisbursementApi(reqWorkerId, amountNum, reqDescription || 'Worker Wage Payout Request');
      alert(`Disbursement request of ₹${amountNum.toLocaleString('en-IN')} submitted to Super Agent for approval!`);
      setShowDisburseReqModal(false);
      setReqAmount('');
      setReqDescription('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit disbursement request');
    } finally {
      setIsSubmittingReq(false);
    }
  };

  const handleAssignAgentFunds = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(assignAmount);
    if (!targetAgentId) {
      alert('Please select a field agent');
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Please enter a valid allocation amount');
      return;
    }

    setIsSubmittingAssign(true);
    try {
      await creditWalletApi(targetAgentId, amountNum, assignDescription || 'Super Agent Fund Allocation');
      alert(`Successfully credited ₹${amountNum.toLocaleString('en-IN')} to Agent wallet!`);
      setShowAssignAgentModal(false);
      setAssignAmount('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to assign funds to agent');
    } finally {
      setIsSubmittingAssign(false);
    }
  };

  const handleApproveDisbursement = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to approve this wallet disbursement payout to worker?')) return;
    setProcessingReqId(requestId);
    try {
      await approveDisbursementApi(requestId);
      alert('Disbursement request approved! Worker wallet has been credited.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve disbursement');
    } finally {
      setProcessingReqId(null);
    }
  };

  const handleRejectDisbursement = async (requestId: number) => {
    if (!window.confirm('Are you sure you want to reject this disbursement request?')) return;
    setProcessingReqId(requestId);
    try {
      await rejectDisbursementApi(requestId);
      alert('Disbursement request rejected.');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject disbursement');
    } finally {
      setProcessingReqId(null);
    }
  };

  // Personal statistics
  const totalPersonalCredits = personalHistory
    .filter((t) => t.type === 'CREDIT')
    .reduce((sum, t) => sum + t.amount, 0) || personalWalletBalance;
  
  const totalPersonalDebits = personalHistory
    .filter((t) => t.type === 'DEBIT')
    .reduce((sum, t) => sum + t.amount, 0);

  const [roleFilter, setRoleFilter] = useState<'ALL' | 'AGENTS' | 'WORKERS'>('ALL');

  const filteredWallets = wallets.filter((w) => {
    if (roleFilter === 'AGENTS') return w.userRole === 'AGENT';
    if (roleFilter === 'WORKERS') return w.userRole === 'WORKER';
    return true;
  });

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Union Digital Wallet</h2>
          <p>Manage agent personal funds, worker digital wallet balances, direct deposits, and weekly allowances.</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {isSuperAgent && (
            <button
              className="primary-btn"
              style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              onClick={() => setShowAssignAgentModal(true)}
            >
              <PlusCircle size={16} />
              <span>Assign Amount to Agent</span>
            </button>
          )}

          {isAgent && (
            <button
              className="primary-btn"
              onClick={() => setShowDisburseReqModal(true)}
            >
              <Send size={16} />
              <span>Request Worker Disbursement Approval</span>
            </button>
          )}

          {activeTab === 'personal' && !isSuperAgent && (
            <button
              className="secondary-btn"
              onClick={() => setShowWithdrawModal(true)}
            >
              <Send size={16} />
              <span>Request Withdrawal / Transfer</span>
            </button>
          )}

          {activeTab === 'workers' && (
            <button
              className="secondary-btn"
              style={{ backgroundColor: '#EEF2FF', color: '#4F46E5', borderColor: '#C7D2FE', fontWeight: 600 }}
              disabled={isDisbursing}
              onClick={handleWeeklyDisbursal}
            >
              {isDisbursing ? <Loader2 size={16} className="spinner" /> : <CalendarCheck size={16} />}
              <span>Distribute Weekly Allowance</span>
            </button>
          )}
        </div>
      </div>

      {/* Wallet View Tab Switcher */}
      {isAgentOrAdmin && (
        <div className="wallet-tabs-wrapper">
          {!isSuperAgent && (
            <button
              className={`wallet-tab-btn ${activeTab === 'personal' ? 'active' : ''}`}
              onClick={() => setActiveTab('personal')}
            >
              <UserCheck size={16} />
              <span>My Personal Wallet</span>
              <span className="wallet-tab-badge">₹ {personalWalletBalance.toLocaleString('en-IN')}</span>
            </button>
          )}

          <button
            className={`wallet-tab-btn ${activeTab === 'workers' ? 'active' : ''}`}
            onClick={() => setActiveTab('workers')}
          >
            <Users size={16} />
            <span>Member Wallets (Agents & Workers)</span>
            <span className="wallet-tab-badge">{wallets.length} Members</span>
          </button>

          <button
            className={`wallet-tab-btn ${activeTab === 'disbursements' ? 'active' : ''}`}
            onClick={() => setActiveTab('disbursements')}
          >
            <Clock size={16} />
            <span>Disbursement Approvals</span>
            <span className="wallet-tab-badge" style={{ backgroundColor: disbursementRequests.filter(r => r.status === 'PENDING').length > 0 ? '#F59E0B' : '#E2E8F0', color: disbursementRequests.filter(r => r.status === 'PENDING').length > 0 ? '#FFFFFF' : '#475569' }}>
              {disbursementRequests.filter(r => r.status === 'PENDING').length} Pending
            </span>
          </button>
        </div>
      )}

      {/* TAB 1: MY PERSONAL WALLET */}
      {activeTab === 'personal' && !isSuperAgent && (
        <>
          <div className="stats-row-3">
            <div className="stat-box-card border-green">
              <div className="stat-header">
                <span>{user?.role === 'WORKER' ? 'My Personal Wallet Balance' : 'My Agent Wallet Balance'}</span>
                <Wallet size={18} className="text-green" />
              </div>
              <span className="stat-number text-green">
                ₹ {personalWalletBalance.toLocaleString('en-IN')}
              </span>
              <span className="stat-sub">
                Personal Treasury & Wage Fund ({user?.name || 'Member'})
              </span>
            </div>

            <div className="stat-box-card border-blue">
              <div className="stat-header">
                <span>Total Allowances Received</span>
                <ArrowDownRight size={18} className="text-blue" />
              </div>
              <span className="stat-number">
                ₹ {totalPersonalCredits.toLocaleString('en-IN')}
              </span>
              <span className="stat-sub">Weekly Disbursals & Bonuses</span>
            </div>

            <div className="stat-box-card border-purple">
              <div className="stat-header">
                <span>Total Withdrawals / Payouts</span>
                <ArrowUpRight size={18} className="text-purple" />
              </div>
              <span className="stat-number">
                ₹ {totalPersonalDebits.toLocaleString('en-IN')}
              </span>
              <span className="stat-sub">Bank & Wire Transfers</span>
            </div>
          </div>

          <div className="table-card mt-24">
            <div className="card-header border-b flex-between">
              <h3 className="card-title">My Personal Transaction History</h3>
              <span className="code-badge">{user?.employeeCode || `AGT-00${user?.id || '1'}`}</span>
            </div>
            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Transaction ID</th>
                    <th>Date & Time</th>
                    <th>Description</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '24px' }}>
                        <Loader2 size={18} className="spinner" style={{ marginRight: '8px' }} /> Loading personal transactions...
                      </td>
                    </tr>
                  ) : personalHistory.length > 0 ? (
                    personalHistory.map((tx: any) => (
                      <tr key={tx.id}>
                        <td><span className="code-badge">TXN-{tx.id}</span></td>
                        <td>{new Date(tx.createdAt || Date.now()).toLocaleString()}</td>
                        <td>
                          <span className="user-name-bold">{tx.description || 'Weekly Allowance Disbursal'}</span>
                        </td>
                        <td>
                          <span className={`badge ${tx.type === 'CREDIT' ? 'badge-approved' : 'badge-pending'}`}>
                            {tx.type}
                          </span>
                        </td>
                        <td>
                          <span className={`currency-bold ${tx.type === 'CREDIT' ? 'text-green' : 'text-purple'}`}>
                            {tx.type === 'CREDIT' ? '+' : '-'} ₹ {tx.amount.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-approved">COMPLETED</span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 24px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                          <CreditCard size={28} style={{ color: 'var(--text-muted)', opacity: 0.6 }} />
                          <span style={{ fontSize: '14px', fontWeight: 500 }}>
                            No wallet transactions found in the database.
                          </span>
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Transactions will appear here when wage deposits, weekly allowances, or withdrawal payouts occur.
                          </span>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: ASSIGNED WORKER WALLETS */}
      {activeTab === 'workers' && (
        <>
          <div className="stats-row-3">
            <div className="stat-box-card border-green">
              <div className="stat-header">
                <span>Total Assigned Worker Balance</span>
                <Wallet size={18} className="text-green" />
              </div>
              <span className="stat-number">
                ₹ {dashboard.totalBalance > 0 ? dashboard.totalBalance.toLocaleString('en-IN') : '0'}
              </span>
              <span className="stat-sub">
                Worker Pool Balance ({wallets.length} Active Member Wallets)
              </span>
            </div>

            <div className="stat-box-card border-blue">
              <div className="stat-header">
                <span>Today Member Credits</span>
                <ArrowDownRight size={18} className="text-blue" />
              </div>
              <span className="stat-number">
                ₹ {dashboard.todayCredits > 0 ? dashboard.todayCredits.toLocaleString('en-IN') : '0'}
              </span>
              <span className="stat-sub">Direct Member Payroll & Bonus Deposits</span>
            </div>

            <div className="stat-box-card border-purple">
              <div className="stat-header">
                <span>Today Withdrawals</span>
                <ArrowUpRight size={18} className="text-purple" />
              </div>
              <span className="stat-number">
                ₹ {dashboard.todayDebits > 0 ? dashboard.todayDebits.toLocaleString('en-IN') : '0'}
              </span>
              <span className="stat-sub">Bank Wire Transfers</span>
            </div>
          </div>

          <div className="table-card mt-24">
            <div className="card-header border-b flex-between" style={{ flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 className="card-title">Member Wallet Balances & Recent Activity</h3>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                  Systematic directory of field agent treasury wallets and worker wage wallets.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  className={`sm-btn ${roleFilter === 'ALL' ? 'btn-success' : 'secondary-btn'}`}
                  style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => setRoleFilter('ALL')}
                >
                  All Members ({wallets.length})
                </button>
                <button
                  type="button"
                  className={`sm-btn ${roleFilter === 'AGENTS' ? 'btn-success' : 'secondary-btn'}`}
                  style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => setRoleFilter('AGENTS')}
                >
                  Field Agents ({wallets.filter(w => w.userRole === 'AGENT').length})
                </button>
                <button
                  type="button"
                  className={`sm-btn ${roleFilter === 'WORKERS' ? 'btn-success' : 'secondary-btn'}`}
                  style={{ padding: '5px 12px', fontSize: '12px', borderRadius: '6px' }}
                  onClick={() => setRoleFilter('WORKERS')}
                >
                  Workers ({wallets.filter(w => w.userRole === 'WORKER').length})
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Member ID</th>
                    <th>Assigned Agent / Role</th>
                    <th>Current Balance</th>
                    <th>Last Transaction Date</th>
                    <th>Transaction Type</th>
                    <th>Last Amount</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                        <Loader2 size={18} className="spinner" style={{ marginRight: '8px' }} /> Loading member wallet records...
                      </td>
                    </tr>
                  ) : filteredWallets.length > 0 ? (
                    filteredWallets.map((w) => (
                      <tr key={w.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span className="user-name-bold">{w.workerName}</span>
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '1px 6px',
                                borderRadius: '4px',
                                display: 'inline-block',
                                width: 'fit-content',
                                backgroundColor: w.userRole === 'AGENT' ? '#EEF2FF' : '#F1F5F9',
                                color: w.userRole === 'AGENT' ? '#4F46E5' : '#475569',
                                border: `1px solid ${w.userRole === 'AGENT' ? '#C7D2FE' : '#CBD5E1'}`
                              }}
                            >
                              {w.userRole === 'AGENT' ? 'FIELD AGENT' : 'WORKER'}
                            </span>
                          </div>
                        </td>
                        <td><span className="code-badge">{w.workerId}</span></td>
                        <td>
                          {w.userRole === 'AGENT' ? (
                            <span style={{ fontSize: '12.5px', color: '#4F46E5', fontWeight: 600 }}>
                              Self (Supervisor{w.assignedWorkersCount ? ` - ${w.assignedWorkersCount} Workers` : ''})
                            </span>
                          ) : (
                            <span className="user-name-bold" style={{ color: '#2563EB' }}>
                              {w.agentName || 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td><span className="currency-bold text-green">₹ {w.balance.toLocaleString('en-IN')}</span></td>
                        <td>{w.lastTransactionDate}</td>
                        <td>
                          <span className={`badge ${w.lastTransactionType === 'CREDIT' ? 'badge-approved' : 'badge-pending'}`}>
                            {w.lastTransactionType}
                          </span>
                        </td>
                        <td>₹ {w.lastAmount.toLocaleString('en-IN')}</td>
                        <td>
                          {isSuperAgent && w.userRole === 'AGENT' ? (
                            <button
                              className="primary-btn sm-btn"
                              style={{ padding: '4px 8px', fontSize: '11.5px', backgroundColor: '#059669', borderColor: '#059669' }}
                              onClick={() => {
                                setTargetAgentId(String(w.rawWorkerId || w.id));
                                setShowAssignAgentModal(true);
                              }}
                            >
                              Assign Funds
                            </button>
                          ) : (
                            <button className="text-action-btn" onClick={() => onOpenModal('wallet_deposit')}>
                              Transfer
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                        No member wallet records found for this filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 3: DISBURSEMENT APPROVAL REQUESTS */}
      {activeTab === 'disbursements' && (
        <div className="table-card mt-24">
          <div className="card-header border-b flex-between">
            <div>
              <h3 className="card-title">Worker Wallet Disbursement Requests</h3>
              <p style={{ fontSize: '12.5px', color: '#64748B', marginTop: '2px' }}>
                {isSuperAgent
                  ? 'Review, approve, or reject worker wallet payout requests submitted by field agents.'
                  : 'Track approval status of your worker wallet disbursement requests sent to Super Agent.'}
              </p>
            </div>
            {isAgent && (
              <button
                className="primary-btn sm-btn"
                onClick={() => setShowDisburseReqModal(true)}
              >
                <Send size={14} />
                <span>+ Request Disbursement</span>
              </button>
            )}
          </div>
          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Requesting Agent</th>
                  <th>Target Worker</th>
                  <th>Amount</th>
                  <th>Description</th>
                  <th>Requested Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '24px' }}>
                      <Loader2 size={18} className="spinner" style={{ marginRight: '8px' }} /> Loading disbursement requests...
                    </td>
                  </tr>
                ) : disbursementRequests.length > 0 ? (
                  disbursementRequests.map((req: any) => (
                    <tr key={req.id}>
                      <td><span className="code-badge">REQ-{req.id}</span></td>
                      <td><span className="user-name-bold">{req.agent?.name || 'Field Agent'}</span></td>
                      <td>
                        <span className="user-name-bold">{req.worker?.name || 'Worker'}</span>
                        <span className="user-sub-email">{req.worker?.employeeCode || `WRK-${req.workerId}`}</span>
                      </td>
                      <td><span className="currency-bold text-green">₹ {req.amount?.toLocaleString('en-IN')}</span></td>
                      <td>{req.description || 'Worker Wage Payout'}</td>
                      <td>{new Date(req.createdAt).toLocaleDateString()}</td>
                      <td>
                        <span
                          className={`badge ${
                            req.status === 'APPROVED'
                              ? 'badge-approved'
                              : req.status === 'REJECTED'
                              ? 'badge-rejected'
                              : 'badge-pending'
                          }`}
                        >
                          {req.status}
                        </span>
                      </td>
                      <td>
                        {isSuperAgent && req.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              className="sm-btn btn-success"
                              style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                              disabled={processingReqId === req.id}
                              onClick={() => handleApproveDisbursement(req.id)}
                            >
                              {processingReqId === req.id ? (
                                <Loader2 size={12} className="spinner" />
                              ) : (
                                <>
                                  <CheckCircle2 size={12} />
                                  <span>Approve</span>
                                </>
                              )}
                            </button>
                            <button
                              className="text-action-btn"
                              style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600 }}
                              disabled={processingReqId === req.id}
                              onClick={() => handleRejectDisbursement(req.id)}
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>
                            {req.status === 'PENDING' ? 'Awaiting Approval' : 'Processed'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '36px 24px' }}>
                      No wallet disbursement requests found in database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AGENT REQUEST DISBURSEMENT APPROVAL MODAL */}
      {showDisburseReqModal && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal-content">
            <div className="wallet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Send size={20} style={{ color: '#2563EB' }} />
                <h3>Request Worker Wallet Disbursement Approval</h3>
              </div>
              <button className="wallet-modal-close-btn" onClick={() => setShowDisburseReqModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleRequestDisbursement}>
              <div className="wallet-modal-body">
                <div style={{ backgroundColor: '#EFF6FF', padding: '12px 16px', borderRadius: '8px', border: '1px solid #BFDBFE' }}>
                  <span style={{ fontSize: '12.5px', color: '#1E40AF', fontWeight: 600 }}>
                    Requests submitted here require Super Agent approval before funds are deposited into worker wallets.
                  </span>
                </div>

                <div className="wallet-form-group">
                  <label>Select Target Worker *</label>
                  <select
                    value={reqWorkerId}
                    onChange={(e) => setReqWorkerId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Worker --</option>
                    {workersList.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.employeeCode || `WRK-${w.id}`}) - {w.designation}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wallet-form-group">
                  <label>Disbursement Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount (e.g. 2500)"
                    value={reqAmount}
                    onChange={(e) => setReqAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="wallet-form-group">
                  <label>Purpose / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Daily wage payout / Overtime allowance"
                    value={reqDescription}
                    onChange={(e) => setReqDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="wallet-modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowDisburseReqModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmittingReq}
                >
                  {isSubmittingReq ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                  <span>Submit Request for Approval</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPER AGENT ASSIGN AMOUNT TO AGENT MODAL */}
      {showAssignAgentModal && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal-content">
            <div className="wallet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <PlusCircle size={20} style={{ color: '#059669' }} />
                <h3>Assign Wallet Amount to Field Agent</h3>
              </div>
              <button className="wallet-modal-close-btn" onClick={() => setShowAssignAgentModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAssignAgentFunds}>
              <div className="wallet-modal-body">
                <div style={{ backgroundColor: '#ECFDF5', padding: '12px 16px', borderRadius: '8px', border: '1px solid #A7F3D0' }}>
                  <span style={{ fontSize: '12.5px', color: '#065F46', fontWeight: 600 }}>
                    As Super Agent, credit funds directly to a field agent's wallet budget.
                  </span>
                </div>

                <div className="wallet-form-group">
                  <label>Select Target Field Agent *</label>
                  <select
                    value={targetAgentId}
                    onChange={(e) => setTargetAgentId(e.target.value)}
                    required
                  >
                    <option value="">-- Choose Field Agent --</option>
                    {agentsList.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.employeeCode || `AGT-${a.id}`}) - {a.designation || 'Agent'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="wallet-form-group">
                  <label>Allocation Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Enter amount (e.g. 50000)"
                    value={assignAmount}
                    onChange={(e) => setAssignAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="wallet-form-group">
                  <label>Allocation Reason / Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Site B Payroll Pool Allocation"
                    value={assignDescription}
                    onChange={(e) => setAssignDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className="wallet-modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowAssignAgentModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                  disabled={isSubmittingAssign}
                >
                  {isSubmittingAssign ? <Loader2 size={16} className="spinner" /> : <PlusCircle size={16} />}
                  <span>Credit Agent Wallet</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WITHDRAWAL / TRANSFER MODAL FOR AGENT */}
      {showWithdrawModal && (
        <div className="wallet-modal-overlay">
          <div className="wallet-modal-content">
            <div className="wallet-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CreditCard size={20} style={{ color: '#4F46E5' }} />
                <h3>Request Agent Wallet Withdrawal</h3>
              </div>
              <button className="wallet-modal-close-btn" onClick={() => setShowWithdrawModal(false)}>
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleAgentWithdraw}>
              <div className="wallet-modal-body">
                <div style={{ backgroundColor: '#EEF2FF', padding: '12px 16px', borderRadius: '8px', border: '1px solid #C7D2FE' }}>
                  <span style={{ fontSize: '13px', color: '#4338CA', fontWeight: 600 }}>
                    Available Personal Balance: ₹ {personalWalletBalance.toLocaleString('en-IN')}
                  </span>
                </div>

                <div className="wallet-form-group">
                  <label>Withdrawal Amount (₹)*</label>
                  <input
                    type="number"
                    min="1"
                    max={personalWalletBalance}
                    placeholder="Enter amount (e.g. 5000)"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="wallet-form-group">
                  <label>Bank Account / UPI ID*</label>
                  <input
                    type="text"
                    placeholder="e.g. agent@okicici or 9876543210@upi or HDFC0001234"
                    value={withdrawAccount}
                    onChange={(e) => setWithdrawAccount(e.target.value)}
                    required
                  />
                </div>

                <div className="wallet-form-group">
                  <label>Payout Reason / Description</label>
                  <select
                    value={withdrawDescription}
                    onChange={(e) => setWithdrawDescription(e.target.value)}
                  >
                    <option value="Bank Wire Transfer">Bank Wire Transfer</option>
                    <option value="Weekly Allowance Payout">Weekly Allowance Payout</option>
                    <option value="Field Commission Withdrawal">Field Commission Withdrawal</option>
                    <option value="Emergency Cash Payout">Emergency Cash Payout</option>
                  </select>
                </div>
              </div>

              <div className="wallet-modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowWithdrawModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={isSubmittingWithdraw}
                >
                  {isSubmittingWithdraw ? <Loader2 size={16} className="spinner" /> : <Send size={16} />}
                  <span>Confirm Withdrawal</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
