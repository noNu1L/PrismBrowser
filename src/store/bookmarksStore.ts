import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'

// 书签项接口
export interface BookmarkItem {
  id: string
  title: string
  url?: string // 文件夹没有url
  icon?: string
  type: 'bookmark' | 'folder'
  parentId?: string
  children?: BookmarkItem[]
  createdAt: number
  updatedAt: number
}

// 书签状态接口
interface BookmarksState {
  bookmarks: BookmarkItem[]
  selectedFolderId: string | null
}

export const useBookmarksStore = defineStore('bookmarks', {
  state: (): BookmarksState => ({
    bookmarks: [],
    selectedFolderId: null
  }),

  getters: {
    // 获取根级别的书签和文件夹
    rootItems: (state) => {
      return state.bookmarks.filter(item => !item.parentId)
    },

    // 获取当前选中文件夹的内容
    currentFolderItems: (state) => {
      if (!state.selectedFolderId) {
        return state.bookmarks.filter(item => !item.parentId)
      }
      return state.bookmarks.filter(item => item.parentId === state.selectedFolderId)
    },

    // 获取所有文件夹（用于移动书签时的选择）
    allFolders: (state) => {
      return state.bookmarks.filter(item => item.type === 'folder')
    },

    // 检查URL是否已收藏
    isBookmarked: (state) => (url: string) => {
      return state.bookmarks.some(item => item.url === url && item.type === 'bookmark')
    },

    // 获取文件夹路径（面包屑导航）
    folderPath: (state) => (folderId: string | null) => {
      if (!folderId) return []
      
      const path: BookmarkItem[] = []
      let currentId = folderId
      
      while (currentId) {
        const folder = state.bookmarks.find(item => item.id === currentId)
        if (folder) {
          path.unshift(folder)
          currentId = folder.parentId
        } else {
          break
        }
      }
      
      return path
    }
  },

  actions: {
    // 初始化书签数据
    async initializeBookmarks() {
      try {
        if (window.api) {
          const savedBookmarks = await window.api.getStore('bookmarks')
          if (savedBookmarks && Array.isArray(savedBookmarks)) {
            this.bookmarks = savedBookmarks
          } else {
            // 创建默认文件夹
            await this.createDefaultFolders()
          }
        }
      } catch (error) {
        console.error('[BookmarksStore] 初始化书签失败:', error)
        await this.createDefaultFolders()
      }
    },

    // 创建默认文件夹
    async createDefaultFolders() {
      const defaultFolders = [
        { title: '书签栏', type: 'folder' as const },
        { title: '其他书签', type: 'folder' as const }
      ]

      for (const folder of defaultFolders) {
        await this.addFolder(folder.title)
      }
    },

    // 添加书签
    async addBookmark(title: string, url: string, parentId?: string, icon?: string) {
      const bookmark: BookmarkItem = {
        id: uuidv4(),
        title,
        url,
        icon,
        type: 'bookmark',
        parentId,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      this.bookmarks.push(bookmark)
      await this.saveToStorage()
      
      console.log('[BookmarksStore] 添加书签:', bookmark)
      return bookmark
    },

    // 添加文件夹
    async addFolder(title: string, parentId?: string) {
      const folder: BookmarkItem = {
        id: uuidv4(),
        title,
        type: 'folder',
        parentId,
        children: [],
        createdAt: Date.now(),
        updatedAt: Date.now()
      }

      this.bookmarks.push(folder)
      await this.saveToStorage()
      
      console.log('[BookmarksStore] 添加文件夹:', folder)
      return folder
    },

    // 删除书签或文件夹
    async removeBookmark(id: string) {
      const item = this.bookmarks.find(b => b.id === id)
      if (!item) return

      // 如果是文件夹，递归删除所有子项
      if (item.type === 'folder') {
        const childItems = this.bookmarks.filter(b => b.parentId === id)
        for (const child of childItems) {
          await this.removeBookmark(child.id)
        }
      }

      // 删除项目本身
      const index = this.bookmarks.findIndex(b => b.id === id)
      if (index !== -1) {
        this.bookmarks.splice(index, 1)
        await this.saveToStorage()
        console.log('[BookmarksStore] 删除书签:', item)
      }
    },

    // 更新书签
    async updateBookmark(id: string, updates: Partial<BookmarkItem>) {
      const bookmark = this.bookmarks.find(b => b.id === id)
      if (bookmark) {
        Object.assign(bookmark, updates, { updatedAt: Date.now() })
        await this.saveToStorage()
        console.log('[BookmarksStore] 更新书签:', bookmark)
      }
    },

    // 移动书签到不同文件夹
    async moveBookmark(id: string, newParentId?: string) {
      await this.updateBookmark(id, { parentId: newParentId })
    },

    // 切换收藏状态
    async toggleBookmark(title: string, url: string, icon?: string) {
      const existing = this.bookmarks.find(b => b.url === url && b.type === 'bookmark')
      
      if (existing) {
        // 已存在，删除
        await this.removeBookmark(existing.id)
        return false
      } else {
        // 不存在，添加到书签栏
        const bookmarkBar = this.bookmarks.find(b => b.title === '书签栏' && b.type === 'folder')
        await this.addBookmark(title, url, bookmarkBar?.id, icon)
        return true
      }
    },

    // 设置当前选中的文件夹
    setSelectedFolder(folderId: string | null) {
      this.selectedFolderId = folderId
    },

    // 搜索书签
    searchBookmarks(query: string) {
      if (!query.trim()) return this.bookmarks

      const lowerQuery = query.toLowerCase()
      return this.bookmarks.filter(item => 
        item.type === 'bookmark' && 
        (item.title.toLowerCase().includes(lowerQuery) || 
         item.url?.toLowerCase().includes(lowerQuery))
      )
    },

    // 保存到本地存储
    async saveToStorage() {
      try {
        if (window.api) {
          await window.api.setStore('bookmarks', this.bookmarks)
        }
      } catch (error) {
        console.error('[BookmarksStore] 保存书签失败:', error)
      }
    },

    // 导入书签（预留接口）
    async importBookmarks(bookmarks: BookmarkItem[]) {
      this.bookmarks = bookmarks
      await this.saveToStorage()
    },

    // 导出书签（预留接口）
    exportBookmarks() {
      return JSON.stringify(this.bookmarks, null, 2)
    }
  }
}) 