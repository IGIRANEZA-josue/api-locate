<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">API Provider Dashboard</h1>
        <p class="page-subtitle">
          Manage your public company profile, published APIs, verification status, and developer reach.
        </p>
      </div>

      <div class="flex-row">
        <router-link to="/submit-api" class="btn btn-secondary btn-sm">+ Publish New API</router-link>
        <router-link to="/provider/promote" class="btn btn-primary btn-sm">Promote an API</router-link>
      </div>
    </div>

    <div v-if="loading" class="card">Loading provider workspace...</div>

    <template v-else>
      <!-- KPI Row -->
      <div class="grid-4" style="margin-bottom: 1.75rem;">
        <div class="stat-card">
          <div class="stat-label">Managed APIs</div>
          <div class="stat-value">{{ metrics.managed_apis_count || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total API Views</div>
          <div class="stat-value">{{ metrics.total_views || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Developer Favorites</div>
          <div class="stat-value">{{ metrics.total_favorites || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Ad Impressions / Clicks</div>
          <div class="stat-value">
            {{ metrics.total_impressions || 0 }} / {{ metrics.total_clicks || 0 }}
          </div>
        </div>
      </div>

      <div class="grid-2" style="margin-bottom: 2rem;">
        <!-- Provider Profile Form -->
        <form class="card" @submit.prevent="saveProviderProfile">
          <div class="flex-between" style="margin-bottom: 1rem;">
            <h3 style="margin: 0;">
              {{ hasProfile ? 'Update Provider Profile' : 'Create Provider Profile' }}
            </h3>
            <span
              v-if="profile"
              class="badge"
              :class="profile.verification_status === 'verified' ? 'badge-free' : 'badge-warning'"
            >
              {{ profile.verification_status }}
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Provider / Company Name *</label>
            <input v-model="profileForm.company_name" type="text" class="input" required placeholder="Acme API Cloud" />
          </div>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label">Official Website</label>
              <input v-model="profileForm.website_url" type="url" class="input" placeholder="https://..." />
            </div>
            <div class="form-group">
              <label class="form-label">Logo URL</label>
              <input v-model="profileForm.logo_url" type="url" class="input" placeholder="https://..." />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Contact Email</label>
            <input v-model="profileForm.contact_email" type="email" class="input" />
          </div>
          <div class="form-group">
            <label class="form-label">Company Description</label>
            <textarea v-model="profileForm.description" class="textarea" style="min-height: 85px;"></textarea>
          </div>

          <div class="flex-between">
            <router-link
              v-if="profile?.slug"
              :to="`/providers/${profile.slug}`"
              class="btn btn-ghost btn-sm"
            >
              View Public Profile ↗
            </router-link>
            <span v-else></span>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? 'Saving...' : hasProfile ? 'Save Profile' : 'Create Profile & Request Verification' }}
            </button>
          </div>
        </form>

        <!-- Recent Campaigns Summary -->
        <section class="card">
          <div class="flex-between" style="margin-bottom: 1rem;">
            <h3 style="margin: 0;">Sponsored Campaigns</h3>
            <router-link to="/provider/campaigns" class="btn btn-ghost btn-sm">Full History →</router-link>
          </div>

          <div v-if="campaigns.length === 0" class="form-hint">
            No sponsored campaigns yet. Promote any approved API to reach developers on Homepage, Explore, and Category pages.
            <div style="margin-top: 0.85rem;">
              <router-link to="/provider/promote" class="btn btn-secondary btn-sm">Create Campaign</router-link>
            </div>
          </div>

          <div v-else class="table-wrap">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Status</th>
                  <th>Impr / Clicks</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="c in campaigns" :key="c.id">
                  <td>
                    <strong>{{ c.title }}</strong>
                    <div class="form-hint">{{ c.package_name }}</div>
                  </td>
                  <td>
                    <span
                      class="badge"
                      :class="c.campaign_status === 'active' ? 'badge-free' : 'badge-warning'"
                    >
                      {{ c.campaign_status }}
                    </span>
                  </td>
                  <td>{{ c.impressions_count }} / {{ c.clicks_count }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <!-- Managed APIs Table -->
      <section class="card">
        <h3 style="margin-bottom: 1rem;">Managed API Listings</h3>

        <div v-if="managedApis.length === 0" class="form-hint">
          You don't manage any APIs yet. Submit your first API listing to begin!
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>API Name</th>
                <th>Category</th>
                <th>Status</th>
                <th>Views</th>
                <th>Favorites</th>
                <th>Rating</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="a in managedApis" :key="a.id">
                <td><strong>{{ a.name }}</strong></td>
                <td>{{ a.category_name }}</td>
                <td>
                  <span
                    class="badge"
                    :class="a.status === 'approved' ? 'badge-free' : 'badge-warning'"
                  >
                    {{ a.status }}
                  </span>
                </td>
                <td>{{ a.views_count }}</td>
                <td>{{ a.favorites_count }}</td>
                <td>{{ Number(a.average_rating || 0).toFixed(1) }} / 5</td>
                <td class="flex-row">
                  <router-link :to="`/apis/${a.slug}`" class="btn btn-ghost btn-sm">View</router-link>
                  <router-link :to="`/apis/${a.id}/edit`" class="btn btn-secondary btn-sm">Edit</router-link>
                  <router-link
                    v-if="a.status === 'approved'"
                    :to="`/provider/promote?api=${a.id}`"
                    class="btn btn-primary btn-sm"
                  >
                    Promote
                  </router-link>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';

const authStore = useAuthStore();
const toast = useToastStore();

const loading = ref(true);
const saving = ref(false);
const hasProfile = ref(false);
const profile = ref(null);
const metrics = ref({});
const managedApis = ref([]);
const campaigns = ref([]);

const profileForm = reactive({
  company_name: '',
  website_url: '',
  logo_url: '',
  contact_email: '',
  description: '',
  request_verification: true
});

async function loadDashboard() {
  loading.value = true;
  try {
    const { data } = await http.get('/providers/me/dashboard');
    hasProfile.value = data.has_profile;
    profile.value = data.profile;
    metrics.value = data.metrics || {};
    managedApis.value = data.managed_apis || [];
    campaigns.value = data.recent_campaigns || [];

    if (data.profile) {
      profileForm.company_name = data.profile.company_name || '';
      profileForm.website_url = data.profile.website_url || '';
      profileForm.logo_url = data.profile.logo_url || '';
      profileForm.contact_email = data.profile.contact_email || '';
      profileForm.description = data.profile.description || '';
    } else if (authStore.user) {
      profileForm.contact_email = authStore.user.email || '';
    }
  } finally {
    loading.value = false;
  }
}

async function saveProviderProfile() {
  saving.value = true;
  try {
    if (hasProfile.value) {
      await http.put('/providers/profile', profileForm);
      toast.success('Provider profile updated.');
    } else {
      await http.post('/providers/profile', profileForm);
      toast.success('Provider profile created!');
    }
    await authStore.refreshProfile();
    await loadDashboard();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    saving.value = false;
  }
}

onMounted(loadDashboard);
</script>
