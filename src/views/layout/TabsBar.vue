<template>
  <div class="tabs-bar" @mousedown="handleBarMouseDown">
    <!-- 标签区域 -->
    <div 
      class="tabs-area" 
      ref="tabsAreaRef"
      @mouseenter="handleAreaMouseEnter"
      @mouseleave="handleAreaMouseLeave"
    >
      <!-- 标签容器 -->
      <div class="tabs-container" ref="tabsContainerRef">
        <div
          v-for="tab in visibleTabs"
          :key="tab.id"
          :class="getTabClasses(tab)"
          :style="getTabStyle(tab)"
          @mousedown="handleTabMouseDown($event, tab.id)"
          @click="handleTabClick($event, tab.id)"
          :id="`tab-${tab.id}`"
          :data-tab-id="tab.id"
        >
          <!-- 标签内容 -->
          <div class="tab-content">
            <!-- 图标 -->
            <el-icon v-if="shouldShowIcon(tab)" class="tab-icon">
              <Document />
            </el-icon>
            
            <!-- 标题 -->
            <span v-if="shouldShowTitle(tab)" class="tab-title">
              {{ tab.title }}
            </span>
            
            <!-- 常规关闭按钮（宽度≥80px时显示） -->
            <button
              v-if="shouldShowNormalCloseBtn(tab)"
              class="tab-close-btn"
              @click.stop="closeTab(tab.id)"
              @mousedown.stop
            >
              <el-icon><Close /></el-icon>
            </button>
          </div>
          
          <!-- 浮层关闭按钮（激活且宽度<80px时显示） -->
          <button
            v-if="shouldShowOverlayCloseBtn(tab)"
            class="tab-overlay-close-btn"
            @click.stop="closeTab(tab.id)"
            @mousedown.stop
          >
            <el-icon><Close /></el-icon>
          </button>
        </div>
        
        <!-- 新增标签按钮 -->
        <el-button
          class="add-tab-btn"
          size="small"
          :icon="Plus"
          @click="addTab"
          @mousedown.stop
        />
      </div>
    </div>
    
    <!-- 窗口控制按钮 -->
    <div class="window-controls">
      <el-button class="window-btn" @click="minimize" title="最小化" size="small" :icon="Minus" />
      <el-button class="window-btn" @click="maximize" title="最大化/还原" size="small" :icon="FullScreen" />
      <el-button class="window-btn close" @click="close" title="关闭" size="small" :icon="Close" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useTabsStore } from '../../store/tabsStore'
import { Close, FullScreen, Minus, Plus, Document } from "@element-plus/icons-vue"

// ==================== 配置参数 ====================
const CONFIG = {
  minTabWidth: 26,
  maxTabWidth: 240,
  closeButtonThreshold: 80,
  dragThreshold: 5,
  boundaryReattachTolerance: 5,
  openAnimationDuration: 250,
  closeAnimationDuration: 250,
  exchangeAnimationDuration: 500,
  mouseMoveThrottle: 16, // 60fps
  newTabButtonWidth: 32,
  windowControlsSpacing: 30
}

// ==================== 状态管理 ====================
const tabsStore = useTabsStore()
const tabsAreaRef = ref(null)
const tabsContainerRef = ref(null)

// UI渲染数据
const localTabs = ref([])

// 拖拽状态
const dragState = reactive({
  isDragging: false,
  draggedTabId: null,
  startPosition: { x: 0, y: 0, relativeX: 0 },
  currentPosition: { x: 0, y: 0 },
  boundaryReached: false,
  originalIndex: -1
})

// 宽度状态
const widthState = reactive({
  frozen: false,
  tabWidths: {},
  containerWidth: 0
})

// 动画状态
const animationState = reactive({
  closingTabs: new Set(),
  enteringTabs: new Set(),
  exchangingTabs: new Set()
})

// 鼠标状态
const mouseState = reactive({
  isHoveringTabArea: false,
  hoverTimer: null
})

// 积压操作
const pendingOperations = ref([])

