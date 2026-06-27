const { contextBridge, ipcRenderer } = require('electron')

// Expose protected methods that allow the renderer process
// to use selected Node.js features without exposing full access
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0',
  getNetworkStatus: () => ipcRenderer.invoke('get-network-status'),
  onNetworkStatus: (callback) => ipcRenderer.on('network-status', (_event, value) => callback(value))
})
