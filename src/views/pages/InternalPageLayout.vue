<template>
  <div class="internal-page-layout">
    <!-- 左侧导航栏 -->
    <div class="sidebar">
      <div class="sidebar-header">
        <h2 class="page-title">{{ pageTitle }}</h2>
      </div>
      <div class="sidebar-content">
        <slot name="sidebar"></slot>
      </div>
    </div>
    
    <!-- 右侧主内容区域 -->
    <div class="main-content">
      <div class="content-header">
        <div class="content-title">
          <slot name="content-title"></slot>
        </div>
        <div class="content-actions">
          <slot name="content-actions"></slot>
        </div>
      </div>
      <div class="content-body">
        <slot name="content"></slot>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  pageTitle: {
    type: String,
    required: true
  }
})
</script>

<style scoped>
.internal-page-layout {
  display: flex;
  height: 100vh;
  background-color: #f5f5f5;
}

.sidebar {
  width: 300px;
  background-color: #ffffff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.sidebar-content {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #e0e0e0;
}

.content-title {
  font-size: 18px;
  font-weight: 500;
  color: #333;
}

.content-actions {
  display: flex;
  gap: 10px;
}

.content-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
}

/* 滚动条样式 */
.sidebar-content::-webkit-scrollbar,
.content-body::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track,
.content-body::-webkit-scrollbar-track {
  background: #f1f1f1;
}

.sidebar-content::-webkit-scrollbar-thumb,
.content-body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover,
.content-body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style> 