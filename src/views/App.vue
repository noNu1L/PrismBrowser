<template>
  <div id="app" class="app-container">
    <router-view />
  </div>
</template>

<script>
export default {
  name: 'App',
  mounted() {
    console.log('PrismBrowser SPA 已加载')
  }
}
</script>

<style scoped>
.app-container {
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  overflow: hidden;
  background-color: var(--app-bg-color);
  color: var(--text-color-primary);
}
</style> 