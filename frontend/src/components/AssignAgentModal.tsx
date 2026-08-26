import React, { useState, useEffect } from 'react';
import { X, Search, Check, AlertCircle, CheckCircle2, Loader2, UserCheck, MapPin, Mail, Shield } from 'lucide-react';
import { fetchAgentsApi, assignWorkerToAgentApi } from '../services/api';
import type { AgentItem } from '../types';
import { UserAvatar } from './UserAvatar';
import './ActionModal.css';

interface AssignAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  workerId: string;
  workerName: string;
  onSuccessRefresh?: () => void;
}

export const AssignAgentModal: React.FC<AssignAgentModalProps> = ({
  isOpen,
  onClose,
  workerId,
  workerName,
  onSuccessRefresh
}) => {
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setSuccessMsg(null);
      setSelectedAgentId('');
      setSearchTerm('');
      setIsFetching(true);

      fetchAgentsApi()
        .then((data) => {
          setAgents(data || []);
          setIsFetching(false);
        })
        .catch((err: any) => {
          setIsFetching(false);
          setErrorMsg(err.message || 'Failed to fetch available agents from backend');
        });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredAgents = agents.filter((agent) => {
    const term = searchTerm.toLowerCase();
    return (
      agent.name.toLowerCase().includes(term) ||
      agent.employeeCode.toLowerCase().includes(term) ||
      (agent.email && agent.email.toLowerCase().includes(term)) ||
      (agent.assignedSite && agent.assignedSite.toLowerCase().includes(term))
    );
  });

  const handleAssign = async () => {
    if (!selectedAgentId) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      await assignWorkerToAgentApi(workerId, selectedAgentId);
      setIsSubmitting(false);
      setSuccessMsg(`✔ Successfully assigned ${workerName} to agent!`);

      if (onSuccessRefresh) {
        onSuccessRefresh();
      }

      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);

    } catch (err: any) {
      setIsSubmitting(false);
      setErrorMsg(err.message || 'Failed to assign worker to selected agent.');
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container animate-fade-in"
        style={{ maxWidth: '620px', width: '90%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="modal-header flex-between border-b">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <UserCheck size={20} color="#2563EB" />
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Assign Field Agent</h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>
                Target Worker: <strong>{workerName}</strong> (ID: #{workerId})
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} disabled={isSubmitting}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="modal-body" style={{ padding: '20px' }}>
          {/* Toast Error Banner */}
          {errorMsg && (
            <div className="toast-banner toast-error mb-16 animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Toast Success Banner */}
          {successMsg && (
            <div className="toast-banner toast-success mb-16 animate-fade-in" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Search Box */}
          <div className="search-input-wrap mb-16" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--card-bg)' }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="Search agents by name, ID code, email, or site..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={isFetching || isSubmitting}
              style={{ border: 'none', outline: 'none', background: 'transparent', width: '100%', fontSize: '13.5px' }}
            />
          </div>

          {/* Agent Selection Container */}
          {isFetching ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Loader2 size={24} className="spinner" style={{ margin: '0 auto 12px auto', display: 'block', color: '#2563EB' }} />
              <span>Fetching available agents from backend...</span>
            </div>
          ) : agents.length === 0 ? (
            <div style={{ padding: '36px 16px', textAlign: 'center', border: '1px dashed var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-secondary)' }}>
              <Shield size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 8px auto', display: 'block' }} />
              <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px' }}>No agents available.</span>
              <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                No active field agents registered in the database. Please register an agent first.
              </p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13.5px' }}>
              No matching agents found for "{searchTerm}".
            </div>
          ) : (
            <div style={{ maxHeight: '280px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
              {filteredAgents.map((agent) => {
                const isSelected = selectedAgentId === agent.id;
                return (
                  <div
                    key={agent.id}
                    onClick={() => !isSubmitting && setSelectedAgentId(agent.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 'var(--radius-md)',
                      border: isSelected ? '2px solid #2563EB' : '1px solid var(--border-color)',
                      backgroundColor: isSelected ? 'rgba(37, 99, 235, 0.05)' : 'var(--card-bg)',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <UserAvatar src={agent.avatar} name={agent.name} size={38} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-main)' }}>{agent.name}</span>
                          <span className="code-badge" style={{ fontSize: '11px', padding: '2px 6px' }}>{agent.employeeCode}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '14px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                          {agent.email && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={12} /> {agent.email}
                            </span>
                          )}
                          {agent.assignedSite && (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <MapPin size={12} /> {agent.assignedSite}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <div
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          border: isSelected ? '6px solid #2563EB' : '2px solid var(--border-color)',
                          backgroundColor: '#FFFFFF',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer flex-between border-t" style={{ padding: '16px 20px' }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="button"
            className="primary-btn"
            disabled={!selectedAgentId || isSubmitting || isFetching}
            onClick={handleAssign}
            style={{
              opacity: !selectedAgentId || isSubmitting || isFetching ? 0.5 : 1,
              cursor: !selectedAgentId || isSubmitting || isFetching ? 'not-allowed' : 'pointer'
            }}
          >
            {isSubmitting ? (
              <span className="btn-loading-content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={16} className="spinner" /> Assigning Agent...
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={16} /> Assign Agent
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
