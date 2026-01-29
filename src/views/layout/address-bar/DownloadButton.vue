<template>
  <NavButton 
    :icon="Download" 
    title="下载"
    @click="openDownloads"
  />
</template>
<script setup>
import NavButton from './NavButton.vue'
import { Download } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

function openDownloads() {
  console.log('[DownloadButton] Opening downloads page')
  tabsStore.addTab({
    url: 'prism://downloads',
    title: '下载',
    active: true
  })
}
</script> 