const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

// 性能优化：确保硬件加速开启
if (!app.disableHardwareAcceleration) {
  console.log('硬件加速已启用');
} else {
  console.warn('硬件加速被禁用，可能影响拖拽性能');
}

// 允许不安全的HTTP资源（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  app.commandLine.appendSwitch('allow-running-insecure-content');
}

// 启用GPU进程
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
      // 启用硬件加速和性能优化
      hardwareAcceleration: true,
      enableBlinkFeatures: 'CSSContainment',
      // 禁用不必要的功能以提升性能
      enableRemoteModule: false,
      backgroundThrottling: false
    }
  });

  // 加载主界面（开发时用 Vite 服务器，打包后用构建文件）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/layout/index.html'));
  }
  
  // 监听主程序开发者工具事件
  ipcMain.on('toggle-main-devtools', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  // 转发前端开发者工具事件
  ipcMain.on('toggle-renderer-devtools', () => {
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('toggle-webview-devtools');
    }
  });

  // 窗口控制事件处理
  ipcMain.on('window-control', (event, action) => {
    if (!mainWindow) return;
    
    switch (action) {
      case 'minimize':
        mainWindow.minimize();
        break;
      case 'maximize':
        if (mainWindow.isMaximized()) {
          mainWindow.unmaximize();
        } else {
          mainWindow.maximize();
        }
        break;
      case 'close':
        mainWindow.close();
        break;
    }
  });

  // 窗口关闭处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('主窗口已创建');
}

// 应用准备就绪
app.whenReady().then(() => {
  createWindow();
  console.log('PrismBrowser 启动完成');
  console.log('硬件加速状态:', !app.disableHardwareAcceleration);
});

// 所有窗口关闭
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 应用激活（macOS）
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

module.exports = { mainWindow }; 