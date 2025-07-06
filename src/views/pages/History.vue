<template>
  <InternalPageLayout page-title="历史记录">
    <!-- 左侧时间筛选 -->
    <template #sidebar>
      <div class="history-sidebar">
        <el-input 
          v-model="searchQuery"
          placeholder="搜索历史记录"
          class="search-input"
          clearable
        >
          <template #prefix>
            <Search :size="16" />
          </template>
        </el-input>

        <div class="time-filters">
          <div class="filter-title">时间筛选</div>
          <div 
            v-for="filter in timeFilters"
            :key="filter.value"
            :class="['filter-item', { active: selectedTimeFilter === filter.value }]"
            @click="selectedTimeFilter = filter.value"
          >
            <component :is="filter.icon" :size="16" />
            <span>{{ filter.label }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- 右侧内容标题 -->
    <template #content-title>
      <div class="content-header">
        <h3>浏览历史</h3>
        <div class="item-count">
          {{ filteredHistory.length }} 条记录
        </div>
      </div>
    </template>

    <!-- 右侧操作按钮 -->
    <template #content-actions>
      <el-button @click="clearHistory" type="danger" size="small">
        <Trash2 :size="16" />
        清除历史记录
      </el-button>
    </template>

    <!-- 右侧历史记录内容 -->
    <template #content>
      <div v-if="filteredHistory.length === 0" class="empty-state">
        <History :size="48" />
        <p>{{ searchQuery ? '未找到匹配的历史记录' : '暂无历史记录' }}</p>
      </div>

      <div v-else class="history-list">
        <div 
          v-for="(group, date) in groupedHistory"
          :key="date"
          class="history-group"
        >
          <div class="group-header">
            <h4>{{ formatDate(date) }}</h4>
          </div>
          <div class="history-items">
            <div 
              v-for="item in group"
              :key="item.id"
              class="history-item"
              @click="openHistoryItem(item)"
            >
              <div class="item-icon">
                <img 
                  v-if="item.icon" 
                  :src="item.icon" 
                  class="favicon"
                  @error="handleIconError"
                />
                <Globe v-else :size="16" />
              </div>
              
              <div class="item-content">
                <div class="item-title" :title="item.title">
                  {{ item.title }}
                </div>
                <div class="item-url" :title="item.url">
                  {{ item.url }}
                </div>
              </div>
              
              <div class="item-time">
                {{ formatTime(item.visitTime) }}
              </div>
              
              <div class="item-actions">
                <el-button 
                  size="small" 
                  text 
                  @click.stop="removeHistoryItem(item)"
                  title="删除"
                >
                  <X :size="14" />
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </InternalPageLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import InternalPageLayout from './InternalPageLayout.vue'
import { useTabsStore } from '../../store/tabsStore'
import { 
  Search, 
  History, 
  Clock, 
  Calendar, 
  CalendarDays,
  Globe, 
  Trash2, 
  X 
} from 'lucide-vue-next'

const tabsStore = useTabsStore()

// 搜索和筛选
const searchQuery = ref('')
const selectedTimeFilter = ref('all')

// 模拟历史记录数据
const historyData = ref([])

const timeFilters = [
  { value: 'all', label: '全部', icon: Calendar },
  { value: 'today', label: '今天', icon: Clock },
  { value: 'yesterday', label: '昨天', icon: CalendarDays },
  { value: 'week', label: '过去7天', icon: Calendar },
  { value: 'month', label: '过去30天', icon: Calendar }
]

// 计算属性
const filteredHistory = computed(() => {
  let filtered = historyData.value

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.title.toLowerCase().includes(query) || 
      item.url.toLowerCase().includes(query)
    )
  }

  // 时间过滤
  if (selectedTimeFilter.value !== 'all') {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    
    filtered = filtered.filter(item => {
      const itemDate = new Date(item.visitTime)
      
      switch (selectedTimeFilter.value) {
        case 'today':
          return itemDate >= today
        case 'yesterday':
          const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
          return itemDate >= yesterday && itemDate < today
        case 'week':
          const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
          return itemDate >= weekAgo
        case 'month':
          const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
          return itemDate >= monthAgo
        default:
          return true
      }
    })
  }

  return filtered.sort((a, b) => b.visitTime - a.visitTime)
})

const groupedHistory = computed(() => {
  const groups = {}
  
  filteredHistory.value.forEach(item => {
    const date = new Date(item.visitTime).toDateString()
    if (!groups[date]) {
      groups[date] = []
    }
    groups[date].push(item)
  })
  
  return groups
})

// 方法
function formatDate(dateString) {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
  
  if (date.toDateString() === today.toDateString()) {
    return '今天'
  } else if (date.toDateString() === yesterday.toDateString()) {
    return '昨天'
  } else {
    return date.toLocaleDateString('zh-CN', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
  }
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString('zh-CN', { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

function openHistoryItem(item) {
  tabsStore.addTab({
    url: item.url,
    title: item.title,
    icon: item.icon,
    active: true
  })
}

function removeHistoryItem(item) {
  const index = historyData.value.findIndex(h => h.id === item.id)
  if (index !== -1) {
    historyData.value.splice(index, 1)
    saveHistoryData()
  }
}

function clearHistory() {
  historyData.value = []
  saveHistoryData()
}

function handleIconError(event) {
  event.target.style.display = 'none'
}

async function loadHistoryData() {
  try {
    if (window.api) {
      const savedHistory = await window.api.getStore('history')
      if (savedHistory && Array.isArray(savedHistory)) {
        historyData.value = savedHistory
      }
    }
  } catch (error) {
    console.error('[History] 加载历史记录失败:', error)
  }
}

async function saveHistoryData() {
  try {
    if (window.api) {
      await window.api.setStore('history', historyData.value)
    }
  } catch (error) {
    console.error('[History] 保存历史记录失败:', error)
  }
}

onMounted(() => {
  loadHistoryData()
})
</script>

<style scoped>
.history-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  margin-bottom: 8px;
}

.time-filters {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
  font-size: 14px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.filter-item:hover {
  background-color: #f5f5f5;
  color: #333;
}

.filter-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.item-count {
  font-size: 14px;
  color: #666;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #999;
  text-align: center;
}

.empty-state p {
  margin-top: 16px;
  font-size: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.history-group {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.group-header {
  padding: 16px 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.group-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.history-items {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.history-item:hover {
  background-color: #f8f9fa;
}

.history-item:hover .item-actions {
  opacity: 1;
}

.history-item:last-child {
  border-bottom: none;
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 12px;
}

.favicon {
  width: 16px;
  height: 16px;
  border-radius: 2px;
}

.item-content {
  flex: 1;
  min-width: 0;
}

.item-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-url {
  font-size: 12px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  font-size: 12px;
  color: #999;
  margin-right: 12px;
  min-width: 50px;
  text-align: right;
}

.item-actions {
  opacity: 0;
  transition: opacity 0.2s ease;
}
</style> 