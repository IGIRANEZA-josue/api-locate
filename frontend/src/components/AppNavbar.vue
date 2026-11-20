<template>
  <header class="navbar">
    <div class="container nav-inner">
      <!-- Left: Dual-Arrows Brand Mark -->
      <div class="nav-zone-left">
        <router-link to="/" class="brand" @click="closeMenus">
          <span class="brand-mark" aria-hidden="true">
            <AppIcon name="brand-arrows" :size="18" />
          </span>
          <span class="brand-name">API Locate</span>
        </router-link>

        <span v-if="sectionCrumb" class="context-crumb">
          <span class="brand-slash" aria-hidden="true">/</span>
          <span>{{ sectionCrumb }}</span>
        </span>
      </div>

      <!-- Center: Clean Editorial Navigation -->
      <nav class="nav-center-links" aria-label="Primary Navigation">
        <router-link to="/" exact-active-class="is-exact" class="nav-link">Home</router-link>
        <router-link to="/explore" class="nav-link">Directory</router-link>
        <router-link to="/categories" class="nav-link">Categories</router-link>
        <router-link to="/about" class="nav-link">About</router-link>
        <router-link to="/pricing" class="nav-link">Pricing</router-link>
      </nav>

      <!-- Right: Subtle Utilities + Signature Outlined Pill CTA -->
      <div class="nav-zone-right">
        <div ref="searchPopoverRef" class="nav-search-wrap nav-desktop-only">
          <button
            v-if="!searchOpen"
            type="button"
            class="icon-circle-btn"
            title="Search APIs (/)"
            aria-label="Search APIs"
            @click="openSearch"
          >
            <AppIcon name="search" :size="15" />
          </button>

          <form v-else class="nav-inline-search" @submit.prevent="submitNavSearch">
            <AppIcon name="search" :size="14" class="inline-search-ic" />
            <input
              ref="searchInputRef"
              v-model="searchText"
              type="search"
              class="inline-search-input"
              placeholder="Search APIs..."
              aria-label="Search APIs"
              @keydown.esc="searchOpen = false"
            />
          </form>
        </div>

        <button
          type="button"
          class="icon-circle-btn"
          :title="`Theme: ${themeLabel}`"
          :aria-label="`Switch theme (current: ${themeLabel})`"
          @click="cycleTheme"
        >
          <AppIcon :name="themeIcon" :size="14" />
        </button>

        <template v-if="authStore.isAuthenticated">
          <router-link to="/submit-api" class="btn btn-secondary btn-sm nav-desktop-only">
            Submit API
          </router-link>
          <router-link v-if="authStore.isAdmin" to="/admin" class="btn btn-secondary btn-sm nav-desktop-only">
            Admin
          </router-link>

          <div ref="menuWrapRef" class="user-menu-wrap">
            <button type="button" class="user-trigger" @click="userDropdownOpen = !userDropdownOpen">
              <span class="user-avatar">{{ initials }}</span>
              <span class="user-name">{{ authStore.user?.username }}</span>
              <span v-if="authStore.isPremium" class="pro-chip">Pro</span>
            </button>

            <div v-if="userDropdownOpen" class="user-dropdown" @click="userDropdownOpen = false">
              <div class="dropdown-header">
                <strong>{{ authStore.user?.full_name || authStore.user?.username }}</strong>
                <span class="dropdown-email">{{ authStore.user?.email }}</span>
              </div>
              <router-link to="/dashboard" class="dropdown-item">Workspace</router-link>
              <router-link to="/dashboard/favorites" class="dropdown-item">Saved APIs</router-link>
              <router-link to="/dashboard/collections" class="dropdown-item">
                Collections <span class="mini-tag">Pro</span>
              </router-link>
              <router-link to="/dashboard/compare" class="dropdown-item">
                Compare Specs <span class="mini-tag">Pro</span>
              </router-link>
              <router-link to="/submit-api" class="dropdown-item">Submit an API</router-link>
              <div class="dropdown-divider"></div>
              <router-link to="/provider/dashboard" class="dropdown-item">Provider Portal</router-link>
              <router-link to="/provider/promote" class="dropdown-item">Promote an API</router-link>
              <router-link to="/provider/campaigns" class="dropdown-item">Campaigns</router-link>
              <div class="dropdown-divider"></div>
              <router-link to="/dashboard/subscription" class="dropdown-item">Plan &amp; Billing</router-link>
              <router-link to="/dashboard/payments" class="dropdown-item">Payment History</router-link>
              <router-link to="/dashboard/settings" class="dropdown-item">Account Settings</router-link>
              <template v-if="authStore.isAdmin">
                <div class="dropdown-divider"></div>
                <router-link to="/admin" class="dropdown-item admin-highlight">
                  Admin Console
                </router-link>
              </template>
              <div class="dropdown-divider"></div>
              <button type="button" class="dropdown-item logout-btn" @click="handleLogout">
                Sign out
              </button>
            </div>
          </div>
        </template>

        <template v-else>
          <router-link to="/login" class="nav-signin-link nav-desktop-only">
            Log in
          </router-link>
          <router-link to="/register" class="nav-pill-cta nav-desktop-only">
            <span>SIGN UP FOR FREE</span>
            <AppIcon name="arrow-right" :size="13" />
          </router-link>
        </template>

        <button
          type="button"
          class="mobile-toggle"
          :aria-expanded="mobileOpen"
          aria-label="Toggle Menu"
          @click="mobileOpen = !mobileOpen"
        >
          <AppIcon :name="mobileOpen ? 'close' : 'menu'" :size="17" />
        </button>
      </div>
    </div>

    <!-- Mobile Navigation Drawer -->
    <div v-if="mobileOpen" class="mobile-drawer">
      <div class="container">
        <form class="mobile-search" @submit.prevent="submitNavSearch">
          <input
            v-model="searchText"
            type="search"
            class="input"
            placeholder="Search APIs, OAuth, payments..."
          />
          <button type="submit" class="btn btn-primary">Search</button>
        </form>

        <div class="mobile-links" @click="mobileOpen = false">
          <router-link to="/" class="mobile-nav-item">Home</router-link>
          <router-link to="/explore" class="mobile-nav-item">Directory</router-link>
          <router-link to="/categories" class="mobile-nav-item">Categories</router-link>
          <router-link to="/about" class="mobile-nav-item">About</router-link>
          <router-link to="/pricing" class="mobile-nav-item">Pricing</router-link>
          <router-link to="/contact" class="mobile-nav-item">Contact</router-link>

          <template v-if="authStore.isAuthenticated">
            <hr />
            <router-link to="/dashboard" class="mobile-nav-item">Workspace Overview</router-link>
            <router-link to="/dashboard/favorites" class="mobile-nav-item">Saved APIs</router-link>
            <router-link to="/dashboard/collections" class="mobile-nav-item">Collections</router-link>
            <router-link to="/dashboard/compare" class="mobile-nav-item">Compare Specs</router-link>
            <router-link to="/submit-api" class="mobile-nav-item">Submit API</router-link>
            <router-link to="/provider/dashboard" class="mobile-nav-item">Provider Portal</router-link>
            <router-link to="/provider/promote" class="mobile-nav-item">Promote API</router-link>
            <router-link to="/dashboard/subscription" class="mobile-nav-item">Plan &amp; Billing</router-link>
            <router-link to="/dashboard/settings" class="mobile-nav-item">Settings</router-link>
            <router-link v-if="authStore.isAdmin" to="/admin" class="mobile-nav-item">Admin Console</router-link>
            <button type="button" class="btn btn-secondary" style="margin-top: 0.4rem;" @click="handleLogout">
              Sign out
            </button>
          </template>
          <template v-else>
            <div class="mobile-auth-btns">
              <router-link to="/login" class="btn btn-secondary">Log in</router-link>
              <router-link to="/register" class="btn btn-primary">
                <span>Sign up</span>
                <AppIcon name="arrow-right" :size="13" />
              </router-link>
            </div>
          </template>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { getInitials } from '../utils/formatters';
