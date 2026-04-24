const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// ── Production EC2 backend ──────────────────────────────────────────────────
const BACKEND_URL = 'http://13.232.38.191:8000';

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, use app.getAppPath() which resolves correctly inside ASAR
    // app.getAppPath() points to the root of the packaged app (where dist/ lives)
    const distPath = path.join(app.getAppPath(), 'dist', 'index.html');
    console.log('Loading from:', distPath);
    mainWindow.loadFile(distPath).catch(err => {
      console.error('Failed to load:', err);
      mainWindow.loadURL('data:text/html,<h1>Error loading app</h1><p>' + err.message + '</p>');
    });
  }

  // Handle load errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', errorDescription);
    console.error('URL:', validatedURL);
  });

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Open DevTools in development
    if (isDev) {
      mainWindow.webContents.openDevTools();
    }
  });

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // Create application menu
  createMenu();
  
  // Inject API URL configuration
  mainWindow.webContents.on('did-finish-load', () => {
    if (!isDev) {
      const configPath = path.join(path.dirname(__dirname), 'config.json');
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        mainWindow.webContents.executeJavaScript(`
          window.__API_BASE_URL__ = '${config.apiBaseUrl}';
          window.__APP_VERSION__ = '${config.appVersion}';
        `);
      }
    }
  });
}

function createMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Refresh',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow.webContents.reload();
          }
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: process.platform === 'darwin' ? 'Alt+Cmd+I' : 'Ctrl+Shift+I',
          click: () => {
            mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: process.platform === 'darwin' ? 'Cmd+Q' : 'Ctrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About KashiKart',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About KashiKart',
              message: 'KashiKart Tender Intelligence',
              detail: `Version: ${app.getVersion()}\nBackend: ${BACKEND_URL}`,
            });
          }
        },
        {
          label: 'API Documentation',
          click: () => {
            shell.openExternal(`${BACKEND_URL}/docs`);
          }
        },
        {
          label: 'Backend Health',
          click: () => {
            shell.openExternal(`${BACKEND_URL}/api/health`);
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, keep app running even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});

// Handle certificate errors (for development only)
if (isDev) {
  app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    // On development, ignore certificate errors
    event.preventDefault();
    callback(true);
  });
}

// IPC handlers
ipcMain.handle('app-version', () => {
  return app.getVersion();
});

ipcMain.handle('app-name', () => {
  return app.getName();
});

ipcMain.handle('platform', () => {
  return process.platform;
});

// Expose backend URL to renderer process
ipcMain.handle('get-backend-url', () => BACKEND_URL);
