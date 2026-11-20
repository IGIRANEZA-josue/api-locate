<template>
  <div class="container page-section" style="max-width: 860px;">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">Profile &amp; Theme Settings</h1>
        <p class="page-subtitle">
          Manage your developer identity, saved theme preference, and account password.
        </p>
      </div>
    </div>

    <div class="grid-2">
      <!-- Profile & Theme -->
      <form class="card" @submit.prevent="saveProfile">
        <h3>Developer Identity &amp; Theme</h3>
        <div class="form-group">
          <label class="form-label">Username</label>
          <input v-model="profileForm.username" type="text" class="input" required />
        </div>
        <div class="form-group">
          <label class="form-label">Full Name</label>
          <input v-model="profileForm.full_name" type="text" class="input" />
        </div>
        <div class="form-group">
          <label class="form-label">Avatar Image URL (Optional)</label>
          <input v-model="profileForm.avatar_url" type="url" class="input" placeholder="https://..." />
        </div>
        <div class="form-group">
          <label class="form-label">Developer Bio</label>
          <textarea v-model="profileForm.bio" class="textarea" style="min-height: 85px;"></textarea>
        </div>
        <div class="form-group">
          <label class="form-label">Theme Preference (Synced to Account)</label>
          <select v-model="profileForm.theme_preference" class="select">
            <option value="system">System Mode (Follow OS)</option>
            <option value="dark">Dark Mode</option>
            <option value="light">Light Mode</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="savingProfile">
          {{ savingProfile ? 'Saving...' : 'Save Profile Changes' }}
        </button>
      </form>

      <!-- Password Change -->
      <form class="card" @submit.prevent="changePassword">
        <h3>Security &amp; Password</h3>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          Passwords are stored strictly as salted bcrypt hashes.
        </p>

        <div class="form-group">
          <label class="form-label">Current Password</label>
          <input
            v-model="pwdForm.current_password"
            type="password"
            class="input"
            required
            autocomplete="current-password"
          />
        </div>
        <div class="form-group">
          <label class="form-label">New Password (min 8 chars)</label>
          <input
            v-model="pwdForm.new_password"
            type="password"
            class="input"
            required
            minlength="8"
            autocomplete="new-password"
          />
        </div>

        <button type="submit" class="btn btn-secondary" :disabled="savingPwd">
          {{ savingPwd ? 'Updating...' : 'Update Password' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';

const authStore = useAuthStore();
const toast = useToastStore();

const savingProfile = ref(false);
const savingPwd = ref(false);

const profileForm = reactive({
  username: '',
  full_name: '',
  avatar_url: '',
  bio: '',
  theme_preference: 'system'
});

const pwdForm = reactive({
  current_password: '',
  new_password: ''
});

async function saveProfile() {
  savingProfile.value = true;
  try {
    await authStore.updateProfile(profileForm);
    toast.success('Profile and theme preference saved.');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    savingProfile.value = false;
  }
}

async function changePassword() {
  savingPwd.value = true;
  try {
    await authStore.updateProfile(pwdForm);
    pwdForm.current_password = '';
    pwdForm.new_password = '';
    toast.success('Password updated successfully.');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    savingPwd.value = false;
  }
}

onMounted(() => {
  if (authStore.user) {
    profileForm.username = authStore.user.username || '';
    profileForm.full_name = authStore.user.full_name || '';
    profileForm.avatar_url = authStore.user.avatar_url || '';
    profileForm.bio = authStore.user.bio || '';
    profileForm.theme_preference = authStore.user.theme_preference || 'system';
  }
});
</script>
