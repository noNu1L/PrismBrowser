<template>
  <button
    class="nav-button"
    :disabled="disabled"
    @click="$emit('click', $event)"
    @mousedown="handleMouseDown"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @touchstart="handleMouseDown"
    @touchend="handleMouseUp"
    @touchcancel="handleMouseLeave"
  >
    <component :is="icon" :size="19" stroke-width="1.5" />
  </button>
</template>

<script setup>
const props = defineProps({
  icon: Object,
  disabled: Boolean,
})
const emit = defineEmits(['click', 'longpress'])

let pressTimer = null

function handleMouseDown(e) {
  if (props.disabled) return
  pressTimer = setTimeout(() => {
    emit('longpress', e)
    pressTimer = null
  }, 500)
}

function handleMouseUp() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}

function handleMouseLeave() {
  if (pressTimer) {
    clearTimeout(pressTimer)
    pressTimer = null
  }
}
</script>

<style scoped>
.nav-button {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  border-radius: 4px;
  cursor: default;
  color: #333;
}
.nav-button:hover:not(:disabled) {
  background-color: rgba(0,0,0,0.1);
}
.nav-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style> 