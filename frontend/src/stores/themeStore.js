import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '../api/http';
import { safeGetItem, safeSetItem, getStoredToken } from '../utils/storage';

const STORAGE_KEY = 'apilocate_theme_v2';

export const useThemeStore = defineStore('theme', () => {
  const mode = ref(safeGetItem(STORAGE_KEY) || 'light');
  const systemPrefersDark = ref(
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false
  );

  const resolvedTheme = computed(() => {
    if (mode.value === 'system') {
      return systemPrefersDark.value ? 'dark' : 'light';
    }
    return mode.value === 'dark' ? 'dark' : 'light';
  });

  function applyToDom() {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme.value);
    }
  }

  function initThemeListener() {
    applyToDom();
    if (typeof window !== 'undefined' && window.matchMedia) {
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e) => {
        systemPrefersDark.value = e.matches;
        if (mode.value === 'system') {
          applyToDom();
        }
      };
      if (media.addEventListener) {
        media.addEventListener('change', handler);
      }
    }
  }

  async function setTheme(nextMode, syncBackend = true) {
    if (!['light', 'dark', 'system'].includes(nextMode)) return;
    mode.value = nextMode;
    safeSetItem(STORAGE_KEY, nextMode, true);
    applyToDom();

    const token = getStoredToken();
    if (syncBackend && token) {
      try {
        await http.put('/auth/profile', { theme_preference: nextMode });
      } catch (_) {
        // Ignore silent sync errors
      }
    }
  }

  return {
    mode,
    resolvedTheme,
    initTheme: initThemeListener,
    initThemeListener,
    setTheme
  };
});
