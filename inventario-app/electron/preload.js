const { contextBridge } = require('electron')

// Expose protected methods that allow the renderer process
// to use selected Node.js features without exposing full access
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  version: process.env.npm_package_version || '1.0.0'
})