// ==================== 计算属性 ====================
const visibleTabs = computed(() => {
  return localTabs.value.filter(tab => !shouldHideTab(tab))
})

// ==================== 工具函数 ====================
function throttle(fn, delay) {
  let lastCall = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastCall >= delay) {
      lastCall = now
      return fn.apply(this, args)
    }
  }
}

function shouldHideTab(tab) {
  // 检查标签是否应该溢出隐藏
  if (!tabsAreaRef.value) return false
  
  const containerWidth = tabsAreaRef.value.offsetWidth - CONFIG.newTabButtonWidth - CONFIG.windowControlsSpacing
  const theoreticalMinWidth = CONFIG.minTabWidth * localTabs.value.length
  
  if (theoreticalMinWidth <= containerWidth) return false
  
  // 计算当前标签的位置，如果超出容器宽度则隐藏
  const tabIndex = localTabs.value.indexOf(tab)
  const visibleCount = Math.floor(containerWidth / CONFIG.minTabWidth)
  
  return tabIndex >= visibleCount
}

function shouldShowIcon(tab) {
  const width = widthState.tabWidths[tab.id] || CONFIG.minTabWidth
  return width >= 60 // 图标需要至少60px宽度
}

function shouldShowTitle(tab) {
  const width = widthState.tabWidths[tab.id] || CONFIG.minTabWidth
  return width >= 40 // 标题需要至少40px宽度
}

function shouldShowNormalCloseBtn(tab) {
  const width = widthState.tabWidths[tab.id] || CONFIG.minTabWidth
  return width >= CONFIG.closeButtonThreshold
}

function shouldShowOverlayCloseBtn(tab) {
  const width = widthState.tabWidths[tab.id] || CONFIG.minTabWidth
  const isActive = tab.id === tabsStore.activeTabId
  return isActive && width < CONFIG.closeButtonThreshold
}

function getTabClasses(tab) {
  return [
    'tab-item',
    {
      'active': tab.id === tabsStore.activeTabId,
      'dragging': dragState.isDragging && dragState.draggedTabId === tab.id,
      'closing': animationState.closingTabs.has(tab.id),
      'entering': animationState.enteringTabs.has(tab.id),
      'exchanging': animationState.exchangingTabs.has(tab.id)
    }
  ]
}

function getTabStyle(tab) {
  const width = widthState.tabWidths[tab.id] || CONFIG.minTabWidth
  const style = {
    width: `${width}px`,
    '--tab-width': `${width}px`
  }
  
  // 拖拽时的位置
  if (dragState.isDragging && dragState.draggedTabId === tab.id) {
    const position = dragState.currentPosition.x - dragState.startPosition.relativeX
    style.transform = `translateX(${position - getTabLeftOffset(tab)}px)`
    style.zIndex = 1000
  }
  
  return style
}

function getTabLeftOffset(tab) {
  // 计算标签在容器中的左偏移量
  const tabIndex = localTabs.value.indexOf(tab)
  let offset = 0
  
  for (let i = 0; i < tabIndex; i++) {
    const prevTab = localTabs.value[i]
    if (!animationState.closingTabs.has(prevTab.id)) {
      offset += widthState.tabWidths[prevTab.id] || CONFIG.minTabWidth
    }
  }
  
  return offset
}

// ==================== 宽度计算 ====================
function calculateOptimalWidth() {
  if (!tabsAreaRef.value) return CONFIG.maxTabWidth
  
  const containerWidth = tabsAreaRef.value.offsetWidth - CONFIG.newTabButtonWidth - CONFIG.windowControlsSpacing
  const visibleTabCount = visibleTabs.value.length
  
  if (visibleTabCount === 0) return CONFIG.maxTabWidth
  
  const calculatedWidth = containerWidth / visibleTabCount
  return Math.max(CONFIG.minTabWidth, Math.min(CONFIG.maxTabWidth, calculatedWidth))
}

