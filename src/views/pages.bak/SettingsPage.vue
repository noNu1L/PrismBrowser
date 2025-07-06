<!--<template>-->
<!--  <div class="settings-page">-->
<!--    &lt;!&ndash; 侧边栏 &ndash;&gt;-->
<!--    <div class="sidebar">-->
<!--      <div class="sidebar-header settings-header">-->
<!--        <h1 class="sidebar-title">设置</h1>-->
<!--        <p class="sidebar-subtitle">配置您的浏览器偏好</p>-->
<!--      </div>-->
<!--      <el-menu -->
<!--        :default-active="activeSection"-->
<!--        @select="handleSectionChange"-->
<!--        mode="vertical"-->
<!--      >-->
<!--        <el-menu-item index="general">-->
<!--          <el-icon>-->
<!--            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">-->
<!--              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>-->
<!--              <polyline points="9 22 9 12 15 12 15 22"></polyline>-->
<!--            </svg>-->
<!--          </el-icon>-->
<!--          <span>启动、主页和新标签页设置</span>-->
<!--        </el-menu-item>-->
<!--        <el-menu-item index="toolbar">-->
<!--          <el-icon><Settings /></el-icon>-->
<!--          <span>自定义工具栏</span>-->
<!--        </el-menu-item>-->
<!--        <el-menu-item index="proxy">-->
<!--          <el-icon><Wifi /></el-icon>-->
<!--          <span>代理设置</span>-->
<!--        </el-menu-item>-->
<!--        <el-menu-item index="about">-->
<!--          <el-icon><File /></el-icon>-->
<!--          <span>关于</span>-->
<!--        </el-menu-item>-->
<!--      </el-menu>-->
<!--    </div>-->

<!--    &lt;!&ndash; 主内容 &ndash;&gt;-->
<!--    <div class="main-content">-->
<!--      <div class="content-container">-->
<!--        <div class="page-header">-->
<!--          <h1 class="page-title">{{ currentSectionTitle }}</h1>-->
<!--          <p class="page-subtitle">{{ currentSectionDesc }}</p>-->
<!--        </div>-->

<!--        &lt;!&ndash; 启动、主页和新标签页设置 &ndash;&gt;-->
<!--        <div v-show="activeSection === 'general'" class="settings-section">-->
<!--          &lt;!&ndash; 浏览器启动设置 &ndash;&gt;-->
<!--          <div class="section-content">-->
<!--            <div class="section-header">-->
<!--              <h2 class="section-title">浏览器启动设置</h2>-->
<!--              <p class="section-subtitle">配置浏览器启动时的默认行为</p>-->
<!--            </div>-->
<!--            <div class="setting-item">-->
<!--              <div class="setting-label">-->
<!--                <h3 class="setting-name">浏览器启动时</h3>-->
<!--                <p class="setting-desc">选择浏览器启动时显示的页面</p>-->
<!--              </div>-->
<!--              <div class="setting-control">-->
<!--                <el-select v-model="settings.startupOption" @change="saveSettings">-->
<!--                  <el-option label="打开空白页" value="blank"></el-option>-->
<!--                  <el-option label="打开主页" value="homepage"></el-option>-->
<!--                  <el-option label="继续浏览上次打开的页面" value="restore"></el-option>-->
<!--                  <el-option label="打开自定义网址" value="custom"></el-option>-->
<!--                </el-select>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->
<!--        </div>-->

<!--        &lt;!&ndash; 其他sections的内容可以后续添加 &ndash;&gt;-->
<!--        <div v-show="activeSection === 'about'" class="settings-section">-->
<!--          <div class="section-content">-->
<!--            <div class="setting-item">-->
<!--              <div class="setting-label">-->
<!--                <h3 class="setting-name">版本</h3>-->
<!--                <p class="setting-desc">当前应用程序版本</p>-->
<!--              </div>-->
<!--              <div class="setting-control">-->
<!--                <el-tag>{{ appVersion }}</el-tag>-->
<!--              </div>-->
<!--            </div>-->
<!--          </div>-->
<!--        </div>-->
<!--      </div>-->
<!--    </div>-->
<!--  </div>-->
<!--</template>-->

<!--<script>-->
<!--import { Wifi, File, Settings } from "lucide-vue-next";-->

