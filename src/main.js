const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

let mainWindow = null;

// 强制启用硬件加速
app.commandLine.appendSwitch('enable-gpu-sandbox');

// Electron性能优化命令行参数
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-compositor-resources');
app.commandLine.appendSwitch('enable-gpu-memory-buffer-video-frames');

// 强制使用硬件加速
app.commandLine.appendSwitch('disable-software-rasterizer');
app.commandLine.appendSwitch('enable-hardware-overlays');

// 提高渲染性能
app.commandLine.appendSwitch('enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('disable-features', 'VizDisplayCompositor');

// V8性能优化
app.commandLine.appendSwitch('js-flags', '--max-old-space-size=4096');
app.commandLine.appendSwitch('js-flags', '--optimize-for-size');

// 禁用一些不必要的功能以提高性能
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// 允许不安全的HTTP资源（仅开发环境）
if (process.env.NODE_ENV === 'development') {
  app.commandLine.appendSwitch('ignore-certificate-errors');
  // app.commandLine.appendSwitch('allow-running-insecure-content');
  // 开发环境额外优化
  app.commandLine.appendSwitch('disable-web-security');
  // app.commandLine.appendSwitch('enable-logging');
}

// 检查硬件加速状态
if (!app.disableHardwareAcceleration) {
  console.log('Hardware acceleration enabled');
} else {
  console.warn('Hardware acceleration disabled, may affect drag performance');
}

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

      // 硬件加速强制启用
      hardwareAcceleration: true,

      // 性能关键优化
      enableBlinkFeatures: 'CSSContainment,CompositingOptimizations,LayoutNG',
      disableBlinkFeatures: 'Auxclick', // 禁用不必要的功能

      // 渲染进程优化
      backgroundThrottling: false,
      offscreen: false,

      // V8引擎优化
      v8CacheOptions: 'code',

      // 禁用不必要的功能提升性能
      enableRemoteModule: false,
      allowRunningInsecureContent: process.env.NODE_ENV === 'development',
      webSecurity: process.env.NODE_ENV !== 'development',

      // 内存和缓存优化
      partition: 'persist:main',

      // 实验性功能（可能提升性能）
      experimentalFeatures: true,

      // 额外的性能优化
      additionalArguments: [
        '--enable-gpu-rasterization',
        '--enable-zero-copy',
        '--disable-software-rasterizer',
        '--enable-hardware-overlays'
      ]
    }
  });

  // 性能优化：设置窗口属性
  // mainWindow.setBackgroundColor('#e8e8e8'); // 避免白屏闪烁

  // 加载主界面（开发时用 Vite 服务器，打包后用构建文件）
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/layout/index.html'));
  }

  // 性能监控和优化
  mainWindow.webContents.once('did-finish-load', () => {
    console.log('✅ Window loaded successfully');

    // 强制启用硬件加速
    mainWindow.webContents.executeJavaScript(`
      // 检查GPU加速状态
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (gl) {
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          console.log('🎮 GPU Renderer:', gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL));
          console.log('🎮 GPU Vendor:', gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL));
        }
      }
      
      // 性能优化提示
      if (navigator.hardwareConcurrency) {
        console.log('💻 CPU Cores:', navigator.hardwareConcurrency);
      }
      
      // 内存信息
      if (performance.memory) {
        console.log('💾 JS Memory Usage:', Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) + 'MB');
        console.log('💾 JS Memory Limit:', Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024) + 'MB');
      }
    `);
  });

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

  console.log('Main window created');
}

// 应用准备就绪
app.whenReady().then(() => {
  // 设置应用级别的性能优化
  app.setAppUserModelId('com.prismbrowser.app');

  // 检查系统性能信息
  const cpuUsage = process.getCPUUsage();
  const memoryUsage = process.getProcessMemoryInfo();

  console.log(' PrismBrowser starting...');
  console.log('System Information:');
  console.log('   - Platform:', process.platform);
  console.log('   - Architecture:', process.arch);
  console.log('   - Electron Version:', process.versions.electron);
  console.log('   - Chrome Version:', process.versions.chrome);
  console.log('   - Hardware Acceleration:', !app.disableHardwareAcceleration ? 'Enabled' : 'Disabled');


  memoryUsage.then(memory => {
    console.log('   - Memory Usage:', Math.round(memory.workingSetSize / 1024 / 1024) + 'MB');
  });

  createWindow();
  console.log('✅ PrismBrowser started successfully');
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