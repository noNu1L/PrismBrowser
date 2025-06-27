<template>
  <div class="tabs-bar drag-region">
    <div class="tabs-bar-left">
      <!-- 标签区域 -->
      <div class="tabs-area">
        <!-- 自定义标签页 -->
        <div class="tabs-container">
          <div
              v-for="tab in tabs"
              :key="tab.id"
              :class="['tab-item', { 'active': tab.id === activeTabId }]"
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
import {ref} from 'vue'
import {Close, FullScreen, Minus, Plus, Document} from "@element-plus/icons-vue";

const activeTabId = ref('tab1')
const tabs = ref([
  { id: 'tab1', title: '新标签页' },
  { id: 'tab2', title: '标签页 2' }
])

let tabCounter = 3

function setActiveTab(tabId) {
  activeTabId.value = tabId
}

function closeTab(tabId) {
  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index > -1) {
    tabs.value.splice(index, 1)
    // 如果关闭的是当前激活标签，切换到相邻标签
    if (tabId === activeTabId.value && tabs.value.length > 0) {
      const newIndex = Math.max(0, index - 1)
      activeTabId.value = tabs.value[newIndex].id
    }
  }
}

function addTab() {
  const newTab = {
    id: `tab${tabCounter++}`,
    title: `新标签页 ${tabCounter - 1}`
  }
  tabs.value.push(newTab)
  activeTabId.value = newTab.id
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
  gap: 2px;
}

.tabs-container {
  display: flex;
  align-items: flex-end;
}

.tab-item {
  height: 32px;
  min-width: 120px;
  max-width: 240px;
  width: 240px;
  background: #e8e8e8;
  border-bottom: none;
  border-radius: 2px 2px 0 0;
  cursor: pointer;
  position: relative;
  transition: all 0.2s;
  box-sizing: border-box;
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
  padding: 0 !important;
  border: 1px solid #d0d0d0 !important;
  border-bottom: 0 !important;
  border-radius: 2px 2px 0 0;
  align-self: flex-end;
  box-sizing: border-box !important;
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