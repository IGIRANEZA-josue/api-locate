import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http, { extractErrorMessage } from '../api/http';
import { useAuthStore } from './authStore';
import { useToastStore } from './toastStore';
import { safeGetItem, safeSetItem, safeRemoveItem } from '../utils/storage';

const COMPARE_KEY = 'apilocate_compare_tray';

export const useWorkspaceStore = defineStore('workspace', () => {
  const favorites = ref([]);
  const quota = ref({ current_count: 0, max_favorites: 5, is_unlimited: false });
  const collections = ref([]);
  const compareTray = ref(
    (() => {
      try {
        return JSON.parse(safeGetItem(COMPARE_KEY) || '[]');
      } catch (_) {
        return [];
      }
    })()
  );

  const favoriteIdSet = computed(() => new Set(favorites.value.map((f) => f.id)));

  async function fetchFavorites() {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      favorites.value = [];
      return;
    }
    try {
      const { data } = await http.get('/favorites');
      favorites.value = data.favorites || [];
      quota.value = data.quota || quota.value;
    } catch (_) {
      // Ignore silent load failures
    }
  }

  async function toggleFavorite(api) {
    const auth = useAuthStore();
    const toast = useToastStore();
    if (!auth.isAuthenticated) {
      toast.warning('Please log in to save favorite APIs.');
      return { requiresLogin: true };
    }

    const isFav = favoriteIdSet.value.has(api.id) || Boolean(api.is_favorited);
    try {
      if (isFav) {
        await http.delete(`/favorites/${api.id}`);
        favorites.value = favorites.value.filter((f) => f.id !== api.id);
        quota.value.current_count = Math.max(0, quota.value.current_count - 1);
        toast.info(`Removed ${api.name} from favorites.`);
        return { favorited: false };
      } else {
        await http.post(`/favorites/${api.id}`);
        await fetchFavorites();
        toast.success(`Saved ${api.name} to favorites.`);
        return { favorited: true };
      }
    } catch (err) {
      toast.error(extractErrorMessage(err));
      return { favorited: isFav, error: err };
    }
  }

  async function fetchCollections() {
    const auth = useAuthStore();
    if (!auth.isAuthenticated || !auth.isPremium) {
      collections.value = [];
      return;
    }
    const { data } = await http.get('/collections');
    collections.value = data.collections || [];
  }

  function isInCompare(apiId) {
    return compareTray.value.some((item) => item.id === apiId);
  }

  function toggleCompare(api) {
    const toast = useToastStore();
    const exists = isInCompare(api.id);
    if (exists) {
      compareTray.value = compareTray.value.filter((item) => item.id !== api.id);
    } else {
      if (compareTray.value.length >= 4) {
        toast.warning('You can compare up to 4 APIs side by side at once.');
        return;
      }
      compareTray.value = [
        ...compareTray.value,
        {
          id: api.id,
          name: api.name,
          slug: api.slug,
          category_name: api.category_name
        }
      ];
      toast.info(`${api.name} added to comparison tray.`);
    }
    safeSetItem(COMPARE_KEY, JSON.stringify(compareTray.value), true);
  }

  function clearCompare() {
    compareTray.value = [];
    safeRemoveItem(COMPARE_KEY);
  }

  function resetWorkspace() {
    favorites.value = [];
    collections.value = [];
  }

  return {
    favorites,
    quota,
    collections,
    compareTray,
    favoriteIdSet,
    fetchFavorites,
    toggleFavorite,
    fetchCollections,
    isInCompare,
    toggleCompare,
    clearCompare,
    resetWorkspace
  };
});
