<template>
  <NavButton
    :icon="isLoading ? X : RotateCw"
    @click="refresh"
  />
</template>

<script setup>
import { computed } from 'vue'
import NavButton from './NavButton.vue'
import { RotateCw, X } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()
const isLoading = computed(() => {
  const activeTab = tabsStore.tabs.find(t => t.active)
  return activeTab && activeTab.loading
})

function refresh() {
  const activeTab = tabsStore.tabs.find(t => t.active)
  if (activeTab) {
    if (isLoading.value) {
      window.api?.webviewStop?.(activeTab.id)
    } else {
      window.api?.webviewReload?.(activeTab.id)
    }
  }
}
</script> 