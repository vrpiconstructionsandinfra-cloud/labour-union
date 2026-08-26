import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, Download, CheckCircle, Clock, ShieldAlert, Loader2 } from 'lucide-react';
import { fetchPayrollsApi, fetchWorkersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import type { User as UserType, WorkerItem } from '../types';
import './Pages.css';

interface PayrollPageProps {
  user?: UserType | null;
  onOpenModal: (type: string) => void;
  refreshTrigger?: number;
}

export const PayrollPage: React.FC<PayrollPageProps> = ({ user, onOpenModal, refreshTrigger }) => {
  const { role } = useAuth();
  const [payrolls, setPayrolls] = useState<any[]>([]);
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isAgentOrSuperAgent = role === 'SUPER_AGENT' || role === 'AGENT';

  const loadData = () => {
    if (isAgentOrSuperAgent) {
      setIsLoading(true);
      Promise.all([
        fetchPayrollsApi().catch(() => []),
        fetchWorkersApi().catch(() => [])
      ]).then(([payrollData, workerData]) => {
        const isAgent = role === 'AGENT';
        
        let filteredWorkers = workerData;
        if (isAgent && user?.id) {
          filteredWorkers = workerData.filter(
            (w: any) => String(w.assignedAgentId || w.agentId) === String(user.id) || w.agentName === user.name
          );
        }
        setWorkers(filteredWorkers.length > 0 ? filteredWorkers : workerData);

        const assignedWorkerIds = new Set(filteredWorkers.map((w: any) => String(w.id)));
        const assignedWorkerNames = new Set(filteredWorkers.map((w: any) => (w.name || '').toLowerCase()));

        let filteredPayrolls = payrollData;
        if (isAgent && user?.id && assignedWorkerIds.size > 0) {
          filteredPayrolls = payrollData.filter((p: any) => {
            const wId = String(p.workerId || p.worker?.id || '');
            const wName = (p.worker?.name || p.workerName || '').toLowerCase();
            return assignedWorkerIds.has(wId) || assignedWorkerNames.has(wName);
          });
        }

        setPayrolls(filteredPayrolls.length > 0 ? filteredPayrolls : payrollData);
        setIsLoading(false);
      });
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handleUpdate = () => {
      loadData();
    };

    socket.on('payroll:updated', handleUpdate);
    socket.on('wallet:updated', handleUpdate);
    socket.on('notification', handleUpdate);

    return () => {
      socket.off('payroll:updated', handleUpdate);
      socket.off('wallet:updated', handleUpdate);
      socket.off('notification', handleUpdate);
    };
  }, [refreshTrigger, role, user]);

  if (!isAgentOrSuperAgent) {
    return (
      <div className="page-wrapper animate-fade-in" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <div className="stat-box-card border-amber" style={{ maxWidth: '600px', margin: '40px auto', padding: '32px' }}>
          <ShieldAlert size={48} className="text-amber" style={{ margin: '0 auto 16px auto', display: 'block' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>Payroll Access Restricted</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6 }}>
            System payroll processing and worker wage disbursal is restricted to <strong>Field Agents</strong> and <strong>Super Agents</strong> only.
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>
            As a labor worker, you can review your earnings and available balance on the <strong>Union Digital Wallet</strong> page.
          </p>
        </div>
      </div>
    );
  }

  // Calculate exact database totals
  const totalPaid = payrolls.reduce((sum, p) => sum + (p.status === 'PAID' ? (p.netAmount || 0) : 0), 0);
  
  // Calculate total gross from database payment records or worker base monthly salaries
  const baseSalarySum = workers.reduce((sum, w) => sum + (w.dailyWage ? w.dailyWage * 30 : 25500), 0);
  const totalGrossFromPayments = payrolls.reduce((sum, p) => sum + (p.basicAmount || 0) + (p.overtimeAmount || 0) + (p.bonus || 0), 0);
  const totalGross = totalGrossFromPayments > 0 ? totalGrossFromPayments : baseSalarySum;

  const totalPending = payrolls.reduce((sum, p) => sum + (p.status === 'PENDING' ? (p.netAmount || 0) : 0), 0);

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>{role === 'AGENT' ? 'My Assigned Workers Payroll & Wages' : 'Enterprise Payroll & Wages'}</h2>
          <p>
            {role === 'AGENT'
              ? 'Generate weekly payrolls, view payslips, and manage wage disbursals for workers assigned to your agent supervision.'
              : 'Generate weekly payrolls, view system-wide payslips, bonus calculations, and insurance deductions.'}
          </p>
        </div>
        <button className="primary-btn" onClick={() => onOpenModal('generate_payroll')}>
          <Plus size={16} />
          <span>Generate Payroll</span>
        </button>
      </div>

      <div className="stats-row-3">
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Total Gross Payroll</span>
            <CreditCard size={18} className="text-blue" />
          </div>
          <span className="stat-number">
            ₹ {Math.round(totalGross).toLocaleString('en-IN')}
          </span>
          <span className="stat-sub">{role === 'AGENT' ? 'Assigned Workers Total' : 'Monthly Allocation'}</span>
        </div>

        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Paid Amount</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">
            ₹ {Math.round(totalPaid).toLocaleString('en-IN')}
          </span>
          <span className="stat-sub">Disbursed to Wallets</span>
        </div>

        <div className="stat-box-card border-red">
          <div className="stat-header">
            <span>Pending Disbursement</span>
            <Clock size={18} className="text-red" />
          </div>
          <span className="stat-number">
            ₹ {Math.round(totalPending).toLocaleString('en-IN')}
          </span>
          <span className="stat-sub">Awaiting Processing</span>
        </div>
      </div>

      <div className="table-card mt-24">
        <div className="card-header border-b flex-between">
          <h3 className="card-title">
            {role === 'AGENT' ? 'Payslips & Wage Disbursals for Assigned Workers' : 'Recent Payslips & Disbursements'}
          </h3>
          <button className="secondary-btn" onClick={() => alert('Exporting CSV report for payroll...')}>
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Week Range</th>
                <th>Basic Salary</th>
                <th>Overtime Bonus</th>
                <th>Insurance Deduction</th>
                <th>Net Paid</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '24px' }}>
                    <Loader2 size={18} className="spinner" style={{ marginRight: '8px' }} /> Loading payroll records...
                  </td>
                </tr>
              ) : payrolls.length > 0 ? (
                payrolls.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <span className="user-name-bold">
                        {p.worker?.name || `Worker #${p.workerId}`}
                      </span>{' '}
                      ({p.worker?.employeeCode || `WRK-00${p.workerId}`})
                    </td>
                    <td>{new Date(p.weekStart).toLocaleDateString()} - {new Date(p.weekEnd).toLocaleDateString()}</td>
                    <td>₹ {Math.round(p.basicAmount || 5500).toLocaleString('en-IN')}</td>
                    <td>₹ {Math.round(p.overtimeAmount || 1200).toLocaleString('en-IN')}</td>
                    <td>- ₹ {Math.round(p.insuranceDeduction || 250)}</td>
                    <td><span className="currency-bold text-green">₹ {Math.round(p.netAmount || 6600).toLocaleString('en-IN')}</span></td>
                    <td>
                      <span className={`badge ${p.status === 'PAID' ? 'badge-approved' : 'badge-pending'}`}>
                        {p.status || 'PAID'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    {role === 'AGENT'
                      ? 'No payroll records generated yet for your assigned workers. Click "+ Generate Payroll" above to run payroll.'
                      : 'No payroll records found in the database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
