<template>
  <div class="prism-plugin-demo">
    <h2>$prism 全局插件演示</h2>
    
    <div class="demo-section">
      <h3>标签页管理 ($prism.tab)</h3>
      <div class="info-box">
        <p><strong>活动标签ID:</strong> {{ activeTabId }}</p>
        <p><strong>标签总数:</strong> {{ tabCount }}</p>
        <p><strong>当前标签URL:</strong> {{ currentTabUrl }}</p>
      </div>
      
      <div class="button-group">
        <button class="btn btn-primary" @click="createNewTab">创建新标签</button>
        <button class="btn btn-info" @click="logAllTabs">打印所有标签</button>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>地址栏按钮管理 ($prism['address-bar'])</h3>
      <div class="info-box">
        <p><strong>后退按钮状态:</strong> {{ backButtonStatus }}</p>
        <p><strong>前进按钮状态:</strong> {{ forwardButtonStatus }}</p>
      </div>
      
      <div class="button-group">
        <button class="btn btn-success" @click="toggleHomeButton">切换主页按钮显示</button>
        <button class="btn btn-warning" @click="disableBackButton">禁用后退按钮</button>
        <button class="btn btn-danger" @click="enableBackButton">启用后退按钮</button>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>控制台输出</h3>
      <div class="console-output">
        <pre>{{ consoleOutput }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, getCurrentInstance } from 'vue'
import { AddressBarButtonType } from '../../models/addressBarButton'

// 获取 $prism 全局对象
const { proxy } = getCurrentInstance()
const $prism = proxy.$prism

// 响应式数据
const consoleOutput = ref('控制台输出将显示在这里...\n')

// 计算属性 - 标签相关
const activeTabId = computed(() => $prism.tab.activeTabId)
const tabCount = computed(() => $prism.tab.tabs.length)
const currentTabUrl = computed(() => {
  const currentTab = $prism.tab.tabs.find(tab => tab.id === activeTabId.value)
  return currentTab?.url || '无'
})

// 计算属性 - 地址栏相关
const backButtonStatus = computed(() => {
  const backButton = $prism['address-bar'].buttons.find(
    btn => btn.type === AddressBarButtonType.BACK
  )
  return backButton ? `显示: ${backButton.show}, 禁用: ${backButton.disabled}` : '未找到'
})

const forwardButtonStatus = computed(() => {
  const forwardButton = $prism['address-bar'].buttons.find(
    btn => btn.type === AddressBarButtonType.FORWARD
  )
  return forwardButton ? `显示: ${forwardButton.show}, 禁用: ${forwardButton.disabled}` : '未找到'
})

// 方法
function log(message) {
  consoleOutput.value += `[${new Date().toLocaleTimeString()}] ${message}\n`
  console.log(message)
}

function createNewTab() {
  const newTabId = `tab-${Date.now()}`
  $prism.tab.addTab({
    id: newTabId,
    title: '新标签页',
    url: 'https://www.example.com'
  })
  log(`创建新标签: ${newTabId}`)
}

function logAllTabs() {
  log('所有标签:')
  $prism.tab.tabs.forEach((tab, index) => {
    log(`  ${index + 1}. ${tab.title} (${tab.id}) - ${tab.url}`)
  })
}

function toggleHomeButton() {
  const homeButton = $prism['address-bar'].buttons.find(
    btn => btn.type === AddressBarButtonType.HOME
  )
  if (homeButton) {
    $prism['address-bar'].setButtonVisible(AddressBarButtonType.HOME, !homeButton.show)
    log(`主页按钮显示状态切换为: ${!homeButton.show}`)
  }
}

function disableBackButton() {
  $prism['address-bar'].setButtonDisabled(AddressBarButtonType.BACK, true)
  log('后退按钮已禁用')
}

function enableBackButton() {
  $prism['address-bar'].setButtonDisabled(AddressBarButtonType.BACK, false)
  log('后退按钮已启用')
}

// 初始化时输出信息
log('$prism 插件演示页面已加载')
log(`当前 $prism 对象包含: ${Object.keys($prism).join(', ')}`)
</script>

<style scoped>
.prism-plugin-demo {
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.demo-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  background-color: #fafafa;
}

.demo-section h3 {
  margin-top: 0;
  color: #333;
}

.info-box {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
  margin-bottom: 15px;
}

.info-box p {
  margin: 5px 0;
  font-family: monospace;
}

.button-group {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.btn {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-success {
  background-color: #28a745;
  color: white;
}

.btn-success:hover {
  background-color: #218838;
}

.btn-warning {
  background-color: #ffc107;
  color: #212529;
}

.btn-warning:hover {
  background-color: #e0a800;
}

.btn-danger {
  background-color: #dc3545;
  color: white;
}

.btn-danger:hover {
  background-color: #c82333;
}

.btn-info {
  background-color: #17a2b8;
  color: white;
}

.btn-info:hover {
  background-color: #138496;
}

.console-output {
  background-color: #1e1e1e;
  color: #d4d4d4;
  padding: 15px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  max-height: 300px;
  overflow-y: auto;
}

.console-output pre {
  margin: 0;
  white-space: pre-wrap;
}
</style> 