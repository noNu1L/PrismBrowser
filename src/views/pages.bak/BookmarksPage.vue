<template>
  <div class="bookmarks-page">
    <div class="page-header">
      <h1 class="page-title">收藏夹</h1>
      <p class="page-subtitle">书签和收藏管理</p>
    </div>
    
    <div class="page-content">
      <el-card>
        <h3>收藏夹功能</h3>
        <p>这里将显示书签管理功能，目前为Vue组件版本。</p>
        <el-button @click="testFunction">测试按钮</el-button>
      </el-card>
    </div>
  </div>
</template>

<script>
export default {
  name: 'BookmarksPage',
  mounted() {
    console.log('收藏夹页面已加载')
  },
  methods: {
    testFunction() {
      console.log('收藏夹测试功能')
    }
  }
}
</script>

<style scoped>
.bookmarks-page {
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