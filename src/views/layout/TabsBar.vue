<template>
  <div class="tabs-bar drag-region">
    <div class="tabs-bar-left">
      <!-- 标签区域 -->
      <div class="tabs-area" ref="tabsAreaRef" @mouseenter="onTabAreaMouseEnter" @mouseleave="onTabAreaMouseLeave">
        <!-- 自定义标签页 -->
        <div class="tabs-container">
          <div
              v-for="tab in localTabs"
              :key="tab.id"
              :class="['tab-item', {
                'active': tab.id === tabsStore.activeTabId,
                'closing': closingTabs.has(tab.id),
                'hide-close-btn': tab.width < 80
              }]"
              :style="{ width: `${tabWidths[tab.id] || 240}px` }"
              @click="setActiveTab(tab.id)"
              :id="`tab-${tab.id}`"
          >
            <div class="tab-content no-drag">
              <el-icon class="tab-icon"><Document /></el-icon>
              <span class="tab-title">{{ tab.title }}</span>
              <el-button
                  class="tab-close-btn"
                  size="small"
                  @click.stop="closeTab(tab.id)"
                  :icon="Close"
              />
            </div>
          </div>
        </div>
        <!-- 新增标签按钮 -->
        <el-button
            class="no-drag add-tab-btn"
            size="small"
            :icon="Plus"
            @click="addTab"
        />
      </div>
    </div>
    <el-button-group class="window-controls">
      <el-button class="window-btn" @click.stop="minimize" title="最小化" size="small" :icon="Minus"/>
      <el-button class="window-btn" @click.stop="maximize" title="最大化/还原" size="small" :icon="FullScreen"/>
      <el-button class="window-btn close" @click.stop="close" title="关闭" size="small" :icon="Close"/>
    </el-button-group>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTabsStore } from '../../store/tabsStore'
import { Close, FullScreen, Minus, Plus, Document } from "@element-plus/icons-vue"

const tabsStore = useTabsStore()
const tabsAreaRef = ref(null)

// [GPT-4, 2024-06-28 19:00:00 Asia/Hong_Kong] 本地UI状态：关闭动画、宽度、悬停
const closingTabs = ref(new Set()) // 正在关闭的标签id集合
const tabWidths = ref({}) // { [tabId]: width }
const isHoveringTabArea = ref(false)
const pendingWidthUpdate = ref(false)
const localTabs = ref([])

