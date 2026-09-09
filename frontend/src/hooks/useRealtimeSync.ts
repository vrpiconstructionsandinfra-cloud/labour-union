import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../services/socket';
import { QUERY_KEYS } from '../services/queryClient';

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getSocket();

    const onAttendanceUpdated = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.attendance });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.attendanceToday });
    };

    const onTicketUpdated = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.tickets });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myTickets });
    };

    const onPaymentCreated = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.sitePayments });
    };

    const onUserRegistered = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.workers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.agents });
    };

    const onLeaveUpdated = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.leaves });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.myLeaves });
    };

    socket.on('attendance:updated', onAttendanceUpdated);
    socket.on('ticket:created', onTicketUpdated);
    socket.on('ticket:updated', onTicketUpdated);
    socket.on('sitePayment:created', onPaymentCreated);
    socket.on('user:registered', onUserRegistered);
    socket.on('user:updated', onUserRegistered);
    socket.on('leave:updated', onLeaveUpdated);

    return () => {
      socket.off('attendance:updated', onAttendanceUpdated);
      socket.off('ticket:created', onTicketUpdated);
      socket.off('ticket:updated', onTicketUpdated);
      socket.off('sitePayment:created', onPaymentCreated);
      socket.off('user:registered', onUserRegistered);
      socket.off('user:updated', onUserRegistered);
      socket.off('leave:updated', onLeaveUpdated);
    };
  }, [queryClient]);
}
