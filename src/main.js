const { app, BrowserWindow, session, ipcMain, screen, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const { default: Store } = require('electron-store');
const fs = require('fs');

const store = new Store();
let clashProcess = null;
let mainWindow = null;
let bookmarkPopup = null;
let addFolderPopup = null;

function getHomePage() {
    const option = store.get('settings.homepageOption', 'custom');
    if (option === 'blank') {
        return 'about:blank';
    } else if (option === 'custom') {
        return store.get('settings.homepageCustomUrl', 'https://www.bing.com');
    }
    return 'https://www.bing.com';
}

function getNewTabPageUrl() {
    const option = store.get('settings.newtabOption', 'blank');
    if (option === 'blank') {
        return 'about:blank';
    } else if (option === 'custom') {
        return store.get('settings.newtabCustomUrl', 'https://www.bing.com');
    }
    return 'about:blank';
}

function getStartupUrl() {
    const option = store.get('settings.startupOption', 'homepage');
    if (option === 'blank') {
        return 'about:blank';
    } else if (option === 'homepage') {
        return getHomePage();
    } else if (option === 'restore') {
        // 会话恢复模式，返回特殊标识
        return 'session:restore';
    } else if (option === 'custom') {
        return store.get('settings.startupCustomUrl', 'https://www.bing.com');
    }
    return getHomePage();
}

// 保存会话状态
function saveSessionState(sessionData) {
    // 如果传入的是数组（旧格式），转换为新格式
    if (Array.isArray(sessionData)) {
        sessionData = {
            tabs: sessionData,
            activeTabIndex: 0
        };
    }
    
    // 添加时间戳
    const finalSessionData = {
        tabs: sessionData.tabs,
        activeTabIndex: sessionData.activeTabIndex || 0,
        timestamp: new Date().toISOString()
    };
    
    store.set('sessionState', finalSessionData);
}

// 获取会话状态
function getSessionState() {
    return store.get('sessionState', null);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // 为安全起见，建议将 contextIsolation 设置为 true。
      contextIsolation: true,
      // nodeIntegration 应设置为 false。
      nodeIntegration: false,
      // 启用 webview 标签。
      webviewTag: true
    }
  });

  // 增加主窗口 webContents 的最大监听器数量
  mainWindow.webContents.setMaxListeners(100);

  // 监听新的 webContents 创建（包括 webview）
  app.on('web-contents-created', (event, contents) => {
    // 为每个新的 webContents 设置更高的最大监听器数量
    contents.setMaxListeners(100);
    
    // 处理新窗口请求
    contents.setWindowOpenHandler(({ url }) => {
      console.log('Main process: Window open request for URL:', url);
      
      // 阻止创建新窗口，而是发送消息给渲染进程创建新标签页
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('create-new-tab', url);
      }
      
      // 返回 { action: 'deny' } 阻止创建新窗口
      return { action: 'deny' };
    });
  });

  mainWindow.loadFile(path.join(__dirname, 'views/layout-index.html'));
  
  // 添加开发者工具快捷键支持
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'i') {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 监听窗口失去焦点事件
  mainWindow.on('blur', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('window-blurred');
    }
  });

  // 监听主session和webview session的下载事件
  const mainSession = session.fromPartition('persist:main');
  const defaultSession = session.defaultSession;
  
  // 下载处理函数
  const handleDownload = (event, item, webContents) => {
    console.log('Main process detected download:', item.getFilename());
    
    // 设置下载路径到用户的下载文件夹，避免显示保存对话框
    const downloadsPath = app.getPath('downloads');
    const originalFilename = item.getFilename();
    
    // 处理重复文件名
    let filename = originalFilename;
    let counter = 1;
    let filePath = path.join(downloadsPath, filename);
    
    // 检查文件是否已存在，如果存在则添加数字后缀
    while (fs.existsSync(filePath)) {
      const ext = path.extname(originalFilename);
      const nameWithoutExt = path.basename(originalFilename, ext);
      filename = `${nameWithoutExt} (${counter})${ext}`;
      filePath = path.join(downloadsPath, filename);
      counter++;
    }
    
    // 设置保存路径，这样就不会显示系统的保存对话框
    item.setSavePath(filePath);
    
    const downloadItem = {
      id: `download-${Date.now()}`,
      filename: filename,
      url: item.getURL(),
      status: 'downloading',
      startTime: new Date().toISOString(),
      totalBytes: item.getTotalBytes(),
      receivedBytes: item.getReceivedBytes(),
      speed: 0,
      filePath: filePath
    };

    // 保存到下载记录
    const downloads = store.get('downloads', []);
    downloads.unshift(downloadItem);
    store.set('downloads', downloads);

    // 通知渲染进程
    console.log('Sending download-started event to renderer:', downloadItem.filename);
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
      console.log('Download completed:', downloadItem.filename, 'Status:', downloadItem.status);
    });
  };
  
  // 为不同session设置下载监听
  mainSession.on('will-download', handleDownload);
  defaultSession.on('will-download', handleDownload);

  // --- 窗口关闭处理 ---
  let isAppClosing = false;
  
  // 窗口关闭前事件处理
  mainWindow.on('close', (event) => {
    if (!isAppClosing) {
      event.preventDefault();
      
      // 询问渲染进程是否需要保存会话状态并关闭
      mainWindow.webContents.send('app-before-quit');
    }
  });

  // 监听渲染进程的关闭确认
  ipcMain.on('confirm-app-close', () => {
    isAppClosing = true;
    stopClash(); // 停止Clash进程
    mainWindow.close();
  });

  // 监听最后一个标签页关闭事件
  ipcMain.on('last-tab-closed', () => {
    isAppClosing = true;
    stopClash(); // 停止Clash进程
    mainWindow.close();
  });

  // 标记应用异常关闭
  store.set('appCrashedLastTime', true);
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
        show: false, // 准备好后再显示
        alwaysOnTop: true, // 保持在最顶层
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
        }
    });

    bookmarkPopup.loadFile(path.join(__dirname, 'components/popups/add-bookmark-popup.html'));

    bookmarkPopup.once('ready-to-show', () => {
        // 确保位置设置在显示前生效
        if (data.buttonPosition) {
            bookmarkPopup.setPosition(x, y);
        }
        bookmarkPopup.show();
        // 发送初始数据到弹窗
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
        x: bounds.x + (bounds.width / 2) - 180, // 水平居中
        y: bounds.y + 150, // 定位到顶部附近
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

    addFolderPopup.loadFile(path.join(__dirname, 'components/popups/add-folder-popup.html'));

    addFolderPopup.once('ready-to-show', () => {
        addFolderPopup.show();
        addFolderPopup.webContents.send('popup-data', data);
    });

    addFolderPopup.on('closed', () => {
        addFolderPopup = null;
    });
}

function startClash(forceStart = false) {
  // 如果已经在运行，直接返回
  if (clashProcess) {
    console.log('Clash process is already running');
    return;
  }

  const clashExe = 'mihomo.exe';
  // 根据应用是否打包来确定基本路径。
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, 'clash-meta')
    : path.join(__dirname, 'vendor', 'clash-meta');

  const clashPath = path.join(basePath, clashExe);

  console.log(`Starting Mihomo (Clash.Meta) from: ${clashPath}`);

  // 启动 Mihomo 进程。
  // '-d' 参数指定 config.yaml 所在的目录。
  clashProcess = spawn(clashPath, ['-d', basePath]);

  let clashReady = false;
  const setProxy = () => {
      if (clashReady) return;
      clashReady = true;

      // 配置 Electron 使用代理
      const proxyPort = 17890;
      const proxyUrl = `http://127.0.0.1:${proxyPort}`;
      session.defaultSession.setProxy({
          proxyRules: proxyUrl,
          proxyBypassRules: '<local>' // 绕过本地地址
      }).then(() => {
          console.log(`Proxy configured to use: ${proxyUrl}`);
      }).catch(err => {
          console.error('Failed to set proxy:', err);
      });
  };

  clashProcess.stdout.on('data', (data) => {
    const logMessage = data.toString();
    console.log(`Mihomo stdout: ${logMessage}`);
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);

    // 检测到代理端口成功监听的日志后，再设置代理
    if (logMessage.includes('Mixed proxy listening at')) {
        setProxy();
    }
  });

  clashProcess.stderr.on('data', (data) => {
    const logMessage = `[STDERR] ${data.toString()}`;
    console.error(`Mihomo stderr: ${logMessage}`);
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);
  });

  // 设置一个超时，以防Clash因为某些原因没有输出成功日志
  setTimeout(() => {
      if (!clashReady) {
          console.warn('Clash process started but did not emit ready signal in time. Forcing proxy setup.');
          setProxy();
      }
  }, 5000); // 5秒后强制设置

  clashProcess.on('close', (code) => {
    const logMessage = `Mihomo process exited with code ${code}`;
    console.log(logMessage);
    clashProcess = null;
    console.error(logMessage);
    if (mainWindow) mainWindow.webContents.send('mihomo-log', logMessage);
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
  // 取消 Electron 的代理配置
  // session.defaultSession.setProxy({
  //     proxyRules: '' // 清空代理规则
  // }).then(() => {
  //     console.log('Proxy configuration cleared.');
  // }).catch(err => {
  //     console.error('Failed to clear proxy:', err);
  // });
}

// --- 默认设置初始化 ---
function initializeDefaultSettings() {
    console.log('Checking and initializing default settings...');
    
    // 定义所有默认设置
    const defaultSettings = {
        'settings.startupOption': 'homepage',
        'settings.startupCustomUrl': 'https://www.bing.com',
        'settings.homepageOption': 'custom',
        'settings.homepageCustomUrl': 'https://www.bing.com',
        'settings.newtabOption': 'blank',
        'settings.newtabCustomUrl': '',
        'settings.toolbar.showToggleLogs': true,
        'settings.toolbar.showFavorites': true,
        'settings.toolbar.showHistory': true,
        'settings.toolbar.showDownloads': true,
        'settings.toolbar.showSettings': true,
        'settings.toolbar.showHome': true
    };
    
    // 检查并设置默认值
    let hasInitialized = false;
    for (const [key, defaultValue] of Object.entries(defaultSettings)) {
        const currentValue = store.get(key);
        if (currentValue === undefined || currentValue === null) {
            store.set(key, defaultValue);
            console.log(`Initialized setting: ${key} = ${defaultValue}`);
            hasInitialized = true;
        }
    }
    
    if (hasInitialized) {
        console.log('Default settings initialization complete.');
    } else {
        console.log('All settings already exist, no initialization needed.');
    }
}

// --- IPC Handlers for Bookmarks (New Tree Structure) ---
function initializeBookmarks() {
    const bookmarks = store.get('bookmarks');
    // 一个更健壮的检查。如果数据不是数组，为空，或不包含必要的文件夹，则重置它。
    const hasToolbar = bookmarks && Array.isArray(bookmarks) && bookmarks.some(folder => folder.id === 'toolbar');
    const hasOther = bookmarks && Array.isArray(bookmarks) && bookmarks.some(folder => folder.id === 'other');

    if (!hasToolbar || !hasOther) {
        // 如果书签是旧格式、不存在或缺少必要的文件夹，则重置。
        store.set('bookmarks', [
            { id: 'toolbar', type: 'folder', title: '收藏栏', children: [] },
            { id: 'other', type: 'folder', title: '其他收藏', children: [] }
        ]);
    }
}

const PROTECTED_FOLDER_IDS = ['toolbar', 'other'];

// 递归搜索辅助函数
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

ipcMain.handle('add-bookmark', async (event, { parentId, title, url, favicon }) => {
    console.log('[Main] 添加书签请求:', { parentId, title, url, favicon });
    const bookmarks = store.get('bookmarks', []);
    const parentFolder = findItem(bookmarks, parentId)?.node;
    if (parentFolder && parentFolder.type === 'folder') {
        const newBookmark = { 
            id: `bm-${Date.now()}`, 
            type: 'bookmark', 
            title, 
            url,
            favicon: favicon || null // 添加favicon字段
        };
        console.log('[Main] 创建的书签对象:', newBookmark);
        parentFolder.children.push(newBookmark);
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('update-bookmark', async (event, { id, title, url, favicon }) => {
    console.log('[Main] 更新书签请求:', { id, title, url, favicon });
    const bookmarks = store.get('bookmarks', []);
    const item = findItem(bookmarks, id)?.node;
    if (item && item.type === 'bookmark') {
        item.title = title;
        item.url = url;
        if (favicon !== undefined) {
            item.favicon = favicon; // 更新favicon字段
        }
        console.log('[Main] 更新后的书签对象:', item);
        store.set('bookmarks', bookmarks);
        return { success: true };
    }
    return { success: false };
});

ipcMain.handle('delete-bookmarks', async (event, ids) => {
    let bookmarks = store.get('bookmarks', []);
    // 防止删除受保护的文件夹
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
    const parentFolder = findItem(bookmarks, parentId || 'other')?.node; // 如果没有父级，则默认为"其他"
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

// 注意：deleteBookmarkFolder 已被 deleteBookmarks 覆盖，所以我们需要在那里保护它。

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
    // 通知主窗口刷新其书签状态
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
        // 如果提供了特定的 URL，则打开它。否则，使用新标签页设置。
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

// --- 数据重置功能 ---
ipcMain.handle('show-confirm-dialog', async (event, options) => {
    const { dialog } = require('electron');
    if (!mainWindow) return { response: 1 }; // Fallback if no window
    return await dialog.showMessageBox(mainWindow, options);
});

ipcMain.handle('reset-all-data', async (event) => {
    try {
        const path = require('path');
        const fs = require('fs');
        
        console.log('Data initialization Start...');
        
        // 清空存储的所有数据
        store.clear();
        
        // 重新初始化必要的默认数据
        initializeDefaultSettings();
        initializeBookmarks();
        
        // 清空用户数据目录（缓存、Cookie等）
        const { app, session } = require('electron');
        const defaultSession = session.defaultSession;
        
        // 清除所有存储数据
        await defaultSession.clearStorageData({
            storages: [
                'appcache',
                'cookies',
                'filesystem',
                'indexdb',
                'localstorage',
                'shadercache',
                'websql',
                'serviceworkers',
                'cachestorage'
            ]
        });
        
        // 清除缓存
        await defaultSession.clearCache();
        
        console.log('Data initialization completed. Preparing to restart the application...');
        
        // 延迟一段时间后重启应用
        setTimeout(() => {
            app.relaunch();
            app.exit(0);
        }, 1000);
        
        return { success: true };
    } catch (error) {
        console.error('数据初始化失败:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-clash-config', async () => {
    try {
        const configPath = path.join(__dirname, 'vendor', 'clash-meta', 'config.yaml');
        const configData = await fs.promises.readFile(configPath, 'utf-8');
        return configData;
    } catch (error) {
        console.error('Error reading Clash config:', error);
        return `# 无法读取配置文件: ${error.message}`;
    }
});

ipcMain.handle('restart-clash', async () => {
    console.log('Restarting Clash process requested...');
    stopClash();
    // 在重新开始前给它一点时间释放资源
    setTimeout(() => {
        startClash();
    }, 500);
    return { success: true };
});

ipcMain.handle('toggle-proxy', async () => {
    try {
        if (clashProcess) {
            // 当前运行中，停止代理
            console.log('Stopping proxy process...');
            stopClash();
            return { success: true, action: 'stopped' };
        } else {
            // 当前未运行，启动代理
            console.log('Starting proxy process...');
            startClash();
            return { success: true, action: 'started' };
        }
    } catch (error) {
        console.error('Toggle proxy failed:', error);
        return { success: false, error: error.message };
    }
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

ipcMain.on('toggle-main-devtools', () => {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.toggleDevTools();
    }
});

// --- 会话恢复功能 ---
ipcMain.handle('save-session-state', async (event, sessionData) => {
    saveSessionState(sessionData);
    return { success: true };
});

ipcMain.handle('get-session-state', async () => {
    return getSessionState();
});

ipcMain.handle('clear-session-state', async () => {
    store.delete('sessionState');
    return { success: true };
});

// --- 异常关闭检测 ---
ipcMain.handle('check-crash-recovery', async () => {
    const appCrashedLastTime = store.get('appCrashedLastTime', false);
    return { crashed: appCrashedLastTime };
});

app.whenReady().then(() => {
  initializeDefaultSettings();
  initializeBookmarks();
  startClash(); // 已移除：不再自动启动代理
  createWindow();

  // 应用正常启动，清除异常关闭标记
  store.set('appCrashedLastTime', false);
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // 应用正常关闭，清除异常关闭标记
    store.set('appCrashedLastTime', false);
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// 确保在应用退出时停止 Mihomo 进程。
app.on('will-quit', () => {
  stopClash();
}); 