import AppIcon from './AppIcon.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const workspaceStore = useWorkspaceStore();

const searchText = ref('');
const searchOpen = ref(false);
const searchInputRef = ref(null);
const searchPopoverRef = ref(null);
const menuWrapRef = ref(null);
const mobileOpen = ref(false);
const userDropdownOpen = ref(false);

const initials = computed(() =>
  getInitials(authStore.user?.full_name || authStore.user?.username || 'U')
);

const themeIcon = computed(() => {
  if (themeStore.mode === 'dark') return 'moon';
  if (themeStore.mode === 'system') return 'monitor';
  return 'sun';
});

const themeLabel = computed(() => {
  if (themeStore.mode === 'dark') return 'Dark';
  if (themeStore.mode === 'system') return 'System';
  return 'Light';
});

function cycleTheme() {
  const order = ['light', 'dark', 'system'];
  const idx = order.indexOf(themeStore.mode);
  const next = order[(idx + 1) % order.length];
  themeStore.setTheme(next);
}

const sectionCrumb = computed(() => {
  if (route.path.startsWith('/admin')) return 'Admin';
  if (route.path.startsWith('/provider')) return 'Provider';
  if (route.path.startsWith('/dashboard')) return 'Workspace';
  return '';
});

function openSearch() {
  searchOpen.value = true;
  nextTick(() => {
    searchInputRef.value?.focus();
  });
}

function closeMenus() {
  mobileOpen.value = false;
  userDropdownOpen.value = false;
  searchOpen.value = false;
}

function submitNavSearch() {
  const q = searchText.value.trim();
  closeMenus();
  router.push({ path: '/explore', query: q ? { q } : {} });
}

async function handleLogout() {
  closeMenus();
  await authStore.logout();
  workspaceStore.resetWorkspace();
  router.push('/');
}

function handleGlobalKeydown(e) {
  if (e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    openSearch();
  } else if (e.key === 'Escape') {
    closeMenus();
  }
}

