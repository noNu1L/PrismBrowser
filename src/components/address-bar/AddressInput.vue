<template>
  <div class="address-input-wrapper">
    <input type="text" class="address-input" placeholder="搜索或输入网址" />
  </div>
</template>

<style scoped>
.address-input-wrapper {
  flex: 1;
  min-width: 0; /* 修复flex布局下的宽度计算问题 */
  margin: 0 8px;
}
.address-input {
  width: 100%;
  height: 28px;
  border: 1px solid #ccc;
  border-radius: 14px;
  padding: 0 12px;
  background-color: white;
  box-sizing: border-box; /* 确保padding和border不影响宽度 */
}
</style> 