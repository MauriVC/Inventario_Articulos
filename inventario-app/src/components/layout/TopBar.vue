<template>
  <header class="topbar">
    <div class="topbar-left">
      <h1 class="topbar-title">{{ $route.meta.title || 'Dashboard' }}</h1>
      <div class="topbar-breadcrumb" v-if="$route.meta.parent">
        <span class="topbar-breadcrumb-item">{{ $route.meta.parent }}</span>
        <ChevronRight :size="14" />
        <span class="topbar-breadcrumb-current">{{ $route.meta.title }}</span>
      </div>
    </div>
    <div class="topbar-right">
      <div class="topbar-search">
        <Search :size="16" />
        <input type="text" placeholder="Buscar..." class="topbar-search-input" />
      </div>
      <button class="topbar-icon-btn" title="Notificaciones">
        <Bell :size="20" />
        <span class="topbar-notification-dot"></span>
      </button>
    </div>
  </header>
</template>

<script setup>
import { Search, Bell, ChevronRight } from 'lucide-vue-next'
</script>

<style scoped>
.topbar {
  height: var(--topbar-height);
  background: var(--color-white);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--space-6);
  flex-shrink: 0;
}
.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.topbar-title {
  font-size: var(--font-size-xl);
  font-weight: 700;
  color: var(--color-gray-800);
  line-height: 1.2;
}
.topbar-breadcrumb {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-gray-400);
}
.topbar-breadcrumb-current {
  color: var(--color-primary);
  font-weight: 500;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}
.topbar-search {
  position: relative;
  display: flex;
  align-items: center;
}
.topbar-search svg {
  position: absolute;
  left: var(--space-3);
  color: var(--color-gray-400);
  pointer-events: none;
}
.topbar-search-input {
  padding: var(--space-2) var(--space-3);
  padding-left: 2.25rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-full);
  font-size: var(--font-size-sm);
  background: var(--color-gray-50);
  outline: none;
  width: 220px;
  transition: all var(--transition-fast);
  color: var(--color-gray-700);
}
.topbar-search-input:focus {
  border-color: var(--color-primary);
  background: var(--color-white);
  box-shadow: 0 0 0 3px rgba(46, 109, 164, 0.1);
  width: 280px;
}
.topbar-search-input::placeholder {
  color: var(--color-gray-400);
}
.topbar-icon-btn {
  position: relative;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  color: var(--color-gray-500);
  transition: all var(--transition-fast);
}
.topbar-icon-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}
.topbar-notification-dot {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 8px;
  height: 8px;
  background: var(--color-danger);
  border-radius: var(--radius-full);
  border: 2px solid var(--color-white);
}
</style>
