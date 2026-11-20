<template>
  <div class="container auth-page">
    <div class="auth-box">
      <div class="auth-head">
        <router-link to="/" class="auth-mark-link" aria-label="API Locate Home">
          <span class="auth-mark">
            <AppIcon name="brand-arrows" :size="20" />
          </span>
        </router-link>
        <p class="serif-italic" style="font-size: 1.15rem; color: var(--text-secondary); margin: 0 0 0.2rem;">
          Welcome back.
        </p>
        <h1>Sign in to API Locate</h1>
        <p>Access your saved APIs, collections, and provider workspace.</p>
      </div>

      <div v-if="errorMsg" class="alert alert-error" role="alert">{{ errorMsg }}</div>

      <!-- Recent / Remembered Accounts on This Browser -->
      <div v-if="authStore.rememberedAccounts.length > 0" class="remembered-box">
        <span class="remembered-label">Recent accounts on this browser</span>
        <div class="remembered-list">
          <div
            v-for="acct in authStore.rememberedAccounts"
            :key="acct.email || acct.username"
            class="remembered-item"
            :class="{ selected: isSelectedAccount(acct) }"
          >
            <button
              type="button"
              class="remembered-pick"
              @click="selectRemembered(acct)"
            >
              <span class="rem-avatar mono">{{ getInitials(acct.full_name || acct.username || acct.email) }}</span>
              <span class="rem-info">
                <strong>{{ acct.full_name || acct.username }}</strong>
                <small>{{ acct.email || `@${acct.username}` }}</small>
              </span>
            </button>
            <button
              type="button"
              class="rem-remove"
              title="Forget this account on this browser"
              aria-label="Forget account"
              @click="forgetAccount(acct)"
            >
              <AppIcon name="close" :size="13" />
            </button>
          </div>
        </div>
      </div>

      <form class="card auth-card" name="apilocate-login" @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="login-identifier" class="form-label">Email or username</label>
          <input
            id="login-identifier"
            v-model.trim="form.identifier"
            name="username"
            type="text"
            class="input"
            required
            placeholder="you@company.com or username"
            autocomplete="username"
          />
        </div>

        <div class="form-group">
          <label for="login-password" class="form-label">Password</label>
          <div class="password-wrap">
            <input
              id="login-password"
              ref="passwordInputRef"
              v-model="form.password"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              class="input password-input"
              required
              placeholder="Enter your password"
              autocomplete="current-password"
            />
            <button
              type="button"
              class="pw-toggle"
              :aria-label="showPassword ? 'Hide password' : 'Show password'"
              @click="showPassword = !showPassword"
            >
              <AppIcon :name="showPassword ? 'eye-off' : 'eye'" :size="15" />
            </button>
          </div>
        </div>

        <label class="remember-row">
          <input v-model="form.remember_me" type="checkbox" />
          <span>Keep me signed in for 30 days</span>
        </label>

        <button
          type="submit"
          class="btn btn-primary auth-submit-btn"
          :disabled="authStore.loading"
        >
          <span>{{ authStore.loading ? 'Signing in...' : 'Sign in' }}</span>
          <AppIcon v-if="!authStore.loading" name="arrow-right" :size="14" />
        </button>
      </form>

      <p class="auth-switch">
        New to API Locate?
        <router-link to="/register">Create an account →</router-link>
      </p>

      <!-- Clearly Distinguished Local Seed Accounts -->
      <details class="dev-seed-details">
        <summary class="mono">Development test accounts (seed data)</summary>
        <div class="dev-seed-grid">
          <button type="button" class="btn btn-secondary btn-sm" @click="quickFill('developer@apilocate.dev', 'Developer123!')">
            Free Developer
          </button>
          <button type="button" class="btn btn-secondary btn-sm" @click="quickFill('premium@apilocate.dev', 'Developer123!')">
            Pro Developer
          </button>
          <button type="button" class="btn btn-secondary btn-sm" @click="quickFill('provider@apilocate.dev', 'Developer123!')">
            API Provider
          </button>
          <button type="button" class="btn btn-secondary btn-sm" @click="quickFill('admin@apilocate.dev', 'Admin123!')">
            Administrator
          </button>
        </div>
      </details>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToastStore } from '../../stores/toastStore';
import { getInitials } from '../../utils/formatters';
import AppIcon from '../../components/AppIcon.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workspaceStore = useWorkspaceStore();
const toast = useToastStore();

