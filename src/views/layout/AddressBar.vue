<template>
  <div class="address-bar drag-region">
    <el-button-group class="no-drag">
      <el-button size="small" disabled>←</el-button>
      <el-button size="small" disabled>→</el-button>
      <el-button size="small">⟲</el-button>
    </el-button-group>
    
    <el-input
      class="no-drag"
      v-model="url"
      placeholder="搜索或输入网址"
      style="margin: 0 8px; flex: 1;"
      size="small"
    />
    
    <el-button class="no-drag" size="small">★</el-button>
    <el-button class="no-drag" size="small">☰</el-button>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const url = ref('')
</script>

<style scoped>
.address-bar {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}

/* 窗口拖拽区域 */
.drag-region {
  -webkit-app-region: drag;
}

/* 非拖拽区域（按钮等交互元素） */
.no-drag {
  -webkit-app-region: no-drag;
}
</style> 