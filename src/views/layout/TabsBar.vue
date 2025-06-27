<template>
  <div class="tabs-bar drag-region">
    <div class="tabs-bar-left">
      <!-- 标签区域 -->
      <div class="tabs-area" @mouseenter="onTabAreaMouseEnter" @mouseleave="onTabAreaMouseLeave">
        <!-- 自定义标签页 -->
        <div class="tabs-container">
          <div
              v-for="tab in tabs"
              :key="tab.id"
              :class="['tab-item', { 'active': tab.id === activeTabId, 'closing': tab.closing }]"
              :style="{ width: `${tab.width}px` }"
              @click="setActiveTab(tab.id)"
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
import {ref, watch, onMounted, onUnmounted} from 'vue'
import {Close, FullScreen, Minus, Plus, Document} from "@element-plus/icons-vue";

const activeTabId = ref('tab1')
const tabs = ref([
  { id: 'tab1', title: '新标签页', width: 240 },
  { id: 'tab2', title: '标签页 2', width: 240 }
])

let tabCounter = 3
const isHoveringTabArea = ref(false)
const pendingWidthUpdate = ref(false)

function setActiveTab(tabId) {
  activeTabId.value = tabId
}

function closeTab(tabId) {
  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index > -1) {
    // 标记需要延迟更新宽度
    pendingWidthUpdate.value = true
    
    // 添加关闭动画类
    const tab = tabs.value[index]
    tab.closing = true
    
    // 延迟移除标签，让动画完成
    setTimeout(() => {
      tabs.value.splice(index, 1)
      // 如果关闭的是当前激活标签，切换到相邻标签
      if (tabId === activeTabId.value && tabs.value.length > 0) {
        const newIndex = Math.max(0, index - 1)
        activeTabId.value = tabs.value[newIndex].id
      }
    }, 300) // 与CSS动画时间匹配
  }
}

function addTab() {
  const newTab = {
    id: `tab${tabCounter++}`,
    title: `新标签页 ${tabCounter - 1}`,
    width: calculateOptimalWidth()
  }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
  
  // 检查是否有标签正在关闭
  const hasClosingTabs = tabs.value.some(tab => tab.closing)
  if (hasClosingTabs) {
    pendingWidthUpdate.value = true
  } else {
    updateAllTabWidths()
  }
}

// 计算最佳标签宽度
function calculateOptimalWidth() {
  const maxWidth = 240
  const minWidth = 20
  const containerWidth = window.innerWidth
  const addBtnWidth = 32
  
  // 标签栏的右边距 (考虑窗口控制按钮)
  const rightPadding = 140
  // 标签栏的左边距
  const leftPadding = 8
  // 预留的空间
  const reservedSpace = 30
  
  const availableWidth = containerWidth - rightPadding - leftPadding - addBtnWidth - reservedSpace
  
  // 计算当前所有非关闭标签的数量
  const activeTabCount = tabs.value.filter(tab => !tab.closing).length
  
  const calculatedWidth = Math.max(minWidth, Math.min(maxWidth, availableWidth / activeTabCount))
  
  return calculatedWidth
}

// 更新所有标签宽度
function updateAllTabWidths() {
  // 如果有标签正在关闭且鼠标在标签区域，不更新宽度
  const hasClosingTabs = tabs.value.some(tab => tab.closing)
  if (hasClosingTabs && isHoveringTabArea.value) {
    return
  }
  
  const newWidth = calculateOptimalWidth()
  tabs.value.forEach(tab => {
    if (!tab.closing) {
      tab.width = newWidth
    }
  })
}

// 鼠标进入标签区域
function onTabAreaMouseEnter() {
  isHoveringTabArea.value = true
}

// 鼠标离开标签区域
function onTabAreaMouseLeave() {
  isHoveringTabArea.value = false
  
  // 如果有待处理的宽度更新，延迟执行
  if (pendingWidthUpdate.value) {
    setTimeout(() => {
      if (!isHoveringTabArea.value) {
        updateAllTabWidths()
        pendingWidthUpdate.value = false
      }
    }, 150)
  }
}

function minimize() {
  window.api?.sendWindowControl('minimize')
}

function maximize() {
  window.api?.sendWindowControl('maximize')
}

function close() {
  window.api?.sendWindowControl('close')
}

// 窗口大小变化处理
function handleResize() {
  // 如果有标签正在关闭，不立即更新
  const hasClosingTabs = tabs.value.some(tab => tab.closing)
  if (hasClosingTabs) {
    pendingWidthUpdate.value = true
  } else {
    updateAllTabWidths()
  }
}

// 组件挂载时添加窗口大小监听
onMounted(() => {
  window.addEventListener('resize', handleResize)
})

// 组件卸载时移除监听
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})


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
  max-width: calc(100% - 30px); /* 预留空间给窗口控制按钮 */
  overflow: hidden;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
  overflow-x: auto;
  flex: 1;
  min-width: 0;
}

.tabs-container::-webkit-scrollbar {
  display: none;
}

.tab-item {
  height: 32px;
  min-width: 80px;
  max-width: 240px;
  background: #e8e8e8;
  border-bottom: none;
  cursor: pointer;
  position: relative;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s, transform 0.3s;
  box-sizing: border-box;
  margin-right: 2px;
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
  margin-left: 0 !important;
  margin-right: 2px !important; /* 保持右边距，避免其他标签移动 */
  padding-left: 0 !important;
  padding-right: 0 !important;
  border-left: none !important;
  border-right: none !important;
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

/* 如果右侧相邻的是激活标签，则不显示分割线 */
.tab-item:not(.active):has(+ .tab-item.active)::after,
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