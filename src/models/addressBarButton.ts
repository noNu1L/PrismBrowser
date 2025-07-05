import { Component } from 'vue'

export interface AddressBarButtonConfig {
  // 按钮标识
  type: AddressBarButtonType
  // 显示标签
  label: string
  // Lucide 图标组件
  icon: Component
  // 是否显示（用户配置）
  show: boolean
  // 是否禁用（动态状态）
  disabled: boolean
  // 强制显示（优先级高于show）
  forceShow: boolean
  // 排序权重
  order: number
  // 布局分组
  group: 'left' | 'center' | 'right'
  // 按钮功能回调
  onClick?: (tabId: string) => void
  onLongPress?: (tabId: string) => void
  // 自定义属性
  tooltip?: string
  size?: number
  activeState?: boolean
  loadingState?: boolean
}

export enum AddressBarButtonType {
  // 导航按钮
  BACK = 'back',
  FORWARD = 'forward', 
  REFRESH = 'refresh',
  HOME = 'home',
  
  // 功能按钮
  BOOKMARK = 'bookmark',
  BOOKMARK_FOLDER = 'bookmark-folder',
  DOWNLOAD = 'download',
  
  // 系统按钮
  PROXY = 'proxy',
  MENU = 'menu'
} 