const errorMsg = ref('');
const showPassword = ref(false);
const passwordInputRef = ref(null);

const form = reactive({
  identifier: '',
  password: '',
  remember_me: true
});

function isSelectedAccount(acct) {
  const current = form.identifier.toLowerCase();
  return (
    Boolean(current) &&
    (acct.email?.toLowerCase() === current || acct.username?.toLowerCase() === current)
  );
}

function selectRemembered(acct) {
  form.identifier = acct.email || acct.username || '';
  form.password = '';
  errorMsg.value = '';
  nextTick(() => {
    passwordInputRef.value?.focus();
  });
}

function forgetAccount(acct) {
  const target = acct.email || acct.username;
  authStore.forgetRememberedAccount(target);
  if (isSelectedAccount(acct)) {
    form.identifier = authStore.rememberedAccounts[0]?.email || '';
  }
}

function quickFill(email, password) {
  form.identifier = email;
  form.password = password;
  errorMsg.value = '';
}

async function handleLogin() {
  errorMsg.value = '';
  try {
    const res = await authStore.login({
      identifier: form.identifier,
      email: form.identifier,
      password: form.password,
      remember_me: form.remember_me
    });
    await workspaceStore.fetchFavorites();
    if (authStore.isPremium) {
      await workspaceStore.fetchCollections();
    }
    toast.success(`Signed in as ${res.user.username}`);
    const redirect = String(route.query.redirect || '');
    if (redirect && redirect.startsWith('/') && !redirect.startsWith('//')) {
      router.push(redirect);
    } else if (res.user.role === 'admin') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  } catch (err) {
    errorMsg.value = extractErrorMessage(err, 'Invalid email/username or password.');
  }
}

onMounted(() => {
  if (!form.identifier && authStore.rememberedAccounts.length > 0) {
    form.identifier =
      authStore.rememberedAccounts[0].email ||
      authStore.rememberedAccounts[0].username ||
      '';
  }
});
</script>

<style scoped>
.auth-page {
  padding: 3.5rem 1rem 4.5rem;
  display: flex;
  justify-content: center;
}

.auth-box {
  width: 100%;
  max-width: 410px;
}

.auth-head {
  text-align: center;
  margin-bottom: 1.35rem;
}

.auth-mark-link {
  display: inline-flex;
  margin-bottom: 0.85rem;
}

.auth-mark {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-strong);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.auth-head h1 {
  font-size: 1.48rem;
  letter-spacing: -0.03em;
  margin-bottom: 0.3rem;
}

.auth-head p {
  font-size: 0.86rem;
  color: var(--text-secondary);
  margin: 0;
}

.remembered-box {
  margin-bottom: 1rem;
  padding: 0.75rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.remembered-label {
  display: block;
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
}

.remembered-list {
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.remembered-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-canvas);
  padding-right: 0.35rem;
  transition: border-color 0.14s ease, background-color 0.14s ease;
}

.remembered-item.selected {
  border-color: var(--text-primary);
  background: var(--bg-surface);
}

.remembered-pick {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.45rem 0.55rem;
  border: none;
  background: transparent;
  text-align: left;
  cursor: pointer;
  min-width: 0;
}

.rem-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
  font-size: 0.68rem;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.rem-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.rem-info strong {
  font-size: 0.81rem;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rem-info small {
  font-size: 0.73rem;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rem-remove {
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  border-radius: 4px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.rem-remove:hover {
  background: var(--bg-surface-alt);
  color: var(--text-primary);
}

.auth-card {
  padding: 1.45rem;
}

.password-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input {
  padding-right: 2.35rem;
}

.pw-toggle {
  position: absolute;
  right: 0.45rem;
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.pw-toggle:hover {
  color: var(--text-primary);
  background: var(--bg-surface-alt);
}

.remember-row {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  margin: 0.15rem 0 1rem;
  user-select: none;
}

.auth-submit-btn {
  width: 100%;
  height: 38px;
}

.auth-switch {
  text-align: center;
  font-size: 0.84rem;
  margin: 1.15rem 0 0;
  color: var(--text-secondary);
}

.auth-switch a {
  color: var(--text-primary);
  font-weight: 600;
}

.auth-switch a:hover {
  text-decoration: underline;
}

.dev-seed-details {
  margin-top: 1.5rem;
  padding: 0.75rem 0.9rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
}

.dev-seed-details summary {
  font-size: 0.72rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.dev-seed-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.45rem;
  margin-top: 0.75rem;
}
</style>