<!--export default {-->
<!--  name: 'SettingsPage',-->
<!--  components: { Settings, Wifi, File },-->
<!--  data() {-->
<!--    return {-->
<!--      activeSection: 'general',-->
<!--      settings: {-->
<!--        startupOption: 'homepage',-->
<!--        startupCustomUrl: 'https://www.bing.com',-->
<!--        homepageOption: 'custom',-->
<!--        homepageCustomUrl: 'https://www.bing.com',-->
<!--        newtabOption: 'blank',-->
<!--        newtabCustomUrl: '',-->
<!--        toolbar: {-->
<!--          showToggleLogs: true,-->
<!--          showFavorites: true,-->
<!--          showHistory: true,-->
<!--          showDownloads: true,-->
<!--          showSettings: true,-->
<!--          showHome: true-->
<!--        }-->
<!--      },-->
<!--      appVersion: '1.0.0'-->
<!--    }-->
<!--  },-->
<!--  computed: {-->
<!--    currentSectionTitle() {-->
<!--      const titles = {-->
<!--        general: '启动、主页和新标签页设置',-->
<!--        toolbar: '自定义工具栏',-->
<!--        proxy: '代理设置',-->
<!--        about: '关于'-->
<!--      }-->
<!--      return titles[this.activeSection] || '设置'-->
<!--    },-->
<!--    currentSectionDesc() {-->
<!--      const descriptions = {-->
<!--        general: '配置浏览器启动、主页和新标签页的默认行为',-->
<!--        toolbar: '自定义工具栏按钮的显示与隐藏',-->
<!--        proxy: '管理 Clash.Meta 代理设置',-->
<!--        about: '应用程序信息和版本详情'-->
<!--      }-->
<!--      return descriptions[this.activeSection] || ''-->
<!--    }-->
<!--  },-->
<!--  async mounted() {-->
<!--    console.log('设置页面已加载')-->
<!--    await this.loadSettings()-->
<!--  },-->
<!--  methods: {-->
<!--    handleSectionChange(section) {-->
<!--      this.activeSection = section-->
<!--    },-->
<!--    async loadSettings() {-->
<!--      try {-->
<!--        // 这里可以调用window.api来加载设置-->
<!--        console.log('加载设置...')-->
<!--      } catch (error) {-->
<!--        console.error('加载设置失败:', error)-->
<!--      }-->
<!--    },-->
<!--    async saveSettings() {-->
<!--      try {-->
<!--        // 这里可以调用window.api来保存设置-->
<!--        console.log('保存设置...')-->
<!--      } catch (error) {-->
<!--        console.error('保存设置失败:', error)-->
<!--      }-->
<!--    }-->
<!--  }-->
<!--}-->
<!--</script>-->

<!--<style scoped>-->
<!--.settings-page {-->
<!--  display: flex;-->
<!--  width: 100%;-->
<!--  height: 100vh;-->
<!--  background-color: var(&#45;&#45;app-bg-color);-->
<!--}-->

<!--.sidebar {-->
<!--  width: 280px;-->
<!--  background-color: var(&#45;&#45;sidebar-bg);-->
<!--  border-right: 1px solid var(&#45;&#45;border-color-secondary);-->
<!--  padding: 20px 0;-->
<!--}-->

<!--.sidebar-header {-->
<!--  padding: 0 20px 20px;-->
<!--}-->

<!--.sidebar-title {-->
<!--  font-size: 24px;-->
<!--  font-weight: 600;-->
<!--  margin: 0 0 8px 0;-->
<!--  color: var(&#45;&#45;text-color-primary);-->
<!--}-->

<!--.sidebar-subtitle {-->
<!--  font-size: 14px;-->
<!--  color: var(&#45;&#45;text-color-secondary);-->
<!--  margin: 0;-->
<!--}-->

<!--.main-content {-->
<!--  flex: 1;-->
<!--  overflow-y: auto;-->
<!--  padding: 0;-->
<!--}-->

<!--.content-container {-->
<!--  max-width: 800px;-->
<!--  margin: 0 auto;-->
<!--  padding: 40px 32px;-->
<!--}-->

<!--.page-header {-->
<!--  margin-bottom: 32px;-->
<!--}-->

<!--.page-title {-->
<!--  font-size: 28px;-->
<!--  font-weight: 600;-->
<!--  color: var(&#45;&#45;text-color-primary);-->
<!--  margin: 0 0 8px 0;-->
<!--}-->

<!--.page-subtitle {-->
<!--  font-size: 16px;-->
<!--  color: var(&#45;&#45;text-color-secondary);-->
<!--  margin: 0;-->
<!--}-->

<!--.settings-section {-->
<!--  background-color: var(&#45;&#45;card-bg);-->
<!--  border: 1px solid var(&#45;&#45;border-color-secondary);-->
<!--  border-radius: 8px;-->
<!--  margin-bottom: 24px;-->
<!--  overflow: hidden;-->
<!--}-->

<!--.section-content {-->
<!--  padding: 24px;-->
<!--}-->

<!--.section-header {-->
<!--  margin-bottom: 24px;-->
<!--}-->

<!--.section-title {-->
<!--  font-size: 18px;-->
<!--  font-weight: 600;-->
<!--  color: var(&#45;&#45;text-color-primary);-->
<!--  margin: 0 0 8px 0;-->
<!--}-->

<!--.section-subtitle {-->
<!--  font-size: 14px;-->
<!--  color: var(&#45;&#45;text-color-secondary);-->
<!--  margin: 0;-->
<!--}-->

<!--.setting-item {-->
<!--  display: flex;-->
<!--  align-items: flex-start;-->
<!--  justify-content: space-between;-->
<!--  padding: 16px 0;-->
<!--  border-bottom: 1px solid var(&#45;&#45;border-color-light);-->
<!--}-->

<!--.setting-item:last-child {-->
<!--  border-bottom: none;-->
<!--}-->

<!--.setting-label {-->
<!--  flex: 1;-->
<!--  margin-right: 16px;-->
<!--}-->

<!--.setting-name {-->
<!--  font-size: 16px;-->
<!--  font-weight: 500;-->
<!--  color: var(&#45;&#45;text-color-primary);-->
<!--  margin: 0 0 4px 0;-->
<!--}-->

<!--.setting-desc {-->
<!--  font-size: 14px;-->
<!--  color: var(&#45;&#45;text-color-secondary);-->
<!--  margin: 0;-->
<!--}-->

<!--.setting-control {-->
<!--  min-width: 200px;-->
<!--}-->
<!--</style>-->