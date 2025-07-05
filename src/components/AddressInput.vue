<template>
  <div class="address-input">
    <el-input
      v-model="inputUrl"
      placeholder="搜索或输入网址"
      size="small"
      @keyup.enter="handleNavigate"
      @focus="selectUrl"
      class="address-input__field"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useTabsStore } from '../store/tabsStore'

const props = defineProps({
  tabId: {
    type: String,
    required: true
  }
})

const emit = defineEmits(['navigate'])

const tabsStore = useTabsStore()
const inputUrl = ref('')

// 计算当前标签
const currentTab = computed(() => {
  return tabsStore.tabs.find(tab => tab.id === props.tabId)
})

// 监听标签变化，更新输入框
watch(() => props.tabId, () => {
  if (currentTab.value) {
    inputUrl.value = currentTab.value.url || ''
  }
}, { immediate: true })

// 监听标签URL变化，更新输入框
watch(() => currentTab.value?.url, (newUrl) => {
  if (newUrl && newUrl !== inputUrl.value) {
    inputUrl.value = newUrl
  }
}, { immediate: true })

// 处理导航
function handleNavigate() {
  if (!inputUrl.value.trim()) return
  
  let targetUrl = inputUrl.value.trim()
  
  // 如果不是完整URL，添加协议
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
    // 判断是否为搜索内容还是网址
    if (targetUrl.includes('.') && !targetUrl.includes(' ')) {
      targetUrl = 'https://' + targetUrl
    } else {
      // 使用必应搜索
      targetUrl = `https://www.bing.com/search?q=${encodeURIComponent(targetUrl)}`
    }
  }
  
  // 更新当前标签的URL
  if (currentTab.value) {
    tabsStore.updateTab(currentTab.value.id, { url: targetUrl })
    
    // 通知主进程或webview导航
    window.api?.navigateWebview?.(currentTab.value.id, targetUrl)
  }
  
  // 触发导航事件
  emit('navigate', targetUrl)
}

// 选中地址栏内容
function selectUrl() {
  // 在下一个tick选中内容，确保input已经聚焦
  setTimeout(() => {
    const input = document.querySelector('.address-input .el-input__inner')
    if (input) {
      input.select()
    }
  }, 10)
}
</script>

<style scoped>
.address-input {
  width: 100%;
}

.address-input__field {
  width: 100%;
}
</style> 