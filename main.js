const { app, BrowserWindow, session, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs').promises;

const store = new Store();
let clashProcess = null;
let mainWindow = null;

function getHomePage() {
    return store.get('settings.homePage', 'https://www.google.com');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
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
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);
  });

  clashProcess.stderr.on('data', (data) => {
    const logMessage = `[STDERR] ${data.toString()}`;
    console.error(`Mihomo stderr: ${logMessage}`);
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);
  });

  clashProcess.on('close', (code) => {
    const logMessage = `Mihomo process exited with code ${code}`;
    console.log(logMessage);
    clashProcess = null;
  });

  clashProcess.on('error', (err) => {
    const logMessage = `Failed to start Mihomo process. ${err}`;
    console.error(logMessage);
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);
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

// --- IPC Handlers for History ---
ipcMain.handle('get-history', async () => {
    return store.get('history', []);
});

ipcMain.handle('add-history', async (event, item) => {
    const history = store.get('history', []);
    // 为了防止历史记录无限增长，我们将其限制在1000条。
    // 同时通过 URL 删除可能的重复项，保留最后一次访问的记录。
    const newHistory = history.filter(h => h.url !== item.url).slice(-999);
    newHistory.push(item);
    store.set('history', newHistory);
    // 通知窗口历史记录已更新
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('history-updated');
    });
    return newHistory;
});

ipcMain.handle('delete-history-items', async (event, urls) => {
    const history = store.get('history', []);
    const newHistory = history.filter(h => !urls.includes(h.url));
    store.set('history', newHistory);
    return newHistory;
});

ipcMain.handle('clear-history', async () => {
    store.set('history', []);
    return [];
});

// --- IPC Handlers for Recently Closed Tabs ---
ipcMain.handle('get-recently-closed', async () => {
    return store.get('recentlyClosed', []);
});

ipcMain.handle('add-recently-closed', async (event, item) => {
    const recentlyClosed = store.get('recentlyClosed', []);
    // 限制最近关闭列表的数量，例如20个
    const newRecentlyClosed = [item, ...recentlyClosed.filter(h => h.url !== item.url)].slice(0, 20);
    store.set('recentlyClosed', newRecentlyClosed);
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('history-updated');
    });
    return newRecentlyClosed;
});

ipcMain.on('open-in-new-tab', (event, url) => {
    if (mainWindow) {
        mainWindow.webContents.send('new-tab-request', url || getHomePage());
        mainWindow.focus();
    }
});

// --- IPC Handlers for Settings ---
ipcMain.handle('get-setting', (event, key) => {
    return store.get(key, null);
});

ipcMain.handle('set-setting', (event, { key, value }) => {
    store.set(key, value);
    // 通知所有窗口设置已更新，以便实时生效
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('setting-updated', { key, value });
    });
    return { success: true };
});

ipcMain.handle('get-clash-config', async () => {
    try {
        const configPath = path.join(__dirname, 'clash-meta', 'config.yaml');
        const configData = await fs.readFile(configPath, 'utf-8');
        return configData;
    } catch (error) {
        console.error('Error reading Clash config:', error);
        return `# 无法读取配置文件: ${error.message}`;
    }
});

ipcMain.handle('restart-clash', async () => {
    console.log('Restarting Clash process requested...');
    stopClash();
    // Give it a moment to release resources before starting again
    setTimeout(() => {
        startClash();
    }, 500);
    return { success: true };
});

ipcMain.handle('clear-browsing-data', async (event, dataTypes) => {
    try {
        if (dataTypes.includes('cache')) {
            await session.defaultSession.clearCache();
        }
        if (dataTypes.includes('cookies')) {
            await session.defaultSession.clearStorageData({ storages: ['cookies'] });
        }
        return { success: true };
    } catch (error) {
        console.error('Failed to clear browsing data:', error);
        return { success: false, error: error.message };
    }
});

// --- Window Controls ---
ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    if (action === 'minimize') mainWindow.minimize();
    if (action === 'maximize') {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
    if (action === 'close') mainWindow.close();
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