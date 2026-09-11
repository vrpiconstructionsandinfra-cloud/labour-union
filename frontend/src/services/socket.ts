import { io, Socket } from 'socket.io-client';

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'http://127.0.0.1:5000';
};

const SOCKET_URL = getSocketUrl();

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: true,
      withCredentials: true,
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
