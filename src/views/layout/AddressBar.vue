<template>
  <div class="address-bar">
    <el-button-group>
      <el-button size="small" icon="ArrowLeft" disabled />
      <el-button size="small" icon="ArrowRight" disabled />
      <el-button size="small" icon="Refresh" />
    </el-button-group>
    
    <el-input
      v-model="url"
      placeholder="搜索或输入网址"
      style="margin: 0 8px; flex: 1;"
      size="small"
    >
      <template #prefix>
        <el-icon><Search /></el-icon>
      </template>
    </el-input>
    
    <el-button size="small" icon="Star" />
    <el-button size="small" icon="Menu" />
  </div>
</template>

<script>
import { Search } from '@element-plus/icons-vue'

export default {
  name: 'AddressBar',
  components: { Search },
  data() {
    return {
      url: ''
    }
  }
}
</script>

<style scoped>
.address-bar {
  display: flex;
  align-items: center;
  padding: 8px;
  background-color: #fafafa;
  border-bottom: 1px solid #e0e0e0;
}
</style> 