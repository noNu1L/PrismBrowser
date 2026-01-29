<template>
  <NavButton :icon="Home" @click="goHome" />
</template>

<script setup>
import NavButton from './NavButton.vue'
import { Home } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

async function getHomeUrl() {
  try {
    if (window.api?.getStore) {
      return await window.api.getStore('settings.homeUrl')
    }
  } catch (error) {
    console.error('Failed to get homeUrl from store.', error)
  }
  return null
}

async function goHome() {
  const activeTab = tabsStore.tabs.find(t => t.active)
  if (activeTab) {
    const homeUrl = await getHomeUrl()
    if (homeUrl) {
      tabsStore.updateTab(activeTab.id, { url: homeUrl })
      window.api?.navigateWebview?.(activeTab.id, homeUrl)
    } else {
      console.warn('Home URL is not configured or failed to load.')
    }
  }
}
</script> 