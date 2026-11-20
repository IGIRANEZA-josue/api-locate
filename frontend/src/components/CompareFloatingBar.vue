<template>
  <div v-if="workspace.compareTray.length > 0 && route.path !== '/dashboard/compare'" class="compare-tray">
    <div class="container compare-inner">
      <div class="compare-chips">
        <span class="compare-title">Comparison tray ({{ workspace.compareTray.length }}/4)</span>
        <span v-for="item in workspace.compareTray" :key="item.id" class="compare-pill">
          {{ item.name }}
          <button type="button" @click="workspace.toggleCompare(item)" aria-label="Remove">×</button>
        </span>
      </div>
      <div class="compare-actions">
        <button type="button" class="btn btn-ghost btn-sm" @click="workspace.clearCompare()">
          Clear
        </button>
        <router-link to="/dashboard/compare" class="btn btn-primary btn-sm">
          Compare APIs
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRoute } from 'vue-router';
import { useWorkspaceStore } from '../stores/workspaceStore';

const route = useRoute();
const workspace = useWorkspaceStore();
</script>

<style scoped>
.compare-tray {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 900;
  background: var(--bg-elevated);
  border-top: 1px solid var(--border-strong);
  box-shadow: var(--shadow-lg);
  padding: 0.65rem 0;
}

.compare-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.compare-chips {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.compare-title {
  font-size: 0.79rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-right: 0.25rem;
}

.compare-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.52rem;
  border-radius: 5px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-size: 0.77rem;
  font-weight: 500;
}

.compare-pill button {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  font-size: 0.92rem;
  padding: 0;
}

.compare-pill button:hover {
  color: var(--text-primary);
}

.compare-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}
</style>
