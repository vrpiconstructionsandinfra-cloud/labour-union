import React, { useState, useEffect } from 'react';
import { Plus, Search, Loader2, UserPlus, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWorkersApi, deleteUserApi, assignWorkerToAgentApi, removeWorkerFromAgentApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import type { WorkerItem } from '../types';
import { UserAvatar } from '../components/UserAvatar';
import { WorkerDetailsModal } from '../components/WorkerDetailsModal';
import './Pages.css';

interface WorkersPageProps {
  onOpenModal: (type: string) => void;
  onOpenEditWorkerModal?: (worker: WorkerItem) => void;
  refreshTrigger?: number;
}

export const WorkersPage: React.FC<WorkersPageProps> = ({ onOpenModal, onOpenEditWorkerModal, refreshTrigger }) => {
  const { user, role } = useAuth();
  const [workers, setWorkers] = useState<WorkerItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [skillFilter, setSkillFilter] = useState('All Skill Types');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assigningWorkerId, setAssigningWorkerId] = useState<string | null>(null);
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState<WorkerItem | null>(null);

  // Pagination & Limit State
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const isSuperAgent = role === 'SUPER_AGENT';

  const loadWorkers = () => {
    fetchWorkersApi()
      .then((data) => setWorkers(data))
      .catch(() => {});
  };

  useEffect(() => {
    loadWorkers();
  }, [refreshTrigger, role]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, skillFilter, itemsPerPage]);

  const handleDeleteWorker = async (workerId: string, workerName: string) => {
    if (!window.confirm(`Are you sure you want to delete worker "${workerName}" from the system?`)) {
      return;
    }

    setDeletingId(workerId);
    try {
      await deleteUserApi(workerId);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete worker');
    } finally {
      setDeletingId(null);
    }
  };

  const handleAssignToMe = async (worker: WorkerItem) => {
    if (!user?.id) return;
    setAssigningWorkerId(worker.id);
    try {
      await assignWorkerToAgentApi(worker.id, user.id);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to assign worker to your account');
    } finally {
      setAssigningWorkerId(null);
    }
  };

  const handleUnassignFromMe = async (worker: WorkerItem) => {
    if (!window.confirm(`Are you sure you want to unassign "${worker.name}" from your agent account?`)) return;
    setAssigningWorkerId(worker.id);
    try {
      await removeWorkerFromAgentApi(worker.id);
      loadWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to unassign worker');
    } finally {
      setAssigningWorkerId(null);
    }
  };

  const filtered = workers.filter(w => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      w.designation.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkill =
      skillFilter === 'All Skill Types' ||
      w.designation.toLowerCase().includes(skillFilter.toLowerCase());

    return matchesSearch && matchesSkill;
  });

  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedWorkers = filtered.slice(startIndex, endIndex);

  const getPageTitle = () => {
    if (role === 'AGENT') return 'Workers';
    if (role === 'WORKER') return 'My Team Workers';
    return 'All Union Workers Directory';
  };

  const getPageSubtitle = () => {
    if (role === 'AGENT') return 'Directory of registered labor union workers assigned under your direct field agent supervision.';
    if (role === 'WORKER') return 'List of labor union workers under your field agent supervisor.';
    return 'Enterprise directory of all registered labor union workers, assigned agents, and site allocations.';
  };

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>{getPageTitle()}</h2>
          <p>{getPageSubtitle()}</p>
        </div>
        {!isSuperAgent && (
          <button className="primary-btn" onClick={() => onOpenModal('add_worker')}>
            <Plus size={16} />
            <span>Register New Worker</span>
          </button>
        )}
      </div>

      <div className="filter-bar">
        <div className="search-input-wrap">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search workers by name, ID code, skill designation..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="select-dropdown"
          value={skillFilter}
          onChange={(e) => setSkillFilter(e.target.value)}
        >
          <option>All Skill Types</option>
          <option>Mason</option>
          <option>Electrician</option>
          <option>Welder</option>
          <option>Helper</option>
        </select>
      </div>

      <div className="table-card">
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Worker</th>
                <th>Employee ID</th>
                <th>Contact Info</th>
                <th>Designation</th>
                <th>Site Allocated</th>
                <th>Assigned Agent</th>
                <th>Daily Wage</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {paginatedWorkers.length > 0 ? (
                paginatedWorkers.map((worker) => (
                  <tr key={worker.id}>
                    <td>
                      <div
                        className="table-user-cell"
                        onClick={() => window.open(`/worker-details?id=${worker.id}`, '_blank')}
                        style={{ cursor: 'pointer' }}
                        title="Click to view complete worker details in a new tab (Aadhaar, PAN, Bank, PF, Form 16, Passport, Address)"
                      >
                        <UserAvatar src={worker.avatar} name={worker.name} />
                        <div>
                          <span className="user-name-bold" style={{ color: '#2563EB', textDecoration: 'underline' }}>{worker.name}</span>
                        </div>
                      </div>
                    </td>
                    <td><span className="code-badge">{worker.employeeCode}</span></td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span className="user-sub-email" style={{ fontWeight: 600, color: '#334155' }}>
                          ✉️ {worker.email}
                        </span>
                        <span style={{ fontSize: '12px', color: '#2563EB', fontWeight: 600 }}>
                          📞 {worker.phone || '+91 9811111111'}
                        </span>
                      </div>
                    </td>
                    <td><span className="badge badge-casual">{worker.designation}</span></td>
                    <td>{worker.siteName}</td>
                    <td><span className="user-name-bold">{worker.agentName}</span></td>
                    <td><span className="currency-bold">₹ {worker.dailyWage}/day</span></td>
                    <td><span className="badge badge-approved">{worker.status}</span></td>
                    <td>
                      <div className="action-buttons-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          className="secondary-btn sm-btn"
                          style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE' }}
                          onClick={() => window.open(`/worker-details?id=${worker.id}`, '_blank')}
                          title="Open details in new tab"
                        >
                          Details ↗
                        </button>

                        {isSuperAgent ? (
                          <span style={{ fontSize: '12px', color: '#64748B', fontStyle: 'italic' }}>Read Only</span>
                        ) : role === 'AGENT' ? (
                          (() => {
                            const isAssignedToMe = worker.assignedAgentId === String(user?.id) || (user?.name && worker.agentName === user.name);
                            return (
                              <>
                                {isAssignedToMe ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span className="badge badge-casual" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: '11px', fontWeight: 700 }}>
                                      Assigned to You
                                    </span>
                                    <button
                                      className="text-action-btn"
                                      style={{ color: '#DC2626', fontSize: '12px', fontWeight: 600 }}
                                      disabled={assigningWorkerId === worker.id}
                                      onClick={() => handleUnassignFromMe(worker)}
                                      title="Unassign from my account"
                                    >
                                      {assigningWorkerId === worker.id ? <Loader2 size={12} className="spinner" /> : 'Unassign'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    className="primary-btn sm-btn"
                                    style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                    disabled={assigningWorkerId === worker.id}
                                    onClick={() => handleAssignToMe(worker)}
                                  >
                                    {assigningWorkerId === worker.id ? (
                                      <Loader2 size={12} className="spinner" />
                                    ) : (
                                      <>
                                        <UserPlus size={12} />
                                        <span>Assign to Me</span>
                                      </>
                                    )}
                                  </button>
                                )}

                                <button
                                  className="text-action-btn"
                                  style={{ color: '#2563EB', fontWeight: 600 }}
                                  onClick={() => {
                                    if (onOpenEditWorkerModal) {
                                      onOpenEditWorkerModal(worker);
                                    } else {
                                      onOpenModal('edit_worker');
                                    }
                                  }}
                                >
                                  Edit
                                </button>
                              </>
                            );
                          })()
                        ) : (
                          <>
                            <button
                              className="text-action-btn"
                              style={{ color: '#2563EB', fontWeight: 600 }}
                              onClick={() => {
                                if (onOpenEditWorkerModal) {
                                  onOpenEditWorkerModal(worker);
                                } else {
                                  onOpenModal('edit_worker');
                                }
                              }}
                            >
                              Edit
                            </button>
                            <button
                              className="text-action-btn"
                              style={{ color: '#DC2626', fontWeight: 600 }}
                              disabled={deletingId === worker.id}
                              onClick={() => handleDeleteWorker(worker.id, worker.name)}
                            >
                              {deletingId === worker.id ? (
                                <Loader2 size={13} className="spinner" />
                              ) : (
                                'Delete'
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px' }}>
                    {role === 'AGENT'
                      ? 'No workers currently assigned to your agent account. Click "+ Register New Worker" or assign workers.'
                      : 'No worker records found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Left / Right Pagination & Limit Selector Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-card)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Showing {totalItems > 0 ? startIndex + 1 : 0} to {endIndex} of {totalItems} workers
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>Show:</span>
              <select
                className="select-dropdown"
                value={itemsPerPage}
                onChange={(e) => setItemsPerPage(Number(e.target.value))}
                style={{ padding: '4px 10px', fontSize: '13px', width: 'auto' }}
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              className="secondary-btn sm-btn"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              style={{ opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', padding: '0 8px' }}>
              Page {currentPage} of {totalPages}
            </span>
            <button
              className="secondary-btn sm-btn"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              style={{ opacity: currentPage >= totalPages ? 0.5 : 1, cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
            >
              <span>Next</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Worker Detailed Profile Modal */}
      <WorkerDetailsModal
        isOpen={!!selectedWorkerForDetails}
        onClose={() => setSelectedWorkerForDetails(null)}
        worker={selectedWorkerForDetails}
        onEdit={onOpenEditWorkerModal}
      />
    </div>
  );
};
