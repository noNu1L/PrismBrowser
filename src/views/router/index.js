import { createRouter, createWebHashHistory } from 'vue-router'
import { getDefaultRoute } from './protocolMap.js'

// 导入页面组件
import SettingsPage from '../pages/SettingsPage.vue'
import HistoryPage from '../pages/HistoryPage.vue'
import BookmarksPage from '../pages/BookmarksPage.vue'
import DownloadsPage from '../pages/DownloadsPage.vue'
import AddressInputDemo from '../pages/AddressInputDemo.vue'
import PrismPluginDemo from '../pages/PrismPluginDemo.vue'
import { AddressBarButtonDemo } from '../../components/nav-button'

// 路由配置
const routes = [
  {
    path: '/',
    redirect: getDefaultRoute()
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsPage,
    meta: {
      title: '设置',
      protocol: 'prism://settings'
    }
  },
  {
    path: '/history',
    name: 'History',
    component: HistoryPage,
    meta: {
      title: '历史记录',
      protocol: 'prism://history'
    }
  },
  {
    path: '/bookmarks',
    name: 'Bookmarks',
    component: BookmarksPage,
    meta: {
      title: '收藏夹',
      protocol: 'prism://bookmarks'
    }
  },
  {
    path: '/downloads',
    name: 'Downloads',
    component: DownloadsPage,
    meta: {
      title: '下载管理',
      protocol: 'prism://downloads'
    }
  },
  {
    path: '/button-demo',
    name: 'ButtonDemo',
    component: AddressBarButtonDemo,
    meta: {
      title: '按钮系统演示',
      protocol: 'prism://button-demo'
    }
  },
  {
    path: '/address-input-demo',
    name: 'AddressInputDemo',
    component: AddressInputDemo,
    meta: {
      title: '地址输入框演示',
      protocol: 'prism://address-input-demo'
    }
  },
  {
    path: '/prism-plugin-demo',
    name: 'PrismPluginDemo',
    component: PrismPluginDemo,
    meta: {
      title: '$prism 插件演示',
      protocol: 'prism://prism-plugin-demo'
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由导航守卫
router.beforeEach((to, from, next) => {
  console.log(`路由跳转: ${from.path} -> ${to.path}`)
  
  // 更新页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - PrismBrowser`
  }
  
  next()
})

export default router 