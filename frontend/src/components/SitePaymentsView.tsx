import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Users,
  Search,
  CheckCircle2,
  Copy,
  Check,
  RefreshCw,
  Zap,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  TrendingUp
} from 'lucide-react';
import {
  fetchSitePaymentsApi,
  createSitePaymentApi,
  exportSitePaymentsExcelApi,
  fetchSitesApi,
  type SitePaymentItem
} from '../services/api';
import { useAuth } from '../context/AuthContext';
import { initiateRazorpayCheckout } from '../utils/razorpay';
import { getSocket } from '../services/socket';
import type { SiteItem } from '../types';
import './SitePaymentsView.css';

interface SitePaymentsViewProps {
  onNavigateTab?: (tab: string) => void;
}

export const SitePaymentsView: React.FC<SitePaymentsViewProps> = () => {
  const { user, role } = useAuth();
  const [payments, setPayments] = useState<SitePaymentItem[]>([]);
  const [sites, setSites] = useState<SiteItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form States (for Agent & Customer Support Agent)
  const [selectedSiteId, setSelectedSiteId] = useState<string>('');
  const [amount, setAmount] = useState<string>('5000');
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'QR_CODE' | 'CARD' | 'RAZORPAY'>('UPI');
  const [transactionRef, setTransactionRef] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');
  const [copiedUpi, setCopiedUpi] = useState<boolean>(false);
  const [copiedTxnId, setCopiedTxnId] = useState<string | null>(null);

  // Success Confirmation Modal State
  const [successPayment, setSuccessPayment] = useState<SitePaymentItem | null>(null);

  // Filter States (for Super Agent & History)
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterSiteId, setFilterSiteId] = useState<string>('ALL');
  const [filterMethod, setFilterMethod] = useState<string>('ALL');
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [paymentsList, sitesList] = await Promise.all([
        fetchSitePaymentsApi().catch(() => []),
        fetchSitesApi().catch(() => [])
      ]);

      setPayments(paymentsList);
      setSites(sitesList);

      // Default site selection for Agent
      if (role === 'AGENT' && user?.id) {
        const assignedSite = sitesList.find(
          (s: any) =>
            Number(s.id) === Number(user.siteId) ||
            Number((s as any).createdById) === Number(user.id) ||
            (s.siteAssignments && s.siteAssignments.some((sa: any) => Number(sa.agentId) === Number(user.id)))
        );
        if (assignedSite) {
          setSelectedSiteId(String(assignedSite.id));
        } else if (sitesList.length > 0) {
          setSelectedSiteId(String(sitesList[0].id));
        }
      } else if (sitesList.length > 0 && !selectedSiteId) {
        setSelectedSiteId(String(sitesList[0].id));
      }
    } catch (err: any) {
      console.error('Failed to load site payments:', err);
      setErrorMessage(err.message || 'Failed to load site payments');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const socket = getSocket();
    const handlePaymentUpdate = () => {
      loadData();
    };

    socket.on('sitePayment:created', handlePaymentUpdate);
    socket.on('sitePayment:updated', handlePaymentUpdate);

    return () => {
      socket.off('sitePayment:created', handlePaymentUpdate);
      socket.off('sitePayment:updated', handlePaymentUpdate);
    };
  }, [user?.id, role]);

  // Determine selectable sites for form
  const selectableSites = useMemo(() => {
    if (role === 'AGENT' && user?.id) {
      const filtered = sites.filter((s: any) => {
        const isDirect = Number(s.id) === Number(user.siteId);
        const isCreator = Number((s as any).createdById) === Number(user.id);
        const isAssignedUser = s.users && s.users.some((u: any) => Number(u.id) === Number(user.id));
        const isAssigned = s.siteAssignments && s.siteAssignments.some((sa: any) => Number(sa.agentId) === Number(user.id));
        return isDirect || isCreator || isAssignedUser || isAssigned;
      });
      return filtered.length > 0 ? filtered : sites;
    }
    return sites;
  }, [sites, role, user?.id, user?.siteId]);

  // Selected site object
  const activeSelectedSite = useMemo(() => {
    return sites.find((s) => String(s.id) === String(selectedSiteId)) || null;
  }, [sites, selectedSiteId]);

  // Determine assigned agent name for selected site
  const activeSiteSupervisor = useMemo(() => {
    if (!activeSelectedSite) return 'Unassigned Supervisor';
    if (role === 'AGENT' && user?.name) return user.name;
    const directUser = (activeSelectedSite as any).users?.find((u: any) => u.role === 'AGENT');
    if (directUser) return directUser.name;
    const assigned = (activeSelectedSite as any).siteAssignments?.[0]?.agent;
    if (assigned) return assigned.name;
    return activeSelectedSite.contactPerson || 'Site Supervisor';
  }, [activeSelectedSite, role, user]);

  // Dynamic UPI URL & QR
  const upiId = 'laborunion@upi';
  const payAmountNum = Number(amount) || 5000;
  const upiPayUrl = `upi://pay?pa=${upiId}&pn=Labor%20Union%20Management&am=${payAmountNum}&cu=INR&tn=Site%20Payment%20${activeSelectedSite?.siteCode || 'BILL'}`;
  const dynamicQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiPayUrl)}`;

  // Copy helper
  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleCopyTxn = (txn: string) => {
    navigator.clipboard.writeText(txn);
    setCopiedTxnId(txn);
    setTimeout(() => setCopiedTxnId(null), 2000);
  };

  // Submit Payment (UPI / QR / Offline Reference)
  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSiteId) {
      setErrorMessage('Please select a project site to pay for.');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErrorMessage('Please enter a valid payment amount (minimum ₹1).');
      return;
    }

    if (paymentMethod === 'CARD' || paymentMethod === 'RAZORPAY') {
      handleRazorpayPay();
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await createSitePaymentApi({
        siteId: Number(selectedSiteId),
        amount: Number(amount),
        paymentMethod: paymentMethod,
        upiTransactionId: transactionRef.trim() || undefined,
        transactionId: transactionRef.trim() || undefined,
        remarks: remarks.trim() || undefined
      });

      if (res.success && res.data) {
        setSuccessPayment(res.data);
        setTransactionRef('');
        setRemarks('');
        loadData();
      }
    } catch (err: any) {
      console.error('Payment error:', err);
      setErrorMessage(err.message || 'Payment processing failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Razorpay Checkout Flow for Card Payment
  const handleRazorpayPay = () => {
    const payAmt = Number(amount);
    if (!payAmt || payAmt <= 0) {
      setErrorMessage('Please enter a valid payment amount.');
      return;
    }
    if (!activeSelectedSite) {
      setErrorMessage('Please select a project site.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    initiateRazorpayCheckout({
      amount: payAmt,
      isINR: true,
      description: `Site Bill Payment - ${activeSelectedSite.siteName}`,
      prefill: {
        name: user?.name || 'Agent',
        email: user?.email || '',
        contact: user?.phone || ''
      },
      notes: {
        siteId: String(activeSelectedSite.id),
        siteName: activeSelectedSite.siteName,
        payerId: String(user?.id || '')
      },
      onSuccess: async (verifyRes, rawResponse) => {
        try {
          const res = await createSitePaymentApi({
            siteId: Number(activeSelectedSite.id),
            amount: payAmt,
            paymentMethod: 'CARD',
            razorpayPaymentId: rawResponse?.razorpay_payment_id || verifyRes.payment_id,
            razorpayOrderId: rawResponse?.razorpay_order_id || verifyRes.order_id,
            razorpaySignature: rawResponse?.razorpay_signature,
            transactionId: rawResponse?.razorpay_payment_id || verifyRes.payment_id,
            remarks: remarks.trim() || 'Paid via Razorpay Card Checkout'
          });

          if (res.success && res.data) {
            setSuccessPayment(res.data);
            setTransactionRef('');
            setRemarks('');
            loadData();
          }
        } catch (postErr: any) {
          setErrorMessage(postErr.message || 'Failed to save Razorpay payment record');
        } finally {
          setIsSubmitting(false);
        }
      },
      onFailure: (error) => {
        setIsSubmitting(false);
        setErrorMessage(error.message || 'Razorpay checkout cancelled or failed');
      }
    });
  };

  // Export Excel Audit Report
  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      await exportSitePaymentsExcelApi({
        siteId: filterSiteId !== 'ALL' ? filterSiteId : undefined,
        paymentMethod: filterMethod !== 'ALL' ? filterMethod : undefined,
        startDate: filterStartDate || undefined,
        endDate: filterEndDate || undefined,
        search: searchQuery || undefined
      });
    } catch (err: any) {
      alert(err.message || 'Failed to export Excel audit report');
    } finally {
      setIsExporting(false);
    }
  };

  // Summary Metrics calculations
  const totalAmountCollected = useMemo(() => {
    return payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  const upiCollected = useMemo(() => {
    return payments
      .filter((p) => p.paymentMethod === 'UPI' || p.paymentMethod === 'QR_CODE')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  const cardCollected = useMemo(() => {
    return payments
      .filter((p) => p.paymentMethod === 'CARD' || p.paymentMethod === 'RAZORPAY')
      .reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  }, [payments]);

  // Filtered Payments List
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.siteName.toLowerCase().includes(q) ||
        (p.siteAddress && p.siteAddress.toLowerCase().includes(q)) ||
        p.payerName.toLowerCase().includes(q) ||
        (p.assignedAgentName && p.assignedAgentName.toLowerCase().includes(q)) ||
        (p.transactionId && p.transactionId.toLowerCase().includes(q)) ||
        (p.upiTransactionId && p.upiTransactionId.toLowerCase().includes(q));

      if (!matchSearch) return false;

      if (filterSiteId !== 'ALL' && String(p.siteId) !== String(filterSiteId)) {
        return false;
      }

      if (filterMethod !== 'ALL' && p.paymentMethod !== filterMethod) {
        return false;
      }

      if (filterStartDate) {
        const pDate = new Date(p.createdAt).toISOString().split('T')[0];
        if (pDate < filterStartDate) return false;
      }

      if (filterEndDate) {
        const pDate = new Date(p.createdAt).toISOString().split('T')[0];
        if (pDate > filterEndDate) return false;
      }

      return true;
    });
  }, [payments, searchQuery, filterSiteId, filterMethod, filterStartDate, filterEndDate]);

  const isSuperAgent = role === 'SUPER_AGENT';

  return (
    <div className="site-payments-view">
      
      {/* Top Header Card */}
      <div className="site-payments-header">
        <div className="site-payments-title-group">
          <h1>
            <CreditCard size={24} color="#2563EB" />
            <span>{isSuperAgent ? 'Site Payments Received & Audit' : 'Site Payments & Bill Pay'}</span>
          </h1>
          <p>
            {isSuperAgent
              ? 'Complete ledger of all site maintenance, electricity, water, and fee transactions.'
              : 'Submit site payments via UPI, QR Scan, or Card/Razorpay with automated transaction tracking.'}
          </p>
        </div>

        <div className="site-payments-actions-row">
          <button
            type="button"
            className="secondary-btn"
            onClick={loadData}
            title="Refresh Live Payments"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={isLoading ? 'spinner' : ''} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            className="primary-btn"
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{
              backgroundColor: '#059669',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FileSpreadsheet size={16} />
            <span>{isExporting ? 'Generating Report...' : 'Export Payments Excel Report'}</span>
          </button>
        </div>
      </div>

      {/* 4 Summary Stats Cards */}
      <div className="site-payments-stats-grid">
        <div className="site-payment-stat-card">
          <div className="site-payment-stat-info">
            <h4>Total Volume</h4>
            <div className="stat-number">₹{totalAmountCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="site-payment-stat-icon" style={{ backgroundColor: '#EFF6FF', color: '#2563EB' }}>
            <TrendingUp size={22} />
          </div>
        </div>

        <div className="site-payment-stat-card">
          <div className="site-payment-stat-info">
            <h4>UPI & QR Payments</h4>
            <div className="stat-number" style={{ color: '#D97706' }}>₹{upiCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="site-payment-stat-icon" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>
            <Smartphone size={22} />
          </div>
        </div>

        <div className="site-payment-stat-card">
          <div className="site-payment-stat-info">
            <h4>Card & Gateway</h4>
            <div className="stat-number" style={{ color: '#7E22CE' }}>₹{cardCollected.toLocaleString('en-IN')}</div>
          </div>
          <div className="site-payment-stat-icon" style={{ backgroundColor: '#F3E8FF', color: '#7E22CE' }}>
            <CreditCard size={22} />
          </div>
        </div>

        <div className="site-payment-stat-card">
          <div className="site-payment-stat-info">
            <h4>Total Transactions</h4>
            <div className="stat-number" style={{ color: '#15803D' }}>{payments.length}</div>
          </div>
          <div className="site-payment-stat-icon" style={{ backgroundColor: '#DCFCE7', color: '#15803D' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>
      </div>

      {/* AGENT & CUSTOMER SUPPORT: Pay Bill Form & Interactive Method */}
      {!isSuperAgent && (
        <div className="site-payment-checkout-layout">
          
          {/* Left: Payment Form Card */}
          <form className="site-payment-form-card" onSubmit={handleSubmitPayment}>
            <h3 className="site-payment-form-title">
              <Zap size={18} color="#EA580C" />
              <span>Make Site Payment</span>
            </h3>

            {errorMessage && (
              <div
                style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '10px',
                  padding: '12px 14px',
                  color: '#991B1B',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Site Selection Dropdown */}
            <div className="form-group-custom">
              <label htmlFor="site-select">
                <span>Select Project Site:</span>
                <span style={{ fontSize: '11px', color: '#2563EB' }}>
                  {role === 'AGENT' ? 'Assigned Sites Only' : 'All Active Sites'}
                </span>
              </label>
              <select
                id="site-select"
                className="form-select-custom"
                value={selectedSiteId}
                onChange={(e) => setSelectedSiteId(e.target.value)}
                required
              >
                {selectableSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName} ({s.siteCode}) — {s.city || 'Site'}
                  </option>
                ))}
              </select>
            </div>

            {/* Auto-filled Site Details Box */}
            {activeSelectedSite && (
              <div className="site-meta-preview-box">
                <div className="site-meta-preview-row">
                  <Building2 size={14} style={{ color: '#2563EB', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <strong>{activeSelectedSite.siteName}</strong>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      {[activeSelectedSite.address, activeSelectedSite.city, activeSelectedSite.state, activeSelectedSite.pincode].filter(Boolean).join(', ')}
                    </div>
                  </div>
                </div>
                <div className="site-meta-preview-row">
                  <Users size={14} style={{ color: '#059669', flexShrink: 0 }} />
                  <span>Assigned Field Supervisor: <strong>{activeSiteSupervisor}</strong></span>
                </div>
              </div>
            )}

            {/* Amount Input & Preset Pills */}
            <div className="form-group-custom">
              <label htmlFor="amount-input">
                <span>Amount to Pay (INR):</span>
                <span style={{ fontSize: '11.5px', color: '#10B981', fontWeight: 800 }}>₹ INR Currency</span>
              </label>
              <input
                id="amount-input"
                type="number"
                min="1"
                step="1"
                className="form-input-custom"
                placeholder="Enter amount (e.g. 5000)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              <div className="amount-presets-row">
                {['2000', '5000', '10000', '25000', '50000', '100000'].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    className={`amount-preset-pill ${amount === preset ? 'active' : ''}`}
                    onClick={() => setAmount(preset)}
                  >
                    + ₹{Number(preset).toLocaleString('en-IN')}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Method Selector Grid */}
            <div className="form-group-custom">
              <label>Select Payment Method:</label>
              <div className="payment-methods-grid">
                <div
                  className={`payment-method-tile ${paymentMethod === 'UPI' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <Smartphone size={20} color="#D97706" />
                  <span className="method-name">UPI Payment</span>
                </div>

                <div
                  className={`payment-method-tile ${paymentMethod === 'QR_CODE' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('QR_CODE')}
                >
                  <QrCode size={20} color="#2563EB" />
                  <span className="method-name">Scan QR Code</span>
                </div>

                <div
                  className={`payment-method-tile ${paymentMethod === 'CARD' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('CARD')}
                >
                  <CreditCard size={20} color="#7E22CE" />
                  <span className="method-name">Card / Razorpay</span>
                </div>
              </div>
            </div>

            {/* Reference ID input for UPI / QR methods */}
            {paymentMethod !== 'CARD' && (
              <div className="form-group-custom">
                <label htmlFor="ref-input">
                  <span>UPI / Bank Reference ID (UTR):</span>
                  <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>Optional / Auto-generated</span>
                </label>
                <input
                  id="ref-input"
                  type="text"
                  className="form-input-custom"
                  placeholder="e.g. UPI Ref: 318293819283 or UTR"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                />
              </div>
            )}

            {/* Remarks */}
            <div className="form-group-custom">
              <label htmlFor="remarks-input">Notes / Remarks:</label>
              <input
                id="remarks-input"
                type="text"
                className="form-input-custom"
                placeholder="e.g. Monthly maintenance bill / Generator diesel / Water supply"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="primary-btn"
              style={{
                padding: '13px 20px',
                fontSize: '15px',
                fontWeight: 800,
                borderRadius: '10px',
                backgroundColor: paymentMethod === 'CARD' ? '#7E22CE' : '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                minHeight: '46px'
              }}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw size={16} className="spinner" />
                  <span>Processing Payment...</span>
                </>
              ) : paymentMethod === 'CARD' ? (
                <>
                  <CreditCard size={18} />
                  <span>Pay ₹{payAmountNum.toLocaleString('en-IN')} with Razorpay</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Confirm & Record Payment (₹{payAmountNum.toLocaleString('en-IN')})</span>
                </>
              )}
            </button>
          </form>

          {/* Right: Interactive Live Payment QR & UPI Details */}
          <div className="site-payment-preview-card">
            <h3 style={{ fontSize: '16px', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Scan & Pay Online
            </h3>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', margin: 0 }}>
              Scan this dynamic QR code via Google Pay, PhonePe, Paytm, or any BHIM UPI app.
            </p>

            <div className="payment-qr-container">
              <img src={dynamicQrUrl} alt="Dynamic Payment QR Code" className="payment-qr-image" />
              <div style={{ fontSize: '12px', fontWeight: 800, color: '#15803D' }}>
                Amount: ₹{payAmountNum.toLocaleString('en-IN')}
              </div>
            </div>

            <div className="upi-id-copy-box">
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Smartphone size={16} color="#2563EB" />
                <span>UPI ID: <strong>{upiId}</strong></span>
              </div>
              <button type="button" className="copy-btn-mini" onClick={handleCopyUpi}>
                {copiedUpi ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedUpi ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <div
              style={{
                backgroundColor: 'var(--bg-main)',
                borderRadius: '10px',
                padding: '12px',
                fontSize: '12px',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                textAlign: 'left'
              }}
            >
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>💡 Instant Verification:</div>
              <div>1. Open your UPI app and scan the QR code above.</div>
              <div>2. Complete payment of ₹{payAmountNum.toLocaleString('en-IN')}.</div>
              <div>3. Copy the 12-digit UTR/Ref ID and click Confirm above.</div>
            </div>
          </div>

        </div>
      )}

      {/* PAYMENTS HISTORY & AUDIT TABLE */}
      <div className="site-payments-table-card">
        
        {/* Table Header & Toolbar */}
        <div className="site-payments-toolbar">
          <div className="site-payments-search-box">
            <Search size={16} className="search-box-icon" />
            <input
              type="text"
              placeholder="Search by Site, Payer, Supervisor Agent, Transaction ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="site-payments-filters-group">
            {/* Site Filter */}
            <select
              className="filter-select-mini"
              value={filterSiteId}
              onChange={(e) => setFilterSiteId(e.target.value)}
            >
              <option value="ALL">All Project Sites</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.siteName}
                </option>
              ))}
            </select>

            {/* Method Filter */}
            <select
              className="filter-select-mini"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option value="ALL">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="QR_CODE">QR Code</option>
              <option value="CARD">Card / Razorpay</option>
            </select>

            {/* Date Range Start */}
            <input
              type="date"
              className="filter-select-mini"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              title="Filter from Date"
            />

            {/* Date Range End */}
            <input
              type="date"
              className="filter-select-mini"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              title="Filter to Date"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="table-responsive">
          <table className="custom-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>S.NO</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>DATE & TIME</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>SITE NAME & ADDRESS</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>ASSIGNED SUPERVISOR</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>PAID BY</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>METHOD</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase' }}>TRANSACTION ID</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase', textAlign: 'right' }}>AMOUNT (₹)</th>
                <th style={{ fontSize: '11px', textTransform: 'uppercase', textAlign: 'center' }}>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '36px' }}>
                    <RefreshCw size={20} className="spinner" style={{ marginRight: '8px' }} />
                    <span>Loading site payment transactions...</span>
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((p, idx) => {
                  const methodClass =
                    p.paymentMethod === 'UPI' ? 'upi' : p.paymentMethod === 'QR_CODE' ? 'qr' : 'card';
                  const formattedDate = new Date(p.createdAt).toLocaleString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: 'var(--text-secondary)' }}>{idx + 1}</td>
                      <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>{formattedDate}</td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                            {p.siteName}
                          </span>
                          <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                            {p.siteAddress || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} style={{ color: '#2563EB' }} />
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>
                            {p.assignedAgentName || 'Unassigned'}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {p.payerName}
                          </span>
                          <span
                            style={{
                              fontSize: '10.5px',
                              fontWeight: 800,
                              color: p.payerRole === 'AGENT' ? '#2563EB' : '#059669',
                              textTransform: 'uppercase'
                            }}
                          >
                            {p.payerRole}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className={`payment-method-badge ${methodClass}`}>
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <code
                            style={{
                              backgroundColor: 'var(--border-light)',
                              padding: '3px 6px',
                              borderRadius: '4px',
                              fontSize: '11.5px',
                              fontWeight: 700
                            }}
                          >
                            {p.transactionId || p.upiTransactionId || 'N/A'}
                          </code>
                          <button
                            type="button"
                            onClick={() => handleCopyTxn(p.transactionId || p.upiTransactionId || '')}
                            title="Copy Transaction ID"
                            style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B' }}
                          >
                            {copiedTxnId === (p.transactionId || p.upiTransactionId) ? (
                              <Check size={13} color="#10B981" />
                            ) : (
                              <Copy size={13} />
                            )}
                          </button>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 800, fontSize: '14px', color: '#0F172A' }}>
                        ₹{Number(p.amount).toLocaleString('en-IN')}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 800,
                            backgroundColor: '#DCFCE7',
                            color: '#15803D',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Check size={11} /> {p.status || 'SUCCESS'}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
                    No payment transactions recorded matching your search filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>

      {/* ANIMATED PAYMENT SUCCESS MODAL (PORTAL) */}
      {successPayment &&
        createPortal(
          <div className="payment-success-modal-backdrop" onClick={() => setSuccessPayment(null)}>
            <div className="payment-success-modal-card" onClick={(e) => e.stopPropagation()}>
              
              {/* Header Hero */}
              <div className="success-modal-header-hero">
                <div className="success-animated-icon">
                  <Check size={36} strokeWidth={3} />
                </div>
                <div style={{ fontSize: '18px', fontWeight: 800 }}>Payment Successful!</div>
                <div className="success-hero-amount">
                  ₹{Number(successPayment.amount).toLocaleString('en-IN')}
                </div>
                <div style={{ fontSize: '12px', opacity: 0.9 }}>Official Site Payment Receipt</div>
              </div>

              {/* Receipt Body */}
              <div className="success-modal-body">
                <div className="receipt-breakdown-list">
                  <div className="receipt-row">
                    <span className="receipt-label">Transaction ID:</span>
                    <span className="receipt-value" style={{ fontFamily: 'monospace', color: '#2563EB' }}>
                      {successPayment.transactionId || successPayment.upiTransactionId || 'TXN-SUCCESS'}
                    </span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Project Site:</span>
                    <span className="receipt-value">{successPayment.siteName}</span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Site Address:</span>
                    <span className="receipt-value" style={{ fontSize: '12px' }}>
                      {successPayment.siteAddress || 'Project Location'}
                    </span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Paid By:</span>
                    <span className="receipt-value">
                      {successPayment.payerName} ({successPayment.payerRole})
                    </span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Supervisor Agent:</span>
                    <span className="receipt-value">
                      {successPayment.assignedAgentName || 'Assigned Field Agent'}
                    </span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Payment Method:</span>
                    <span className="receipt-value">{successPayment.paymentMethod}</span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Date & Time:</span>
                    <span className="receipt-value">
                      {new Date(successPayment.createdAt).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </span>
                  </div>

                  <div className="receipt-row">
                    <span className="receipt-label">Status:</span>
                    <span className="receipt-value" style={{ color: '#15803D' }}>
                      ✅ VERIFIED & RECORDED
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="success-modal-footer">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => window.print()}
                  style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <Printer size={15} />
                  <span>Print Receipt</span>
                </button>

                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setSuccessPayment(null)}
                  style={{ flex: 1.5, backgroundColor: '#059669', justifyContent: 'center' }}
                >
                  <span>Done</span>
                </button>
              </div>

            </div>
          </div>,
          document.body
        )}

    </div>
  );
};
