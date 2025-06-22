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
  // --- Bookmarks ---
  getBookmarks: () => ipcRenderer.invoke('get-bookmarks'),
  addBookmark: (bookmark) => ipcRenderer.invoke('add-bookmark', bookmark),
  deleteBookmark: (url) => ipcRenderer.invoke('delete-bookmark', url),
  // --- History ---
  getHistory: () => ipcRenderer.invoke('get-history'),
  addHistory: (item) => ipcRenderer.invoke('add-history', item),
  deleteHistoryItem: (url) => ipcRenderer.invoke('delete-history-item', url),
  clearHistory: () => ipcRenderer.invoke('clear-history'),
  openInNewTab: (url) => ipcRenderer.send('open-in-new-tab', url),
  onHistoryUpdated: (callback) => {
    ipcRenderer.on('history-updated', (_event) => callback());
  },
  onNewTabRequest: (callback) => {
    ipcRenderer.on('new-tab-request', (_event, url) => callback(url));
  },
  // --- Window ---
  sendWindowControl: (action) => ipcRenderer.send('window-control', action),
  // openLogWindow: () => ipcRenderer.send('open-log-window'), // No longer needed
});

window.addEventListener('DOMContentLoaded', () => {
    // You can add code here to run when the renderer process's DOM is ready.
    console.log('Preload script loaded and API exposed.');
}); 