onMounted(() => {
  syncTabsFromStore()
  window.addEventListener('resize', handleResize)
  updateAllTabWidths()

  // 暴露组件实例到全局，供调试面板使用
  window.tabsBarInstance = {
    tabsStore,
    updateAllTabWidths
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})

watch(() => tabsStore.tabs, (newStoreTabs) => {
  const localTabIds = new Set(localTabs.value.map(t => t.id));
  const storeTabIds = new Set(newStoreTabs.map(t => t.id));

  // [GPT-4, 2024-06-28 20:05:00 Asia/Hong_Kong] 检查ID集合是否一致，避免不必要重渲染
  if (localTabIds.size !== storeTabIds.size || [...localTabIds].some(id => !storeTabIds.has(id))) {
    nextTick(() => {
      syncTabsFromStore()
    });
  }
}, { deep: true });

function diffAndSyncTabs(newTabs, oldTabs) {
  // 新增标签
  newTabs.forEach(tab => {
    if (!localTabs.value.find(t => t.id === tab.id)) {
      console.log(`[TabsBar][diffAndSyncTabs][${now()}] 新增标签:`, tab)
      localTabs.value.push({ ...tab })
    }
  })
  // 删除标签（设置closing，动画后移除）
  localTabs.value.forEach((tab, idx) => {
    if (!newTabs.find(t => t.id === tab.id)) {
      console.log(`[TabsBar][diffAndSyncTabs][${now()}] 删除标签:`, tab)
      closingTabs.value.add(tab.id)
      setTimeout(() => {
        const i = localTabs.value.findIndex(t => t.id === tab.id)
        if (i !== -1) localTabs.value.splice(i, 1)
        closingTabs.value.delete(tab.id)
        updateAllTabWidths()
      }, 300)
    }
  })
  // 更新标签内容
  newTabs.forEach(tab => {
    const local = localTabs.value.find(t => t.id === tab.id)
    if (local) {
      for (const key in tab) {
        if (key !== 'id' && local[key] !== tab[key]) {
          console.log(`[TabsBar][diffAndSyncTabs][${now()}] 更新标签${tab.id}字段${key}: ${local[key]} → ${tab[key]}`)
          local[key] = tab[key]
        }
      }
    }
  })
  updateAllTabWidths()
}

function syncTabsFromStore() {
  console.log(`[TabsBar][syncTabsFromStore][${now()}] 从Pinia同步tabs`)
  localTabs.value = tabsStore.tabs.map(tab => ({ ...tab }))
  updateAllTabWidths()
}

function addTab() {
  console.log(`[TabsBar][addTab][${now()}] 新增标签`)
  tabsStore.addTab({ active: true, loading: true })
}

function closeTab(tabId) {
  console.log(`[TabsBar][closeTab][${now()}] 开始关闭标签: ${tabId}`)
  closingTabs.value.add(tabId)
  pendingWidthUpdate.value = true

  // 先执行关闭动画
  const index = localTabs.value.findIndex(tab => tab.id === tabId)
  if (index !== -1) {
    const tab = localTabs.value[index]
    tab.closing = true
  }

  setTimeout(() => {
    // 动画结束后，再同步到Pinia
    tabsStore.removeTab(tabId)
    // 本地也移除
    const idx = localTabs.value.findIndex(tab => tab.id === tabId)
    if (idx !== -1) localTabs.value.splice(idx, 1)

    // 如果鼠标已经离开，立即更新宽度
    if (!isHoveringTabArea.value) {
      updateAllTabWidths()
      pendingWidthUpdate.value = false
    }
  }, 300)
}

function setActiveTab(tabId) {
  console.log(`[TabsBar][setActiveTab][${now()}] 激活标签: ${tabId}`)
  tabsStore.setActiveTab(tabId)
}

function updateTab(id, patch) {
  const tab = localTabs.value.find(t => t.id === id)
  if (tab) {
    let changed = false
    for (const key in patch) {
      if (key !== 'id' && tab[key] !== patch[key]) {
        console.log(`[TabsBar][updateTab][${now()}] 更新标签${id}字段${key}: ${tab[key]} → ${patch[key]}`)
        tab[key] = patch[key]
        changed = true
      }
    }
    if ('active' in patch && patch.active === true) {
      localTabs.value.forEach(t => {
        if (t.id !== id && t.active) t.active = false
      })
    }
    if (changed) {
      tabsStore.updateTab(id, patch)
    }
  }
}

function calculateOptimalWidth() {
  const maxWidth = 240
  const minWidth = 40
  if (!tabsAreaRef.value) return maxWidth
  const containerWidth = tabsAreaRef.value.offsetWidth
  const addBtnWidth = 34
  const availableWidth = containerWidth - addBtnWidth
  const tabCount = localTabs.value.filter(t => !closingTabs.value.has(t.id)).length
  if (tabCount === 0) return maxWidth
  const width = Math.max(minWidth, Math.min(maxWidth, availableWidth / tabCount))
  console.log(`[TabsBar][calculateOptimalWidth][${now()}] 计算宽度: ${width}, 标签数: ${tabCount}, 容器宽: ${containerWidth}`)
  return width
}

function updateAllTabWidths() {
  const newWidth = calculateOptimalWidth()
  localTabs.value.forEach(tab => {
    if (!closingTabs.value.has(tab.id)) {
      if (tabWidths.value[tab.id] !== newWidth) {
        console.log(`[TabsBar][updateAllTabWidths][${now()}] 标签${tab.id}宽度: ${tabWidths.value[tab.id]} → ${newWidth}`)
      }
      tabWidths.value[tab.id] = newWidth
      tab.width = newWidth
    }
  })
}

function onTabAreaMouseEnter() {
  isHoveringTabArea.value = true
  console.log(`[TabsBar][onTabAreaMouseEnter][${now()}] 鼠标进入标签区域`)
}
function onTabAreaMouseLeave() {
  isHoveringTabArea.value = false
  console.log(`[TabsBar][onTabAreaMouseLeave][${now()}] 鼠标离开标签区域，pending: ${pendingWidthUpdate.value}`)
  if (pendingWidthUpdate.value) {
    setTimeout(() => {
      if (!isHoveringTabArea.value) {
        console.log(`[TabsBar][onTabAreaMouseLeave][${now()}] 执行延迟的宽度更新`)
        updateAllTabWidths()
        pendingWidthUpdate.value = false
      }
    }, 200)
  }
}

function handleResize() {
  if (pendingWidthUpdate.value) return
  updateAllTabWidths()
}

function now() {
  // [GPT-4, 2024-06-28 19:00:00 Asia/Hong_Kong] 获取当前时间字符串
  const date = new Date()
  return date.toLocaleString('zh-HK', { hour12: false })
}

function minimize() { window.api?.sendWindowControl('minimize') }
function maximize() { window.api?.sendWindowControl('maximize') }
function close() { window.api?.sendWindowControl('close') }
</script>

<style scoped>
.tabs-bar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 140px 0 8px;
  background-color: #e8e8e8;
  position: relative;
  box-sizing: border-box;
}

