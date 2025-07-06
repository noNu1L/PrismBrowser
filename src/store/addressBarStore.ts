import { defineStore } from 'pinia'

// 🎯 简单的地址栏按钮配置接口
// 只关心按钮的显示/隐藏，其他逻辑由按钮组件自己处理
interface AddressBarConfig {
  showHome: boolean
  showFavorites: boolean
  showBookmarks: boolean
  showHistory: boolean
  showDownloads: boolean
  showProxy: boolean
}

export const useAddressBarStore = defineStore('addressBar', {
  state: () => ({
    // 🎯 纯状态管理：不定义默认值，启动时从 Electron Store 加载
    config: null as AddressBarConfig | null
  }),
  
  actions: {
    // 🔧 设置单个按钮的显示状态
    async setButtonVisible(button: keyof AddressBarConfig, visible: boolean) {
      this.config[button] = visible
      await this.saveToElectronStore()
    },
    
    // 🔧 批量设置按钮显示状态
    async setBatchVisible(settings: Partial<AddressBarConfig>) {
      Object.assign(this.config, settings)
      await this.saveToElectronStore()
    },
    
    // 💾 从 Electron Store 加载配置到 Pinia
    async loadFromElectronStore() {
      try {
        if ((window as any).api) {
          const savedConfig = await (window as any).api.getStore('addressBar')
          if (savedConfig) {
            // 直接设置从 Electron Store 加载的配置
            this.config = savedConfig
          } else {
            // 如果没有保存的配置，说明是首次启动，等待 initService 初始化
            console.log('未找到保存的配置，等待初始化...')
          }
        }
      } catch (error) {
        console.error('从 Electron Store 加载地址栏配置失败:', error)
      }
    },

    // 💾 保存 Pinia 配置到 Electron Store
    async saveToElectronStore() {
      try {
        if ((window as any).api && this.config) {
          // 🔧 确保保存的是纯净的配置对象，避免序列化问题
          const configToSave = { ...this.config }
          await (window as any).api.setStore('addressBar', configToSave)
          console.log('配置已保存到 Electron Store:', configToSave)
        } else {
          console.warn('无法保存配置：API 不可用或配置为空')
        }
      } catch (error) {
        console.error('保存地址栏配置到 Electron Store 失败:', error)
      }
    },
    
    // 🔧 设置配置（由 initService 调用）
    setConfig(config: AddressBarConfig) {
      // 🔧 确保设置的是纯净的配置对象
      this.config = { ...config }
      console.log('Pinia Store 配置已设置:', this.config)
    },
    
    // 🔧 设置配置并同步到 Electron Store
    async setConfigAndSave(config: AddressBarConfig) {
      this.setConfig(config)
      await this.saveToElectronStore()
    },
    
    // ✅ 检查配置是否已初始化
    isInitialized(): boolean {
      return this.config !== null
    }
  }
})

// 🎯 导出配置类型，供其他地方使用
export type { AddressBarConfig } 