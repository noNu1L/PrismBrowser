<template>
  <el-container style="height: 100vh;">
    <!-- 标签栏 -->
    <el-header height="auto" style="padding: 0;">
      <TabsBar />
    </el-header>
    
    <!-- 地址栏 -->
    <el-header height="auto" style="padding: 0;">
      <AddressBar />
    </el-header>
    
    <!-- 主内容区 -->
    <el-main style="padding: 24px;">
      <el-empty description="主内容区（仅界面展示）" />
    </el-main>
  </el-container>
</template>

<script>
import TabsBar from './TabsBar.vue'
import AddressBar from './AddressBar.vue'

export default {
  name: 'LayoutApp',
  components: {
    TabsBar,
    AddressBar
  },
  mounted() {
    console.log('主界面布局已加载')
  }
}
</script>

<style scoped>
/* 使用Element Plus的基础样式，不自定义 */
</style> 