<template>
  <div class="tabs-bar">
    <el-tabs v-model="activeTab" type="card" closable>
      <el-tab-pane label="新标签页" name="tab1" />
      <el-tab-pane label="标签页 2" name="tab2" />
    </el-tabs>
    <el-button size="small" style="margin-left: 8px;">+</el-button>
  </div>
</template>

<script>
export default {
  name: 'TabsBar',
  data() {
    return {
      activeTab: 'tab1'
    }
  }
}
</script>

<style scoped>
.tabs-bar {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  background-color: #f5f5f5;
}
</style> 