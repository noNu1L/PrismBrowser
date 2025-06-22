const { app, BrowserWindow, session } = require('electron');
const { spawn } = require('child_process');
const path = require('path');

let clashProcess = null;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
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

  mainWindow.loadFile('renderer/index.html');
}

function startClash() {
  // Path to the Clash.Meta executable, assuming it's for Windows and in the 'clash-meta' directory.
  const clashExe = 'mihomo.exe';
  const clashPath = path.join(__dirname, 'clash-meta', clashExe);
  const configPath = path.join(__dirname, 'clash-meta', 'config.yaml');

  console.log(`Starting Mihomo (Clash.Meta) from: ${clashPath}`);

  // Start the Mihomo process.
  // The '-d' argument specifies the directory where config.yaml is located.
  clashProcess = spawn(clashPath, ['-d', path.join(__dirname, 'clash-meta')]);

  clashProcess.stdout.on('data', (data) => {
    console.log(`Mihomo stdout: ${data}`);
  });

  clashProcess.stderr.on('data', (data) => {
    console.error(`Mihomo stderr: ${data}`);
  });

  clashProcess.on('close', (code) => {
    console.log(`Mihomo process exited with code ${code}`);
    clashProcess = null;
  });

  clashProcess.on('error', (err) => {
    console.error('Failed to start Mihomo process.', err);
  });
}

function stopClash() {
  if (clashProcess) {
    console.log('Stopping Mihomo process...');
    clashProcess.kill();
    clashProcess = null;
  }
}

app.whenReady().then(async () => {
  // Start Mihomo first.
  startClash();

  // Configure the proxy for all HTTP and HTTPS traffic.
  // This must be done after the app is ready.
  // We assume Mihomo is running on port 7890 (a common default).
  const proxyRules = 'http=127.0.0.1:7890;https=127.0.0.1:7890';
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