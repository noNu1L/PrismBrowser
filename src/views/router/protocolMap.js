// 协议到Vue路由的映射表
export const protocolToVueRoute = {
  'prism://settings': '/settings',
  'prism://history': '/history',
  'prism://bookmarks': '/bookmarks',
  'prism://downloads': '/downloads'
}

// Vue路由到协议的反向映射（可选，用于调试或其他用途）
export const vueRouteToProtocol = {
  '/settings': 'prism://settings',
  '/history': 'prism://history',
  '/bookmarks': 'prism://bookmarks',
  '/downloads': 'prism://downloads'
}

// 检查是否为支持的协议
export function isSupportedProtocol(protocolUrl) {
  return protocolUrl in protocolToVueRoute
}

// 获取默认路由
export function getDefaultRoute() {
  return '/settings'
} 