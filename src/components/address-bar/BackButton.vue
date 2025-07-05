<template>
  <NavButton
    :icon="ChevronLeft"
    :disabled="!canGoBack"
    @click="goBack"
    @longpress="showHistory"
  />
</template>

<script setup>
import { computed } from 'vue'
import NavButton from './NavButton.vue'
import { ChevronLeft } from 'lucide-vue-next'
import { useTabsStore } from '../../store/tabsStore'

const tabsStore = useTabsStore()
const canGoBack = computed(() => {
  const activeTab = tabsStore.tabs.find(t => t.active)
  return activeTab && activeTab.canGoBack
})

function goBack() {
  const activeTab = tabsStore.tabs.find(t => t.active)
  if (activeTab) {
    window.api?.webviewGoBack?.(activeTab.id)
  }
}
function showHistory() {
  console.log('显示后退历史')
}
</script> 