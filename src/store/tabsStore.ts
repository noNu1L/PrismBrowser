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
    muted: false
  }
}

export const useTabsStore = defineStore('tabs', {
  state: (): TabState => ({
    tabs: [createDefaultTab()],
    activeTabId: '',
    lastActiveTabId: ''
  }),
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
    // [GPT-4, 2024-06-28 18:20:00 Asia/Hong_Kong] 关闭标签
    removeTab(id: string) {
      const idx = this.tabs.findIndex(t => t.id === id)
      if (idx === -1) return
      const wasActive = this.tabs[idx].id === this.activeTabId
      this.tabs.splice(idx, 1)
      if (wasActive && this.tabs.length > 0) {
        const newIdx = Math.max(0, idx - 1)
        this.setActiveTab(this.tabs[newIdx].id)
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
    }
  }
}) 