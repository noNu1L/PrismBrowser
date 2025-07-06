<template>
  <el-container style="height: 100vh;">
    <el-header height=40px style="padding: 0; margin: 0 ">
      <TabsBar />
    </el-header>
    <el-header height="auto" style="padding: 0;">
      <AddressBar />
    </el-header>
    <el-main style="padding: 0; position: relative; background-color: #ffffff;">
      <!-- 为每个标签创建独立的webview -->
      <div 
        v-for="tab in tabs"
        :key="tab.id"
        :style="{
          width: '100%',
          height: '100%',
          position: 'absolute',
          top: 0,
          left: 0,
          transform: tab.active ? 'translateX(0)' : 'translateX(-100vw)',
          transition: 'none',
          zIndex: tab.active ? 1 : 0,
          backgroundColor: '#ffffff'
        }"
      >
        <webview
          :id="`webview-${tab.id}`"
          :src="tab.url"
          :data-active="tab.active"
          style="width: 100%; height: 100%; background-color: #ffffff;"
          webpreferences="contextIsolation=false,scrollBounce=true"
          @dom-ready="onWebviewReady(tab.id)"
        ></webview>
      </div>
    </el-main>
  </el-container>
</template>

<script setup>
import { computed, onMounted, watch, nextTick } from 'vue'
import TabsBar from './TabsBar.vue'
import AddressBar from './AddressBar.vue'
import { useTabsStore } from '../../store/tabsStore'

const tabsStore = useTabsStore()

const tabs = computed(() => tabsStore.tabs)
const activeTabId = computed(() => tabsStore.activeTabId)

// 监听标签变化，为新标签创建webview
watch(() => tabs.value.length, async () => {
  await nextTick()
  setupWebviews()
})

// 监听标签URL变化
watch(() => tabs.value.map(tab => ({ id: tab.id, url: tab.url })), (newTabs, oldTabs) => {
  newTabs.forEach(newTab => {
    const oldTab = oldTabs?.find(t => t.id === newTab.id)
    if (oldTab && oldTab.url !== newTab.url) {
      const webview = document.getElementById(`webview-${newTab.id}`)
      if (webview && webview.src !== newTab.url) {
        webview.src = newTab.url
      }
    }
  })
}, { deep: true })

function onWebviewReady(tabId) {
  const webview = document.getElementById(`webview-${tabId}`)
  if (!webview) return

  // 注入CSS来修复滚动条背景
  const scrollbarCSS = `
    ::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    ::-webkit-scrollbar-track {
      background: #f1f1f1 !important;
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb {
      background: #c1c1c1 !important;
      border-radius: 10px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #a8a8a8 !important;
    }
    ::-webkit-scrollbar-corner {
      background: #f1f1f1 !important;
    }
    html, body {
      background-color: #ffffff !important;
    }
  `

  // 监听DOM就绪后注入样式
  webview.addEventListener('dom-ready', () => {
    webview.insertCSS(scrollbarCSS)
  })

  // 监听导航状态变化
  webview.addEventListener('did-navigate', () => {
    updateNavigationState(tabId, webview)
    updateTabInfo(tabId, webview)
    // 导航后重新注入样式
    setTimeout(() => {
      webview.insertCSS(scrollbarCSS)
    }, 100)
  })

  webview.addEventListener('did-navigate-in-page', () => {
    updateNavigationState(tabId, webview)
    updateTabInfo(tabId, webview)
  })

  // 监听标题变化
  webview.addEventListener('page-title-updated', () => {
    updateTabInfo(tabId, webview)
  })

  // 监听加载状态
  webview.addEventListener('did-start-loading', () => {
    tabsStore.updateTab(tabId, { loading: true })
  })

  webview.addEventListener('did-stop-loading', () => {
    tabsStore.updateTab(tabId, { loading: false })
    updateNavigationState(tabId, webview)
    updateTabInfo(tabId, webview)
    // 加载完成后重新注入样式
    setTimeout(() => {
      webview.insertCSS(scrollbarCSS)
    }, 100)
  })

  // 立即注入样式
  setTimeout(() => {
    webview.insertCSS(scrollbarCSS)
    updateNavigationState(tabId, webview)
    updateTabInfo(tabId, webview)
  }, 100)
}

function updateNavigationState(tabId, webview) {
  if (!webview || !webview.canGoBack) return
  
  const canGoBack = webview.canGoBack()
  const canGoForward = webview.canGoForward()
  
  tabsStore.updateTab(tabId, {
    canGoBack,
    canGoForward
  })
}

function updateTabInfo(tabId, webview) {
  if (!webview) return
  
  const url = webview.getURL()
  const title = webview.getTitle() || '新标签页'
  
  tabsStore.updateTab(tabId, {
    url,
    title: title.length > 20 ? title.substring(0, 20) + '...' : title
  })
}

function setupWebviews() {
  // 确保所有webview都已经准备好
  tabs.value.forEach(tab => {
    const webview = document.getElementById(`webview-${tab.id}`)
    if (webview && webview.nodeType === 1) {
      // webview已存在，确保事件监听器已添加
      if (!webview.dataset.eventsAdded) {
        onWebviewReady(tab.id)
        webview.dataset.eventsAdded = 'true'
      }
    }
  })
}

onMounted(() => {
  // 初始化API处理
  if (window.api) {
    // 处理导航请求
    window.api.navigateWebview = (tabId, url) => {
      const webview = document.getElementById(`webview-${tabId}`)
      if (webview) {
        webview.src = url
      }
    }
    
    // 处理后退请求
    window.api.webviewGoBack = (tabId) => {
      const webview = document.getElementById(`webview-${tabId}`)
      if (webview && webview.canGoBack()) {
        webview.goBack()
      }
    }
    
    // 处理前进请求
    window.api.webviewGoForward = (tabId) => {
      const webview = document.getElementById(`webview-${tabId}`)
      if (webview && webview.canGoForward()) {
        webview.goForward()
      }
    }
    
    // 处理刷新请求
    window.api.webviewReload = (tabId) => {
      const webview = document.getElementById(`webview-${tabId}`)
      if (webview) {
        webview.reload()
      }
    }
    
    // 处理强制刷新请求
    window.api.webviewReloadIgnoringCache = (tabId) => {
      const webview = document.getElementById(`webview-${tabId}`)
      if (webview) {
        webview.reloadIgnoringCache()
      }
    }
    
    // 处理停止加载请求
    window.api.webviewStop = (tabId) => {
      const webview = document.getElementById(`webview-${tabId}`)
    if (webview) {
        webview.stop()
      }
    }
    
    // 处理开发者工具切换
    window.api.onToggleWebViewDevTools?.(() => {
      const activeWebview = document.getElementById(`webview-${activeTabId.value}`)
      if (activeWebview) {
        if (activeWebview.isDevToolsOpened()) {
          activeWebview.closeDevTools()
      } else {
          activeWebview.openDevTools()
      }
    }
  })
  }
  
  // 延迟设置webview事件监听器，确保DOM已渲染
  setTimeout(setupWebviews, 100)
})
</script>

<style scoped>
/* 使用Element Plus的基础样式，不自定义 */

/* 修复webview滚动条样式 */
webview {
  background-color: #ffffff;
}

/* 确保非活动webview不会影响滚动条 */
webview:not([data-active="true"]) {
  pointer-events: none !important;
}

/* 为活动webview设置正确的背景 */
webview[data-active="true"] {
  background-color: #ffffff;
  pointer-events: auto !important;
}
</style> 