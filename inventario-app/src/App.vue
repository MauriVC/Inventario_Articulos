<template>
  <component :is="layout">
    <router-view />
  </component>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AppLayout from '@/components/layout/AppLayout.vue'

const route = useRoute()
const layout = computed(() => {
  return route.meta.layout === 'none' ? 'div' : AppLayout
})
</script>

<style>
/* ... global style variables are in global.css ... */
</style>
