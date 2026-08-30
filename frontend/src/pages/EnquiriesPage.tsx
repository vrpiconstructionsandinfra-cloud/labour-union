import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Search,
  RefreshCw,
  Trash2,
  Phone,
  Mail,
  MapPin,
  Clock,
  UserCheck,
  Users,
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';
import { fetchEnquiriesApi, updateEnquiryStatusApi, deleteEnquiryApi, type EnquiryItem } from '../services/api';
import './EnquiriesPage.css';

export const EnquiriesPage: React.FC = () => {
  const [enquiries, setEnquiries] = useState<EnquiryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [designationFilter, setDesignationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadEnquiries = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    setErrorMsg(null);

    try {
      const data = await fetchEnquiriesApi({
        designation: designationFilter,
        status: statusFilter,
        search: searchTerm,
      });
      setEnquiries(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load enquiries');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEnquiries();
  }, [designationFilter, statusFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadEnquiries();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleStatusChange = async (id: number, newStatus: string) => {
    try {
      await updateEnquiryStatusApi(id, newStatus);
      setEnquiries((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: newStatus as any } : item))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the enquiry from ${name}?`)) {
      return;
    }
    try {
      await deleteEnquiryApi(id);
      setEnquiries((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete enquiry');
    }
  };

  // Metrics
  const totalCount = enquiries.length;
  const workerCount = enquiries.filter((e) => e.designation === 'WORKER').length;
  const agentCount = enquiries.filter((e) => e.designation === 'AGENT').length;
  const newCount = enquiries.filter((e) => e.status === 'NEW' || e.status === 'PENDING').length;

  return (
    <div className="enquiries-page-container">
      {/* Page Header */}
      <div className="enquiries-header-row">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="enquiries-header-icon-box">
              <FileSpreadsheet size={22} color="#2563EB" />
            </div>
            <div>
              <h1 className="enquiries-page-title">Candidate Enquiries</h1>
              <p className="enquiries-page-subtitle">
                Review and follow up with candidate enquiries submitted for Worker and Agent roles.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadEnquiries(true)}
          className="enquiries-refresh-btn"
          disabled={isRefreshing}
        >
          <RefreshCw size={16} className={isRefreshing ? 'spinner' : ''} />
          <span>Refresh Leads</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="enquiries-metrics-grid">
        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap blue">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <span className="metric-label">Total Enquiries</span>
            <h3 className="metric-value">{totalCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap amber">
            <Clock size={20} />
          </div>
          <div>
            <span className="metric-label">New / Action Required</span>
            <h3 className="metric-value">{newCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap cyan">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="metric-label">Worker Enquiries</span>
            <h3 className="metric-value">{workerCount}</h3>
          </div>
        </div>

        <div className="enquiry-metric-card">
          <div className="metric-icon-wrap purple">
            <Users size={20} />
          </div>
          <div>
            <span className="metric-label">Agent Enquiries</span>
            <h3 className="metric-value">{agentCount}</h3>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="enquiries-toolbar">
        <div className="enquiries-search-wrap">
          <Search size={17} color="#64748B" />
          <input
            type="text"
            placeholder="Search by name, phone, email, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="enquiries-search-input"
          />
        </div>

        <div className="enquiries-filter-group">
          <div className="select-with-icon">
            <Filter size={15} color="#64748B" />
            <select
              value={designationFilter}
              onChange={(e) => setDesignationFilter(e.target.value)}
              className="enquiry-filter-select"
            >
              <option value="ALL">All Roles</option>
              <option value="WORKER">Workers Only (👷)</option>
              <option value="AGENT">Agents Only (👔)</option>
            </select>
          </div>

          <div className="select-with-icon">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="enquiry-filter-select"
            >
              <option value="ALL">All Statuses</option>
              <option value="NEW">⚡ New</option>
              <option value="CONTACTED">📞 Contacted</option>
              <option value="CONVERTED">✓ Converted</option>
              <option value="REJECTED">✕ Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMsg && (
        <div className="enquiries-error-alert">
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Table Card */}
      <div className="enquiries-table-card">
        {isLoading ? (
          <div className="enquiries-loading-state">
            <RefreshCw size={28} className="spinner" color="#2563EB" />
            <p>Loading candidate enquiries from database...</p>
          </div>
        ) : enquiries.length === 0 ? (
          <div className="enquiries-empty-state">
            <FileSpreadsheet size={48} color="#94A3B8" />
            <h3>No enquiries found</h3>
            <p>
              {searchTerm || designationFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'No candidate enquiries match your filter criteria.'
                : 'New enquiries submitted from the login page will appear here.'}
            </p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="enquiries-data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Designation</th>
                  <th>Contact Number</th>
                  <th>Email Address</th>
                  <th>Address</th>
                  <th>Submitted On</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((item) => {
                  const dateStr = new Date(item.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <tr key={item.id}>
                      {/* Candidate Name */}
                      <td>
                        <div className="candidate-name-cell">
                          <div className={`candidate-avatar ${item.designation.toLowerCase()}`}>
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="candidate-full-name">{item.name}</span>
                            <span className="candidate-id-sub">Lead #{item.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Designation */}
                      <td>
                        {item.designation === 'AGENT' ? (
                          <span className="designation-badge agent">
                            👔 Field Agent
                          </span>
                        ) : (
                          <span className="designation-badge worker">
                            👷 Union Worker
                          </span>
                        )}
                      </td>

                      {/* Contact Phone */}
                      <td>
                        <a href={`tel:${item.phone}`} className="contact-link">
                          <Phone size={13} color="#2563EB" />
                          <span>{item.phone}</span>
                        </a>
                      </td>

                      {/* Email */}
                      <td>
                        {item.email ? (
                          <a href={`mailto:${item.email}`} className="contact-link">
                            <Mail size={13} color="#64748B" />
                            <span>{item.email}</span>
                          </a>
                        ) : (
                          <span className="text-muted-dash">—</span>
                        )}
                      </td>

                      {/* Address */}
                      <td>
                        {item.address ? (
                          <div className="address-text" title={item.address}>
                            <MapPin size={13} color="#64748B" style={{ flexShrink: 0 }} />
                            <span>{item.address}</span>
                          </div>
                        ) : (
                          <span className="text-muted-dash">—</span>
                        )}
                      </td>

                      {/* Date */}
                      <td>
                        <div className="date-cell">
                          <Calendar size={13} color="#64748B" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td>
                        <select
                          value={item.status}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className={`status-dropdown-pill ${item.status.toLowerCase()}`}
                        >
                          <option value="NEW">⚡ New</option>
                          <option value="CONTACTED">📞 Contacted</option>
                          <option value="CONVERTED">✓ Converted</option>
                          <option value="REJECTED">✕ Rejected</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id, item.name)}
                          className="action-delete-btn"
                          title="Delete Enquiry"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
