<template>
  <div class="app-shell">
    <AppNavbar />
    <main class="main-content">
      <router-view />
    </main>
    <CompareFloatingBar />
    <ToastContainer />
    <AppFooter />
  </div>
</template>

<script setup>
import { onMounted, watch } from 'vue';
import AppNavbar from './components/AppNavbar.vue';
import AppFooter from './components/AppFooter.vue';
import CompareFloatingBar from './components/CompareFloatingBar.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();

onMounted(async () => {
  themeStore.initTheme();
  await authStore.initAuth();
  if (authStore.isAuthenticated) {
    await workspaceStore.fetchFavorites();
    if (authStore.isPremium) {
      await workspaceStore.fetchCollections();
    }
  }
});

watch(
  () => authStore.isAuthenticated,
  async (loggedIn) => {
    if (loggedIn) {
      await workspaceStore.fetchFavorites();
      if (authStore.isPremium) {
        await workspaceStore.fetchCollections();
      }
    } else {
      workspaceStore.resetWorkspace();
    }
  }
);
</script>
