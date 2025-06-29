<template>
  <div class="tabs-bar drag-region">
    <div class="tabs-bar-left">
      <!-- 标签区域 -->
      <div class="tabs-area" ref="tabsAreaRef" @mouseenter="onTabAreaMouseEnter" @mouseleave="onTabAreaMouseLeave">
        <!-- 自定义标签页 -->
        <div class="tabs-container" ref="sortableContainer">
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
              :data-tab-id="tab.id"
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
import Sortable from 'sortablejs'

const tabsStore = useTabsStore()
const tabsAreaRef = ref(null)
const sortableContainer = ref(null)

// [GPT-4, 2024-06-28 19:00:00 Asia/Hong_Kong] 本地UI状态：关闭动画、宽度、悬停、拖拽
const closingTabs = ref(new Set()) // 正在关闭的标签id集合
const tabWidths = ref({}) // { [tabId]: width }
const isHoveringTabArea = ref(false)
const pendingWidthUpdate = ref(false)
const localTabs = ref([])

// 拖拽相关状态
const isDragging = ref(false)
const draggedTabId = ref(null)
let sortableInstance = null

onMounted(() => {
  syncTabsFromStore()
  window.addEventListener('resize', handleResize)
  updateAllTabWidths()
  
  // 初始化SortableJS
  initSortable()

  // 暴露组件实例到全局，供调试面板使用
  window.tabsBarInstance = {
    tabsStore,
    updateAllTabWidths,
    // 调试面板需要的方法和属性
    addTab,
    closeTab,
    setActiveTab,
    updateTab,
    // 暴露响应式数据
    localTabs,
    tabWidths,
    isHoveringTabArea,
    closingTabs,
    isDragging,
    draggedTabId,
    // 暴露 tabsStore 的方法
    closeAllTabs: () => tabsStore.closeAllTabs(),
    closeHalfTabs: () => tabsStore.closeHalfTabs(),
    addMultipleTabs: (count) => {
      for (let i = 0; i < count; i++) {
        tabsStore.addTab({ active: i === count - 1, loading: true })
      }
    },
    // 在指定位置插入标签的方法
    insertTabAt: (position, tabOptions) => {
      return tabsStore.insertTabAt(position, tabOptions)
    },
    // 便捷方法：在第2个位置插入标签
    insertTabAtSecond: () => {
      return tabsStore.insertTabAt(1, { active: true, loading: true, title: '新标签(位置2)' })
    },
    // 便捷方法：在第5个位置插入标签
    insertTabAtFifth: () => {
      return tabsStore.insertTabAt(4, { active: true, loading: true, title: '新标签(位置5)' })
    }
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  // 清理SortableJS实例
  if (sortableInstance) {
    sortableInstance.destroy()
    sortableInstance = null
  }
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

// 初始化SortableJS拖拽功能
function initSortable() {
  if (!sortableContainer.value) return
  
  sortableInstance = new Sortable(sortableContainer.value, {
    // 基础配置
    group: 'tabs',
    animation: 200,
    easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    
    // 拖拽句柄 - 整个标签内容区域都可拖拽，但排除关闭按钮
    handle: '.tab-content',
    filter: '.tab-close-btn',
    preventOnFilter: false,
    
    // 拖拽阈值和延迟
    delay: 100,
    delayOnTouchStart: true,
    touchStartThreshold: 10,
    
    // 样式类名
    ghostClass: 'tab-ghost',        // 拖拽占位符样式
    chosenClass: 'tab-chosen',      // 被选中时的样式
    dragClass: 'tab-dragging',      // 拖拽中的样式
    
    // 强制回退机制，确保在所有浏览器中一致
    forceFallback: true,
    fallbackClass: 'tab-fallback',
    fallbackOnBody: true,
    
    // 事件处理
    onStart: onDragStart,
    onMove: onDragMove,
    onEnd: onDragEnd,
    onClone: onDragClone
  })
  
  console.log('[TabsBar][initSortable] SortableJS已初始化')
}

// 拖拽开始事件
function onDragStart(evt) {
  const tabId = evt.item.dataset.tabId
  if (!tabId) return
  
  isDragging.value = true
  draggedTabId.value = tabId
  
  console.log(`[TabsBar][onDragStart] 开始拖拽标签: ${tabId}`)
  console.log(`[TabsBar][onDragStart] 原始位置: ${evt.oldIndex}`)
  
  // 给被拖拽的标签添加特殊样式
  evt.item.classList.add('tab-being-dragged')
  
  // 暂停鼠标悬停检测，避免干扰拖拽
  isHoveringTabArea.value = false
}

// 拖拽移动事件（用于自定义交换逻辑）
function onDragMove(evt) {
  // 这里可以添加自定义的交换逻辑
  // 比如基于鼠标位置和标签中心点的距离来决定是否交换
  return true // 返回true允许移动，false阻止移动
}

// 拖拽结束事件
function onDragEnd(evt) {
  const tabId = evt.item.dataset.tabId
  if (!tabId) return
  
  console.log(`[TabsBar][onDragEnd] 拖拽结束: ${tabId}`)
  console.log(`[TabsBar][onDragEnd] 原始位置: ${evt.oldIndex}, 新位置: ${evt.newIndex}`)
  
  // 移除拖拽样式
  evt.item.classList.remove('tab-being-dragged')
  
  // 如果位置发生了变化，更新数据
  if (evt.oldIndex !== evt.newIndex) {
    reorderTabs(evt.oldIndex, evt.newIndex)
  }
  
  // 重置拖拽状态
  isDragging.value = false
  draggedTabId.value = null
  
  // 重新计算宽度
  nextTick(() => {
    updateAllTabWidths()
  })
  
  console.log(`[TabsBar][onDragEnd] 标签重排完成`)
}

// 拖拽克隆事件（如果需要的话）
function onDragClone(evt) {
  console.log(`[TabsBar][onDragClone] 克隆标签:`, evt.item.dataset.tabId)
}

// 重排序标签
function reorderTabs(oldIndex, newIndex) {
  if (oldIndex === newIndex) return
  
  console.log(`[TabsBar][reorderTabs] 重排序: ${oldIndex} → ${newIndex}`)
  
  // 更新本地标签数组
  const movedTab = localTabs.value.splice(oldIndex, 1)[0]
  localTabs.value.splice(newIndex, 0, movedTab)
  
  // 更新Pinia store中的顺序
  const newOrder = localTabs.value.map(tab => tab.id)
  tabsStore.reorderTabs(newOrder)
  
  console.log(`[TabsBar][reorderTabs] 新顺序:`, newOrder)
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

/* ===== SortableJS 拖拽样式 - Edge浏览器风格 ===== */

/* 拖拽占位符样式 - 显示标签将要插入的位置 */
.tab-ghost {
  opacity: 0.4;
  background: #d0d0d0 !important;
  border: 2px dashed #999 !important;
  transform: none !important;
}

.tab-ghost .tab-content {
  opacity: 0.6;
}

/* 被选中准备拖拽的标签样式 */
.tab-chosen {
  cursor: grabbing !important;
}

/* 正在被拖拽的标签样式 */
.tab-dragging {
  opacity: 1 !important;
  transform: rotate(0deg) !important; /* 确保没有旋转 */
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  z-index: 1000 !important;
}

/* SortableJS回退拖拽样式 */
.tab-fallback {
  opacity: 1 !important;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2) !important;
  transform: rotate(0deg) !important;
  z-index: 1000 !important;
  cursor: grabbing !important;
}

/* 自定义被拖拽标签样式 - Edge风格 */
.tab-being-dragged {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
  z-index: 999 !important;
  cursor: grabbing !important;
  transition: box-shadow 0.1s ease !important;
}

/* 拖拽过程中的容器样式 */
.tabs-container.sortable-drag {
  cursor: grabbing;
}

/* 确保拖拽时标签内容不被选中 */
.tabs-container * {
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
}

/* 拖拽时禁用标签的hover效果 */
.tabs-container.sortable-drag .tab-item:hover {
  background: inherit !important;
}

/* 拖拽时标签的平滑移动效果 */
.tab-item {
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* 拖拽状态下禁用标签自身的过渡效果，避免冲突 */
.tab-item.sortable-chosen,
.tab-item.sortable-ghost,
.tab-item.tab-being-dragged {
  transition: none !important;
}

/* 确保关闭按钮在拖拽时不可点击 */
.tab-being-dragged .tab-close-btn {
  pointer-events: none !important;
}

/* 拖拽时的标签内容样式 */
.tab-being-dragged .tab-content {
  pointer-events: none !important;
}

/* Edge风格：拖拽时标签栏的整体效果 */
.tabs-container {
  position: relative;
}

/* 确保拖拽占位符与其他标签一致 */
.tab-ghost .tab-icon,
.tab-ghost .tab-title,
.tab-ghost .tab-close-btn {
  opacity: 0.5;
}

/* 拖拽时禁用标签点击事件，避免意外激活 */
.tab-item.sortable-chosen,
.tab-item.tab-being-dragged {
  pointer-events: none !important;
}

.tab-item.sortable-chosen .tab-content,
.tab-item.tab-being-dragged .tab-content {
  pointer-events: none !important;
}

/*
原有的拖拽设计想法（已由SortableJS实现）：
- 检测拖拽行为后提取标签DOM，创建虚拟标签替换
- 被拖拽标签脱离DOM跟随鼠标移动
- 虚拟标签与其他标签交换位置
- 拖拽结束时删除虚拟标签，用实际标签替换

Edge浏览器风格实现：
- 标签只做左右移动，无旋转描边特效
- 交换位置的标签简单滑动
- 移动半个标签距离即可交换位置
- 使用SortableJS的幽灵标签方案
*/
</style>