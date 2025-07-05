import Store from 'electron-store'

const store = new Store({
  defaults: {
    addressBar: {
      showHome: false,
      showFavorites: true,
      showBookmarks: false,
      showHistory: false,
      showDownloads: false,
      showProxy: true,
    }
  }
})

export default {
  getButtonConfig() {
    return store.get('addressBar')
  },
  setButtonConfig(key, value) {
    store.set(`addressBar.${key}`, value)
  }
} 