// 🎯 统一的默认配置定义
const DEFAULT_CONFIGS = {
  // 地址栏按钮默认配置
  addressBar: {
    showHome: false,
    showFavorites: true,
    showBookmarks: false,
    showHistory: false,
    showDownloads: false,
    showProxy: true,
    showSettings: false
  },
  
  // 应用设置默认配置
  app: {
    newTabUrl: 'https://www.qq.com',
    homeUrl: 'https://www.baidu.com',
    startupUrl: 'https://www.bing.com'
  }
}

const INIT_KEY = 'app.initialized'

// 🎯 统一的初始化服务
export default {
  // 主初始化入口
  async init() {
    const initialized = await window.api.getStore(INIT_KEY)
    if (!initialized) {
      // 首次启动：设置默认配置到 Electron Store
      await this.runFirstTimeSetup()
    }
    
    // 每次启动：从 Electron Store 加载配置到 Pinia
    await this.loadConfigsToPinia()
  },

  // 首次启动的完整设置
  async runFirstTimeSetup() {
    console.log('检测到首次启动，开始初始化...')
    await this.initAppSettings()
    await this.initAddressBarToElectronStore()
    
    // 初始化 Pinia Store（如果可用）
    if (window.addressBarStore) {
      window.addressBarStore.setConfig(DEFAULT_CONFIGS.addressBar)
    }
    
    await window.api.setStore(INIT_KEY, true)
    console.log('首次启动初始化完成')
  },
  
  // 初始化应用设置到 Electron Store
  async initAppSettings() {
    const { app } = DEFAULT_CONFIGS
    await window.api.setStore('settings.newTabUrl', app.newTabUrl)
    await window.api.setStore('settings.homeUrl', app.homeUrl)
    await window.api.setStore('settings.startupUrl', app.startupUrl)
  },

  // 初始化地址栏配置到 Electron Store
  async initAddressBarToElectronStore() {
    await window.api.setStore('addressBar', DEFAULT_CONFIGS.addressBar)
    console.log('地址栏默认配置已保存到 Electron Store')
  },

  // 从 Electron Store 加载配置到 Pinia Store
  async loadConfigsToPinia() {
    // 等待 Pinia store 可用（通过全局对象访问）
    if (window.addressBarStore) {
      await window.addressBarStore.loadFromElectronStore()
      
      // 检查是否成功加载
      if (window.addressBarStore.isInitialized()) {
        console.log('配置已从 Electron Store 加载到 Pinia')
      } else {
        console.warn('从 Electron Store 加载配置失败，使用默认配置')
        window.addressBarStore.setConfig(DEFAULT_CONFIGS.addressBar)
      }
    } else {
      console.warn('addressBarStore 尚未初始化，稍后重试...')
      // 延迟重试
      setTimeout(() => this.loadConfigsToPinia(), 100)
    }
  },

  // 清除所有数据并重新初始化
  async reinitialize() {
    await window.api.clearStore()
    await this.runFirstTimeSetup()
    await this.loadConfigsToPinia()
  },


} 