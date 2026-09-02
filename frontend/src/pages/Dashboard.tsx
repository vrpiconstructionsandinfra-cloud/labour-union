import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ResponsiveLayout } from '../components/ResponsiveLayout';
import { AgentDashboardView, WorkerDashboardView } from '../components/RoleDashboards';
import { MetricCard } from '../components/MetricCard';
import { TodayAgentAttendanceTable } from '../components/TodayAgentAttendanceTable';
import { QuickActions } from '../components/QuickActions';
import { fetchDashboardStatsApi } from '../services/api';
import type { MetricData, QuickActionItem } from '../types';

interface DashboardProps {
  onNavigate?: (nav: string) => void;
  onOpenModal?: (type: string) => void;
}

const DEFAULT_QUICK_ACTIONS: QuickActionItem[] = [
  { id: '1', title: 'Register New Agent', description: 'Onboard field agent with photo and banking details', iconType: 'agent', actionKey: 'add_agent' },
  { id: '2', title: 'Register New Worker', description: 'Add construction worker with trade and salary rate', iconType: 'worker', actionKey: 'add_worker' },
  { id: '3', title: 'Create Working Site', description: 'Add new commercial or infrastructure site project', iconType: 'site', actionKey: 'add_site' },
  { id: '4', title: 'Audit Reports', description: 'Download weekly attendance and payroll audit logs', iconType: 'report', actionKey: 'view_reports' }
];

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigate = () => {},
  onOpenModal = () => {}
}) => {
  const { user, role } = useAuth();
  const [metrics, setMetrics] = useState<MetricData[]>([
    { id: '1', title: 'Total Workers', value: '156', change: '+12.5%', isPositive: true, type: 'workers', comparisonPeriod: 'from last month' },
    { id: '2', title: 'Total Agents', value: '24', change: '+8.3%', isPositive: true, type: 'agents', comparisonPeriod: 'from last month' },
    { id: '3', title: 'Total Sites', value: '12', change: '+4.2%', isPositive: true, type: 'sites', comparisonPeriod: 'from last month' },
    { id: '4', title: 'Active Workers', value: '142', change: '+10.8%', isPositive: true, type: 'active', comparisonPeriod: 'from last month' },
    { id: '5', title: 'Today Attendance', value: '138', change: '+3.6%', isPositive: true, type: 'attendance', comparisonPeriod: 'from yesterday' }
  ]);

  useEffect(() => {
    fetchDashboardStatsApi()
      .then((data) => {
        if (data.cards && data.cards.length > 0) {
          setMetrics(data.cards);
        }
      })
      .catch(() => {});
  }, []);

  if (role === 'AGENT') {
    return <AgentDashboardView user={user} onOpenModal={onOpenModal} onNavigateTab={onNavigate} />;
  }

  if (role === 'WORKER') {
    return <WorkerDashboardView user={user} onOpenModal={onOpenModal} onNavigateTab={onNavigate} />;
  }

  // Super Agent / Admin Default Responsive Dashboard
  return (
    <ResponsiveLayout activeNav="dashboard" onNavSelect={onNavigate} title="Super Agent Dashboard">
      <div className="dashboard-grid" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Metric Cards Row */}
        <div className="responsive-metrics-grid">
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              data={metric}
              onClick={() => {
                if (metric.type === 'agents') onNavigate('agents');
                else if (metric.type === 'workers' || metric.type === 'active') onNavigate('workers');
                else if (metric.type === 'sites') onNavigate('sites');
                else if (metric.type === 'attendance') onNavigate('attendance');
              }}
            />
          ))}
        </div>

        {/* Today's Agent Attendance Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          <TodayAgentAttendanceTable onViewAllAgents={() => onNavigate('agents')} />
        </div>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          <QuickActions
            actions={DEFAULT_QUICK_ACTIONS}
            onActionClick={onOpenModal}
          />
        </div>
      </div>
    </ResponsiveLayout>
  );
};
