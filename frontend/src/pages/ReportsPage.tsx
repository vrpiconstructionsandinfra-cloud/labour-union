import React, { useState, useEffect } from 'react';
import { BarChart3, Download, FileText, PieChart, Loader2, ShieldCheck } from 'lucide-react';
import { fetchDashboardStatsApi } from '../services/api';
import './Pages.css';

export const ReportsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStatsApi()
      .then((data: any) => {
        setMetrics(data.stats || null);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleDownloadReport = (title: string, dataSummary: string) => {
    const csvContent = `data:text/csv;charset=utf-8,Report Title,Value,Exported Date\n"${title}","${dataSummary}","${new Date().toLocaleDateString()}"\n`;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${title.toLowerCase().replace(/\s+/g, '_')}_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const reportsList = [
    {
      title: 'Worker Attendance Summary Report',
      desc: `Live backend summary: ${metrics?.todayAttendance ?? 0} worker(s) present out of ${metrics?.totalWorkers ?? 0} total workers.`,
      icon: FileText,
      value: `${metrics?.todayAttendance ?? 0} Present Today`,
      statKey: 'todayAttendance'
    },
    {
      title: 'Weekly Payroll Disbursal Report',
      desc: `Live backend summary: ${metrics?.pendingPayroll ?? 0} pending payment(s), Total Wallet Pool: ₹ ${metrics?.walletBalance?.toLocaleString('en-IN') ?? 0}.`,
      icon: BarChart3,
      value: `₹ ${metrics?.walletBalance?.toLocaleString('en-IN') ?? 0}`,
      statKey: 'walletBalance'
    },
    {
      title: 'Site & Labor Allocation Analytics',
      desc: `Live backend summary: ${metrics?.totalSites ?? 0} active working site(s) with ${metrics?.activeWorkers ?? 0} active deployed workers.`,
      icon: PieChart,
      value: `${metrics?.totalSites ?? 0} Active Sites`,
      statKey: 'totalSites'
    },
    {
      title: 'Union Insurance Coverage Report',
      desc: `Live backend summary: ${metrics?.insurancePolicies ?? 0} active member insurance policy(ies) enrolled in backend database.`,
      icon: ShieldCheck,
      value: `${metrics?.insurancePolicies ?? 0} Active Policies`,
      statKey: 'insurancePolicies'
    }
  ];

  return (
    <div className="page-wrapper animate-fade-in">
      <div className="page-header">
        <div>
          <h2>System & Analytics Reports</h2>
          <p>Live audit reports, workforce analytics, and database export tools.</p>
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#64748B' }}>
          <Loader2 size={24} className="spinner" style={{ display: 'block', margin: '0 auto 12px auto', color: '#2563EB' }} />
          <span>Fetching live report metrics from backend database...</span>
        </div>
      ) : (
        <div className="cards-grid-2">
          {reportsList.map((report, idx) => {
            const Icon = report.icon;
            return (
              <div key={idx} className="module-card">
                <div className="card-badge-header">
                  <div className="report-icon-box">
                    <Icon size={20} />
                  </div>
                  <span className="code-badge" style={{ backgroundColor: '#EFF6FF', color: '#2563EB', fontWeight: 700 }}>
                    {report.value}
                  </span>
                </div>
                <h3 className="card-main-title mt-12">{report.title}</h3>
                <p className="card-sub-info mt-4">{report.desc}</p>
                
                <div className="card-footer-actions mt-16">
                  <button
                    className="primary-btn"
                    onClick={() => handleDownloadReport(report.title, report.value)}
                  >
                    <Download size={15} />
                    <span>Export CSV Report</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
