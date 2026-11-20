<template>
  <div class="toast-stack" aria-live="polite">
    <div
      v-for="item in toastStore.toasts"
      :key="item.id"
      class="toast-item"
      :class="`toast-${item.type}`"
    >
      <span class="toast-dot" aria-hidden="true"></span>
      <span class="toast-msg">{{ item.message }}</span>
      <button type="button" class="toast-close" @click="toastStore.dismiss(item.id)" aria-label="Close">
        ×
      </button>
    </div>
  </div>
</template>

<script setup>
import { useToastStore } from '../stores/toastStore';
const toastStore = useToastStore();
</script>

<style scoped>
.toast-stack {
  position: fixed;
  top: 70px;
  right: 18px;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-width: 360px;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  box-shadow: var(--shadow-md);
  font-size: 0.83rem;
  color: var(--text-primary);
}

.toast-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--text-muted);
}

.toast-success .toast-dot { background: var(--success); }
.toast-error .toast-dot { background: var(--danger); }
.toast-warning .toast-dot { background: var(--warning); }
.toast-info .toast-dot { background: var(--accent); }

.toast-msg {
  flex: 1;
}

.toast-close {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 1.05rem;
  cursor: pointer;
  padding: 0 0.2rem;
}
</style>