function handleOutsideClick(e) {
  if (userDropdownOpen.value && menuWrapRef.value && !menuWrapRef.value.contains(e.target)) {
    userDropdownOpen.value = false;
  }
  if (searchOpen.value && searchPopoverRef.value && !searchPopoverRef.value.contains(e.target)) {
    searchOpen.value = false;
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('click', handleOutsideClick);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
  window.removeEventListener('click', handleOutsideClick);
});
</script>

<style scoped>
.navbar {
  position: sticky;
  top: 0;
  z-index: 950;
  background: var(--bg-nav);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.nav-inner {
  height: 74px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 1rem;
}

.nav-zone-left {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
}

.brand {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  color: var(--text-primary);
  text-decoration: none;
  flex-shrink: 0;
}

.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-primary);
  transition: transform 0.18s ease;
}

.brand:hover .brand-mark {
  transform: translateX(1px);
}

.brand-name {
  font-weight: 700;
  font-size: 1.04rem;
  letter-spacing: -0.032em;
  color: var(--text-primary);
}

.brand-slash {
  color: var(--border-strong);
  font-weight: 300;
  font-size: 1rem;
}

.context-crumb {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-muted);
}

/* Center Navigation Links (matches reference) */
.nav-center-links {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.85rem;
}

.nav-link {
  color: var(--text-secondary);
  font-weight: 500;
  font-size: 0.84rem;
  letter-spacing: -0.005em;
  transition: color 0.16s ease;
}

.nav-link:hover,
.nav-link.is-exact,
.nav-link.router-link-active:not([href="/"]) {
  color: var(--text-primary);
}

/* Right Actions */
.nav-zone-right {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
}

.icon-circle-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s ease, background-color 0.15s ease, border-color 0.15s ease;
}

.icon-circle-btn:hover {
  color: var(--text-primary);
  background: var(--bg-surface-alt);
  border-color: var(--border-subtle);
}

.nav-inline-search {
  position: relative;
  display: flex;
  align-items: center;
}

.inline-search-ic {
  position: absolute;
  left: 0.72rem;
  color: var(--text-muted);
  pointer-events: none;
}

.inline-search-input {
  width: 185px;
  height: 34px;
  padding: 0 0.8rem 0 2rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.81rem;
}

.inline-search-input:focus {
  outline: none;
  border-color: var(--text-primary);
}

.nav-signin-link {
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-secondary);
  padding: 0.3rem 0.45rem;
  white-space: nowrap;
}

.nav-signin-link:hover {
  color: var(--text-primary);
}

/* Signature Outlined Pill CTA Button (matches "TRY IT FOR FREE ->") */
.nav-pill-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  height: 38px;
  padding: 0 1.2rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--pill-border);
  background: transparent;
  color: var(--text-primary);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  text-decoration: none;
  transition: background-color 0.18s ease, color 0.18s ease, border-color 0.18s ease, transform 0.14s ease;
}

.nav-pill-cta:hover,
.nav-pill-cta.router-link-active {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
  border-color: var(--btn-primary-bg);
  text-decoration: none;
}

.user-menu-wrap {
  position: relative;
}

.user-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  height: 36px;
  padding: 0 0.65rem 0 0.35rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface);
  color: var(--text-primary);
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 600;
}

.user-trigger:hover {
  border-color: var(--text-primary);
}

.user-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
  font-family: var(--font-mono);
  font-size: 0.67rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.pro-chip {
  font-size: 0.64rem;
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-pill);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  font-weight: 600;
}

.user-dropdown {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 232px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 0.4rem;
  z-index: 1050;
}

.dropdown-header {
  padding: 0.5rem 0.7rem 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 0.25rem;
  display: flex;
  flex-direction: column;
  font-size: 0.83rem;
}

.dropdown-email {
  font-size: 0.74rem;
  color: var(--text-muted);
  word-break: break-all;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 0.44rem 0.7rem;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
}

.dropdown-item:hover {
  background: var(--bg-surface-alt);
  color: var(--text-primary);
}

.mini-tag {
  font-size: 0.64rem;
  font-weight: 600;
  padding: 0.04rem 0.38rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
}

.dropdown-divider {
  height: 1px;
  background: var(--border-subtle);
  margin: 0.3rem 0;
}

.admin-highlight {
  color: var(--text-primary);
  font-weight: 600;
}

.logout-btn {
  color: var(--danger);
}

.mobile-toggle {
  display: none;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
  border-radius: var(--radius-pill);
  height: 36px;
  width: 36px;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.mobile-drawer {
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border-subtle);
  padding: 1rem 0 1.5rem;
}

.mobile-search {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 0.9rem;
}

.mobile-links {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.mobile-nav-item {
  padding: 0.46rem 0.25rem;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
}

.mobile-nav-item:hover {
  color: var(--text-primary);
}

.mobile-links hr {
  border: none;
  border-top: 1px solid var(--border-subtle);
  width: 100%;
}

.mobile-auth-btns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
  margin-top: 0.75rem;
}

@media (max-width: 980px) {
  .nav-inner {
    display: flex;
    justify-content: space-between;
    height: 64px;
  }

  .nav-center-links,
  .nav-desktop-only,
  .user-name,
  .context-crumb {
    display: none;
  }

  .mobile-toggle {
    display: inline-flex;
  }
}
</style>
