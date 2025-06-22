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
});

window.addEventListener('DOMContentLoaded', () => {
    // You can add code here to run when the renderer process's DOM is ready.
    console.log('Preload script loaded and API exposed.');
}); 