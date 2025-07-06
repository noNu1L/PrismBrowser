<template>
  <NavButton :icon="Home" @click="goHome" />
</template>

<script setup>
import NavButton from './NavButton.vue'
import { Home } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()
const HOME_URL = 'https://www.bing.com'

function goHome() {
  const activeTab = tabsStore.tabs.find(t => t.active)
  if (activeTab) {
    tabsStore.updateTab(activeTab.id, { url: HOME_URL })
    window.api?.navigateWebview?.(activeTab.id, HOME_URL)
  }
}
</script> 