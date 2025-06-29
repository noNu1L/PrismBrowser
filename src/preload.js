// 在预加载进程中，所有 Node.js API 都是可用的。
// 它拥有与 Chrome 扩展程序相同的沙盒环境。
// 我们可以使用 contextBridge 将特定功能安全地暴露给渲染进程，
// 以便与主进程进行安全通信。

const { contextBridge, ipcRenderer } = require('electron');

// 向渲染器进程暴露一个安全的、有限的API。
contextBridge.exposeInMainWorld('api', {
  /**
   * 为渲染器提供一个函数，每当从主进程接收到 'mihomo-log' 消息时，该函数都将被调用。
   * @param {function(string)} callback 要使用日志数据调用的函数。
   */
  onMihomoLog: (callback) => {
    ipcRenderer.on('mihomo-log', (_event, value) => callback(value));
  },
  // --- 书签 (树状结构) ---
  getBookmarksTree: () => ipcRenderer.invoke('get-bookmarks-tree'),
  addBookmark: (data) => ipcRenderer.invoke('add-bookmark', data),
  updateBookmark: (data) => ipcRenderer.invoke('update-bookmark', data),
  deleteBookmarks: (ids) => ipcRenderer.invoke('delete-bookmarks', ids),
  addBookmarkFolder: (data) => ipcRenderer.invoke('add-bookmark-folder', data),
  updateBookmarkFolder: (data) => ipcRenderer.invoke('update-bookmark-folder', data),
  // --- 历史记录 ---
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (item) => ipcRenderer.invoke('add-history', item),
  deleteHistoryItems: (urls) => ipcRenderer.invoke('delete-history-items', urls),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  getRecentlyClosed: () => ipcRenderer.invoke('get-recently-closed'),
  addRecentlyClosed: (item) => ipcRenderer.invoke('add-recently-closed', item),
  openInNewTab: (url) => ipcRenderer.send('open-in-new-tab', url),
  onHistoryUpdated: (callback) => {
    ipcRenderer.on('history-updated', (_event) => callback());
  },
  onNewTabRequest: (callback) => {
    ipcRenderer.on('new-tab-request', (_event, url) => callback(url));
  },
  onCreateNewTab: (callback) => {
    ipcRenderer.on('create-new-tab', (_event, url) => callback(url));
  },
  // --- 下载 ---
  getDownloads: () => ipcRenderer.invoke('get-downloads'),
  addDownload: (item) => ipcRenderer.invoke('add-download', item),
  updateDownload: (id, data) => ipcRenderer.invoke('update-download', { id, data }),
  deleteDownload: (downloadId) => ipcRenderer.invoke('delete-download', downloadId),
  pauseDownload: (downloadId) => ipcRenderer.invoke('pause-download', downloadId),
  resumeDownload: (downloadId) => ipcRenderer.invoke('resume-download', downloadId),
  pauseAllDownloads: () => ipcRenderer.invoke('pause-all-downloads'),
  clearCompletedDownloads: () => ipcRenderer.invoke('clear-completed-downloads'),
  openDownloadFile: (downloadId) => ipcRenderer.invoke('open-download-file', downloadId),
  showDownloadInFolder: (downloadId) => ipcRenderer.invoke('show-download-in-folder', downloadId),
  onDownloadUpdated: (callback) => {
    ipcRenderer.on('download-updated', () => callback());
  },
  onDownloadStarted: (callback) => {
    ipcRenderer.on('download-started', (_event, downloadItem) => callback(downloadItem));
  },
  onDownloadProgress: (callback) => {
    ipcRenderer.on('download-updated', (_event, downloadItem) => callback(downloadItem));
  },
  onDownloadCompleted: (callback) => {
    ipcRenderer.on('download-completed', (_event, downloadItem) => callback(downloadItem));
  },
  // --- 设置 ---
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
  getClashConfig: () => ipcRenderer.invoke('get-clash-config'),
  restartClash: () => ipcRenderer.invoke('restart-clash'),
  toggleProxy: () => ipcRenderer.invoke('toggle-proxy'),
  clearBrowsingData: (dataTypes) => ipcRenderer.invoke('clear-browsing-data', dataTypes),
  resetAllData: () => ipcRenderer.invoke('reset-all-data'),
  onSettingUpdated: (callback) => {
    ipcRenderer.on('setting-updated', (_event, { key, value }) => callback({ key, value }));
  },
  showConfirmDialog: (options) => ipcRenderer.invoke('show-confirm-dialog', options),
  // --- 窗口 ---
  sendWindowControl: (action) => ipcRenderer.send('window-control', action),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  onWindowBlurred: (callback) => ipcRenderer.on('window-blurred', () => callback()),
  // openLogWindow: () => ipcRenderer.send('open-log-window'), // 不再需要
  // --- 弹窗 ---
  openAddBookmarkPopup: (data) => ipcRenderer.send('open-add-bookmark-popup', data),
  openAddFolderPopup: (data) => ipcRenderer.send('open-add-folder-popup', data),
  onPopupData: (callback) => ipcRenderer.on('popup-data', (_event, data) => callback(data)),
  closePopupAndRefresh: () => ipcRenderer.send('close-popup-and-refresh'),
  onBookmarkUpdated: (callback) => ipcRenderer.on('bookmark-updated', () => callback()),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
  // --- 开发者工具 ---
  toggleMainDevTools: () => ipcRenderer.send('toggle-main-devtools'),
  
  // --- 会话管理 ---
  saveSessionState: (sessionData) => ipcRenderer.invoke('save-session-state', sessionData),
  getSessionState: () => ipcRenderer.invoke('get-session-state'),
  clearSessionState: () => ipcRenderer.invoke('clear-session-state'),
  
  // --- 应用生命周期 ---
  checkCrashRecovery: () => ipcRenderer.invoke('check-crash-recovery'),
  confirmAppClose: () => ipcRenderer.send('confirm-app-close'),
  lastTabClosed: () => ipcRenderer.send('last-tab-closed'),
  onAppBeforeQuit: (callback) => ipcRenderer.on('app-before-quit', () => callback()),
  
  // --- 协议路由 ---
  onProtocolNavigate: (callback) => ipcRenderer.on('protocol-navigate', (_event, protocolUrl) => callback(protocolUrl)),

  // [GPT-4, 2024-06-28 19:30:00 Asia/Hong_Kong] 添加前端开发者工具API
  toggleRendererDevTools: () => ipcRenderer.send('toggle-renderer-devtools'),
  onToggleWebViewDevTools: (callback) => ipcRenderer.on('toggle-webview-devtools', callback)
});

window.addEventListener('DOMContentLoaded', () => {
    // 你可以在这里添加当渲染器进程的 DOM 准备就绪时运行的代码。
    console.log('Preload script loaded and API exposed.');
}); 