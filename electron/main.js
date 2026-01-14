const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let backendProcess;
const isDev = process.env.NODE_ENV === 'development';
const BACKEND_PORT = 3001;
const FRONTEND_PORT = 5173;

// Backend process management
function startBackend() {
  const serverDir = path.join(__dirname, '..', 'server');
  const nodeModulesPath = path.join(serverDir, 'node_modules');

  // Check if backend dependencies are installed
  if (!fs.existsSync(nodeModulesPath)) {
    dialog.showErrorBox(
      'Chyba při spuštění',
      'Backend závislosti nejsou nainstalovány.\nSpusťte: cd server && npm install'
    );
    app.quit();
    return;
  }

  // Ensure data directory exists
  const dataDir = path.join(serverDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  console.log('🚀 Spouštím backend server...');

  // Use npx to run tsx with server.ts
  const isWindows = process.platform === 'win32';
  const command = isWindows ? 'npx.cmd' : 'npx';
  
  backendProcess = spawn(command, ['tsx', 'server.ts'], {
    cwd: serverDir,
    env: {
      ...process.env,
      NODE_ENV: isDev ? 'development' : 'production',
      PORT: BACKEND_PORT,
      CORS_ORIGIN: isDev ? `http://localhost:${FRONTEND_PORT}` : 'electron://app'
    },
    stdio: 'inherit',
    shell: true
  });

  backendProcess.on('error', (err) => {
    console.error('❌ Backend chyba:', err);
    dialog.showErrorBox('Backend chyba', `Nelze spustit backend server:\n${err.message}`);
  });

  backendProcess.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`❌ Backend ukončen s kódem ${code}`);
    }
  });
}

function stopBackend() {
  if (backendProcess) {
    console.log('🛑 Zastavuji backend server...');
    backendProcess.kill();
    backendProcess = null;
  }
}

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true
    },
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: !isDev
  });

  // Load app
  const startUrl = isDev
    ? `http://localhost:${FRONTEND_PORT}`
    : `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;

  mainWindow.loadURL(startUrl);

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Create application menu
  createMenu();
}

// Create application menu
function createMenu() {
  const template = [
    {
      label: 'Soubor',
      submenu: [
        {
          label: 'Nová revize',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow.webContents.send('menu-new-revize');
          }
        },
        { type: 'separator' },
        {
          label: 'Export PDF',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow.webContents.send('menu-export-pdf');
          }
        },
        { type: 'separator' },
        {
          label: 'Ukončit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Upravit',
      submenu: [
        { label: 'Zpět', accelerator: 'CmdOrCtrl+Z', role: 'undo' },
        { label: 'Znovu', accelerator: 'CmdOrCtrl+Y', role: 'redo' },
        { type: 'separator' },
        { label: 'Vyjmout', accelerator: 'CmdOrCtrl+X', role: 'cut' },
        { label: 'Kopírovat', accelerator: 'CmdOrCtrl+C', role: 'copy' },
        { label: 'Vložit', accelerator: 'CmdOrCtrl+V', role: 'paste' },
        { label: 'Vybrat vše', accelerator: 'CmdOrCtrl+A', role: 'selectAll' }
      ]
    },
    {
      label: 'Zobrazení',
      submenu: [
        { label: 'Reload', accelerator: 'CmdOrCtrl+R', role: 'reload' },
        { label: 'Force Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'forceReload' },
        { type: 'separator' },
        { label: 'Aktuální velikost', accelerator: 'CmdOrCtrl+0', role: 'resetZoom' },
        { label: 'Přiblížit', accelerator: 'CmdOrCtrl+Plus', role: 'zoomIn' },
        { label: 'Oddálit', accelerator: 'CmdOrCtrl+-', role: 'zoomOut' },
        { type: 'separator' },
        { label: 'Celá obrazovka', accelerator: 'F11', role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Nástroje',
      submenu: [
        {
          label: 'Backup databáze',
          click: () => {
            mainWindow.webContents.send('menu-backup');
          }
        },
        {
          label: 'Obnovit databázi',
          click: () => {
            mainWindow.webContents.send('menu-restore');
          }
        },
        { type: 'separator' },
        {
          label: 'Nastavení',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            mainWindow.webContents.send('menu-settings');
          }
        }
      ]
    }
  ];

  if (isDev) {
    template.push({
      label: 'Vývoj',
      submenu: [
        { label: 'Toggle DevTools', accelerator: 'F12', role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Otevřit složku databáze',
          click: () => {
            const { shell } = require('electron');
            shell.openPath(path.join(__dirname, '..', 'server', 'data'));
          }
        }
      ]
    });
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// IPC handlers
ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

ipcMain.handle('get-app-path', () => {
  return app.getPath('userData');
});

ipcMain.handle('select-file', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

ipcMain.handle('save-file', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options);
  return result;
});

ipcMain.handle('show-message', async (event, options) => {
  const result = await dialog.showMessageBox(mainWindow, options);
  return result;
});

// App lifecycle
app.whenReady().then(() => {
  // Start backend server
  startBackend();

  // Wait a bit for backend to start, then create window
  setTimeout(() => {
    createWindow();
  }, 2000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  stopBackend();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  stopBackend();
});

// Handle errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Chyba aplikace', error.message);
});
