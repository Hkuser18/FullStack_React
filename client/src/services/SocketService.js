// SocketService - thin wrapper around socket.io-client for the Live Monitor feature.
// No-ops entirely in mock mode (VITE_USE_SERVER !== 'true') so callers never need
// their own mock-mode branching.
import { io } from 'socket.io-client';

const TOKEN_KEY = 'auth_token'; // matches ServerApiService.js's TOKEN_KEY
const ENABLED   = import.meta.env.VITE_USE_SERVER === 'true';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect() {
    if (!ENABLED || this.socket) return;
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;
    this.socket = io(import.meta.env.VITE_API_URL || undefined, {
      auth: { token },
    });
  }

  getSocket() {
    return this.socket;
  }

  on(event, cb) {
    this.socket?.on(event, cb);
  }

  off(event, cb) {
    this.socket?.off(event, cb);
  }

  emit(event, payload) {
    this.socket?.emit(event, payload);
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
  }
}

export default new SocketService();
