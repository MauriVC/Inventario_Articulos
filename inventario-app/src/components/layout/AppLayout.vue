<template>
  <div class="app-layout">
    <Sidebar />
    <div class="app-main">
      <TopBar />
      <main class="app-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import Sidebar from './Sidebar.vue'
import TopBar from './TopBar.vue'
</script>

<style scoped>
.app-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}
.app-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
}
.app-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-6);
  background: var(--color-gray-50);
}
</style>
