<template>
  <NavButton 
    :icon="History" 
    title="历史记录"
    @click="openHistory"
  />
</template>
<script setup>
import NavButton from './NavButton.vue'
import { History } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

function openHistory() {
  console.log('[HistoryButton] Opening history page')
  tabsStore.addTab({
    url: 'prism://history',
    title: '历史记录',
    active: true
  })
}
</script> 