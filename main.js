const { app, BrowserWindow, session, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const Store = require('electron-store');
const fs = require('fs').promises;

const store = new Store();
let clashProcess = null;
let mainWindow = null;
let bookmarkPopup = null;
let addFolderPopup = null;

function getHomePage() {
    return store.get('settings.homePage', 'https://www.google.com');
}

function getNewTabPageUrl() {
    return store.get('settings.newTabPage', 'about:blank');
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

  mainWindow.loadFile('renderer/pages/index.html');
}

function createBookmarkPopup(data) {
    if (bookmarkPopup) {
        bookmarkPopup.focus();
        return;
    }
    const bounds = mainWindow.getBounds();
    bookmarkPopup = new BrowserWindow({
        x: bounds.x + (bounds.width / 2) - 190, // Center horizontally
        y: bounds.y + 100, // Position near the top
        width: 400,
        height: 250,
        frame: false,
        parent: mainWindow,
        modal: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        show: false, // Don't show until ready
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    bookmarkPopup.loadFile('renderer/popups/add-bookmark-popup.html');

    bookmarkPopup.once('ready-to-show', () => {
        bookmarkPopup.show();
        // Send initial data to the popup window
        bookmarkPopup.webContents.send('popup-data', data);
    });

    bookmarkPopup.on('closed', () => {
        bookmarkPopup = null;
    });
}

function createAddFolderPopup(data) {
    if (addFolderPopup) {
        addFolderPopup.focus();
        return;
    }
    const bounds = mainWindow.getBounds();
    addFolderPopup = new BrowserWindow({
        x: bounds.x + (bounds.width / 2) - 180, // Center horizontally
        y: bounds.y + 150, // Position near the top
        width: 360,
        height: 210,
        frame: false,
        parent: mainWindow,
        modal: true,
        resizable: false,
        maximizable: false,
        minimizable: false,
        show: false, 
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    addFolderPopup.loadFile('renderer/popups/add-folder-popup.html');

    addFolderPopup.once('ready-to-show', () => {
        addFolderPopup.show();
        addFolderPopup.webContents.send('popup-data', data);
    });

    addFolderPopup.on('closed', () => {
        addFolderPopup = null;
    });
}

function startClash() {
  const clashExe = 'mihomo.exe';
  // Determine the base path based on whether the app is packaged or not.
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, 'clash-meta')
    : path.join(__dirname, 'clash-meta');

  const clashPath = path.join(basePath, clashExe);

  console.log(`Starting Mihomo (Clash.Meta) from: ${clashPath}`);

  // Start the Mihomo process.
  // The '-d' argument specifies the directory where config.yaml is located.
  clashProcess = spawn(clashPath, ['-d', basePath]);

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

// --- IPC Handlers for Bookmarks (New Tree Structure) ---
function initializeBookmarks() {
    const bookmarks = store.get('bookmarks');
    // A more robust check. If the data is not an array, is empty, or doesn't contain the essential folders, reset it.
    const hasToolbar = bookmarks && Array.isArray(bookmarks) && bookmarks.some(folder => folder.id === 'toolbar');
    const hasOther = bookmarks && Array.isArray(bookmarks) && bookmarks.some(folder => folder.id === 'other');

    if (!hasToolbar || !hasOther) {
        // If bookmarks are old format, non-existent, or missing essential folders, reset.
        store.set('bookmarks', [
            { id: 'toolbar', type: 'folder', title: '收藏栏', children: [] },
            { id: 'other', type: 'folder', title: '其他收藏', children: [] }
        ]);
    }
}

const PROTECTED_FOLDER_IDS = ['toolbar', 'other'];

// Helper for recursive search
function findItem(nodes, id) {
    for (const node of nodes) {
        if (node.id === id) return { node, parent: nodes };
        if (node.type === 'folder' && node.children) {
            const found = findItem(node.children, id);
            if (found) return found;
        }
    }
    return null;
}

ipcMain.handle('get-bookmarks-tree', async () => {
    return store.get('bookmarks', []);
});

ipcMain.handle('add-bookmark', async (event, { parentId, title, url }) => {
    const bookmarks = store.get('bookmarks', []);
    const parentFolder = findItem(bookmarks, parentId)?.node;
    if (parentFolder && parentFolder.type === 'folder') {
        const newBookmark = { id: `bm-${Date.now()}`, type: 'bookmark', title, url };
        parentFolder.children.push(newBookmark);
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('update-bookmark', async (event, { id, title, url }) => {
    const bookmarks = store.get('bookmarks', []);
    const item = findItem(bookmarks, id)?.node;
    if (item && item.type === 'bookmark') {
        item.title = title;
        item.url = url;
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('delete-bookmarks', async (event, ids) => {
    let bookmarks = store.get('bookmarks', []);
    // Prevent deletion of protected folders
    const filteredIds = ids.filter(id => !PROTECTED_FOLDER_IDS.includes(id));
    const originalLength = bookmarks.length;

    function filterRecursive(nodes) {
        return nodes.filter(node => !filteredIds.includes(node.id)).map(node => {
            if (node.type === 'folder' && node.children) {
                node.children = filterRecursive(node.children);
            }
            return node;
        });
    }
    bookmarks = filterRecursive(bookmarks);
    store.set('bookmarks', bookmarks);
    return { success: true };
});


ipcMain.handle('add-bookmark-folder', async (event, { parentId, title }) => {
    const bookmarks = store.get('bookmarks', []);
    const parentFolder = findItem(bookmarks, parentId || 'other')?.node; // Default to 'other' if no parent
     if (parentFolder && parentFolder.type === 'folder') {
        const newFolder = { id: `f-${Date.now()}`, type: 'folder', title, children: [] };
        parentFolder.children.push(newFolder);
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('update-bookmark-folder', async (event, { id, title }) => {
    if (PROTECTED_FOLDER_IDS.includes(id)) return { success: false, error: 'Cannot rename protected folder' }; 

     const bookmarks = store.get('bookmarks', []);
    const item = findItem(bookmarks, id)?.node;
    if (item && item.type === 'folder') {
        item.title = title;
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

// Note: deleteBookmarkFolder is covered by deleteBookmarks, so we need to protect it there.

// --- IPC Handlers for Popup ---
ipcMain.on('open-add-bookmark-popup', (event, data) => {
    createBookmarkPopup(data);
});

ipcMain.on('open-add-folder-popup', (event, data) => {
    createAddFolderPopup(data);
});

ipcMain.on('close-popup-and-refresh', (event) => {
    if (bookmarkPopup) {
        bookmarkPopup.close();
    }
    if (addFolderPopup) {
        addFolderPopup.close();
    }
    // Notify main window to refresh its bookmark state
    mainWindow.webContents.send('bookmark-updated');
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
        // If a specific URL is provided, open it. Otherwise, use the new tab page setting.
        const urlToOpen = url || getNewTabPageUrl();
        mainWindow.webContents.send('new-tab-request', urlToOpen);
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
  
  // Initialize data stores
  initializeBookmarks();

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