function updateAllTabWidths() {
  if (widthState.frozen) return
  
  console.log('[TabsBar] 更新所有标签宽度')
  
  const newWidth = calculateOptimalWidth()
  
  localTabs.value.forEach(tab => {
    if (!animationState.closingTabs.has(tab.id)) {
      widthState.tabWidths[tab.id] = newWidth
    }
  })
  
  widthState.containerWidth = tabsAreaRef.value?.offsetWidth || 0
}

function freezeTabWidths() {
  widthState.frozen = true
  console.log('[TabsBar] 冻结标签宽度')
}

function unfreezeTabWidths() {
  widthState.frozen = false
  console.log('[TabsBar] 解冻标签宽度')
  nextTick(() => {
    updateAllTabWidths()
  })
}

// ==================== 数据同步 ====================
function syncFromStore() {
  console.log('[TabsBar] 从Store同步数据')
  
  if (dragState.isDragging) {
    addPendingOperation('sync', tabsStore.tabs)
    return
  }
  
  const newTabs = tabsStore.tabs.map(tab => ({ ...tab }))
  const currentIds = new Set(localTabs.value.map(t => t.id))
  const newIds = new Set(newTabs.map(t => t.id))
  
  // 处理新增标签
  newTabs.forEach(tab => {
    if (!currentIds.has(tab.id)) {
      addTabWithAnimation(tab)
    }
  })
  
  // 处理删除标签
  localTabs.value.forEach(tab => {
    if (!newIds.has(tab.id)) {
      removeTabWithAnimation(tab.id)
    }
  })
  
  // 更新现有标签属性
  updateTabProperties(newTabs)
}

function updateTabProperties(newTabs) {
  newTabs.forEach(newTab => {
    const localTab = localTabs.value.find(t => t.id === newTab.id)
    if (localTab) {
      Object.assign(localTab, newTab)
    }
  })
}

function addTabWithAnimation(tab) {
  console.log(`[TabsBar] 添加标签动画: ${tab.id}`)
  
  localTabs.value.push({ ...tab })
  animationState.enteringTabs.add(tab.id)
  
  setTimeout(() => {
    animationState.enteringTabs.delete(tab.id)
    
    // 只有在鼠标不在标签区域时才重新计算宽度
    // if (!mouseState.isHoveringTabArea) {
      updateAllTabWidths()
    // }
  }, CONFIG.openAnimationDuration)
}

function removeTabWithAnimation(tabId) {
  console.log(`[TabsBar] 移除标签动画: ${tabId}`)
  
  animationState.closingTabs.add(tabId)
  
  setTimeout(() => {
    const index = localTabs.value.findIndex(t => t.id === tabId)
    if (index !== -1) {
      localTabs.value.splice(index, 1)
    }
    animationState.closingTabs.delete(tabId)
    
    // 只有在鼠标不在标签区域时才重新计算宽度
    if (!mouseState.isHoveringTabArea) {
      updateAllTabWidths()
    }
  }, CONFIG.closeAnimationDuration)
}

function addPendingOperation(type, data) {
  pendingOperations.value.push({ type, data, timestamp: Date.now() })
}

function processPendingOperations() {
  console.log(`[TabsBar] 处理积压操作: ${pendingOperations.value.length}个`)
  
  // 按类型排序：先关闭，后打开
  const sortedOperations = pendingOperations.value.sort((a, b) => {
    const priority = { 'close': 1, 'open': 2, 'sync': 3 }
    return priority[a.type] - priority[b.type]
  })
  
  sortedOperations.forEach(operation => {
    switch (operation.type) {
      case 'sync':
        syncFromStore()
        break
      case 'close':
        removeTabWithAnimation(operation.data)
        break
      case 'open':
        addTabWithAnimation(operation.data)
        break
    }
  })
  
  pendingOperations.value = []
}

// ==================== 拖拽系统 ====================
let dragMoveThrottled = null

