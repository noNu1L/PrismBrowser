<template>
  <InternalPageLayout page-title="下载">
    <!-- 左侧筛选 -->
    <template #sidebar>
      <div class="downloads-sidebar">
        <el-input 
          v-model="searchQuery"
          placeholder="搜索下载文件"
          class="search-input"
          clearable
        >
          <template #prefix>
            <Search :size="16" />
          </template>
        </el-input>

        <div class="status-filters">
          <div class="filter-title">状态筛选</div>
          <div 
            v-for="filter in statusFilters"
            :key="filter.value"
            :class="['filter-item', { active: selectedStatusFilter === filter.value }]"
            @click="selectedStatusFilter = filter.value"
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
        <h3>下载管理</h3>
        <div class="item-count">
          {{ filteredDownloads.length }} 个文件
        </div>
      </div>
    </template>

    <!-- 右侧操作按钮 -->
    <template #content-actions>
      <el-button @click="clearCompleted" size="small">
        <Trash2 :size="16" />
        清除已完成
      </el-button>
      <el-button @click="openDownloadsFolder" type="primary" size="small">
        <FolderOpen :size="16" />
        打开下载文件夹
      </el-button>
    </template>

    <!-- 右侧下载列表 -->
    <template #content>
      <div v-if="filteredDownloads.length === 0" class="empty-state">
        <Download :size="48" />
        <p>{{ searchQuery ? '未找到匹配的下载文件' : '暂无下载文件' }}</p>
      </div>

      <div v-else class="downloads-list">
        <div 
          v-for="item in filteredDownloads"
          :key="item.id"
          class="download-item"
        >
          <!-- 文件图标 -->
          <div class="item-icon">
            <component :is="getFileIcon(item.filename)" :size="24" />
          </div>
          
          <!-- 文件信息 -->
          <div class="item-content">
            <div class="item-title" :title="item.filename">
              {{ item.filename }}
            </div>
            <div class="item-details">
              <span class="file-size">{{ formatFileSize(item.totalBytes) }}</span>
              <span class="separator">•</span>
              <span class="download-time">{{ formatTime(item.startTime) }}</span>
              <span v-if="item.url" class="separator">•</span>
              <span v-if="item.url" class="item-url" :title="item.url">{{ item.url }}</span>
            </div>
            
            <!-- 进度条 (下载中时显示) -->
            <div v-if="item.state === 'in_progress'" class="progress-container">
              <el-progress 
                :percentage="getProgress(item)" 
                :status="item.state === 'interrupted' ? 'exception' : undefined"
                :stroke-width="4"
              />
              <div class="progress-details">
                <span>{{ formatFileSize(item.receivedBytes) }} / {{ formatFileSize(item.totalBytes) }}</span>
                <span v-if="item.speed">{{ formatSpeed(item.speed) }}</span>
              </div>
            </div>
          </div>
          
          <!-- 状态和操作 -->
          <div class="item-actions">
            <div class="item-status">
              <el-tag 
                :type="getStatusTagType(item.state)" 
                size="small"
              >
                {{ getStatusText(item.state) }}
              </el-tag>
            </div>
            
            <div class="action-buttons">
              <!-- 下载中的操作 -->
              <template v-if="item.state === 'in_progress'">
                <el-button size="small" @click="pauseDownload(item)">
                  <Pause :size="14" />
                </el-button>
                <el-button size="small" @click="cancelDownload(item)">
                  <X :size="14" />
                </el-button>
              </template>
              
              <!-- 已暂停的操作 -->
              <template v-else-if="item.state === 'interrupted'">
                <el-button size="small" @click="resumeDownload(item)">
                  <Play :size="14" />
                </el-button>
                <el-button size="small" @click="cancelDownload(item)">
                  <X :size="14" />
                </el-button>
              </template>
              
              <!-- 已完成的操作 -->
              <template v-else-if="item.state === 'completed'">
                <el-button size="small" @click="openFile(item)">
                  <ExternalLink :size="14" />
                </el-button>
                <el-button size="small" @click="showInFolder(item)">
                  <Folder :size="14" />
                </el-button>
                <el-button size="small" @click="removeDownload(item)">
                  <Trash2 :size="14" />
                </el-button>
              </template>
              
              <!-- 其他状态 -->
              <template v-else>
                <el-button size="small" @click="removeDownload(item)">
                  <Trash2 :size="14" />
                </el-button>
              </template>
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
import { 
  Search, 
  Download, 
  CheckCircle, 
  Clock, 
  XCircle, 
  Pause,
  Play,
  X,
  ExternalLink,
  Folder,
  FolderOpen,
  Trash2,
  File,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  Archive
} from 'lucide-vue-next'

// 搜索和筛选
const searchQuery = ref('')
const selectedStatusFilter = ref('all')

