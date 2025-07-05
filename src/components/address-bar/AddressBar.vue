<template>
  <div class="address-bar">
    <div class="left-buttons">
      <BackButton />
      <ForwardButton />
      <RefreshButton />
      <HomeButton v-if="buttonConfig.showHome" />
    </div>

    <AddressInput />

    <div class="right-buttons">
      <FavoriteButton v-if="buttonConfig.showFavorites" />
      <BookmarksButton v-if="buttonConfig.showBookmarks" />
      <HistoryButton v-if="buttonConfig.showHistory" />
      <DownloadButton v-if="buttonConfig.showDownloads" />
      <ProxyButton v-if="buttonConfig.showProxy" />
      <MoreMenuButton />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import AddressInput from './AddressInput.vue'
import addressBarService from '../../services/addressBarService'
import {
  BackButton,
  ForwardButton,
  RefreshButton,
  HomeButton,
  FavoriteButton,
  BookmarksButton,
  HistoryButton,
  DownloadButton,
  ProxyButton,
  MoreMenuButton
} from './index'

const buttonConfig = ref({})
onMounted(() => {
  buttonConfig.value = addressBarService.getButtonConfig()
})
</script>

<style scoped>
.address-bar {
  display: flex;
  align-items: center;
  padding: 8px;
  gap: 8px;
  background-color: #f1f1f1;
}
.left-buttons, .right-buttons {
  display: flex;
  gap: 4px;
}
</style> 