function handleTabMouseDown(event, tabId) {
  // 激活标签
  setActiveTab(tabId)
  
  // 单标签不允许拖拽
  if (localTabs.value.length <= 1) return
  
  const startPosition = {
    x: event.clientX,
    y: event.clientY,
    relativeX: event.offsetX
  }
  
  // 添加临时监听器检测拖拽
  const handleMouseMove = (e) => checkDragStart(e, tabId, startPosition)
  const handleMouseUp = () => {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

function checkDragStart(event, tabId, startPosition) {
  const deltaX = Math.abs(event.clientX - startPosition.x)
  const deltaY = Math.abs(event.clientY - startPosition.y)
  
  if (deltaX > CONFIG.dragThreshold || deltaY > CONFIG.dragThreshold) {
    startDrag(tabId, startPosition)
  }
}

function startDrag(tabId, startPosition) {
  console.log(`[TabsBar] 开始拖拽: ${tabId}`)
  
  Object.assign(dragState, {
    isDragging: true,
    draggedTabId: tabId,
    startPosition,
    currentPosition: startPosition,
    boundaryReached: false,
    originalIndex: localTabs.value.findIndex(tab => tab.id === tabId)
  })
  
  // 冻结宽度
  freezeTabWidths()
  
  // 创建节流的mousemove处理器
  dragMoveThrottled = throttle(handleDragMove, CONFIG.mouseMoveThrottle)
  
  // 添加全局事件监听器
  document.addEventListener('mousemove', dragMoveThrottled)
  document.addEventListener('mouseup', handleDragEnd)
  document.addEventListener('keydown', handleDragKeyDown)
  document.addEventListener('contextmenu', handleDragRightClick)
  document.addEventListener('blur', handleWindowBlur)
  
  // 清理临时监听器
  document.removeEventListener('mousemove', checkDragStart)
}

function handleDragMove(event) {
  if (!dragState.isDragging) return
  
  const currentX = event.clientX
  const currentY = event.clientY
  
  if (!tabsContainerRef.value) return
  
  const containerRect = tabsContainerRef.value.getBoundingClientRect()
  const draggedTabWidth = widthState.tabWidths[dragState.draggedTabId] || CONFIG.minTabWidth
  
  // 计算标签应该的位置
  const tabPosition = currentX - dragState.startPosition.relativeX
  const leftBoundary = containerRect.left
  const rightBoundary = containerRect.right - draggedTabWidth
  
  // 边界检测
  if (tabPosition < leftBoundary) {
    dragState.boundaryReached = 'left'
  } else if (tabPosition > rightBoundary) {
    dragState.boundaryReached = 'right'
  } else {
    // 检查是否从边界重连
    if (dragState.boundaryReached) {
      const yDelta = Math.abs(currentY - dragState.startPosition.y)
      if (yDelta <= CONFIG.boundaryReattachTolerance) {
        dragState.boundaryReached = false
        console.log('[TabsBar] 边界重连成功')
      }
    }
    
    if (!dragState.boundaryReached) {
      // 更新拖拽位置
      dragState.currentPosition = { x: currentX, y: currentY }
      
      // 检查标签交换
      checkTabExchange(currentX)
    }
  }
}

function checkTabExchange(mouseX) {
  const draggedTab = localTabs.value.find(tab => tab.id === dragState.draggedTabId)
  const draggedIndex = localTabs.value.indexOf(draggedTab)
  
  for (let i = 0; i < localTabs.value.length; i++) {
    if (i === draggedIndex) continue
    
    const tab = localTabs.value[i]
    const tabElement = document.getElementById(`tab-${tab.id}`)
    if (!tabElement) continue
    
    const tabRect = tabElement.getBoundingClientRect()
    const tabCenter = tabRect.left + tabRect.width / 2
    
    // 检查是否越过中心点
    if ((i < draggedIndex && mouseX < tabCenter) || 
        (i > draggedIndex && mouseX > tabCenter)) {
      exchangeTabs(draggedIndex, i)
      break
    }
  }
}

function exchangeTabs(fromIndex, toIndex) {
  console.log(`[TabsBar] 交换标签: ${fromIndex} → ${toIndex}`)
  
  // 中断当前交换动画
  animationState.exchangingTabs.clear()
  
  // 移动标签
  const movedTab = localTabs.value.splice(fromIndex, 1)[0]
  localTabs.value.splice(toIndex, 0, movedTab)
  
  // 播放交换动画
  playExchangeAnimation(fromIndex, toIndex)
}

function playExchangeAnimation(fromIndex, toIndex) {
  // 标记相关标签为交换动画状态
  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  
  for (let i = start; i <= end; i++) {
    if (localTabs.value[i] && localTabs.value[i].id !== dragState.draggedTabId) {
      animationState.exchangingTabs.add(localTabs.value[i].id)
    }
  }
  
  // 动画结束后清理状态
  setTimeout(() => {
    for (let i = start; i <= end; i++) {
      if (localTabs.value[i]) {
        animationState.exchangingTabs.delete(localTabs.value[i].id)
      }
    }
  }, CONFIG.exchangeAnimationDuration)
}

// 拖拽结束相关事件处理
function handleDragEnd(event) {
  if (!dragState.isDragging) return
  
  console.log('[TabsBar] 拖拽结束')
  
  endDrag(false)
}

function handleDragKeyDown(event) {
  if (event.key === 'Escape') {
    console.log('[TabsBar] ESC取消拖拽')
    endDrag(true)
  }
}

function handleDragRightClick(event) {
  event.preventDefault()
  console.log('[TabsBar] 右键取消拖拽')
  endDrag(true)
}

function handleWindowBlur() {
  console.log('[TabsBar] 失焦取消拖拽')
  endDrag(true)
}

function endDrag(cancelled = false) {
  if (!dragState.isDragging) return
  
  // 清理事件监听器
  if (dragMoveThrottled) {
    document.removeEventListener('mousemove', dragMoveThrottled)
    dragMoveThrottled = null
  }
  document.removeEventListener('mouseup', handleDragEnd)
  document.removeEventListener('keydown', handleDragKeyDown)
  document.removeEventListener('contextmenu', handleDragRightClick)
  document.removeEventListener('blur', handleWindowBlur)
  
  if (!cancelled) {
    // 同步到Store
    const newOrder = localTabs.value.map(tab => tab.id)
    tabsStore.reorderTabs(newOrder)
    
    // 处理积压操作
    processPendingOperations()
  }
  
  // 解冻宽度
  unfreezeTabWidths()
  
  // 重置拖拽状态
  Object.assign(dragState, {
    isDragging: false,
    draggedTabId: null,
    startPosition: { x: 0, y: 0, relativeX: 0 },
    currentPosition: { x: 0, y: 0 },
    boundaryReached: false,
    originalIndex: -1
  })
  
  // 清理交换动画状态
  animationState.exchangingTabs.clear()
}

// ==================== 基础交互 ====================
function handleTabClick(event, tabId) {
  if (!dragState.isDragging) {
    setActiveTab(tabId)
  }
}

function handleBarMouseDown(event) {
  // 空白区域点击不做处理，保持窗口拖拽功能
}

function setActiveTab(tabId) {
  console.log(`[TabsBar] 激活标签: ${tabId}`)
  tabsStore.setActiveTab(tabId)
}

function addTab() {
  console.log('[TabsBar] 新增标签')
  tabsStore.addTab({ active: true, loading: true })
}

function closeTab(tabId) {
  console.log(`[TabsBar] 关闭标签: ${tabId}`)
  
  if (dragState.isDragging) {
    addPendingOperation('close', tabId)
    return
  }
  
  tabsStore.removeTab(tabId)
}

// ==================== 鼠标悬停处理 ====================
function handleAreaMouseEnter() {
  mouseState.isHoveringTabArea = true
  
  if (mouseState.hoverTimer) {
    clearTimeout(mouseState.hoverTimer)
    mouseState.hoverTimer = null
  }
  
  console.log('[TabsBar] 鼠标进入标签区域')
}

function handleAreaMouseLeave() {
  mouseState.isHoveringTabArea = false
  
  // 延迟200ms后重新计算宽度
  mouseState.hoverTimer = setTimeout(() => {
    if (!mouseState.isHoveringTabArea && !dragState.isDragging) {
      // 强制重新计算宽度，处理可能积压的计算需求
      updateAllTabWidths()
    }
    mouseState.hoverTimer = null
  }, 200)
  
  console.log('[TabsBar] 鼠标离开标签区域')
}

// ==================== 窗口控制 ====================
function minimize() {
  window.api?.sendWindowControl('minimize')
}

function maximize() {
  window.api?.sendWindowControl('maximize')
}

function close() {
  window.api?.sendWindowControl('close')
}

// ==================== 窗口大小变化 ====================
function handleResize() {
  if (dragState.isDragging) {
    endDrag(true) // 窗口大小变化时取消拖拽
    return
  }
  
  updateAllTabWidths()
}

// ==================== 生命周期 ====================
onMounted(() => {
  console.log('[TabsBar] 组件挂载')
  
  // 初始化数据
  syncFromStore()
  updateAllTabWidths()
  
  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)
  
  // 暴露组件实例供调试使用
  window.tabsBarInstance = {
    tabsStore,
    localTabs,
    dragState,
    widthState,
    animationState,
    mouseState,
    pendingOperations,
    updateAllTabWidths,
    addTab,
    closeTab,
    setActiveTab,
    // 调试方法
    closeAllTabs: () => tabsStore.closeAllTabs(),
    closeHalfTabs: () => tabsStore.closeHalfTabs(),
    addMultipleTabs: (count) => {
      for (let i = 0; i < count; i++) {
        tabsStore.addTab({ active: i === count - 1, loading: true })
      }
    },
    insertTabAt: (position, tabOptions) => {
      return tabsStore.insertTabAt(position, tabOptions)
    }
  }
})

onUnmounted(() => {
  console.log('[TabsBar] 组件卸载')
  
  // 清理事件监听器
  window.removeEventListener('resize', handleResize)
  
  if (mouseState.hoverTimer) {
    clearTimeout(mouseState.hoverTimer)
  }
  
  // 清理拖拽相关监听器
  if (dragState.isDragging) {
    endDrag(true)
  }
  
  // 清理全局暴露
  delete window.tabsBarInstance
})

// ==================== Store监听 ====================
watch(() => tabsStore.tabs, (newTabs) => {
  const localTabIds = new Set(localTabs.value.map(t => t.id))
  const storeTabIds = new Set(newTabs.map(t => t.id))
  
  // 检查是否需要重新渲染
  if (localTabIds.size !== storeTabIds.size || 
      [...localTabIds].some(id => !storeTabIds.has(id))) {
    syncFromStore()
  } else {
    // 只更新属性
    updateTabProperties(newTabs)
  }
}, { deep: true })

// 监听激活标签变化
watch(() => tabsStore.activeTabId, (newActiveId) => {
  console.log(`[TabsBar] 激活标签变化: ${newActiveId}`)
})
</script>

<style scoped>
/* ==================== 基础布局 ==================== */
.tabs-bar {
  display: flex;
  align-items: center;
  height: 40px;
  padding: 0 140px 0 8px;
  background-color: #e8e8e8;
  position: relative;
  box-sizing: border-box;
  -webkit-app-region: drag;
  user-select: none;
}

.tabs-area {
  display: flex;
  align-items: flex-end;
  flex: 1;
  min-width: 0;
  height: 100%;
  margin-top: 8px;
  -webkit-app-region: drag;
  overflow: hidden;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  flex: 1;
  min-width: 0;
  height: 32px;
  overflow: hidden;
  position: relative;
  -webkit-app-region: no-drag;
}

/* ==================== 标签样式 ==================== */
.tab-item {
  height: 32px;
  min-width: var(--tab-width, 26px);
  width: var(--tab-width, 26px);
  background: #e8e8e8;
  border-bottom: none;
  cursor: default;
  position: relative;
  flex-shrink: 0;
  box-sizing: border-box;
  transition: width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item:not(.dragging) {
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1),
              width 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-item.active {
  background: #ffffff;
  z-index: 2;
}

.tab-item.dragging {
  z-index: 1000;
  pointer-events: none;
  transition: none;
}

.tab-item:hover:not(.dragging):not(.active) {
  background: #dadada;
}

/* ==================== 标签内容 ==================== */
.tab-content {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 0 12px;
  gap: 6px;
  overflow: hidden;
  position: relative;
}

.tab-icon {
  font-size: 16px;
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
  min-width: 0;
}

/* ==================== 关闭按钮 ==================== */
.tab-close-btn {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: transparent;
  border-radius: 2px;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  z-index: 2;
  color: #000000;
  transition: background-color 0.15s ease;
}

.tab-close-btn:hover {
  background: #bababa !important;
  color: black !important;
}

.tab-overlay-close-btn {
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  width: 18px;
  height: 18px;
  padding: 0;
  border: none;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 2px;
  cursor: default;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  color: #000000;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: background-color 0.15s ease;
}

.tab-overlay-close-btn:hover {
  background: #bababa !important;
  color: black !important;
}

/* ==================== 分割线 ==================== */
.tab-item:not(.active):not(.dragging)::after {
  content: '';
  position: absolute;
  right: 0;
  top: 25%;
  height: 50%;
  width: 1px;
  background: #2d2d2d;
  opacity: 0.6;
}

.tab-item:not(.active):last-child::after,
.tab-item:not(.active):has(+ .tab-item.active)::after,
.tab-item:not(.active).closing::after {
  display: none;
}

.tab-item:not(.active):hover::after,
.tab-item:not(.active):has(+ .tab-item:hover)::after {
  display: none;
}

/* ==================== 动画 ==================== */
.tab-item.entering {
  animation: tab-enter 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  overflow: hidden;
}

.tab-item.closing {
  animation: tab-close 250ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
  overflow: hidden;
}

.tab-item.exchanging {
  transition: transform 500ms cubic-bezier(0.23, 1, 0.32, 1) !important;
}

@keyframes tab-enter {
  from {
    width: 0;
    min-width: 0;
    opacity: 0;
    transform: scaleX(0);
    transform-origin: left center;
  }
  to {
    width: var(--tab-width);
    min-width: var(--tab-width);
    opacity: 1;
    transform: scaleX(1);
    transform-origin: left center;
  }
}

@keyframes tab-close {
  from {
    width: var(--tab-width);
    min-width: var(--tab-width);
    opacity: 1;
    transform: scaleX(1);
    transform-origin: center;
  }
  to {
    width: 0;
    min-width: 0;
    opacity: 0;
    transform: scaleX(0);
    transform-origin: center;
  }
}

/* ==================== 新增按钮 ==================== */
.add-tab-btn {
  height: 32px !important;
  width: 32px !important;
  min-width: 32px !important;
  min-height: 32px !important;
  padding: 0 !important;
  border: none !important;
  background: #e8e8e8;
  color: black !important;
  cursor: default;
  flex-shrink: 0;
  transition: background-color 0.15s ease;
}

.add-tab-btn:hover {
  background: #dadada !important;
  color: black !important;
}

/* ==================== 窗口控制 ==================== */
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
  width: 46px !important;
  height: 100% !important;
  border: none !important;
  border-radius: 0 !important;
  background: transparent !important;
  color: #444 !important;
  outline: none !important;
  cursor: default;
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.window-btn:hover {
  background: #e0e0e0 !important;
  color: #444 !important;
}

.window-btn.close:hover {
  background: #e57373 !important;
  color: #fff !important;
}

/* ==================== 响应式和容器查询 ==================== */
@container (max-width: 30px) {
  .tab-content {
    padding: 0 4px;
    gap: 2px;
  }
  
  .tab-icon,
  .tab-title {
    display: none;
  }
}

@container (max-width: 50px) {
  .tab-title {
    font-size: 11px;
  }
}

@container (max-width: 70px) {
  .tab-content {
    gap: 4px;
  }
}

/* ==================== 性能优化 ==================== */
.tab-item,
.tab-content,
.tab-close-btn,
.tab-overlay-close-btn {
  will-change: transform, opacity;
}

.tab-item.dragging,
.tab-item.entering,
.tab-item.closing,
.tab-item.exchanging {
  will-change: transform, width, opacity;
}
</style> 