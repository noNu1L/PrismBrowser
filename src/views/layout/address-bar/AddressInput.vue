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
    <!-- 收藏按钮在输入框右侧 -->
    <button 
      class="favorite-button"
      @click="toggleFavorite"
      :class="{ 'favorited': isFavorited }"
      :title="isFavorited ? '从收藏夹中移除' : '添加到收藏夹'"
    >
      <Star :size="16" :fill="isFavorited ? '#FFD700' : 'none'" />
    </button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useTabsStore } from '../../../store/tabsStore'
import { useBookmarksStore } from '../../../store/bookmarksStore'
import { Star } from 'lucide-vue-next'

const tabsStore = useTabsStore()
const bookmarksStore = useBookmarksStore()
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
    
    if (url.startsWith('prism://')) {
      // 内部页面直接更新标签状态
      console.log(`[AddressInput] Internal page detected: ${url}`)
      tabsStore.updateTab(activeTabId, { 
        url, 
        loading: false  // 内部页面立即设置为加载完成
      })
    } else {
      // 普通网页通过 webview 加载
      const webview = document.getElementById(`webview-${activeTabId}`)
      if (webview) {
        console.log(`[AddressInput] Found webview, setting src to: ${url}`)
        webview.src = url
        // 同时更新 store 中的状态
        tabsStore.updateTab(activeTabId, { url, loading: true })
      } else {
        console.error(`[AddressInput] Webview not found for tab ${activeTabId}`)
      }
    }
  } else {
    console.error('[AddressInput] No active tab found')
  }
}

// 收藏功能相关
const isFavorited = computed(() => {
  const activeTab = tabsStore.tabs.find(tab => tab.id === tabsStore.activeTabId)
  if (!activeTab || !activeTab.url) return false
  
  return bookmarksStore.isBookmarked(activeTab.url)
})

async function toggleFavorite() {
  const activeTab = tabsStore.tabs.find(tab => tab.id === tabsStore.activeTabId)
  if (!activeTab || !activeTab.url) return
  
  try {
    const isNowBookmarked = await bookmarksStore.toggleBookmark(
      activeTab.title || '未命名页面',
      activeTab.url,
      activeTab.icon
    )
    
    console.log('[AddressInput] Toggle favorite for:', activeTab.url, 'Result:', isNowBookmarked)
  } catch (error) {
    console.error('[AddressInput] Toggle favorite failed:', error)
  }
}

onMounted(async () => {
  updateInputFromCurrentTab()
  // 初始化书签store
  await bookmarksStore.initializeBookmarks()
  console.log('[AddressInput] Component mounted and initialized')
})
</script>

<style scoped>
.address-input-wrapper {
  flex: 1;
  min-width: 0; /* 修复flex布局下的宽度计算问题 */
  margin: 0 8px;
  position: relative;
  display: flex;
  align-items: center;
}

.address-input {
  width: 100%;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 2px;
  padding: 0 12px;
  padding-right: 36px; /* 为收藏按钮留出空间 */
  background-color: white;
  box-sizing: border-box; /* 确保padding和border不影响宽度 */
}

.favorite-button {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.favorite-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

.favorite-button.favorited {
  color: #FFD700;
}

.favorite-button.favorited:hover {
  color: #FFA500;
}
</style> 