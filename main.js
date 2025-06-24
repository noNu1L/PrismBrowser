const { app, BrowserWindow, session, ipcMain, screen, shell } = require('electron');
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
    const option = store.get('settings.homepageOption', 'custom');
    if (option === 'newtab') {
        return getNewTabPageUrl();
    } else if (option === 'custom') {
        return store.get('settings.homepageCustomUrl', 'https://www.google.com');
    }
    return 'https://www.google.com';
}

function getNewTabPageUrl() {
    const option = store.get('settings.newtabOption', 'blank');
    if (option === 'blank') {
        return 'about:blank';
    } else if (option === 'custom') {
        return store.get('settings.newtabCustomUrl', 'https://www.google.com');
    }
    return 'about:blank';
}

function getStartupUrl() {
    const option = store.get('settings.startupOption', 'homepage');
    if (option === 'homepage') {
        return getHomePage();
    } else if (option === 'newtab') {
        return getNewTabPageUrl();
    } else if (option === 'custom') {
        return store.get('settings.startupCustomUrl', 'https://www.google.com');
    } else if (option === 'lastsession') {
        // TODO: 实现恢复上次会话的功能
        return getHomePage(); // 暂时回退到主页
    }
    return getHomePage();
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

  mainWindow.loadFile('renderer/pages/main/index.html');
  
  // 添加开发者工具快捷键支持
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 监听所有webContents的下载事件
  mainWindow.webContents.session.on('will-download', (event, item, webContents) => {
    console.log('主进程检测到下载:', item.getFilename());
    
    const downloadItem = {
      id: `download-${Date.now()}`,
      filename: item.getFilename(),
      url: item.getURL(),
      status: 'downloading',
      startTime: new Date().toISOString(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      speed: 0,
      filePath: null
    };

    // 保存到下载记录
    const downloads = store.get('downloads', []);
    downloads.unshift(downloadItem);
    store.set('downloads', downloads);

    // 通知渲染进程
    mainWindow.webContents.send('download-started', downloadItem);

    // 监听下载进度
    item.on('updated', (event, state) => {
      downloadItem.receivedBytes = item.getReceivedBytes();
      downloadItem.speed = item.getCurrentBytesPerSecond ? item.getCurrentBytesPerSecond() : 0;
      
      if (state === 'interrupted') {
        downloadItem.status = 'error';
      } else if (state === 'progressing') {
        downloadItem.status = 'downloading';
      }

      // 更新存储的下载记录
      const currentDownloads = store.get('downloads', []);
      const index = currentDownloads.findIndex(d => d.id === downloadItem.id);
      if (index !== -1) {
        currentDownloads[index] = downloadItem;
        store.set('downloads', currentDownloads);
      }

      // 通知渲染进程更新
      mainWindow.webContents.send('download-updated', downloadItem);
    });

    // 监听下载完成
    item.once('done', (event, state) => {
      if (state === 'completed') {
        downloadItem.status = 'completed';
        downloadItem.filePath = item.getSavePath();
        downloadItem.receivedBytes = item.getTotalBytes();
      } else {
        downloadItem.status = state === 'cancelled' ? 'cancelled' : 'error';
      }

      // 更新存储的下载记录
      const currentDownloads = store.get('downloads', []);
      const index = currentDownloads.findIndex(d => d.id === downloadItem.id);
      if (index !== -1) {
        currentDownloads[index] = downloadItem;
        store.set('downloads', currentDownloads);
      }

      // 通知渲染进程下载完成
      mainWindow.webContents.send('download-completed', downloadItem);
      console.log('下载完成:', downloadItem.filename, '状态:', downloadItem.status);
    });
  });
}

function createBookmarkPopup(data) {
    if (bookmarkPopup) {
        bookmarkPopup.focus();
        return;
    }
    
    // 使用按钮位置信息定位弹窗，如果没有提供则使用默认位置
    let x, y;
    if (data.buttonPosition && typeof data.buttonPosition.x === 'number' && typeof data.buttonPosition.y === 'number') {
        // 获取屏幕工作区域信息
        const display = screen.getPrimaryDisplay();
        const workArea = display.workArea;

        // 计算弹窗位置（弹窗宽度408，居中对齐按钮）
        x = Math.round(data.buttonPosition.x - 204);
        y = Math.round(data.buttonPosition.y);
        
        // 确保弹窗不超出屏幕边界
        const popupWidth = 408;
        const popupHeight = 258;

        x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - popupWidth));
        y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - popupHeight));
    } else {
        // 默认位置（居中）
        const bounds = mainWindow.getBounds();
        x = bounds.x + (bounds.width / 2) - 204;
        y = bounds.y + 100;
    }
    
    bookmarkPopup = new BrowserWindow({
        x: x,
        y: y,
        width: 408, // 增加宽度以适应margin
        height: 258, // 增加高度以适应margin
        frame: false,
        transparent: true, // 启用透明背景
        parent: mainWindow,
        modal: false, // 改为非模态，这样不会阻塞主窗口
        resizable: false,
        maximizable: false,
        minimizable: false,
        show: false, // Don't show until ready
        alwaysOnTop: true, // 保持在最顶层
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    bookmarkPopup.loadFile('renderer/popups/add-bookmark-popup.html');

    bookmarkPopup.once('ready-to-show', () => {
        // 确保位置设置在显示前生效
        if (data.buttonPosition) {
            bookmarkPopup.setPosition(x, y);
        }
        bookmarkPopup.show();
        // Send initial data to the popup window
        bookmarkPopup.webContents.send('popup-data', data);
    });

    // 当弹窗失去焦点时自动关闭（点击外部区域）
    // 延迟关闭，避免在位置设置时意外关闭
    bookmarkPopup.on('blur', () => {
        setTimeout(() => {
            if (bookmarkPopup && !bookmarkPopup.isDestroyed() && !bookmarkPopup.isFocused()) {
                bookmarkPopup.close();
            }
        }, 100);
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

// --- IPC Handlers for Downloads ---
ipcMain.handle('get-downloads', async () => {
    return store.get('downloads', []);
});

ipcMain.handle('add-download', async (event, item) => {
    const downloads = store.get('downloads', []);
    const newDownloads = [item, ...downloads.filter(d => d.id !== item.id)];
    store.set('downloads', newDownloads);
    // 通知所有窗口下载已更新
    BrowserWindow.getAllWindows().forEach(win => {
        win.webContents.send('download-updated');
    });
    return newDownloads;
});

ipcMain.handle('update-download', async (event, { id, data }) => {
    const downloads = store.get('downloads', []);
    const downloadIndex = downloads.findIndex(d => d.id === id);
    if (downloadIndex !== -1) {
        downloads[downloadIndex] = { ...downloads[downloadIndex], ...data };
        store.set('downloads', downloads);
        // 通知所有窗口下载已更新
        BrowserWindow.getAllWindows().forEach(win => {
            win.webContents.send('download-updated');
        });
    }
    return downloads;
});

ipcMain.handle('delete-download', async (event, downloadId) => {
    const downloads = store.get('downloads', []);
    const newDownloads = downloads.filter(d => d.id !== downloadId);
    store.set('downloads', newDownloads);
    return newDownloads;
});

ipcMain.handle('pause-download', async (event, downloadId) => {
    // 实际应用中这里会调用下载管理器暂停下载
    console.log('暂停下载:', downloadId);
    return { success: true };
});

ipcMain.handle('resume-download', async (event, downloadId) => {
    // 实际应用中这里会调用下载管理器恢复下载
    console.log('恢复下载:', downloadId);
    return { success: true };
});

ipcMain.handle('pause-all-downloads', async () => {
    // 实际应用中这里会暂停所有进行中的下载
    console.log('暂停所有下载');
    return { success: true };
});

ipcMain.handle('clear-completed-downloads', async () => {
    const downloads = store.get('downloads', []);
    const newDownloads = downloads.filter(d => d.status !== 'completed');
    store.set('downloads', newDownloads);
    return newDownloads;
});

ipcMain.handle('open-download-file', async (event, downloadId) => {
    const downloads = store.get('downloads', []);
    const download = downloads.find(d => d.id === downloadId);
    if (download && download.filePath) {
        try {
            await shell.openPath(download.filePath);
            console.log('打开文件:', download.filePath);
            return { success: true };
        } catch (error) {
            console.error('打开文件失败:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: '文件不存在' };
});

ipcMain.handle('show-download-in-folder', async (event, downloadId) => {
    const downloads = store.get('downloads', []);
    const download = downloads.find(d => d.id === downloadId);
    if (download && download.filePath) {
        try {
            shell.showItemInFolder(download.filePath);
            console.log('在文件夹中显示:', download.filePath);
            return { success: true };
        } catch (error) {
            console.error('显示文件夹失败:', error);
            return { success: false, error: error.message };
        }
    }
    return { success: false, error: '文件不存在' };
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
    if (action === 'devtools') {
        // 切换主窗口的开发者工具
        if (mainWindow.webContents.isDevToolsOpened()) {
            mainWindow.webContents.closeDevTools();
        } else {
            mainWindow.webContents.openDevTools();
        }
    }
});

ipcMain.handle('get-preload-path', () => {
    return path.join(__dirname, 'preload.js');
});

ipcMain.handle('get-window-bounds', () => {
    if (!mainWindow) return { x: 0, y: 0 };
    const bounds = mainWindow.getBounds();
    return { x: bounds.x, y: bounds.y };
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