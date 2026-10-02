import { io, Socket } from 'socket.io-client';

const getSocketUrl = (): string => {
  const customSocketUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (customSocketUrl) {
    return customSocketUrl.trim().replace(/\/+$/, '');
  }

  const apiUrl = (import.meta as any).env?.VITE_API_URL;
  if (apiUrl) {
    // Strip trailing /api or slashes since Socket.io listens at server root /socket.io
    return apiUrl.trim().replace(/\/api\/?$/i, '').replace(/\/+$/, '');
  }

  // Local development fallback
  if (typeof window !== 'undefined') {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    if (isLocalhost) {
      return 'http://127.0.0.1:5000';
    }
    // In production without VITE_API_URL, return empty string to avoid continuous 404 spam on static hosts like Vercel
    console.warn('[Socket.io] VITE_API_URL environment variable is missing on this deployment. Real-time updates will be paused until VITE_API_URL is configured in Vercel settings.');
    return '';
  }

  return 'http://127.0.0.1:5000';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL || 'http://127.0.0.1:5000', {
      autoConnect: Boolean(SOCKET_URL),
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 10000,
    });
  }
  return socket;
};

export const joinUserRoom = (userId?: number | string, role?: string) => {
  const s = getSocket();
  if (userId || role) {
    s.emit('join', { userId: userId ? Number(userId) : undefined, role });
  }
};
