import { io, Socket } from 'socket.io-client';

const DEFAULT_PROD_SOCKET_URL = 'https://labour-union.onrender.com';

const getSocketUrl = (): string => {
  const customSocketUrl = (import.meta as any).env?.VITE_SOCKET_URL;
  if (customSocketUrl) {
    return customSocketUrl.trim().replace(/\/+$/, '');
  }

  let apiUrl = (import.meta as any).env?.VITE_API_URL;
  if (!apiUrl && typeof window !== 'undefined') {
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '0.0.0.0';
    if (!isLocalhost) {
      apiUrl = DEFAULT_PROD_SOCKET_URL;
    }
  }

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
    return DEFAULT_PROD_SOCKET_URL;
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
