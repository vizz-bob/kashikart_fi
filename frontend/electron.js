const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const isDev = process.env.NODE_ENV === 'development';

// ── Production EC2 backend ──────────────────────────────────────────────────
const BACKEND_URL = 'http://13.232.38.191:8000';

// Keep a global reference of the window object
let mainWindow;
let server = null;

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
      preload: path.join(__dirname, 'public', 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'icon.png'),
    show: false, // Don't show until ready-to-show
    titleBarStyle: 'default',
    autoHideMenuBar: true
  });

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // In production, use a simple HTTP server to serve the dist folder
    // This is more reliable than file:// protocol
    const express = require('express');
    const appServer = express();
    const distPath = path.join(__dirname, 'dist');
    
    console.log('Serving dist folder from:', distPath);
    console.log('Dist exists:', fs.existsSync(distPath));
    
    if (fs.existsSync(distPath)) {
      appServer.use(express.static(distPath));
      
      // Handle SPA routing
      appServer.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
      
      server = appServer.listen(0, '127.0.0.1', () => {
        const port = server.address().port;
        console.log('Local server running on port:', port);
        mainWindow.loadURL(`http://127.0.0.1:${port}`);
      });
      
      server.on('error', (err) => {
        console.error('Server error:', err);
        mainWindow.loadURL('data:text/html,<h1>Error: Could not start local server</h1><p>Please reinstall.</p>');
      });
    } else {
      console.error('Could not find dist folder at:', distPath);
      mainWindow.loadURL('data:text/html,<h1>Error: Could not find application files</h1><p>Please reinstall.</p>');
    }
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
      const configPath = path.join(__dirname, 'public', 'config.json');
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
            mainWindow.reload();
          }
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
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
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About KashiKart',
              message: 'KashiKart Tender Intelligence',
              detail: 'Version 1.0.0\n\nA tender intelligence system for automated procurement monitoring.'
            });
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
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Auto-updater setup (for future use)
// const { autoUpdater } = require('electron-updater');
// autoUpdater.checkForUpdatesAndNotify();
