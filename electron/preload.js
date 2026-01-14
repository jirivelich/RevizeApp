const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  getAppPath: () => ipcRenderer.invoke('get-app-path'),

  // File dialogs
  selectFile: (options) => ipcRenderer.invoke('select-file', options),
  saveFile: (options) => ipcRenderer.invoke('save-file', options),
  showMessage: (options) => ipcRenderer.invoke('show-message', options),

  // Menu events
  onNewRevize: (callback) => ipcRenderer.on('menu-new-revize', callback),
  onExportPdf: (callback) => ipcRenderer.on('menu-export-pdf', callback),
  onBackup: (callback) => ipcRenderer.on('menu-backup', callback),
  onRestore: (callback) => ipcRenderer.on('menu-restore', callback),
  onSettings: (callback) => ipcRenderer.on('menu-settings', callback),

  // Platform info
  platform: process.platform,
  isElectron: true
});

// Log that preload script loaded
console.log('✅ Electron preload script loaded');
