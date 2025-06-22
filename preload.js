// All of the Node.js APIs are available in the preload process.
// It has the same sandbox as a Chrome extension.
// We can use the contextBridge to expose specific functions to the renderer process
// for safe communication with the main process.

window.addEventListener('DOMContentLoaded', () => {
    // You can add code here to run when the renderer process's DOM is ready.
    console.log('Preload script loaded.');
}); 