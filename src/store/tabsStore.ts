import { defineStore } from 'pinia'
import { TabEntity, TabState } from '../models/tab'
import { TabType } from '../constants/tab'
import { v4 as uuidv4 } from 'uuid'

const BING_URL = 'https://www.bing.com'

function createDefaultTab(): TabEntity {
  return {
    id: uuidv4(),
    index: 0,
    title: '必应',
    url: BING_URL,
    icon: '',
    loading: false,
    active: true,
    pinned: false,
    groupId: '',
    type: TabType.NORMAL,
    muted: false,
    canGoBack: false,
    canGoForward: false
  }
}

export const useTabsStore = defineStore('tabs', {
  state: (): TabState => {
    const defaultTab = createDefaultTab()
    return {
      tabs: [defaultTab],
      activeTabId: defaultTab.id,
      lastActiveTabId: ''
    }
  },
  actions: {
    // [GPT-4, 2024-06-28 18:20:00 Asia/Hong_Kong] 初始化标签栏
    resetTabs() {
      this.tabs = [createDefaultTab()]
      this.activeTabId = this.tabs[0].id
      this.lastActiveTabId = ''
    },
    // [GPT-4, 2024-06-28 18:20:00 Asia/Hong_Kong] 新增标签，支持Partial<TabEntity>，active/loading可选
    addTab(tab?: Partial<TabEntity>) {
      // 如果传入active: true，先取消其他标签激活
      const isActive = tab?.active ?? false
      if (isActive) {
        this.tabs.forEach(t => t.active = false)
      }
      const newTab: TabEntity = {
        ...createDefaultTab(),
        ...tab,
        id: uuidv4(),
        index: this.tabs.length,
        active: isActive,
        loading: tab?.loading ?? false
      }
      this.tabs.push(newTab)
      if (isActive) {
        this.activeTabId = newTab.id
      }
      return newTab
    },
    // 在指定位置插入标签
    insertTabAt(position: number, tab?: Partial<TabEntity>) {
      // 确保位置在有效范围内
      const insertPosition = Math.max(0, Math.min(position, this.tabs.length))
      
      // 如果传入active: true，先取消其他标签激活
      const isActive = tab?.active ?? false
      if (isActive) {
        this.tabs.forEach(t => t.active = false)
      }
      
      const newTab: TabEntity = {
        ...createDefaultTab(),
        ...tab,
        id: uuidv4(),
        index: insertPosition,
        active: isActive,
        loading: tab?.loading ?? false
      }
      
      // 在指定位置插入标签
      this.tabs.splice(insertPosition, 0, newTab)
      
      // 更新后续标签的index
      this.updateTabIndices()
      
      if (isActive) {
        this.activeTabId = newTab.id
      }
      
      return newTab
    },
    // 更新所有标签的index，确保连续性
    updateTabIndices() {
      this.tabs.forEach((tab, index) => {
        tab.index = index
      })
    },
    // [GPT-4, 2024-06-28 18:20:00 Asia/Hong_Kong] 关闭标签
    removeTab(id: string) {
      const idx = this.tabs.findIndex(t => t.id === id)
      if (idx === -1) return
      const wasActive = this.tabs[idx].active
      this.tabs.splice(idx, 1)
      
      // 更新标签索引
      this.updateTabIndices()
      
      if (wasActive && this.tabs.length > 0) {
        // Activate the next tab (the one on the right), or the new last one if the closed tab was the last one.
        const newActiveIndex = Math.min(idx, this.tabs.length - 1)
        this.setActiveTab(this.tabs[newActiveIndex].id)
      } else if (this.tabs.length === 0) {
        this.addTab({ active: true })
      }
    },
    // [GPT-4, 2024-06-28 18:20:00 Asia/Hong_Kong] 更新标签
    updateTab(id: string, patch: Partial<TabEntity>) {
      const tab = this.tabs.find(t => t.id === id)
      if (tab) Object.assign(tab, patch)
    },
    setActiveTab(id: string) {
      const prev = this.activeTabId
      this.tabs.forEach(t => t.active = false)
      const tab = this.tabs.find(t => t.id === id)
      if (tab) {
        tab.active = true
        this.lastActiveTabId = prev
        this.activeTabId = id
      }
    },
    setTabMuted(id: string, muted: boolean) {
      this.updateTab(id, { muted })
    },
    setTabGroup(id: string, groupId: string) {
      this.updateTab(id, { groupId })
    },
    setTabIcon(id: string, icon: string) {
      this.updateTab(id, { icon })
    },
    setTabLoading(id: string, loading: boolean) {
      this.updateTab(id, { loading })
    },
    setTabPinned(id: string, pinned: boolean) {
      this.updateTab(id, { pinned })
    },
    closeTabs(ids: string[]) {
      ids.forEach(id => this.removeTab(id))
    },
    closeAllTabs() {
      this.resetTabs()
    },
    closeHalfTabs() {
      const half = Math.floor(this.tabs.length / 2)
      const ids = this.tabs.slice(0, half).map(t => t.id)
      this.closeTabs(ids)
    },
    // [GPT-4, 2024-06-28 20:30:00 Asia/Hong_Kong] 重排序标签
    reorderTabs(newOrder: string[]) {
      const reorderedTabs: TabEntity[] = []
      newOrder.forEach(id => {
        const tab = this.tabs.find(t => t.id === id)
        if (tab) {
          tab.index = reorderedTabs.length
          reorderedTabs.push(tab)
        }
      })
      this.tabs = reorderedTabs
    }
  }
}) 