const axios = require('axios');
const { EventEmitter } = require('events');

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.isOnline = true; // Asumimos online al inicio
    this.checkInterval = 10000; // 10 segundos
    this.intervalId = null;
    // Ping a un servicio muy confiable y rápido para verificar internet real
    this.pingUrl = 'https://1.1.1.1'; 
  }

  start() {
    this.checkConnection();
    this.intervalId = setInterval(() => this.checkConnection(), this.checkInterval);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async checkConnection() {
    try {
      await axios.get(this.pingUrl, { timeout: 3000 });
      if (!this.isOnline) {
        this.isOnline = true;
        this.emit('status-changed', true);
        console.log('[ConnectionManager] Estado cambiado a: ONLINE');
      }
    } catch (error) {
      if (this.isOnline) {
        this.isOnline = false;
        this.emit('status-changed', false);
        console.log('[ConnectionManager] Estado cambiado a: OFFLINE');
      }
    }
  }

  getStatus() {
    return this.isOnline;
  }
}

module.exports = new ConnectionManager();
