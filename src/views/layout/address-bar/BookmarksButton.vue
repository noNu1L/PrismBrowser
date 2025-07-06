<template>
  <NavButton 
    :icon="AlignStartVertical" 
    title="书签"
    @click="openBookmarks"
  />
</template>
<script setup>
import NavButton from './NavButton.vue'
import { AlignStartVertical } from 'lucide-vue-next'
import { useTabsStore } from '../../../store/tabsStore'

const tabsStore = useTabsStore()

function openBookmarks() {
  console.log('[BookmarksButton] Opening bookmarks page')
  tabsStore.addTab({
    url: 'prism://bookmarks',
    title: '书签',
    active: true
  })
}
</script> 