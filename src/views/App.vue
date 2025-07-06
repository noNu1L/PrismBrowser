<template>
  <IndexLayout />
</template>
<script setup>
import { onMounted, onUnmounted } from 'vue'
import IndexLayout from './layout/Index.vue'
import { useTabsStore } from '../store/tabsStore'

const tabsStore = useTabsStore()

// 快捷键处理函数
function handleKeyDown(event) {
  // F12 或 Ctrl+Shift+T 打开当前标签页的开发者工具
  if (event.key === 'F12' || 
      (event.ctrlKey && event.shiftKey && event.key === 'T')) {
    event.preventDefault()
    toggleCurrentWebViewDevTools()
  }
  // Ctrl+Shift+I 打开主程序开发者工具
  else if (event.ctrlKey && event.shiftKey && event.key === 'I') {
    event.preventDefault()
    if (window.api?.toggleMainDevTools) {
      window.api.toggleMainDevTools()
    }
  }
}

// 切换当前 webview 的开发者工具
function toggleCurrentWebViewDevTools() {
  const activeTabId = tabsStore.activeTabId
  if (activeTabId && window.api?.toggleWebViewDevTools) {
    console.log(`[App] Toggling devtools for tab: ${activeTabId}`)
    window.api.toggleWebViewDevTools(activeTabId)
  } else {
    console.warn('[App] No active tab or API not available')
  }
}

onMounted(() => {
  // 添加全局快捷键监听
  document.addEventListener('keydown', handleKeyDown)
  console.log('[App] Global keyboard shortcuts registered')
  
  // 监听来自主进程的 webview 开发者工具切换事件
  if (window.api?.onToggleWebViewDevTools) {
    window.api.onToggleWebViewDevTools((event, tabId) => {
      console.log(`[App] Received toggle webview devtools event for tab: ${tabId}`)
      const webview = document.getElementById(`webview-${tabId || tabsStore.activeTabId}`)
      if (webview) {
        if (webview.isDevToolsOpened && webview.isDevToolsOpened()) {
          webview.closeDevTools()
          console.log(`[App] Closed devtools for webview: ${tabId || tabsStore.activeTabId}`)
        } else {
          webview.openDevTools()
          console.log(`[App] Opened devtools for webview: ${tabId || tabsStore.activeTabId}`)
        }
      } else {
        console.warn(`[App] Webview not found: webview-${tabId || tabsStore.activeTabId}`)
      }
    })
  }
})

onUnmounted(() => {
  // 移除全局快捷键监听
  document.removeEventListener('keydown', handleKeyDown)
  console.log('[App] Global keyboard shortcuts unregistered')
})
</script> 