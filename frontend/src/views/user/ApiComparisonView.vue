<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <span class="badge badge-freemium" style="margin-bottom: 0.35rem;">Premium Tool</span>
        <h1 class="page-title">Side-by-Side API Comparison</h1>
        <p class="page-subtitle">
          Compare pricing, authentication, provider trust, documentation, and technical capabilities across up to 4 APIs.
        </p>
      </div>
    </div>

    <div v-if="!authStore.isPremium" class="empty-state">
      <h2>Side-by-Side API Comparison Requires Premium</h2>
      <p style="max-width: 560px; margin: 0 auto 1.25rem;">
        Evaluate competing APIs side by side across authentication requirements, rate limits,
        SDK availability, OpenAPI specs, and developer ratings.
      </p>
      <router-link to="/pricing" class="btn btn-primary">Upgrade to Premium</router-link>
    </div>

    <template v-else>
      <!-- Picker Controls -->
      <div class="card flex-between" style="margin-bottom: 1.5rem; flex-wrap: wrap;">
        <div class="flex-row" style="flex: 1;">
          <select v-model="selectedApiId" class="select" style="max-width: 340px;">
            <option value="">+ Select an API to add ({{ workspace.compareTray.length }}/4)...</option>
            <option
              v-for="item in allApis"
              :key="item.id"
              :value="item.id"
              :disabled="workspace.isInCompare(item.id)"
            >
              {{ item.name }} — {{ item.category_name }}
            </option>
          </select>
          <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="!selectedApiId || workspace.compareTray.length >= 4"
            @click="addPickedApi"
          >
            Add to Matrix
          </button>
        </div>

        <button
          v-if="workspace.compareTray.length > 0"
          type="button"
          class="btn btn-ghost btn-sm"
          @click="clearAll"
        >
          Clear Selection
        </button>
      </div>

      <div v-if="workspace.compareTray.length < 2" class="empty-state">
        <h3>Select at least 2 APIs to compare</h3>
        <p>
          Currently selected: <strong>{{ workspace.compareTray.length }}</strong> API(s). Pick another API from the dropdown above or click "+ Compare" on any API card.
        </p>
      </div>

      <div v-else-if="loading" class="card">Loading comparison matrix...</div>

      <div v-else-if="comparedApis.length >= 2" class="table-wrap">
        <table class="data-table compare-matrix">
          <thead>
            <tr>
              <th style="min-width: 180px;">Attribute</th>
              <th v-for="api in comparedApis" :key="api.id" style="min-width: 240px;">
                <div class="flex-between">
                  <router-link :to="`/apis/${api.slug}`" style="font-size: 0.98rem; color: var(--accent);">
                    {{ api.name }}
                  </router-link>
                  <button
                    type="button"
                    class="btn btn-ghost btn-sm"
                    @click="removeFromMatrix(api)"
                    title="Remove"
                  >
                    ✕
                  </button>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Category</strong></td>
              <td v-for="api in comparedApis" :key="`cat-${api.id}`">{{ api.category_name }}</td>
            </tr>
            <tr>
              <td><strong>Pricing Model</strong></td>
              <td v-for="api in comparedApis" :key="`pr-${api.id}`">
                <span class="badge" :class="formatPricingBadgeClass(api.pricing_model)">
                  {{ PRICING_LABELS[api.pricing_model] }}
                </span>
                <div v-if="api.pricing_details" class="form-hint">{{ api.pricing_details }}</div>
              </td>
            </tr>
            <tr>
              <td><strong>Authentication</strong></td>
              <td v-for="api in comparedApis" :key="`au-${api.id}`">
                <strong>{{ AUTH_LABELS[api.auth_type] }}</strong>
                <div v-if="api.auth_details" class="form-hint mono">{{ api.auth_details }}</div>
              </td>
            </tr>
            <tr>
              <td><strong>Provider &amp; Trust</strong></td>
              <td v-for="api in comparedApis" :key="`pv-${api.id}`">
                <div>{{ api.provider_company_name || api.provider_name }}</div>
                <span
                  class="badge"
                  :class="api.verification_level === 'verified' ? 'badge-free' : 'badge-neutral'"
                  style="margin-top: 0.25rem;"
                >
                  {{ VERIFICATION_LABELS[api.verification_level] }}
                </span>
              </td>
            </tr>
            <tr>
              <td><strong>Rate Limits</strong></td>
              <td v-for="api in comparedApis" :key="`rl-${api.id}`">
                {{ api.rate_limit_info || 'See documentation' }}
              </td>
            </tr>
            <tr>
              <td><strong>Documentation &amp; OpenAPI</strong></td>
              <td v-for="api in comparedApis" :key="`dc-${api.id}`">
                <div>
                  <a :href="api.docs_url" target="_blank" rel="noopener noreferrer">Official Docs ↗</a>
                </div>
                <div class="form-hint">
                  OpenAPI Spec: {{ api.openapi_spec_url ? '✓ Available' : 'Not listed' }}
                </div>
              </td>
            </tr>
            <tr>
              <td><strong>HTTPS &amp; Browser CORS</strong></td>
              <td v-for="api in comparedApis" :key="`hc-${api.id}`">
                HTTPS: {{ api.https_supported ? '✓ Yes' : 'No' }} · CORS: {{ api.cors_supported }}
              </td>
            </tr>
            <tr>
              <td><strong>Features &amp; SDKs</strong></td>
              <td v-for="api in comparedApis" :key="`ft-${api.id}`">
                <div v-if="api.features_json?.sdks">
                  <strong>SDKs:</strong> {{ api.features_json.sdks.join(', ') }}
                </div>
                <div class="form-hint">
                  Documented Endpoints: {{ api.endpoints_count || 0 }}
                </div>
              </td>
            </tr>
            <tr>
              <td><strong>Developer Rating</strong></td>
              <td v-for="api in comparedApis" :key="`rt-${api.id}`">
                <strong>{{ Number(api.average_rating || 0).toFixed(1) }} / 5.0</strong>
                <span class="form-hint"> ({{ api.reviews_count || 0 }} reviews)</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import {
  AUTH_LABELS,
  PRICING_LABELS,
  VERIFICATION_LABELS,
  formatPricingBadgeClass
} from '../../utils/formatters';

const authStore = useAuthStore();
const workspace = useWorkspaceStore();
const toast = useToastStore();

const allApis = ref([]);
const comparedApis = ref([]);
const selectedApiId = ref('');
const loading = ref(false);

async function loadComparison() {
  if (!authStore.isPremium || workspace.compareTray.length < 2) {
    comparedApis.value = [];
    return;
  }
  loading.value = true;
  try {
    const ids = workspace.compareTray.map((item) => item.id);
    const { data } = await http.post('/apis/compare', { api_ids: ids });
    comparedApis.value = data.comparison || [];
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    loading.value = false;
  }
}

function addPickedApi() {
  const found = allApis.value.find((a) => a.id === Number(selectedApiId.value));
  if (found) {
    workspace.toggleCompare(found);
    selectedApiId.value = '';
  }
}

function removeFromMatrix(api) {
  workspace.toggleCompare(api);
}

function clearAll() {
  workspace.clearCompare();
  comparedApis.value = [];
}

watch(
  () => workspace.compareTray.map((i) => i.id).join(','),
  () => {
    loadComparison();
  }
);

onMounted(async () => {
  if (authStore.isPremium) {
    const res = await http.get('/apis?limit=48');
    allApis.value = res.data.apis || [];
    await loadComparison();
  }
});
</script>
