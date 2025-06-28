<template>
  <el-container style="height: 100vh;">
    <el-header height=40px style="padding: 0; margin: 0 ">
      <TabsBar />
    </el-header>
<!--    <el-header height="auto" style="padding: 0;">-->
<!--      <AddressBar />-->
<!--    </el-header>-->
    <el-main style="padding: 0;">
      <webview id="main-webview" src="https://www.bing.com" style="width: 100%; height: 100%;" webpreferences="contextIsolation=false"></webview>
    </el-main>
  </el-container>
</template>

<script setup>
import TabsBar from './TabsBar.vue'
import AddressBar from './AddressBar.vue'
</script>

<style scoped>
/* 使用Element Plus的基础样式，不自定义 */
</style> 