// 模拟下载数据
const downloadsData = ref([])

const statusFilters = [
  { value: 'all', label: '全部', icon: Download },
  { value: 'completed', label: '已完成', icon: CheckCircle },
  { value: 'in_progress', label: '下载中', icon: Clock },
  { value: 'interrupted', label: '已暂停', icon: Pause },
  { value: 'cancelled', label: '已取消', icon: XCircle }
]

// 计算属性
const filteredDownloads = computed(() => {
  let filtered = downloadsData.value

  // 搜索过滤
  if (searchQuery.value.trim()) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(item => 
      item.filename.toLowerCase().includes(query) || 
      (item.url && item.url.toLowerCase().includes(query))
    )
  }

  // 状态过滤
  if (selectedStatusFilter.value !== 'all') {
    filtered = filtered.filter(item => item.state === selectedStatusFilter.value)
  }

  return filtered.sort((a, b) => b.startTime - a.startTime)
})

// 方法
function getFileIcon(filename) {
  const ext = filename.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'bmp':
    case 'svg':
      return FileImage
    case 'mp4':
    case 'avi':
    case 'mkv':
    case 'mov':
    case 'wmv':
      return FileVideo
    case 'mp3':
    case 'wav':
    case 'flac':
    case 'aac':
      return FileAudio
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return Archive
    case 'txt':
    case 'md':
    case 'doc':
    case 'docx':
    case 'pdf':
      return FileText
    default:
      return File
  }
}

function getStatusText(state) {
  const statusMap = {
    'completed': '已完成',
    'in_progress': '下载中',
    'interrupted': '已暂停',
    'cancelled': '已取消'
  }
  return statusMap[state] || '未知'
}

function getStatusTagType(state) {
  const typeMap = {
    'completed': 'success',
    'in_progress': 'primary',
    'interrupted': 'warning',
    'cancelled': 'danger'
  }
  return typeMap[state] || 'info'
}

function getProgress(item) {
  if (!item.totalBytes || item.totalBytes === 0) return 0
  return Math.round((item.receivedBytes / item.totalBytes) * 100)
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function formatSpeed(bytesPerSecond) {
  return formatFileSize(bytesPerSecond) + '/s'
}

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleString('zh-CN')
}

function pauseDownload(item) {
  // TODO: 实现暂停下载
  console.log('[Downloads] Pause download:', item.id)
}

function resumeDownload(item) {
  // TODO: 实现恢复下载
  console.log('[Downloads] Resume download:', item.id)
}

function cancelDownload(item) {
  // TODO: 实现取消下载
  console.log('[Downloads] Cancel download:', item.id)
}

function openFile(item) {
  // TODO: 打开文件
  console.log('[Downloads] Open file:', item.savePath)
}

function showInFolder(item) {
  // TODO: 在文件夹中显示
  console.log('[Downloads] Show in folder:', item.savePath)
}

function removeDownload(item) {
  const index = downloadsData.value.findIndex(d => d.id === item.id)
  if (index !== -1) {
    downloadsData.value.splice(index, 1)
    saveDownloadsData()
  }
}

function clearCompleted() {
  downloadsData.value = downloadsData.value.filter(item => item.state !== 'completed')
  saveDownloadsData()
}

function openDownloadsFolder() {
  // TODO: 打开下载文件夹
  console.log('[Downloads] Open downloads folder')
}

async function loadDownloadsData() {
  try {
    if (window.api) {
      const savedDownloads = await window.api.getStore('downloads')
      if (savedDownloads && Array.isArray(savedDownloads)) {
        downloadsData.value = savedDownloads
      }
    }
  } catch (error) {
    console.error('[Downloads] 加载下载数据失败:', error)
  }
}

async function saveDownloadsData() {
  try {
    if (window.api) {
      await window.api.setStore('downloads', downloadsData.value)
    }
  } catch (error) {
    console.error('[Downloads] 保存下载数据失败:', error)
  }
}

onMounted(() => {
  loadDownloadsData()
})
</script>

<style scoped>
.downloads-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  margin-bottom: 8px;
}

.status-filters {
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

.downloads-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.download-item {
  display: flex;
  align-items: flex-start;
  padding: 16px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.2s ease;
}

.download-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  margin-right: 16px;
  color: #666;
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

.item-details {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #666;
  margin-bottom: 8px;
}

.separator {
  color: #ccc;
}

.item-url {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}

.progress-container {
  margin-top: 8px;
}

.progress-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 4px;
  font-size: 12px;
  color: #666;
}

.item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 8px;
  margin-left: 16px;
}

.item-status {
  margin-bottom: 4px;
}

.action-buttons {
  display: flex;
  gap: 4px;
}
</style> 