.tabs-bar-left {
  display: flex;
  align-items: flex-end;
  flex: 1;
  min-width: 0;
  height: 100%;
}

.tabs-area {
  display: flex;
  align-items: flex-end;
  margin-top: 8px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  overflow-x: auto;
  flex-shrink: 1; /* 允许收缩但不主动扩展 */
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-item {
  height: 32px;
  min-width: 40px;
  max-width: 240px;
  background: #e8e8e8;
  border-bottom: none;
  cursor: pointer;
  position: relative;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s, transform 0.2s; /*动画时间调整为 0.2s*/
  box-sizing: border-box;
  margin-right: 2px;
  container-type: inline-size; /* 让每个标签成为容器 */
}

.tab-item:last-child {
  margin-right: 0;
}

/* 标签关闭动画 */
.tab-item.closing {
  width: 0 !important;
  min-width: 0 !important;
  opacity: 0;
  transform: scaleX(0);
  transform-origin: center;
  overflow: hidden;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}

/* 未激活标签右侧分割线 */
.tab-item:not(.active)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background: #2d2d2d;
  opacity: 0.6;
}

/* 如果右侧相邻的是激活/关闭中的标签，则不显示分割线 */
.tab-item:not(.active):has(+ .tab-item.active)::after,
.tab-item:not(.active):has(+ .tab-item.closing)::after,
.tab-item:not(.active):last-child::after {
  display: none;
}

/* 鼠标悬停时隐藏分割线 */
.tab-item:not(.active):hover::after,
.tab-item:not(.active):has(+ .tab-item:hover)::after {
  display: none;
}

.tab-item:hover {
  background: #dadada;
}

.tab-item.active {
  background: #ffffff;
  border-color: #c0c0c0;
  z-index: 1;
}

.tab-item.hide-close-btn:not(.active) .tab-close-btn {
  display: none;
}

.tab-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 8px;
  gap: 10px;
}

.tab-icon {
  font-size: 14px;
  color: #666;
  flex-shrink: 0;
}

.tab-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 12px;
  font-weight: 400;
  color: #000000;
  line-height: 1;
}

.tab-close-btn {
  width: 16px !important;
  height: 16px !important;
  min-height: 16px !important;
  padding: 0 !important;
  border: none;
  background: transparent;
  color: #666;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
  transition: all 0.2s;
}

.tab-close-btn:hover {
  background: #ff4757 !important;
  color: white !important;
  opacity: 1;
}

@container (max-width: 72px) {
  .tab-close-btn {
    display: none;
  }
}

.add-tab-btn {
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  color: black;
  background: #e8e8e8;
  padding: 0 !important;
  border : none !important;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
}

.add-tab-btn:hover {
  background: #dadada;
}

.add-tab-btn.active {
  background: #ffffff;
  border-color: #c0c0c0;
  z-index: 1;
}

.window-controls {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  height: 40px;
  -webkit-app-region: no-drag;
  user-select: none;
}

.window-btn {
  width: 46px;
  height: 100%;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #444;
  outline: none;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-btn:hover {
  background: #e0e0e0;
}

.window-btn.close:hover {
  background: #e57373;
  color: #fff;
}

.drag-region {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}
</style>