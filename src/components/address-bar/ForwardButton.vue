<template>
  <NavButton
    :icon="ArrowRight"
    :disabled="!canGoForward"
    @click="goForward"
    @longpress="showHistory"
  />
</template>

<script setup>
import { computed } from 'vue'
import NavButton from './NavButton.vue'
import { ArrowRight } from 'lucide-vue-next'
import { useTabsStore } from '../../store/tabsStore'

const tabsStore = useTabsStore()
const canGoForward = computed(() => {
  const activeTab = tabsStore.tabs.find(t => t.active)
  return activeTab && activeTab.canGoForward
})

function goForward() {
  const activeTab = tabsStore.tabs.find(t => t.active)
  if (activeTab) {
    window.api?.webviewGoForward?.(activeTab.id)
  }
}
function showHistory() {
  console.log('显示前进历史')
}
</script> 