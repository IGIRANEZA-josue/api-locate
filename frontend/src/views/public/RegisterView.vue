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
          Start building in seconds.
        </p>
        <h1>Create your account</h1>
        <p>Save favorite APIs, submit specifications, or manage a provider catalog.</p>
      </div>

      <div v-if="errorMsg" class="alert alert-error" role="alert">{{ errorMsg }}</div>

      <form class="card auth-card" name="apilocate-register" @submit.prevent="handleRegister">
        <div class="grid-2">
          <div class="form-group">
            <label for="reg-username" class="form-label">Username *</label>
            <input
              id="reg-username"
              v-model.trim="form.username"
              name="username"
              type="text"
              class="input"
              required
              minlength="3"
              maxlength="40"
              placeholder="mki_josue"
              autocomplete="username"
            />
          </div>

          <div class="form-group">
            <label for="reg-fullname" class="form-label">Full name</label>
            <input
              id="reg-fullname"
              v-model="form.full_name"
              name="name"
              type="text"
              class="input"
              placeholder="Alex Ndayisaba"
              autocomplete="name"
            />
          </div>
        </div>

        <div class="form-group">
          <label for="reg-email" class="form-label">Email address *</label>
          <input
            id="reg-email"
            v-model.trim="form.email"
            name="email"
            type="email"
            class="input"
            required
            placeholder="alex@company.com"
            autocomplete="email"
          />
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label for="reg-password" class="form-label">Password * (8+ chars)</label>
            <div class="password-wrap">
              <input
                id="reg-password"
                v-model="form.password"
                name="new-password"
                :type="showPassword ? 'text' : 'password'"
                class="input password-input"
                required
                minlength="8"
                placeholder="Min. 8 characters"
                autocomplete="new-password"
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

          <div class="form-group">
            <label for="reg-confirm" class="form-label">Confirm password *</label>
            <input
              id="reg-confirm"
              v-model="form.confirm_password"
              name="confirm-password"
              :type="showPassword ? 'text' : 'password'"
              class="input"
              required
              minlength="8"
              placeholder="Repeat password"
              autocomplete="new-password"
            />
          </div>
        </div>

        <label class="remember-row">
          <input v-model="form.remember_me" type="checkbox" />
          <span>Keep me signed in on this browser (30 days)</span>
        </label>

        <button
          type="submit"
          class="btn btn-primary auth-submit-btn"
          :disabled="authStore.loading"
        >
          <span>{{ authStore.loading ? 'Creating account...' : 'Sign up' }}</span>
          <AppIcon v-if="!authStore.loading" name="arrow-right" :size="14" />
        </button>
      </form>

      <p class="auth-switch">
        Already have an account?
        <router-link to="/login">Sign in →</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToastStore } from '../../stores/toastStore';
import AppIcon from '../../components/AppIcon.vue';

const router = useRouter();
const authStore = useAuthStore();
const themeStore = useThemeStore();
const workspaceStore = useWorkspaceStore();
const toast = useToastStore();

const errorMsg = ref('');
const showPassword = ref(false);

const form = reactive({
  username: '',
  full_name: '',
  email: '',
  password: '',
  confirm_password: '',
  remember_me: true,
  theme_preference: themeStore.mode || 'light'
});

async function handleRegister() {
  errorMsg.value = '';
  if (form.password.length < 8) {
    errorMsg.value = 'Password must be at least 8 characters long.';
    return;
  }
  if (form.password !== form.confirm_password) {
    errorMsg.value = 'Passwords do not match. Please double-check your password.';
    return;
  }

  try {
    const res = await authStore.register(form);
    await workspaceStore.fetchFavorites();
    toast.success(`Welcome to API Locate, ${res.user.username}!`);
    router.push('/dashboard');
  } catch (err) {
    errorMsg.value = extractErrorMessage(err, 'Registration failed.');
  }
}
</script>

<style scoped>
.auth-page {
  padding: 3.5rem 1rem 4.5rem;
  display: flex;
  justify-content: center;
}

.auth-box {
  width: 100%;
  max-width: 465px;
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
</style>
