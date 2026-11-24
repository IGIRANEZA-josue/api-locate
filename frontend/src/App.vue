<template>
  <div class="app-shell">
    <div v-if="bootLoading" class="boot-screen" role="status" aria-live="polite">
      <div class="boot-brand-mark" aria-hidden="true">
        <AppIcon name="brand-arrows" :size="24" />
      </div>
      <p class="boot-brand-name">API Locate</p>
      <span class="boot-spinner" aria-hidden="true"></span>
      <p class="boot-message">Preparing your API workspace</p>
    </div>
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
import { onMounted, ref, watch } from 'vue';
import AppNavbar from './components/AppNavbar.vue';
import AppIcon from './components/AppIcon.vue';
import AppFooter from './components/AppFooter.vue';
import CompareFloatingBar from './components/CompareFloatingBar.vue';
import ToastContainer from './components/ToastContainer.vue';
import { useThemeStore } from './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { useWorkspaceStore } from './stores/workspaceStore';

const themeStore = useThemeStore();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const bootLoading = ref(true);

onMounted(async () => {
  themeStore.initTheme();
  try {
    await authStore.initAuth();
    if (authStore.isAuthenticated) {
      await workspaceStore.fetchFavorites();
      if (authStore.isPremium) {
        await workspaceStore.fetchCollections();
      }
    }
  } catch (error) {
    // A workspace API may be temporarily unavailable; keep the public site usable.
    console.warn('Workspace initialization was incomplete.', error);
  } finally {
    bootLoading.value = false;
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
