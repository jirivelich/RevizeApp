// Detekce Electron prostředí
export const isElectron = () => {
  return !!(window as any).electron;
};

// Electron API wrapper
export const electronAPI = {
  // App info
  getAppVersion: async () => {
    if (isElectron()) {
      return await (window as any).electron.getAppVersion();
    }
    return null;
  },

  getAppPath: async () => {
    if (isElectron()) {
      return await (window as any).electron.getAppPath();
    }
    return null;
  },

  // File dialogs
  selectFile: async (options: any) => {
    if (isElectron()) {
      return await (window as any).electron.selectFile(options);
    }
    return null;
  },

  saveFile: async (options: any) => {
    if (isElectron()) {
      return await (window as any).electron.saveFile(options);
    }
    return null;
  },

  showMessage: async (options: any) => {
    if (isElectron()) {
      return await (window as any).electron.showMessage(options);
    }
    return null;
  },

  // Menu event listeners
  onNewRevize: (callback: () => void) => {
    if (isElectron()) {
      (window as any).electron.onNewRevize(callback);
    }
  },

  onExportPdf: (callback: () => void) => {
    if (isElectron()) {
      (window as any).electron.onExportPdf(callback);
    }
  },

  onBackup: (callback: () => void) => {
    if (isElectron()) {
      (window as any).electron.onBackup(callback);
    }
  },

  onRestore: (callback: () => void) => {
    if (isElectron()) {
      (window as any).electron.onRestore(callback);
    }
  },

  onSettings: (callback: () => void) => {
    if (isElectron()) {
      (window as any).electron.onSettings(callback);
    }
  },

  // Platform info
  getPlatform: () => {
    if (isElectron()) {
      return (window as any).electron.platform;
    }
    return 'web';
  },
};

// Export pro kompatibilitu
export default electronAPI;
