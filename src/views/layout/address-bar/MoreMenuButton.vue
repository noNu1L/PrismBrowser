<template>
  <el-dropdown @command="handleCommand" trigger="click">
    <button class="more-menu-button" title="更多">
      <MoreHorizontal :size="16" />
    </button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item command="bookmarks">
          <Bookmark :size="16" />
          <span>书签</span>
        </el-dropdown-item>
        <el-dropdown-item command="history">
          <History :size="16" />
          <span>历史记录</span>
        </el-dropdown-item>
        <el-dropdown-item command="downloads">
          <Download :size="16" />
          <span>下载</span>
        </el-dropdown-item>
        <el-dropdown-item divided command="settings">
          <Settings :size="16" />
          <span>设置</span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
</template>

<script setup>
import { MoreHorizontal, Bookmark, History, Download, Settings } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

function handleCommand(command) {
  console.log('[MoreMenuButton] Command:', command)
  
  const urlMap = {
    bookmarks: 'prism://bookmarks',
    history: 'prism://history',
    downloads: 'prism://downloads',
    settings: 'prism://settings'
  }
  
  const titleMap = {
    bookmarks: '书签',
    history: '历史记录',
    downloads: '下载',
    settings: '设置'
  }
  
  if (urlMap[command]) {
    tabsStore.addTab({
      url: urlMap[command],
      title: titleMap[command],
      active: true
    })
  }
}
</script>

<style scoped>
.more-menu-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s ease;
}

.more-menu-button:hover {
  background-color: #f0f0f0;
  color: #333;
}

:deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
}

:deep(.el-dropdown-menu__item span) {
  font-size: 14px;
}
</style> 