import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import http from '../api/http';
import { useThemeStore } from './themeStore';
import {
  getStoredToken,
  setStoredToken,
  getCachedUser,
  setCachedUser,
  clearSessionStorageOnly,
  getRememberedAccounts,
  saveRememberedAccount,
  removeRememberedAccount
} from '../utils/storage';

export const useAuthStore = defineStore('auth', () => {
  const token = ref(getStoredToken());
  const user = ref(getCachedUser());
  const rememberedAccounts = ref(getRememberedAccounts());
  const initialized = ref(false);
  const loading = ref(false);
  let initPromise = null;

  const isAuthenticated = computed(() => Boolean(user.value && (token.value || initialized.value)));
  const isAdmin = computed(() => user.value?.role === 'admin');
  const isPremium = computed(() => Boolean(user.value?.is_premium));
  const hasProviderProfile = computed(() => Boolean(user.value?.provider_profile_id));

  function applySession(newToken, userData, persistent = true) {
    if (newToken) {
      token.value = newToken;
      setStoredToken(newToken, persistent);
    }
    user.value = userData;
    setCachedUser(userData, persistent);

    if (persistent && userData) {
      rememberedAccounts.value = saveRememberedAccount(userData);
    }

    if (userData?.theme_preference) {
      const themeStore = useThemeStore();
      themeStore.setTheme(userData.theme_preference, false);
    }
  }

  function clearSession() {
    token.value = '';
    user.value = null;
    clearSessionStorageOnly();
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('apilocate:session-expired', () => {
      clearSession();
    });
  }

  async function initAuth() {
    if (initialized.value) return;
    if (initPromise) return initPromise;

    initPromise = (async () => {
      try {
        // Checks Bearer token OR HttpOnly session cookie seamlessly without 401 noise
        const { data } = await http.get('/auth/session', { timeout: 4000 });
        if (data?.authenticated && data.user) {
          applySession(data.token || token.value, data.user, true);
        } else {
          clearSession();
        }
      } catch (err) {
        const status = err?.response?.status;
        if (status === 401 || status === 403) {
          clearSession();
        }
      } finally {
        initialized.value = true;
        initPromise = null;
      }
    })();

    return initPromise;
  }

  async function refreshProfile() {
    try {
      const { data } = await http.get('/auth/profile');
      if (data?.user) {
        user.value = data.user;
        setCachedUser(data.user, true);
      }
      return data.user;
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 403) {
        clearSession();
      }
      return null;
    }
  }

  async function login(credentials) {
    loading.value = true;
    const rememberMe = credentials?.remember_me !== false;
    try {
      const payload = {
        identifier: credentials.identifier ?? credentials.email ?? credentials.username ?? '',
        email: credentials.email ?? credentials.identifier ?? '',
        password: credentials.password || '',
        remember_me: rememberMe
      };
      const { data } = await http.post('/auth/login', payload);
      applySession(data.token, data.user, rememberMe);
      initialized.value = true;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function register(payload) {
    loading.value = true;
    const rememberMe = payload?.remember_me !== false;
    try {
      const { data } = await http.post('/auth/register', {
        ...payload,
        remember_me: rememberMe
      });
      applySession(data.token, data.user, rememberMe);
      initialized.value = true;
      return data;
    } finally {
      loading.value = false;
    }
  }

  async function updateProfile(payload) {
    const { data } = await http.put('/auth/profile', payload);
    applySession(data.token || token.value, data.user, true);
    return data.user;
  }

  async function logout() {
    clearSession();
    try {
      await http.post('/auth/logout');
    } catch (_) {
      // Cookie clear best-effort
    }
  }

  function forgetRememberedAccount(identifier) {
    rememberedAccounts.value = removeRememberedAccount(identifier);
  }

  return {
    token,
    user,
    rememberedAccounts,
    initialized,
    loading,
    isAuthenticated,
    isAdmin,
    isPremium,
    hasProviderProfile,
    initAuth,
    refreshProfile,
    login,
    register,
    updateProfile,
    logout,
    forgetRememberedAccount
  };
});
