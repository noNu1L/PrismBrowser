const { app, BrowserWindow, session, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const Store = require('electron-store');

const store = new Store();
let clashProcess = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // For security reasons, contextIsolation is recommended to be true.
      contextIsolation: true,
      // nodeIntegration should be false.
      nodeIntegration: false,
      // Enable the webview tag.
      webviewTag: true
    }
  });

  mainWindow.loadFile('renderer/index.html');
}

function startClash() {
  // Path to the Clash.Meta executable, assuming it's for Windows and in the 'clash-meta' directory.
  const clashExe = 'mihomo.exe';
  const clashPath = path.join(__dirname, 'clash-meta', clashExe);
  const configPath = path.join(__dirname, 'clash-meta', 'config.yaml');

  console.log(`Starting Mihomo (Clash.Meta) from: ${clashPath}`);

  // Start the Mihomo process.
  // The '-d' argument specifies the directory where config.yaml is located.
  clashProcess = spawn(clashPath, ['-d', path.join(__dirname, 'clash-meta')]);

  clashProcess.stdout.on('data', (data) => {
    const logMessage = data.toString();
    console.log(`Mihomo stdout: ${logMessage}`);
    if (mainWindow) {
      mainWindow.webContents.send('mihomo-log', logMessage);
    }
  });

  clashProcess.stderr.on('data', (data) => {
    const logMessage = `[STDERR] ${data.toString()}`;
    console.error(`Mihomo stderr: ${logMessage}`);
    if (mainWindow) {
      mainWindow.webContents.send('mihomo-log', logMessage);
    }
  });

  clashProcess.on('close', (code) => {
    const logMessage = `Mihomo process exited with code ${code}`;
    console.log(logMessage);
    if (mainWindow) {
      mainWindow.webContents.send('mihomo-log', logMessage);
    }
    clashProcess = null;
  });

  clashProcess.on('error', (err) => {
    const logMessage = `Failed to start Mihomo process. ${err}`;
    console.error(logMessage);
    if (mainWindow) {
      mainWindow.webContents.send('mihomo-log', logMessage);
    }
  });
}

function stopClash() {
  if (clashProcess) {
    console.log('Stopping Mihomo process...');
    clashProcess.kill();
    clashProcess = null;
  }
}

// --- IPC Handlers for Bookmarks ---
ipcMain.handle('get-bookmarks', async () => {
  return store.get('bookmarks', []);
});

ipcMain.handle('add-bookmark', async (event, bookmark) => {
  const bookmarks = store.get('bookmarks', []);
  // Avoid duplicates
  if (bookmarks.find(b => b.url === bookmark.url)) {
    return bookmarks;
  }
  const newBookmarks = [...bookmarks, bookmark];
  store.set('bookmarks', newBookmarks);
  return newBookmarks;
});

ipcMain.handle('delete-bookmark', async (event, url) => {
  const bookmarks = store.get('bookmarks', []);
  const newBookmarks = bookmarks.filter(b => b.url !== url);
  store.set('bookmarks', newBookmarks);
  return newBookmarks;
});

app.whenReady().then(async () => {
  // Start Mihomo first.
  startClash();

  // Configure the proxy for all HTTP and HTTPS traffic.
  // This must be done after the app is ready.
  // We assume Mihomo is running on port 17890 now.
  const proxyRules = 'http=127.0.0.1:17890;https=127.0.0.1:17890';
  await session.defaultSession.setProxy({
    proxyRules: proxyRules,
    // You can add bypass rules for local addresses if needed.
    proxyBypassRules: '<local>'
  });
  console.log(`Proxy configured to: ${proxyRules}`);


  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS it's common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Make sure to stop the Mihomo process when the app quits.
app.on('will-quit', () => {
  stopClash();
}); 