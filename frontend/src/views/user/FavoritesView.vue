<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">Saved Favorite APIs</h1>
        <p class="page-subtitle">
          Quick-access bookmarks for the APIs you reference most frequently.
        </p>
      </div>

      <div class="quota-pill">
        <template v-if="workspace.quota.is_unlimited">
          <span class="badge badge-freemium">Unlimited favorites ({{ workspace.favorites.length }} saved)</span>
        </template>
        <template v-else>
          <span class="badge" :class="workspace.favorites.length >= (workspace.quota.max_favorites || 5) ? 'badge-warning' : 'badge-neutral'">
            {{ workspace.favorites.length }} / {{ workspace.quota.max_favorites || 5 }} Free Plan Favorites Used
          </span>
          <router-link to="/pricing" class="btn btn-primary btn-sm">Go Unlimited</router-link>
        </template>
      </div>
    </div>

    <div v-if="workspace.favorites.length === 0" class="empty-state">
      <h3>No favorite APIs yet</h3>
      <p>Browse the directory and select the bookmark icon on any API card to save it here.</p>
      <router-link to="/explore" class="btn btn-primary">Explore API Directory</router-link>
    </div>

    <div v-else class="grid-3">
      <ApiCard v-for="api in workspace.favorites" :key="api.id" :api="api" placement="favorites" />
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import UserSubnav from '../../components/UserSubnav.vue';
import ApiCard from '../../components/ApiCard.vue';

const workspace = useWorkspaceStore();

onMounted(() => {
  workspace.fetchFavorites();
});
</script>

<style scoped>
.quota-pill {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}
</style>
