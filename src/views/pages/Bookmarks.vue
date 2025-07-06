<template>
  <InternalPageLayout page-title="书签">
    <!-- 左侧文件夹树 -->
    <template #sidebar>
      <div class="bookmarks-sidebar">
        <!-- 搜索框 -->
        <el-input 
          v-model="searchQuery"
          placeholder="搜索书签"
          class="search-input"
          clearable
        >
          <template #prefix>
            <Search :size="16" />
          </template>
        </el-input>

        <!-- 文件夹树 -->
        <div class="folder-tree">
          <div 
            :class="['folder-item', { active: !selectedFolderId }]"
            @click="selectFolder(null)"
          >
            <Folder :size="16" />
            <span>所有书签</span>
          </div>
          
          <div 
            v-for="folder in folders"
            :key="folder.id"
            :class="['folder-item', { active: selectedFolderId === folder.id }]"
            @click="selectFolder(folder.id)"
          >
            <Folder :size="16" />
            <span>{{ folder.title }}</span>
            <span class="item-count">({{ getFolderItemCount(folder.id) }})</span>
          </div>
        </div>

        <!-- 添加文件夹按钮 -->
        <el-button 
          @click="showAddFolderDialog = true"
          type="primary" 
          size="small"
          class="add-folder-btn"
        >
          <FolderPlus :size="16" />
          新建文件夹
        </el-button>
      </div>
    </template>

    <!-- 右侧内容标题 -->
    <template #content-title>
      <div class="content-header">
        <div class="breadcrumb">
          <span v-if="!selectedFolderId">所有书签</span>
          <span v-else>{{ getCurrentFolderName() }}</span>
        </div>
        <div class="item-count-info">
          {{ displayItems.length }} 个项目
        </div>
      </div>
    </template>

    <!-- 右侧操作按钮 -->
    <template #content-actions>
      <el-button @click="showAddBookmarkDialog = true" type="primary" size="small">
        <Plus :size="16" />
        添加书签
      </el-button>
    </template>

    <!-- 右侧书签内容 -->
    <template #content>
      <div v-if="displayItems.length === 0" class="empty-state">
        <BookmarkX :size="48" />
        <p>{{ searchQuery ? '未找到匹配的书签' : '此文件夹为空' }}</p>
      </div>

      <div v-else class="bookmarks-grid">
        <div 
          v-for="item in displayItems"
          :key="item.id"
          :class="['bookmark-item', { folder: item.type === 'folder' }]"
          @click="handleItemClick(item)"
          @contextmenu.prevent="showContextMenu(item, $event)"
        >
          <!-- 图标 -->
          <div class="item-icon">
            <Folder v-if="item.type === 'folder'" :size="20" />
            <img 
              v-else-if="item.icon" 
              :src="item.icon" 
              class="favicon"
              @error="handleIconError"
            />
            <Globe v-else :size="20" />
          </div>

          <!-- 标题 -->
          <div class="item-title" :title="item.title">
            {{ item.title }}
          </div>

          <!-- URL (仅书签) -->
          <div v-if="item.type === 'bookmark'" class="item-url" :title="item.url">
            {{ item.url }}
          </div>

          <!-- 操作按钮 -->
          <div class="item-actions">
            <el-button 
              size="small" 
              text 
              @click.stop="editItem(item)"
              title="编辑"
            >
              <Edit :size="14" />
            </el-button>
            <el-button 
              size="small" 
              text 
              @click.stop="deleteItem(item)"
              title="删除"
            >
              <Trash2 :size="14" />
            </el-button>
          </div>
        </div>
      </div>
    </template>
  </InternalPageLayout>

  <!-- 添加书签对话框 -->
  <el-dialog v-model="showAddBookmarkDialog" title="添加书签" width="400px">
    <el-form :model="newBookmark" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="newBookmark.title" placeholder="输入书签名称" />
      </el-form-item>
      <el-form-item label="网址">
        <el-input v-model="newBookmark.url" placeholder="输入网址" />
      </el-form-item>
      <el-form-item label="文件夹">
        <el-select v-model="newBookmark.parentId" placeholder="选择文件夹">
          <el-option label="根目录" :value="null" />
          <el-option 
            v-for="folder in folders"
            :key="folder.id"
            :label="folder.title"
            :value="folder.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddBookmarkDialog = false">取消</el-button>
      <el-button type="primary" @click="addBookmark">添加</el-button>
    </template>
  </el-dialog>

  <!-- 添加文件夹对话框 -->
  <el-dialog v-model="showAddFolderDialog" title="新建文件夹" width="400px">
    <el-form :model="newFolder" label-width="80px">
      <el-form-item label="名称">
        <el-input v-model="newFolder.title" placeholder="输入文件夹名称" />
      </el-form-item>
      <el-form-item label="位置">
        <el-select v-model="newFolder.parentId" placeholder="选择位置">
          <el-option label="根目录" :value="null" />
          <el-option 
            v-for="folder in folders"
            :key="folder.id"
            :label="folder.title"
            :value="folder.id"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="showAddFolderDialog = false">取消</el-button>
      <el-button type="primary" @click="addFolder">创建</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import InternalPageLayout from './InternalPageLayout.vue'
