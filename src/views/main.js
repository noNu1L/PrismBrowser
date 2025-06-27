import { createApp } from '../vendor/vue/vue.global.js'
import App from './App.vue'
import router from './router/index.js'
import { protocolToVueRoute } from './router/protocolMap.js'

// 创建Vue应用
const app = createApp(App)

// 使用路由
app.use(router)

// 挂载应用
app.mount('#app')

// 监听协议跳转
if (window.api?.onProtocolNavigate) {
    window.api.onProtocolNavigate((protocolUrl) => {
        console.log('收到协议跳转请求:', protocolUrl)
        const vueRoute = protocolToVueRoute[protocolUrl]
        if (vueRoute) {
            console.log('跳转到Vue路由:', vueRoute)
            router.push(vueRoute)
        } else {
            console.warn('未找到对应的Vue路由:', protocolUrl)
        }
    })
} else {
    console.warn('window.api.onProtocolNavigate 未定义，可能是在开发环境中')
} 