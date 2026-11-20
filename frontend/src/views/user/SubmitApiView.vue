<template>
  <div class="container page-section" style="max-width: 960px;">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">{{ isEditing ? 'Edit API Listing' : 'Submit an API' }}</h1>
        <p class="page-subtitle">
          {{
            authStore.isAdmin
              ? 'Administrator mode: listings can be published and verified immediately.'
              : 'Community submissions start in a pending state and go live after administrator review.'
          }}
        </p>
      </div>
    </div>

    <form class="card" @submit.prevent="handleSubmit">
      <h3 style="margin-bottom: 1rem;">1. Core Identity &amp; Categorization</h3>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">API Name *</label>
          <input v-model="form.name" type="text" class="input" required placeholder="e.g., Paystack Payments API" />
        </div>
        <div class="form-group">
          <label class="form-label">Category *</label>
          <select v-model="form.category_id" class="select" required>
            <option value="">Select Category...</option>
            <option v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</option>
          </select>
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Provider / Company Name *</label>
          <input v-model="form.provider_name" type="text" class="input" required placeholder="e.g., Paystack" />
        </div>
        <div class="form-group">
          <label class="form-label">Logo URL (Optional)</label>
          <input v-model="form.logo_url" type="url" class="input" placeholder="https://..." />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Short Description * (max 300 chars)</label>
        <input
          v-model="form.short_description"
          type="text"
          class="input"
          maxlength="300"
          required
          placeholder="Concise one-sentence summary of what developers can build with this API."
        />
      </div>

      <div class="form-group">
        <label class="form-label">Full Technical Description *</label>
        <textarea
          v-model="form.full_description"
          class="textarea"
          required
          placeholder="Explain key capabilities, SDK support, webhook behavior, and integration use cases..."
        ></textarea>
      </div>

      <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 1.5rem 0;" />

      <h3 style="margin-bottom: 1rem;">2. URLs, Authentication &amp; Pricing</h3>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Official Documentation URL *</label>
          <input v-model="form.docs_url" type="url" class="input" required placeholder="https://docs.example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">Base Endpoint URL</label>
          <input v-model="form.base_url" type="url" class="input" placeholder="https://api.example.com/v1" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Official Website URL</label>
          <input v-model="form.website_url" type="url" class="input" placeholder="https://example.com" />
        </div>
        <div class="form-group">
          <label class="form-label">OpenAPI / Swagger Spec URL</label>
          <input v-model="form.openapi_spec_url" type="url" class="input" placeholder="https://api.example.com/openapi.json" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Authentication Type *</label>
          <select v-model="form.auth_type" class="select">
            <option value="none">No Authentication</option>
            <option value="api_key">API Key</option>
            <option value="bearer">Bearer Token</option>
            <option value="oauth2">OAuth 2.0</option>
            <option value="basic">Basic Authentication</option>
            <option value="custom">Custom Authentication</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Auth Header / Details</label>
          <input v-model="form.auth_details" type="text" class="input" placeholder="e.g., Authorization: Bearer <API_KEY>" />
        </div>
      </div>

      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Pricing Model *</label>
          <select v-model="form.pricing_model" class="select">
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
            <option value="contact">Contact Provider</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Pricing Notes</label>
          <input v-model="form.pricing_details" type="text" class="input" placeholder="e.g., 1,000 req/day free" />
        </div>
        <div class="form-group">
          <label class="form-label">Rate Limits</label>
          <input v-model="form.rate_limit_info" type="text" class="input" placeholder="e.g., 60 req/minute" />
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Tags (comma separated)</label>
          <input v-model="tagsText" type="text" class="input" placeholder="rest, webhooks, payments, json" />
        </div>
        <div class="form-group">
          <label class="form-label">Browser CORS Support</label>
          <select v-model="form.cors_supported" class="select">
            <option value="unknown">Unknown</option>
            <option value="yes">Yes (Browser Direct Calls Allowed)</option>
            <option value="no">No (Server-to-Server Only)</option>
          </select>
        </div>
      </div>

      <!-- Admin-only Publishing Controls -->
      <div v-if="authStore.isAdmin" class="grid-3" style="padding: 1rem; background: var(--bg-surface-alt); border-radius: var(--radius-sm); margin-bottom: 1rem;">
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Admin Status</label>
          <select v-model="form.status" class="select">
            <option value="approved">Approved (Live)</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0;">
          <label class="form-label">Verification Level</label>
          <select v-model="form.verification_level" class="select">
            <option value="verified">Verified</option>
            <option value="community_reviewed">Community Reviewed</option>
            <option value="unverified">Unverified</option>
          </select>
        </div>
        <div class="form-group" style="margin: 0; display: flex; align-items: center; padding-top: 1.4rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input v-model="form.is_featured" type="checkbox" />
            <strong>Feature on Homepage</strong>
          </label>
        </div>
      </div>

      <hr style="border: none; border-top: 1px solid var(--border-subtle); margin: 1.5rem 0;" />

      <!-- 3. Endpoint Examples Builder -->
      <div class="flex-between" style="margin-bottom: 1rem;">
        <h3 style="margin: 0;">3. Endpoint Examples (Optional)</h3>
        <button type="button" class="btn btn-secondary btn-sm" @click="addEndpointRow">
          + Add Endpoint Example
        </button>
      </div>

      <div v-for="(ep, index) in form.endpoints" :key="index" class="endpoint-builder-card">
        <div class="flex-between" style="margin-bottom: 0.65rem;">
          <strong>Endpoint #{{ index + 1 }}</strong>
          <button type="button" class="btn btn-ghost btn-sm" style="color: var(--danger);" @click="form.endpoints.splice(index, 1)">
            Remove
          </button>
        </div>
        <div class="grid-3">
          <div class="form-group">
            <label class="form-label">Method</label>
            <select v-model="ep.http_method" class="select">
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>PATCH</option>
              <option>DELETE</option>
              <option>GRAPHQL</option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Path *</label>
            <input v-model="ep.path" type="text" class="input" placeholder="/v1/charges" required />
          </div>
          <div class="form-group">
            <label class="form-label">Summary *</label>
            <input v-model="ep.summary" type="text" class="input" placeholder="Create a payment charge" required />
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Sample Request Payload</label>
            <textarea v-model="ep.sample_request" class="textarea mono" style="min-height: 75px;"></textarea>
          </div>
          <div class="form-group" style="margin-bottom: 0;">
            <label class="form-label">Sample JSON Response</label>
            <textarea v-model="ep.sample_response" class="textarea mono" style="min-height: 75px;"></textarea>
          </div>
        </div>
      </div>

      <div class="flex-row" style="justify-content: flex-end; margin-top: 1.5rem;">
        <router-link to="/dashboard" class="btn btn-ghost">Cancel</router-link>
        <button type="submit" class="btn btn-primary" :disabled="saving">
          {{ saving ? 'Saving...' : isEditing ? 'Save API Changes' : 'Submit API Listing' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const isEditing = computed(() => Boolean(route.params.id));
const categories = ref([]);
const saving = ref(false);
const tagsText = ref('');

const form = reactive({
  name: '',
  category_id: '',
  provider_name: authStore.user?.provider_company_name || '',
  logo_url: '',
  short_description: '',
  full_description: '',
  docs_url: '',
  base_url: '',
  website_url: '',
  openapi_spec_url: '',
  auth_type: 'api_key',
  auth_details: '',
  pricing_model: 'freemium',
  pricing_details: '',
  rate_limit_info: '',
  cors_supported: 'unknown',
  status: 'approved',
  verification_level: 'verified',
  is_featured: false,
  endpoints: []
});

function addEndpointRow() {
  form.endpoints.push({
    http_method: 'GET',
    path: '',
    summary: '',
    auth_required: true,
    sample_request: '',
    sample_response: ''
  });
}

async function handleSubmit() {
  saving.value = true;
  try {
    const payload = {
      ...form,
      tags: tagsText.value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    };

    if (isEditing.value) {
      const { data } = await http.put(`/apis/${route.params.id}`, payload);
      toast.success(data.message);
      router.push(`/apis/${data.api.slug}`);
    } else {
      const { data } = await http.post('/apis', payload);
      toast.success(data.message);
      if (data.api.status === 'approved') {
        router.push(`/apis/${data.api.slug}`);
      } else {
        router.push('/dashboard');
      }
    }
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  const catRes = await http.get('/categories');
  categories.value = catRes.data.categories || [];

  if (isEditing.value) {
    try {
      const { data } = await http.get(`/apis/${route.params.id}`);
      const a = data.api;
      form.name = a.name;
      form.category_id = a.category_id;
      form.provider_name = a.provider_name;
      form.logo_url = a.logo_url || '';
      form.short_description = a.short_description;
      form.full_description = a.full_description;
      form.docs_url = a.docs_url;
      form.base_url = a.base_url || '';
      form.website_url = a.website_url || '';
      form.openapi_spec_url = a.openapi_spec_url || '';
      form.auth_type = a.auth_type;
      form.auth_details = a.auth_details || '';
      form.pricing_model = a.pricing_model;
      form.pricing_details = a.pricing_details || '';
      form.rate_limit_info = a.rate_limit_info || '';
      form.cors_supported = a.cors_supported || 'unknown';
      form.status = a.status;
      form.verification_level = a.verification_level;
      form.is_featured = Boolean(a.is_featured);
      form.endpoints = Array.isArray(a.endpoints) ? a.endpoints : [];
      tagsText.value = Array.isArray(a.tags) ? a.tags.map((t) => t.name).join(', ') : '';
    } catch (err) {
      toast.error(extractErrorMessage(err));
      router.push('/dashboard');
    }
  }
});
</script>

<style scoped>
.endpoint-builder-card {
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  margin-bottom: 0.85rem;
}
</style>
