const axios = require('axios');
const { EventEmitter } = require('events');

// Múltiples objetivos: si uno está bloqueado/lento no causamos falsos OFFLINE.
// 1.1.1.1 (Cloudflare) y 8.8.8.8 (Google) también responden HTTPS con certificado válido.
const PING_TARGETS = [
  'https://1.1.1.1',
  'https://8.8.8.8',
  'https://www.google.com'
];

// Retorna true si CUALQUIER objetivo responde (resolución rápida en paralelo).
async function checkReachable() {
  try {
    await Promise.any(
      PING_TARGETS.map((url) =>
        axios.get(url, { timeout: 4000 }).then(() => url)
      )
    );
    return true;
  } catch {
    return false;
  }
}

class ConnectionManager extends EventEmitter {
  constructor() {
    super();
    this.isOnline = true; // Asumimos online al inicio
    this.checkInterval = 5000; // 5 segundos
    this.intervalId = null;
    this.fastTimer = null;
    this.checking = false;
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
    if (this.fastTimer) {
      clearTimeout(this.fastTimer);
      this.fastTimer = null;
    }
  }

  async checkConnection() {
    if (this.checking) return;
    this.checking = true;
    let onlineNow = false;
    try {
      onlineNow = await checkReachable();
    } finally {
      this.checking = false;
    }

    if (onlineNow && !this.isOnline) {
      this.isOnline = true;
      this.emit('status-changed', true);
      console.log('[ConnectionManager] Estado cambiado a: ONLINE');
    } else if (!onlineNow && this.isOnline) {
      this.isOnline = false;
      this.emit('status-changed', false);
      console.log('[ConnectionManager] Estado cambiado a: OFFLINE');
      // Cuando estamos offline, verificar seguido para detectar el regreso rápido
      this.scheduleFastRecheck();
    }
  }

  // Re-chequeo acelerado (2s) mientras estemos offline, para reaccionar apenas vuelva internet
  scheduleFastRecheck() {
    if (this.fastTimer) clearTimeout(this.fastTimer);
    this.fastTimer = setTimeout(() => {
      this.fastTimer = null;
      this.checkConnection();
    }, 2000);
  }

  getStatus() {
    return this.isOnline;
  }
}

const manager = new ConnectionManager();
module.exports = manager;
module.exports.checkReachable = checkReachable;
