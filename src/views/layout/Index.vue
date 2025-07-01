<template>
  <el-container style="height: 100vh;">
    <el-header height=60px style="padding: 0; margin: 0 ">
      <TabsBar />
    </el-header>
    <el-header height="auto" style="padding: 0;">
      <AddressBar />
    </el-header>
    <el-main style="padding: 0;">
      <webview id="main-webview" src="https://www.bing.com" style="width: 100%; height: 100%;" webpreferences="contextIsolation=false"></webview>
    </el-main>
  </el-container>
</template>

<script setup>
import { onMounted } from 'vue'
import TabsBar from './TabsBar.vue'
import AddressBar from './AddressBar.vue'

// [GPT-4, 2024-06-28 19:30:00 Asia/Hong_Kong] 监听并打开webview开发者工具
onMounted(() => {
  window.api?.onToggleWebViewDevTools?.(() => {
    const webview = document.getElementById('main-webview')
    if (webview) {
      if (webview.isDevToolsOpened()) {
        webview.closeDevTools()
      } else {
        webview.openDevTools()
      }
    }
  })
})
</script>

<style scoped>
/* 使用Element Plus的基础样式，不自定义 */
</style> 