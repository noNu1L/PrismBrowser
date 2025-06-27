<template>
  <div class="downloads-page">
    <div class="page-header">
      <h1 class="page-title">下载管理</h1>
      <p class="page-subtitle">下载任务和文件管理</p>
    </div>
    
    <div class="page-content">
      <el-card>
        <h3>下载管理功能</h3>
        <p>这里将显示下载管理功能，目前为Vue组件版本。</p>
        <el-button @click="testFunction">测试按钮</el-button>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: 'DownloadsPage',
  mounted() {
    console.log('下载管理页面已加载')
  },
  methods: {
    testFunction() {
      console.log('下载管理测试功能')
    }
  }
}
</script>

<style scoped>
.downloads-page {
  padding: 24px;
  height: 100vh;
  overflow-y: auto;
  background-color: var(--app-bg-color);
}

.page-header {
  margin-bottom: 24px;
}

.page-title {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-color-primary);
  margin: 0 0 8px 0;
}

.page-subtitle {
  font-size: 16px;
  color: var(--text-color-secondary);
  margin: 0;
}

.page-content {
  max-width: 1200px;
}
</style> 