import { useBookmarksStore } from '../../store/bookmarksStore'
import { useTabsStore } from '../../store/tabsStore'
import { 
  Search, 
  Folder, 
  FolderPlus, 
  Plus, 
  Globe, 
  BookmarkX, 
  Edit, 
  Trash2 
} from 'lucide-vue-next'

const bookmarksStore = useBookmarksStore()
const tabsStore = useTabsStore()

// 搜索和过滤
const searchQuery = ref('')
const selectedFolderId = ref(null)

// 对话框状态
const showAddBookmarkDialog = ref(false)
const showAddFolderDialog = ref(false)

// 新建表单数据
const newBookmark = ref({
  title: '',
  url: '',
  parentId: null
})

const newFolder = ref({
  title: '',
  parentId: null
})

// 计算属性
const folders = computed(() => bookmarksStore.allFolders)

const displayItems = computed(() => {
  if (searchQuery.value.trim()) {
    return bookmarksStore.searchBookmarks(searchQuery.value)
  }
  
  if (selectedFolderId.value) {
    return bookmarksStore.currentFolderItems
  }
  
  return bookmarksStore.rootItems
})

// 方法
function selectFolder(folderId) {
  selectedFolderId.value = folderId
  bookmarksStore.setSelectedFolder(folderId)
}

function getCurrentFolderName() {
  if (!selectedFolderId.value) return '所有书签'
  const folder = folders.value.find(f => f.id === selectedFolderId.value)
  return folder ? folder.title : '未知文件夹'
}

function getFolderItemCount(folderId) {
  return bookmarksStore.bookmarks.filter(item => item.parentId === folderId).length
}

function handleItemClick(item) {
  if (item.type === 'folder') {
    selectFolder(item.id)
  } else if (item.url) {
    // 在新标签页中打开书签
    tabsStore.addTab({
      url: item.url,
      title: item.title,
      icon: item.icon,
      active: true
    })
  }
}

function handleIconError(event) {
  event.target.style.display = 'none'
}

async function addBookmark() {
  if (!newBookmark.value.title || !newBookmark.value.url) {
    return
  }
  
  try {
    await bookmarksStore.addBookmark(
      newBookmark.value.title,
      newBookmark.value.url,
      newBookmark.value.parentId || undefined
    )
    
    // 重置表单
    newBookmark.value = { title: '', url: '', parentId: null }
    showAddBookmarkDialog.value = false
  } catch (error) {
    console.error('[Bookmarks] 添加书签失败:', error)
  }
}

async function addFolder() {
  if (!newFolder.value.title) {
    return
  }
  
  try {
    await bookmarksStore.addFolder(
      newFolder.value.title,
      newFolder.value.parentId || undefined
    )
    
    // 重置表单
    newFolder.value = { title: '', parentId: null }
    showAddFolderDialog.value = false
  } catch (error) {
    console.error('[Bookmarks] 添加文件夹失败:', error)
  }
}

function editItem(item) {
  // TODO: 实现编辑功能
  console.log('[Bookmarks] Edit item:', item)
}

async function deleteItem(item) {
  try {
    await bookmarksStore.removeBookmark(item.id)
  } catch (error) {
    console.error('[Bookmarks] 删除失败:', error)
  }
}

function showContextMenu(item, event) {
  // TODO: 实现右键菜单
  console.log('[Bookmarks] Context menu for:', item, event)
}

onMounted(async () => {
  await bookmarksStore.initializeBookmarks()
})
</script>

<style scoped>
.bookmarks-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-input {
  margin-bottom: 8px;
}

.folder-tree {
  flex: 1;
  overflow-y: auto;
}

.folder-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.folder-item:hover {
  background-color: #f5f5f5;
  color: #333;
}

.folder-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.item-count {
  margin-left: auto;
  font-size: 12px;
  color: #999;
}

.add-folder-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
}

.content-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.breadcrumb {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.item-count-info {
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

.bookmarks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.bookmark-item {
  display: flex;
  flex-direction: column;
  padding: 16px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  background: white;
  position: relative;
}

.bookmark-item:hover {
  border-color: #1976d2;
  box-shadow: 0 2px 8px rgba(25, 118, 210, 0.1);
}

.bookmark-item:hover .item-actions {
  opacity: 1;
}

.bookmark-item.folder {
  border-color: #ff9800;
}

.bookmark-item.folder:hover {
  border-color: #f57c00;
  box-shadow: 0 2px 8px rgba(255, 152, 0, 0.1);
}

.item-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-bottom: 12px;
}

.favicon {
  width: 20px;
  height: 20px;
  border-radius: 2px;
}

.item-title {
  font-weight: 500;
  color: #333;
  margin-bottom: 8px;
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

.item-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s ease;
}
</style> 