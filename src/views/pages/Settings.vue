<template>
  <InternalPageLayout page-title="设置">
    <!-- 左侧导航 -->
    <template #sidebar>
      <div class="settings-nav">
        <div 
          v-for="category in categories" 
          :key="category.id"
          :class="['nav-item', { active: activeCategory === category.id }]"
          @click="activeCategory = category.id"
        >
          <component :is="category.icon" :size="16" />
          <span>{{ category.name }}</span>
        </div>
      </div>
    </template>

    <!-- 右侧内容标题 -->
    <template #content-title>
      <h3>{{ currentCategoryName }}</h3>
    </template>

    <!-- 右侧内容 -->
    <template #content>
      <!-- 启动设置 -->
      <div v-if="activeCategory === 'startup'" class="settings-section">
        <div class="setting-item">
          <label class="setting-label">启动时</label>
          <el-select v-model="startupOption" class="setting-control">
            <el-option label="打开新标签页" value="new-tab" />
            <el-option label="打开主页" value="home" />
            <el-option label="恢复上次会话" value="restore" />
          </el-select>
        </div>

        <div class="setting-item">
          <label class="setting-label">主页</label>
          <el-input 
            v-model="homeUrl" 
            placeholder="输入主页网址"
            class="setting-control"
            @change="saveHomeUrl"
          />
        </div>

        <div class="setting-item">
          <label class="setting-label">新标签页</label>
          <el-input 
            v-model="newTabUrl" 
            placeholder="输入新标签页网址"
            class="setting-control"
            @change="saveNewTabUrl"
          />
        </div>
      </div>

      <!-- 工具栏设置 -->
      <div v-if="activeCategory === 'toolbar'" class="settings-section">
        <div class="setting-item">
          <label class="setting-label">显示按钮</label>
          <div class="toolbar-buttons">
            <div 
              v-for="button in toolbarButtons" 
              :key="button.key"
              class="button-toggle"
            >
              <el-switch 
                v-model="button.visible" 
                @change="updateButtonVisibility(button.key, button.visible)"
              />
              <span class="button-label">{{ button.label }}</span>
            </div>
          </div>
        </div>

        <div class="setting-item">
          <label class="setting-label">预设配置</label>
          <div class="preset-buttons">
            <el-button @click="showAllButtons">显示所有按钮</el-button>
            <el-button @click="hideAllButtons">隐藏所有按钮</el-button>
            <el-button @click="resetToDefault">恢复默认</el-button>
          </div>
        </div>
      </div>
    </template>
  </InternalPageLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import InternalPageLayout from './InternalPageLayout.vue'
import { useAddressBarStore } from '../../store/addressBarStore'
import { 
  Play, 
  Wrench, 
  Home, 
  Bookmark, 
  History, 
  Download, 
  Wifi,
  Settings as SettingsIcon
} from 'lucide-vue-next'

const addressBarStore = useAddressBarStore()

// 导航分类
const categories = [
  { id: 'startup', name: '启动', icon: Play },
  { id: 'toolbar', name: '工具栏', icon: Wrench }
]

const activeCategory = ref('startup')

const currentCategoryName = computed(() => {
  const category = categories.find(c => c.id === activeCategory.value)
  return category ? category.name : ''
})

// 启动设置
const startupOption = ref('new-tab')
const homeUrl = ref('')
const newTabUrl = ref('')

// 工具栏按钮配置
const toolbarButtons = ref([
  { key: 'showHome', label: '主页', visible: false },
  { key: 'showBookmarks', label: '书签', visible: false },
  { key: 'showHistory', label: '历史记录', visible: false },
  { key: 'showDownloads', label: '下载', visible: false },
  { key: 'showProxy', label: '代理', visible: true },
  { key: 'showSettings', label: '设置', visible: false }
])

// 加载设置数据
async function loadSettings() {
  try {
    if (window.api) {
      // 加载启动设置
      homeUrl.value = await window.api.getStore('settings.homeUrl') || 'https://www.baidu.com'
      newTabUrl.value = await window.api.getStore('settings.newTabUrl') || 'https://www.qq.com'
      startupOption.value = await window.api.getStore('settings.startupOption') || 'new-tab'
      
      // 加载工具栏设置
      await addressBarStore.loadFromElectronStore()
      if (addressBarStore.config) {
        toolbarButtons.value.forEach(button => {
          button.visible = addressBarStore.config[button.key] || false
        })
      }
    }
  } catch (error) {
    console.error('[Settings] 加载设置失败:', error)
  }
}

// 保存设置
async function saveHomeUrl() {
  try {
    if (window.api) {
      await window.api.setStore('settings.homeUrl', homeUrl.value)
      console.log('[Settings] 主页设置已保存:', homeUrl.value)
    }
  } catch (error) {
    console.error('[Settings] 保存主页设置失败:', error)
  }
}

async function saveNewTabUrl() {
  try {
    if (window.api) {
      await window.api.setStore('settings.newTabUrl', newTabUrl.value)
      console.log('[Settings] 新标签页设置已保存:', newTabUrl.value)
    }
  } catch (error) {
    console.error('[Settings] 保存新标签页设置失败:', error)
  }
}

// 工具栏按钮控制
async function updateButtonVisibility(key, visible) {
  try {
    await addressBarStore.setButtonVisible(key, visible)
    console.log(`[Settings] 按钮 ${key} 设置为 ${visible ? '显示' : '隐藏'}`)
  } catch (error) {
    console.error('[Settings] 更新按钮显示状态失败:', error)
  }
}

async function showAllButtons() {
  const updates = {}
  toolbarButtons.value.forEach(button => {
    button.visible = true
    updates[button.key] = true
  })
  await addressBarStore.setBatchVisible(updates)
  console.log('[Settings] 所有按钮已显示')
}

async function hideAllButtons() {
  const updates = {}
  toolbarButtons.value.forEach(button => {
    button.visible = false
    updates[button.key] = false
  })
  await addressBarStore.setBatchVisible(updates)
  console.log('[Settings] 所有按钮已隐藏')
}

async function resetToDefault() {
  const defaultConfig = {
    showHome: false,
    showBookmarks: false,
    showHistory: false,
    showDownloads: false,
    showProxy: true,
    showSettings: false
  }
  
  toolbarButtons.value.forEach(button => {
    button.visible = defaultConfig[button.key] || false
  })
  
  await addressBarStore.setBatchVisible(defaultConfig)
  console.log('[Settings] 工具栏设置已恢复默认')
}

onMounted(() => {
  loadSettings()
})
</script>

<style scoped>
.settings-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #666;
}

.nav-item:hover {
  background-color: #f5f5f5;
  color: #333;
}

.nav-item.active {
  background-color: #e3f2fd;
  color: #1976d2;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.setting-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.setting-label {
  font-weight: 500;
  color: #333;
  font-size: 14px;
}

.setting-control {
  max-width: 400px;
}

.toolbar-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
}

.button-toggle {
  display: flex;
  align-items: center;
  gap: 12px;
}

.button-label {
  font-size: 14px;
  color: #333;
}

.preset-buttons {
  display: flex;
  gap: 12px;
}
</style> 