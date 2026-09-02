import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle, Clock, ShieldAlert, DollarSign, Calendar } from 'lucide-react';
import { fetchPayrollsApi, fetchWorkersApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { getSocket } from '../services/socket';
import type { User as UserType, WorkerItem } from '../types';
import {
  ListHeader,
  StatusBadge,
  MobileListCard,
  ResponsivePagination,
  ListEmptyState,
  ListLoadingState
} from '../components/common';
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
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isAgentOrSuperAgent = role === 'SUPER_AGENT' || role === 'AGENT';

  const loadData = () => {
    if (isAgentOrSuperAgent) {
      setIsLoading(true);
      Promise.all([
        fetchPayrollsApi().catch(() => []),
        fetchWorkersApi().catch(() => [])
      ])
        .then(([payrollData, workerData]) => {
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
        })
        .finally(() => setIsLoading(false));
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

  const filteredPayrolls = payrolls.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const wName = (p.worker?.name || p.workerName || '').toLowerCase();
    const wCode = (p.worker?.employeeCode || '').toLowerCase();
    return wName.includes(term) || wCode.includes(term);
  });

  const totalPaid = payrolls.reduce((sum, p) => sum + (p.status === 'PAID' ? (p.netAmount || 0) : 0), 0);
  const baseSalarySum = workers.reduce((sum, w) => sum + (w.dailyWage ? w.dailyWage * 30 : 25500), 0);
  const totalGrossFromPayments = payrolls.reduce((sum, p) => sum + (p.basicAmount || 0) + (p.overtimeAmount || 0) + (p.bonus || 0), 0);
  const totalGross = totalGrossFromPayments > 0 ? totalGrossFromPayments : baseSalarySum;
  const totalPending = payrolls.reduce((sum, p) => sum + (p.status === 'PENDING' ? (p.netAmount || 0) : 0), 0);

  const totalItems = filteredPayrolls.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedPayrolls = filteredPayrolls.slice(startIndex, endIndex);

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Standardized Header */}
      <ListHeader
        title={role === 'AGENT' ? 'Worker Payroll & Wages' : 'Enterprise Payroll & Wage Disbursals'}
        subtitle={
          role === 'AGENT'
            ? 'Generate weekly payrolls, view payslips, and manage wage disbursals for assigned workers.'
            : 'Enterprise wage logs, bonus calculations, and worker insurance deductions.'
        }
        badgeCount={totalItems}
        searchQuery={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Search payroll by worker name or employee code..."
        onExport={() => alert('Exporting payroll CSV data...')}
        exportLabel="Export CSV"
        primaryActionLabel="Generate Payroll"
        primaryActionIcon={<Plus size={16} />}
        onPrimaryAction={() => onOpenModal('generate_payroll')}
      />

      {/* Metrics Summary Row */}
      <div className="responsive-metrics-grid" style={{ marginBottom: '16px' }}>
        <div className="stat-box-card border-blue">
          <div className="stat-header">
            <span>Total Gross Payroll</span>
            <CreditCard size={18} className="text-blue" />
          </div>
          <span className="stat-number">
            ₹ {Math.round(totalGross).toLocaleString('en-IN')}
          </span>
          <span className="stat-sub">{role === 'AGENT' ? 'Assigned Workers' : 'Monthly Allocation'}</span>
        </div>

        <div className="stat-box-card border-green">
          <div className="stat-header">
            <span>Disbursed Wages</span>
            <CheckCircle size={18} className="text-green" />
          </div>
          <span className="stat-number">
            ₹ {Math.round(totalPaid).toLocaleString('en-IN')}
          </span>
          <span className="stat-sub">Paid to Digital Wallets</span>
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

      {isLoading ? (
        <ListLoadingState message="Loading payroll records..." rows={5} />
      ) : filteredPayrolls.length === 0 ? (
        <ListEmptyState
          isSearchOrFilter={Boolean(searchTerm)}
          onClearFilters={() => setSearchTerm('')}
          primaryActionLabel="Generate Payroll"
          onPrimaryAction={() => onOpenModal('generate_payroll')}
        />
      ) : (
        <>
          {/* DESKTOP TABLE VIEW (≥ 768px) */}
          <div className="table-desktop-view">
            <div className="table-card">
              <div className="table-responsive">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Worker</th>
                      <th>Pay Period</th>
                      <th>Basic Salary</th>
                      <th>Overtime Bonus</th>
                      <th>Deductions</th>
                      <th>Net Paid</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayrolls.map((p) => {
                      const workerName = p.worker?.name || p.workerName || `Worker #${p.workerId}`;
                      const workerCode = p.worker?.employeeCode || `WRK-00${p.workerId}`;
                      const weekStartStr = p.weekStart ? new Date(p.weekStart).toLocaleDateString('en-IN') : '1 Aug 2026';
                      const weekEndStr = p.weekEnd ? new Date(p.weekEnd).toLocaleDateString('en-IN') : '7 Aug 2026';

                      return (
                        <tr key={p.id}>
                          <td>
                            <span className="user-name-bold">{workerName}</span>{' '}
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({workerCode})</span>
                          </td>
                          <td>{weekStartStr} → {weekEndStr}</td>
                          <td>₹ {Math.round(p.basicAmount || 5500).toLocaleString('en-IN')}</td>
                          <td>+ ₹ {Math.round(p.overtimeAmount || 1200).toLocaleString('en-IN')}</td>
                          <td style={{ color: '#DC2626' }}>- ₹ {Math.round(p.insuranceDeduction || 250)}</td>
                          <td>
                            <strong className="currency-bold text-green">₹ {Math.round(p.netAmount || 6600).toLocaleString('en-IN')}</strong>
                          </td>
                          <td>
                            <StatusBadge status={p.status || 'PAID'} size="sm" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="card-mobile-view">
            {paginatedPayrolls.map((p) => {
              const workerName = p.worker?.name || p.workerName || `Worker #${p.workerId}`;
              const workerCode = p.worker?.employeeCode || `WRK-00${p.workerId}`;
              const weekStartStr = p.weekStart ? new Date(p.weekStart).toLocaleDateString('en-IN') : '1 Aug';
              const weekEndStr = p.weekEnd ? new Date(p.weekEnd).toLocaleDateString('en-IN') : '7 Aug';

              return (
                <MobileListCard
                  key={p.id}
                  avatarName={workerName}
                  title={workerName}
                  subtitle={workerCode}
                  status={p.status || 'PAID'}
                  metaRows={[
                    {
                      label: 'Net Wage',
                      value: `₹ ${Math.round(p.netAmount || 6600).toLocaleString('en-IN')}`,
                      icon: <DollarSign size={13} color="#059669" />
                    },
                    {
                      label: 'Period',
                      value: `${weekStartStr} – ${weekEndStr}`,
                      icon: <Calendar size={13} color="#64748B" />
                    },
                    {
                      label: 'Basic / OT',
                      value: `₹ ${Math.round(p.basicAmount || 5500)} / +₹ ${Math.round(p.overtimeAmount || 0)}`
                    }
                  ]}
                />
              );
            })}
          </div>

          {/* Responsive Pagination */}
          <ResponsivePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </>
      )}
    </div>
  );
};
