// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
// We can use the contextBridge to expose specific functions to the renderer process
// for safe communication with the main process.

const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer process.
contextBridge.exposeInMainWorld('api', {
  /**
   * Provide a function to the renderer that will be called every time a
   * 'mihomo-log' message is received from the main process.
   * @param {function(string)} callback The function to call with the log data.
   */
  onMihomoLog: (callback) => {
    ipcRenderer.on('mihomo-log', (_event, value) => callback(value));
  },
  // --- Bookmarks (Tree Structure) ---
  getBookmarksTree: () => ipcRenderer.invoke('get-bookmarks-tree'),
  addBookmark: (data) => ipcRenderer.invoke('add-bookmark', data),
  updateBookmark: (data) => ipcRenderer.invoke('update-bookmark', data),
  deleteBookmarks: (ids) => ipcRenderer.invoke('delete-bookmarks', ids),
  addBookmarkFolder: (data) => ipcRenderer.invoke('add-bookmark-folder', data),
  updateBookmarkFolder: (data) => ipcRenderer.invoke('update-bookmark-folder', data),
  // --- History ---
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
  // --- Downloads ---
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
  // --- Settings ---
  getSetting: (key) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key, value) => ipcRenderer.invoke('set-setting', { key, value }),
  getClashConfig: () => ipcRenderer.invoke('get-clash-config'),
  restartClash: () => ipcRenderer.invoke('restart-clash'),
  clearBrowsingData: (dataTypes) => ipcRenderer.invoke('clear-browsing-data', dataTypes),
  onSettingUpdated: (callback) => {
    ipcRenderer.on('setting-updated', (_event, { key, value }) => callback({ key, value }));
  },
  // --- Window ---
  sendWindowControl: (action) => ipcRenderer.send('window-control', action),
  getWindowBounds: () => ipcRenderer.invoke('get-window-bounds'),
  // openLogWindow: () => ipcRenderer.send('open-log-window'), // No longer needed
  // --- Popups ---
  openAddBookmarkPopup: (data) => ipcRenderer.send('open-add-bookmark-popup', data),
  openAddFolderPopup: (data) => ipcRenderer.send('open-add-folder-popup', data),
  onPopupData: (callback) => ipcRenderer.on('popup-data', (_event, data) => callback(data)),
  closePopupAndRefresh: () => ipcRenderer.send('close-popup-and-refresh'),
  onBookmarkUpdated: (callback) => ipcRenderer.on('bookmark-updated', () => callback()),
  getPreloadPath: () => ipcRenderer.invoke('get-preload-path'),
});

window.addEventListener('DOMContentLoaded', () => {
    // You can add code here to run when the renderer process's DOM is ready.
    console.log('Preload script loaded and API exposed.');
}); 