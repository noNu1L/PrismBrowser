<template>
  <NavButton 
    :icon="Settings" 
    title="设置"
    @click="openSettings"
  />
</template>

<script setup>
import NavButton from './NavButton.vue'
import { Settings } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

function openSettings() {
  console.log('[SettingsButton] Opening settings page')
  // 添加新标签页并导航到设置页面
  tabsStore.addTab({
    url: 'prism://settings',
    title: '设置',
    active: true,
  })
}
</script> 