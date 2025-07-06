// 在预加载进程中，所有 Node.js API 都是可用的。
// 它拥有与 Chrome 扩展程序相同的沙盒环境。
// 我们可以使用 contextBridge 将特定功能安全地暴露给渲染进程，
// 以便与主进程进行安全通信。

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 渲染器 -> 主
  sendWindowControl: (action) => ipcRenderer.send('window-control', action),
  openInNewTab: (url) => ipcRenderer.send('open-in-new-tab', url),

  // 主 -> 渲染器
  onToggleWebViewDevTools: (callback) => ipcRenderer.on('toggle-webview-devtools', callback),

  // 开发者工具
  toggleMainDevTools: () => ipcRenderer.send('toggle-main-devtools'),
  toggleWebViewDevTools: (tabId) => ipcRenderer.send('toggle-webview-devtools', tabId),

  // electron-store
  getStore: (key) => ipcRenderer.invoke('getStore', key),
  setStore: (key, value) => ipcRenderer.invoke('setStore', key, value),
  clearStore: () => ipcRenderer.invoke('clearStore'),
});

window.addEventListener('DOMContentLoaded', () => {
    // 你可以在这里添加当渲染器进程的 DOM 准备就绪时运行的代码。
    console.log('Preload script loaded and API exposed.');
}); 