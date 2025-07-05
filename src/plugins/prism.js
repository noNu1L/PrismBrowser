// // src/plugins/prism.js
// import {useTabsStore} from '@/store/tabsStore'
// import {useAddressBarStore} from '@/store/addressBarStore'
//
// export default {
//   install(app) {
//     // $prism 全局对象，支持扩展
//     const $prism = {
//       get tab() {
//         return useTabsStore()
//       },
//       get 'address-bar'() {
//         return useAddressBarStore()
//       }
//       // 以后可继续扩展其它 store 或全局方法
//     }
//     // 挂载到全局属性
//     app.config.globalProperties.$prism = $prism
//   }
// }