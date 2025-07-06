<template>
  <div class="address-input-wrapper">
    <input 
      type="text" 
      class="address-input" 
      placeholder="搜索或输入网址"
      v-model="inputValue"
      @keydown.enter="handleEnter"
      @focus="handleFocus"
      @blur="handleBlur"
      ref="inputRef"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()
const inputRef = ref(null)
const inputValue = ref('')
const isEditing = ref(false)

// 监听活动标签变化，更新输入框内容
watch(() => tabsStore.activeTabId, () => {
  if (!isEditing.value) {
    updateInputFromCurrentTab()
  }
})

// 监听标签URL变化
watch(() => tabsStore.tabs.map(tab => ({ id: tab.id, url: tab.url })), () => {
  if (!isEditing.value) {
    updateInputFromCurrentTab()
  }
}, { deep: true })

function updateInputFromCurrentTab() {
  const activeTab = tabsStore.tabs.find(tab => tab.id === tabsStore.activeTabId)
  if (activeTab) {
    inputValue.value = activeTab.url
  }
}

function handleEnter() {
  const url = processUrl(inputValue.value.trim())
  if (url) {
    console.log(`[AddressInput] Navigating to: ${url}`)
    navigateActiveTab(url)
    inputRef.value?.blur()
  }
}

function handleFocus() {
  isEditing.value = true
}

function handleBlur() {
  isEditing.value = false
  // 失去焦点时恢复显示当前页面URL
  updateInputFromCurrentTab()
}

function processUrl(input) {
  if (!input) return ''
  
  // 如果已经是完整的URL
  if (input.startsWith('http://') || input.startsWith('https://')) {
    return input
  }
  
  // 如果看起来是域名
  if (input.includes('.') && !input.includes(' ')) {
    return `https://${input}`
  }
  
  // 否则作为搜索查询
  return `https://www.bing.com/search?q=${encodeURIComponent(input)}`
}

function navigateActiveTab(url) {
  const activeTabId = tabsStore.activeTabId
  if (activeTabId) {
    console.log(`[AddressInput] Updating tab ${activeTabId} with URL: ${url}`)
    
    // 直接更新 webview 的 src
    const webview = document.getElementById(`webview-${activeTabId}`)
    if (webview) {
      console.log(`[AddressInput] Found webview, setting src to: ${url}`)
      webview.src = url
      // 同时更新 store 中的状态
      tabsStore.updateTab(activeTabId, { url, loading: true })
    } else {
      console.error(`[AddressInput] Webview not found for tab ${activeTabId}`)
    }
  } else {
    console.error('[AddressInput] No active tab found')
  }
}

onMounted(() => {
  updateInputFromCurrentTab()
  console.log('[AddressInput] Component mounted and initialized')
})
</script>

<style scoped>
.address-input-wrapper {
  flex: 1;
  min-width: 0; /* 修复flex布局下的宽度计算问题 */
  margin: 0 8px;
}
.address-input {
  width: 100%;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 0 12px;
  background-color: white;
  box-sizing: border-box; /* 确保padding和border不影响宽度 */
}
</style> 