import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds fresh data
      gcTime: 1000 * 60 * 5, // 5 minutes cache retention
      refetchOnWindowFocus: false, // Prevent aggressive refetches
      retry: (failureCount, error: any) => {
        // Don't retry on 401 or 403 authorization errors
        if (error?.status === 401 || error?.status === 403 || error?.message?.includes('401')) {
          return false;
        }
        return failureCount < 2;
      },
    },
    mutations: {
      retry: 1,
    },
  },
});

export const QUERY_KEYS = {
  workers: ['workers'] as const,
  agents: ['agents'] as const,
  sites: ['sites'] as const,
  attendance: ['attendance'] as const,
  attendanceToday: ['attendance', 'today'] as const,
  leaves: ['leaves'] as const,
  myLeaves: ['leaves', 'my'] as const,
  sitePayments: ['sitePayments'] as const,
  tickets: ['tickets'] as const,
  myTickets: ['tickets', 'my'] as const,
  enquiries: ['enquiries'] as const,
  notifications: ['notifications'] as const,
  dashboardStats: ['dashboard', 'stats'] as const,
  wallet: (workerId?: number | string) => ['wallet', workerId] as const,
  insurance: (workerId?: number | string) => ['insurance', workerId] as const,
};
