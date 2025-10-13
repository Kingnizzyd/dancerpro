// WebSocket service for real-time communication using Socket.IO
import { io } from 'socket.io-client';

class WebSocketService {
  constructor() {
    this.socket = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectInterval = 1000;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  connect(url) {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return;
    }

    this.url = url;
    this.isConnecting = true;

    try {
      this.socket = io(url, {
        transports: ['websocket', 'polling'],
        autoConnect: true
      });
      
      this.socket.on('connect', () => {
        console.log('Socket.IO connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
      });

      this.socket.on('message', (data) => {
        this.emit('message', data);
        
        // Emit specific event types
        if (data.type) {
          this.emit(data.type, data);
        }
      });

      this.socket.on('disconnect', () => {
        console.log('Socket.IO disconnected');
        this.isConnecting = false;
        this.emit('disconnected');
        this.attemptReconnect();
      });

      this.socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        this.isConnecting = false;
        this.emit('error', error);
      });

      // Listen for specific events from the server
      this.socket.on('message_status_update', (data) => {
        this.emit('message_status_update', data);
      });

      this.socket.on('new_message', (data) => {
        this.emit('new_message', data);
      });

    } catch (error) {
      console.error('Failed to create Socket.IO connection:', error);
      this.isConnecting = false;
      this.emit('error', error);
    }
  }

  disconnect() {
    this.reconnectAttempts = this.maxReconnectAttempts; // Prevent reconnection
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  send(data) {
    if (this.socket && this.socket.connected) {
      try {
        this.socket.emit('message', data);
        return true;
      } catch (error) {
        console.error('Error sending Socket.IO message:', error);
        return false;
      }
    }
    return false;
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.url) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connect(this.url);
      }, this.reconnectInterval * this.reconnectAttempts);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in Socket.IO event listener for ${event}:`, error);
        }
      });
    }
  }

  isConnected() {
    return this.socket && this.socket.connected;
  }

  getReadyState() {
    return this.socket ? (this.socket.connected ? 1 : 0) : 3; // WebSocket-like states
  }
}

// Create a singleton instance
const webSocketService = new WebSocketService();

export default webSocketService;