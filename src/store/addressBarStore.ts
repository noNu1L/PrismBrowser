import { defineStore } from 'pinia'
import { AddressBarButtonConfig, AddressBarButtonType } from '../models/addressBarButton'
import { 
  ChevronLeft, ChevronRight, RefreshCw, Home,
  Star, Folder, Download, Link, MoreVertical
} from 'lucide-vue-next'

const DEFAULT_BUTTON_CONFIGS: AddressBarButtonConfig[] = [
  // Left区域 - 导航按钮
  {
    type: AddressBarButtonType.BACK,
    label: '后退',
    icon: ChevronLeft,
    show: true,
    disabled: false,
    forceShow: true,
    order: 1,
    group: 'left',
    tooltip: '后退'
  },
  {
    type: AddressBarButtonType.FORWARD,
    label: '前进', 
    icon: ChevronRight,
    show: true,
    disabled: false,
    forceShow: true,
    order: 2,
    group: 'left',
    tooltip: '前进'
  },
  {
    type: AddressBarButtonType.REFRESH,
    label: '刷新',
    icon: RefreshCw,
    show: true,
    disabled: false,
    forceShow: true,
    order: 3,
    group: 'left',
    tooltip: '刷新'
  },
  {
    type: AddressBarButtonType.HOME,
    label: '主页',
    icon: Home,
    show: false,  // 默认隐藏
    disabled: false,
    forceShow: false,
    order: 4,
    group: 'left',
    tooltip: '主页'
  },
  // Right区域 - 功能按钮
  {
    type: AddressBarButtonType.BOOKMARK,
    label: '收藏',
    icon: Star,
    show: true,
    disabled: false,
    forceShow: false,
    order: 10,
    group: 'right',
    tooltip: '收藏此页'
  },
  {
    type: AddressBarButtonType.BOOKMARK_FOLDER,
    label: '收藏夹',
    icon: Folder,
    show: false,
    disabled: false,
    forceShow: false,
    order: 11,
    group: 'right',
    tooltip: '管理收藏夹'
  },
  {
    type: AddressBarButtonType.DOWNLOAD,
    label: '下载',
    icon: Download,
    show: false,
    disabled: false,
    forceShow: false,
    order: 12,
    group: 'right',
    tooltip: '下载管理'
  },
  {
    type: AddressBarButtonType.PROXY,
    label: '代理',
    icon: Link,
    show: true,
    disabled: false,
    forceShow: false,
    order: 13,
    group: 'right',
    tooltip: '代理设置'
  },
  {
    type: AddressBarButtonType.MENU,
    label: '菜单',
    icon: MoreVertical,
    show: true,
    disabled: false,
    forceShow: true,
    order: 14,
    group: 'right',
    tooltip: '更多选项'
  }
]

export const useAddressBarStore = defineStore('addressBar', {
  state: () => ({
    buttonConfigs: [...DEFAULT_BUTTON_CONFIGS]
  }),
  
  getters: {
    // 获取可见按钮
    visibleButtons: (state) => {
      return state.buttonConfigs
        .filter(btn => btn.show || btn.forceShow)
        .sort((a, b) => a.order - b.order)
    },
    
    // 按分组获取按钮
    leftButtons: (state) => {
      return state.buttonConfigs
        .filter(btn => (btn.show || btn.forceShow) && btn.group === 'left')
        .sort((a, b) => a.order - b.order)
    },
    
    centerButtons: (state) => {
      return state.buttonConfigs
        .filter(btn => (btn.show || btn.forceShow) && btn.group === 'center')
        .sort((a, b) => a.order - b.order)
    },
    
    rightButtons: (state) => {
      return state.buttonConfigs
        .filter(btn => (btn.show || btn.forceShow) && btn.group === 'right')
        .sort((a, b) => a.order - b.order)
    },

    // 根据类型获取按钮配置
    getButtonConfig: (state) => (type: AddressBarButtonType) => {
      return state.buttonConfigs.find(btn => btn.type === type)
    }
  },
  
  actions: {
    // 更新按钮配置
    updateButtonConfig(type: AddressBarButtonType, patch: Partial<AddressBarButtonConfig>) {
      const config = this.buttonConfigs.find(btn => btn.type === type)
      if (config) {
        Object.assign(config, patch)
      }
    },
    
    // 显示/隐藏按钮
    setButtonVisible(type: AddressBarButtonType, visible: boolean) {
      this.updateButtonConfig(type, { show: visible })
    },
    
    // 启用/禁用按钮
    setButtonDisabled(type: AddressBarButtonType, disabled: boolean) {
      this.updateButtonConfig(type, { disabled })
    },

    // 设置按钮激活状态
    setButtonActive(type: AddressBarButtonType, active: boolean) {
      this.updateButtonConfig(type, { activeState: active })
    },

    // 设置按钮加载状态
    setButtonLoading(type: AddressBarButtonType, loading: boolean) {
      this.updateButtonConfig(type, { loadingState: loading })
    },
    
    // 重置为默认配置
    resetToDefault() {
      this.buttonConfigs = [...DEFAULT_BUTTON_CONFIGS]
    }
  }
}) 