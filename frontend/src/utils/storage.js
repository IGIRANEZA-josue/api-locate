const memoryStore = new Map();

export const TOKEN_KEY = 'apilocate_token';
export const USER_CACHE_KEY = 'apilocate_user_cache';
export const REMEMBERED_ACCOUNTS_KEY = 'apilocate_remembered_accounts';

function tryGet(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch (_) {
    return null;
  }
}

function trySet(storage, key, value) {
  try {
    if (storage) {
      storage.setItem(key, value);
      return true;
    }
  } catch (_) {
    // Ignore storage quota or iframe SecurityError
  }
  return false;
}

function tryRemove(storage, key) {
  try {
    if (storage) {
      storage.removeItem(key);
    }
  } catch (_) {
    // Ignore iframe SecurityError
  }
}

export function safeGetItem(key) {
  if (typeof window === 'undefined') return memoryStore.get(key) ?? null;
  const localVal = tryGet(window.localStorage, key);
  if (localVal !== null) return localVal;
  const sessionVal = tryGet(window.sessionStorage, key);
  if (sessionVal !== null) return sessionVal;
  return memoryStore.get(key) ?? null;
}

export function safeSetItem(key, value, persistent = true) {
  const str = String(value);
  memoryStore.set(key, str);
  if (typeof window === 'undefined') return;

  if (persistent) {
    const wroteLocal = trySet(window.localStorage, key, str);
    trySet(window.sessionStorage, key, str);
    if (!wroteLocal) {
      memoryStore.set(key, str);
    }
  } else {
    tryRemove(window.localStorage, key);
    trySet(window.sessionStorage, key, str);
  }
}

export function safeRemoveItem(key) {
  memoryStore.delete(key);
  if (typeof window === 'undefined') return;
  tryRemove(window.localStorage, key);
  tryRemove(window.sessionStorage, key);
}

export function getStoredToken() {
  const raw = safeGetItem(TOKEN_KEY);
  if (!raw || raw === 'null' || raw === 'undefined') return '';
  return raw;
}

export function setStoredToken(token, persistent = true) {
  if (!token) {
    safeRemoveItem(TOKEN_KEY);
    return;
  }
  safeSetItem(TOKEN_KEY, token, persistent);
}

export function getCachedUser() {
  const raw = safeGetItem(USER_CACHE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && parsed.id ? parsed : null;
  } catch (_) {
    return null;
  }
}

export function setCachedUser(user, persistent = true) {
  if (!user || !user.id) {
    safeRemoveItem(USER_CACHE_KEY);
    return;
  }
  const safeSnapshot = {
    id: user.id,
    username: user.username,
    email: user.email,
    full_name: user.full_name,
    avatar_url: user.avatar_url,
    bio: user.bio,
    role: user.role,
    theme_preference: user.theme_preference,
    is_active: user.is_active,
    is_premium: user.is_premium,
    subscription: user.subscription || null,
    provider_profile_id: user.provider_profile_id || null,
    provider_company_name: user.provider_company_name || null,
    provider_slug: user.provider_slug || null,
    provider_verification_status: user.provider_verification_status || null,
    favorites_count: user.favorites_count ?? 0,
    unread_notifications_count: user.unread_notifications_count ?? 0
  };
  safeSetItem(USER_CACHE_KEY, JSON.stringify(safeSnapshot), persistent);
}

export function clearSessionStorageOnly() {
  safeRemoveItem(TOKEN_KEY);
  safeRemoveItem(USER_CACHE_KEY);
}

export function getRememberedAccounts() {
  const raw = safeGetItem(REMEMBERED_ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((item) => item && (item.email || item.username)) : [];
  } catch (_) {
    return [];
  }
}

export function saveRememberedAccount(user) {
  if (!user || (!user.email && !user.username)) return [];
  const existing = getRememberedAccounts().filter(
    (a) =>
      a.email?.toLowerCase() !== user.email?.toLowerCase() &&
      a.username?.toLowerCase() !== user.username?.toLowerCase()
  );
  const next = [
    {
      username: user.username,
      email: user.email,
      full_name: user.full_name || '',
      role: user.role || 'user',
      last_used_at: new Date().toISOString()
    },
    ...existing
  ].slice(0, 5);
  safeSetItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next), true);
  return next;
}

export function removeRememberedAccount(identifier) {
  const target = String(identifier || '').toLowerCase();
  const next = getRememberedAccounts().filter(
    (a) => a.email?.toLowerCase() !== target && a.username?.toLowerCase() !== target
  );
  safeSetItem(REMEMBERED_ACCOUNTS_KEY, JSON.stringify(next), true);
  return next;
}
