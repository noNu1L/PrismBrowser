<template>
  <div class="address-input-demo">
    <h2>地址输入框组件演示</h2>
    
    <div class="demo-section">
      <h3>基本用法</h3>
      <div class="demo-container">
        <AddressInput 
          :tab-id="demoTabId"
          @navigate="handleNavigate"
        />
      </div>
      <p>输入网址或搜索内容，按回车键导航</p>
    </div>
    
    <div class="demo-section">
      <h3>导航历史</h3>
      <div class="history-list">
        <div v-for="(item, index) in navigationHistory" :key="index" class="history-item">
          <span class="history-url">{{ item.url }}</span>
          <span class="history-time">{{ item.time }}</span>
        </div>
      </div>
    </div>
    
    <div class="demo-section">
      <h3>当前标签信息</h3>
      <div class="tab-info">
        <p><strong>标签ID:</strong> {{ demoTabId }}</p>
        <p><strong>当前URL:</strong> {{ currentTab?.url || '无' }}</p>
        <p><strong>标题:</strong> {{ currentTab?.title || '无' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTabsStore } from '../../store/tabsStore'
import { AddressInput } from '../../components'

const tabsStore = useTabsStore()
const navigationHistory = ref([])

// 创建一个演示标签ID
const demoTabId = ref('demo-tab-1')

// 计算当前标签
const currentTab = computed(() => {
  return tabsStore.tabs.find(tab => tab.id === demoTabId.value)
})

// 处理导航事件
function handleNavigate(url) {
  console.log('导航到:', url)
  
  // 添加到导航历史
  navigationHistory.value.unshift({
    url,
    time: new Date().toLocaleTimeString()
  })
  
  // 限制历史记录数量
  if (navigationHistory.value.length > 10) {
    navigationHistory.value = navigationHistory.value.slice(0, 10)
  }
  
  // 更新标签URL
  tabsStore.updateTab(demoTabId.value, { url })
}
</script>

<style scoped>
.address-input-demo {
  padding: 20px;
  max-width: 800px;
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

.demo-container {
  margin: 15px 0;
  padding: 15px;
  background-color: white;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.history-item:last-child {
  border-bottom: none;
}

.history-url {
  font-family: monospace;
  color: #0066cc;
}

.history-time {
  color: #666;
  font-size: 0.9em;
}

.tab-info {
  background-color: white;
  padding: 15px;
  border-radius: 4px;
  border: 1px solid #ddd;
}

.tab-info p {
  margin: 5px 0;
}
</style> 