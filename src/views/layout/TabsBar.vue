<template>
  <div class="tabs-bar drag-region">
    <div class="tabs-bar-left">
      <!-- 标签区域 -->
      <div class="tabs-area" ref="tabsAreaRef" @mouseenter="onTabAreaMouseEnter" @mouseleave="onTabAreaMouseLeave">
        <!-- 自定义标签页 -->
        <div :class="['tabs-container', { 'dragging': dragState.isDragging }]">
          <div
              v-for="tab in localTabs"
              :key="tab.id"
              :class="['tab-item', {
                'active': tab.id === tabsStore.activeTabId,
                'closing': closingTabs.has(tab.id),
                'hide-close-btn': tab.width < 80,
                'dragging': dragState.isDragging && dragState.draggedTabId === tab.id,
                'drag-over-before': dragState.dragOverTabId === tab.id && dragState.insertPosition === 'before',
                'drag-over-after': dragState.dragOverTabId === tab.id && dragState.insertPosition === 'after'
              }]"
              :style="{ width: `${tabWidths[tab.id] || 240}px` }"
              @click="setActiveTab(tab.id)"
              :id="`tab-${tab.id}`"
              draggable="true"
              @dragstart="onDragStart($event, tab.id)"
              @dragover="onDragOver($event, tab.id)"
              @dragenter="onDragEnter($event, tab.id)"
              @dragleave="onDragLeave($event, tab.id)"
              @drop="onDrop($event, tab.id)"
              @dragend="onDragEnd($event, tab.id)"
          >
            <div class="tab-content no-drag">
              <el-icon class="tab-icon"><Document /></el-icon>
              <span class="tab-title">{{ tab.title }}</span>
              <button
                  class="tab-close-btn"
                  @click.stop="closeTab(tab.id)"
              >
                <el-icon><Close /></el-icon>
              </button>
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
import {Close, FullScreen, Minus, Plus, Document, CloseBold} from "@element-plus/icons-vue"

const tabsStore = useTabsStore()
const tabsAreaRef = ref(null)

// [GPT-4, 2024-06-28 19:00:00 Asia/Hong_Kong] 本地UI状态：关闭动画、宽度、悬停
const closingTabs = ref(new Set()) // 正在关闭的标签id集合
const tabWidths = ref({}) // { [tabId]: width }
const isHoveringTabArea = ref(false)
const pendingWidthUpdate = ref(false)
const localTabs = ref([])

// 拖拽相关状态
const dragState = ref({
  isDragging: false,
  draggedTabId: null,
  dragOverTabId: null,
  insertPosition: null // 'before' | 'after'
})

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
  console.log('[TabsBar][diffAndSyncTabs] 比较并同步tabs', {
    newTabs: newTabs.map(t => ({ id: t.id, width: t.width })),
    oldTabs: oldTabs.map(t => ({ id: t.id, width: t.width })),
    localTabs: localTabs.value.map(t => ({ id: t.id, width: t.width })),
    isHoveringTabArea: isHoveringTabArea.value,
    pendingWidthUpdate: pendingWidthUpdate.value
  })
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
  console.log('[TabsBar][syncTabsFromStore] 从Pinia同步tabs', {
    tabsStoreTabs: tabsStore.tabs.map(t => ({ id: t.id, width: t.width })),
    localTabs: localTabs.value.map(t => ({ id: t.id, width: t.width })),
    isHoveringTabArea: isHoveringTabArea.value,
    pendingWidthUpdate: pendingWidthUpdate.value
  })
  localTabs.value = tabsStore.tabs.map(tab => ({ ...tab }))
  updateAllTabWidths()
}

function addTab() {
  console.log(`[TabsBar][addTab][${now()}] 新增标签`)
  tabsStore.addTab({ active: true, loading: true })
}

function closeTab(tabId) {
  console.log(`[TabsBar][closeTab] 开始关闭标签: ${tabId}`)
  console.log(`[TabsBar][closeTab] localTabs:`)
  localTabs.value.forEach(t => console.log(`  - 标签${t.id}: width=${t.width}`))
  console.log(`[TabsBar][closeTab] tabWidths:`, { ...tabWidths.value })
  console.log(`[TabsBar][closeTab] isHoveringTabArea:`, isHoveringTabArea.value)
  console.log(`[TabsBar][closeTab] pendingWidthUpdate:`, pendingWidthUpdate.value)
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
    console.log(`[TabsBar][closeTab] 动画结束，移除标签: ${tabId}`)
    console.log(`[TabsBar][closeTab] localTabs:`)
    localTabs.value.forEach(t => console.log(`  - 标签${t.id}: width=${t.width}`))
    console.log(`[TabsBar][closeTab] tabWidths:`, { ...tabWidths.value })
    console.log(`[TabsBar][closeTab] isHoveringTabArea:`, isHoveringTabArea.value)
    console.log(`[TabsBar][closeTab] pendingWidthUpdate:`, pendingWidthUpdate.value)
  }, 300)
}

function setActiveTab(tabId) {
  // 如果正在拖拽，不执行激活操作
  if (dragState.value.isDragging) return
  
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
  console.log('[TabsBar][updateAllTabWidths] 调整所有标签宽度', {
    localTabs: localTabs.value.map(t => ({ id: t.id, width: t.width, closing: closingTabs.value.has(t.id) })),
    tabWidths: { ...tabWidths.value },
    isHoveringTabArea: isHoveringTabArea.value,
    pendingWidthUpdate: pendingWidthUpdate.value
  })
  const newWidth = calculateOptimalWidth()
  localTabs.value.forEach(tab => {
    if (!closingTabs.value.has(tab.id)) {
      if (tabWidths.value[tab.id] !== newWidth) {
        console.log(`[TabsBar][updateAllTabWidths] 标签${tab.id}宽度: ${tabWidths.value[tab.id]} → ${newWidth}`)
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
  console.log('[TabsBar][onTabAreaMouseLeave] 鼠标离开标签区域', {
    localTabs: localTabs.value.map(t => ({ id: t.id, width: t.width })),
    tabWidths: { ...tabWidths.value },
    isHoveringTabArea: isHoveringTabArea.value,
    pendingWidthUpdate: pendingWidthUpdate.value
  })
  if (pendingWidthUpdate.value) {
    setTimeout(() => {
      if (!isHoveringTabArea.value) {
        console.log('[TabsBar][onTabAreaMouseLeave] 执行延迟的宽度更新', {
          localTabs: localTabs.value.map(t => ({ id: t.id, width: t.width })),
          tabWidths: { ...tabWidths.value },
          isHoveringTabArea: isHoveringTabArea.value,
          pendingWidthUpdate: pendingWidthUpdate.value
        })
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

// 拖拽事件处理
function onDragStart(event, tabId) {
  console.log(`[TabsBar][onDragStart] 开始拖拽标签: ${tabId}`)
  dragState.value.isDragging = true
  dragState.value.draggedTabId = tabId
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', tabId)
  
  // 创建拖拽图像
  const draggedElement = event.target.closest('.tab-item')
  if (draggedElement) {
    const rect = draggedElement.getBoundingClientRect()
    event.dataTransfer.setDragImage(draggedElement, rect.width / 2, rect.height / 2)
  }
}

function onDragOver(event, tabId) {
  event.preventDefault()
  event.dataTransfer.dropEffect = 'move'
  
  if (dragState.value.draggedTabId === tabId) return
  
  // 计算插入位置
  const rect = event.currentTarget.getBoundingClientRect()
  const midpoint = rect.left + rect.width / 2
  const insertPosition = event.clientX < midpoint ? 'before' : 'after'
  
  dragState.value.dragOverTabId = tabId
  dragState.value.insertPosition = insertPosition
}

function onDragEnter(event, tabId) {
  event.preventDefault()
  if (dragState.value.draggedTabId !== tabId) {
    dragState.value.dragOverTabId = tabId
  }
}

function onDragLeave(event, tabId) {
  // 检查是否真的离开了元素
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX
  const y = event.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    if (dragState.value.dragOverTabId === tabId) {
      dragState.value.dragOverTabId = null
      dragState.value.insertPosition = null
    }
  }
}

function onDrop(event, tabId) {
  event.preventDefault()
  console.log(`[TabsBar][onDrop] 放置到标签: ${tabId}`)
  
  const draggedTabId = dragState.value.draggedTabId
  const insertPosition = dragState.value.insertPosition
  
  if (draggedTabId && draggedTabId !== tabId) {
    reorderTabs(draggedTabId, tabId, insertPosition)
  }
  
  // 重置拖拽状态
  resetDragState()
}

function onDragEnd(event, tabId) {
  console.log(`[TabsBar][onDragEnd] 结束拖拽标签: ${tabId}`)
  
  // 重置拖拽状态
  resetDragState()
}

function resetDragState() {
  dragState.value.isDragging = false
  dragState.value.draggedTabId = null
  dragState.value.dragOverTabId = null
  dragState.value.insertPosition = null
}

function reorderTabs(draggedTabId, targetTabId, insertPosition) {
  console.log(`[TabsBar][reorderTabs] 重排序标签: ${draggedTabId} -> ${targetTabId} (${insertPosition})`)
  
  const draggedIndex = localTabs.value.findIndex(tab => tab.id === draggedTabId)
  const targetIndex = localTabs.value.findIndex(tab => tab.id === targetTabId)
  
  if (draggedIndex === -1 || targetIndex === -1) return
  
  // 移除被拖拽的标签
  const [draggedTab] = localTabs.value.splice(draggedIndex, 1)
  
  // 计算新的插入位置
  let newIndex = targetIndex
  if (draggedIndex < targetIndex) {
    newIndex = insertPosition === 'before' ? targetIndex - 1 : targetIndex
  } else {
    newIndex = insertPosition === 'before' ? targetIndex : targetIndex + 1
  }
  
  // 插入到新位置
  localTabs.value.splice(newIndex, 0, draggedTab)
  
  // 同步到store
  tabsStore.reorderTabs(localTabs.value.map(tab => tab.id))
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
  cursor: default;
  position: relative;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s, transform 0.2s; /*动画时间调整为 0.2s*/
  box-sizing: border-box;
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

/* 拖拽样式 */
.tab-item.dragging {
  opacity: 0.6;
  transform: scale(1.05);
  z-index: 1000;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  transition: none;
}

.tab-item.drag-over-before::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  width: 3px;
  height: 100%;
  background: #007acc;
  z-index: 1001;
}

.tab-item.drag-over-after::after {
  content: '';
  position: absolute;
  right: -2px;
  top: 0;
  width: 3px;
  height: 100%;
  background: #007acc;
  z-index: 1001;
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
  padding: 0 12px;
  gap: 10px;
  background: inherit;
}

.tab-icon {
  font-size: 18px;
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
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  color: #000000;
  background: inherit;
  border-radius: 25%;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
}

.tab-item.active .tab-close-btn {
  opacity: 1;
}

.tab-close-btn:hover {
  background: #bababa !important;
  color: black !important;
  opacity: 1;
}

@container (max-width: 18px) {
  .tab-close-btn {
    display: none;
  }
}

.add-tab-btn {
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  color: black !important;
  background: #e8e8e8;
  padding: 0 !important;
  border : none !important;
  cursor: default;
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
  cursor: default;
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