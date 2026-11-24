<template>
  <div class="container page-section">
    <div v-if="loading" class="card">Loading API specification...</div>

    <div v-else-if="errorMsg" class="empty-state">
      <h2>API Unavailable</h2>
      <p>{{ errorMsg }}</p>
      <router-link to="/explore" class="btn btn-primary">Back to Directory</router-link>
    </div>

    <template v-else-if="api">
      <section v-if="api.is_directory_preview || api.is_demo" class="simple-api-detail">
        <router-link to="/explore" class="simple-api-back">← Back to APIs</router-link>
        <article class="card simple-api-card">
          <div class="flex-row simple-api-labels">
            <span class="badge badge-free">{{ PRICING_LABELS[api.pricing_model] || 'Free' }}</span>
            <span class="badge badge-neutral">{{ AUTH_LABELS[api.auth_type] || 'No authentication' }}</span>
            <span v-if="api.category_name" class="badge badge-neutral">{{ api.category_name }}</span>
          </div>
          <p class="eyebrow simple-api-provider">{{ api.provider_name || api.provider_company_name }}</p>
          <h1 class="simple-api-title">{{ api.name }}</h1>
          <p class="simple-api-description">{{ api.short_description }}</p>
          <p v-if="api.full_description" class="simple-api-full-description">{{ api.full_description }}</p>

          <div v-if="api.base_url" class="simple-api-info-row">
            <strong>Base URL</strong>
            <code>{{ api.base_url }}</code>
          </div>
          <div v-if="api.endpoints?.length" class="simple-api-info-row">
            <strong>Example</strong>
            <code>{{ api.endpoints[0].http_method }} {{ api.endpoints[0].path }}</code>
          </div>

          <div class="simple-api-actions">
            <a :href="api.docs_url" target="_blank" rel="noopener noreferrer" class="btn btn-primary">
              Official documentation ↗
            </a>
            <a v-if="api.website_url" :href="api.website_url" target="_blank" rel="noopener noreferrer" class="btn btn-secondary">
              Provider website
            </a>
          </div>
        </article>
      </section>

      <template v-else>
      <!-- Top Breadcrumb -->
      <div v-if="api.is_demo" class="alert alert-info" role="status">
        This is a local free-API preview listing. It links to the provider’s official docs; favorites, reviews, and other saved actions need the API Locate backend.
      </div>

      <div class="breadcrumb">
        <router-link to="/explore">Explore</router-link>
        <span>/</span>
        <router-link :to="`/explore?category=${api.category_slug}`">{{ api.category_name }}</router-link>
        <span>/</span>
        <span>{{ api.name }}</span>
      </div>

      <!-- Verification / Moderation Transparency Banner -->
      <div
        v-if="api.status !== 'approved'"
        class="alert alert-warning"
      >
        <strong>Moderation Status ({{ api.status.toUpperCase() }}):</strong>
        This listing is not yet publicly visible in the directory.
        <span v-if="api.rejection_reason"> Reason: {{ api.rejection_reason }}</span>
      </div>

      <div
        v-if="api.verification_level !== 'verified'"
        class="alert alert-info"
      >
        <strong>{{ VERIFICATION_LABELS[api.verification_level] || 'Unverified Listing' }}:</strong>
        Some metadata on this {{ api.source_type }} listing has not yet been independently verified against an official OpenAPI contract. Always review official documentation before sending production credentials.
      </div>

      <!-- Main Header Card -->
      <section class="card details-hero">
        <div class="details-hero-left">
          <div class="hero-logo">
            <img v-if="detailLogoUrl && !logoError" :src="detailLogoUrl" :alt="`${api.provider_name || api.name} logo`" referrerpolicy="no-referrer" @error="logoError = true" />
            <span v-else>{{ getInitials(api.name) }}</span>
          </div>

          <div>
            <div class="flex-row" style="margin-bottom: 0.45rem;">
              <span
                class="badge"
                :class="api.verification_level === 'verified' ? 'badge-free' : 'badge-warning'"
              >
                {{ api.verification_level === 'verified' ? 'Verified specification' : VERIFICATION_LABELS[api.verification_level] }}
              </span>

              <span class="badge" :class="formatPricingBadgeClass(api.pricing_model)">
                {{ PRICING_LABELS[api.pricing_model] }}
              </span>

              <span class="badge badge-neutral">
                {{ AUTH_LABELS[api.auth_type] }}
              </span>

              <span class="badge badge-neutral">
                Status: {{ api.operational_status }}
              </span>

              <span v-if="api.is_seed_data" class="badge badge-neutral">
                Seed sample
              </span>
            </div>

            <h1 class="details-title">{{ api.name }}</h1>
            <p class="details-short">{{ api.short_description }}</p>

            <div class="flex-row" style="margin-top: 0.75rem;">
              <a :href="api.docs_url" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-sm">
                Documentation ↗
              </a>
              <a
                v-if="api.website_url"
                :href="api.website_url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
              >
                Website ↗
              </a>
              <a
                v-if="api.openapi_spec_url"
                :href="api.openapi_spec_url"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
              >
                OpenAPI spec ↗
              </a>
            </div>
          </div>
        </div>

        <!-- Developer Action Buttons -->
        <div class="details-actions">
          <div v-if="api.is_demo" class="alert alert-info" style="margin: 0;">
            Preview listing only; account actions are unavailable offline.
          </div>
          <button
            v-if="!api.is_demo"
            type="button"
            class="btn btn-secondary"
            @click="handleFavorite"
          >
            <AppIcon :name="isFavorited ? 'bookmark-solid' : 'bookmark'" :size="15" />
            <span>{{ isFavorited ? 'Saved' : 'Save favorite' }} ({{ api.favorites_count || 0 }})</span>
          </button>

          <button v-if="!api.is_demo" type="button" class="btn btn-secondary" @click="openCollectionModal">
            <AppIcon name="plus" :size="15" />
            <span>Add to collection</span>
          </button>

          <button
            v-if="!api.is_demo"
            type="button"
            class="btn btn-secondary"
            @click="workspace.toggleCompare(api)"
          >
            <AppIcon name="columns" :size="15" />
            <span>{{ workspace.isInCompare(api.id) ? 'In comparison tray' : 'Compare API' }}</span>
          </button>

          <div class="flex-row" style="justify-content: flex-end;">
            <router-link
              v-if="canEdit"
              :to="`/apis/${api.id}/edit`"
              class="btn btn-ghost btn-sm"
            >
              <AppIcon name="edit" :size="14" />
              <span>Edit</span>
            </router-link>
            <button v-if="!api.is_demo" type="button" class="btn btn-ghost btn-sm" @click="openReportModal">
              <AppIcon name="flag" :size="14" />
              <span>Report issue</span>
            </button>
          </div>
        </div>
      </section>

      <!-- Two-Column Technical Layout -->
      <div class="details-grid">
        <div class="details-main">
          <!-- Base URL Box -->
          <section class="card" style="margin-bottom: 1.25rem;">
            <div class="flex-between" style="margin-bottom: 0.6rem;">
              <h2 style="font-size: 1.1rem; margin: 0;">Base Endpoint URL</h2>
              <button
                v-if="api.base_url"
                type="button"
                class="btn btn-secondary btn-sm"
                @click="copyBaseUrl"
              >
                {{ copied ? '✓ Copied' : 'Copy Base URL' }}
              </button>
            </div>
            <pre v-if="api.base_url" class="code-block">{{ api.base_url }}</pre>
            <p v-else class="form-hint" style="margin: 0;">
              Base URL is tenant-specific or documented inside the official reference guide.
            </p>
          </section>

          <!-- Full Overview -->
          <section class="card" style="margin-bottom: 1.25rem;">
            <h2 style="font-size: 1.2rem;">Overview &amp; Capabilities</h2>
            <p style="white-space: pre-line; margin-bottom: 1rem;">{{ api.full_description }}</p>

            <div v-if="api.tags && api.tags.length > 0" class="flex-row">
              <router-link
                v-for="tag in api.tags"
                :key="tag.id"
                :to="`/explore?tag=${tag.slug}`"
                class="badge badge-neutral mono"
              >
                {{ tag.name }}
              </router-link>
            </div>
          </section>

          <!-- Endpoint Examples -->
          <section class="card" style="margin-bottom: 1.25rem;">
            <div class="flex-between" style="margin-bottom: 1rem;">
              <h2 style="font-size: 1.2rem; margin: 0;">
                Endpoint Examples ({{ api.endpoints?.length || 0 }})
              </h2>
            </div>

            <div v-if="!api.endpoints || api.endpoints.length === 0" class="alert alert-info" style="margin: 0;">
              No sample endpoints have been added yet. Consult the
              <a :href="api.docs_url" target="_blank" rel="noopener noreferrer">Official Documentation</a>
              for complete endpoint schemas.
            </div>

            <div v-else class="endpoints-stack">
              <div v-for="ep in api.endpoints" :key="ep.id" class="endpoint-item">
                <div class="endpoint-header">
                  <span class="method-badge" :class="`method-${ep.http_method}`">
                    {{ ep.http_method }}
                  </span>
                  <code class="endpoint-path">{{ ep.path }}</code>
                  <span class="badge badge-neutral" style="margin-left: auto;">
                    {{ ep.auth_required ? 'Auth Required' : 'Public' }}
                  </span>
                </div>
                <p class="endpoint-summary"><strong>{{ ep.summary }}</strong></p>
                <p v-if="ep.description" style="font-size: 0.85rem;">{{ ep.description }}</p>

                <div v-if="ep.sample_request || ep.sample_response" class="grid-2">
                  <div v-if="ep.sample_request">
                    <span class="code-caption">Sample Request</span>
                    <pre class="code-block">{{ ep.sample_request }}</pre>
                  </div>
                  <div v-if="ep.sample_response">
                    <span class="code-caption">Sample Response</span>
                    <pre class="code-block">{{ ep.sample_response }}</pre>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Reviews & Ratings -->
          <section class="card">
            <div class="flex-between" style="margin-bottom: 1rem;">
              <div>
                <h2 style="font-size: 1.15rem; margin: 0;">Developer Reviews</h2>
                <p style="margin: 0.2rem 0 0; font-size: 0.84rem; color: var(--text-muted);">
                  Average rating: <strong>{{ Number(api.average_rating || 0).toFixed(1) }} / 5.0</strong> ({{ api.reviews_count || 0 }} {{ api.reviews_count === 1 ? 'review' : 'reviews' }})
                </p>
              </div>
            </div>

            <!-- Authenticated Review Form -->
            <form v-if="authStore.isAuthenticated && !api.is_demo" class="review-form" @submit.prevent="submitReview">
              <h4 style="margin-bottom: 0.65rem; font-size: 0.92rem;">Write or update your review</h4>
              <div class="grid-2">
                <div class="form-group">
                  <label class="form-label">Rating</label>
                  <select v-model.number="reviewForm.rating" class="select" required>
                    <option :value="5">5 / 5 — Excellent</option>
                    <option :value="4">4 / 5 — Good</option>
                    <option :value="3">3 / 5 — Solid</option>
                    <option :value="2">2 / 5 — Needs work</option>
                    <option :value="1">1 / 5 — Poor</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Headline (Optional)</label>
                  <input
                    v-model="reviewForm.title"
                    type="text"
                    class="input"
                    placeholder="e.g., Clear docs and reliable webhooks"
                  />
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Integration Notes (Optional)</label>
                <textarea
                  v-model="reviewForm.comment"
                  class="textarea"
                  style="min-height: 80px;"
                  placeholder="Share SDK quality, latency, auth clarity, or pricing feedback..."
                ></textarea>
              </div>
              <button type="submit" class="btn btn-primary btn-sm" :disabled="savingReview">
                {{ savingReview ? 'Saving...' : 'Publish review' }}
              </button>
            </form>
            <div v-else class="alert alert-info">
              <template v-if="api.is_demo">Reviews are enabled after connecting the API Locate backend.</template>
              <template v-else><router-link to="/login">Sign in</router-link> to rate and review this API.</template>
            </div>

            <!-- Reviews List -->
            <div v-if="reviews.length === 0" style="margin-top: 1rem; color: var(--text-muted); font-size: 0.86rem;">
              No developer reviews yet.
            </div>
            <div v-else class="reviews-list">
              <div v-for="rev in reviews" :key="rev.id" class="review-card">
                <div class="flex-between">
                  <div class="flex-row">
                    <span class="badge badge-neutral mono">{{ rev.rating }}.0 / 5</span>
                    <strong>{{ rev.title || 'Developer review' }}</strong>
                  </div>
                  <span style="font-size: 0.76rem; color: var(--text-muted);">
                    @{{ rev.username }} · {{ formatDate(rev.created_at) }}
                  </span>
                </div>
                <p v-if="rev.comment" style="margin: 0.45rem 0 0; font-size: 0.86rem;">
                  {{ rev.comment }}
                </p>
              </div>
            </div>
          </section>
        </div>

        <!-- Right Specification Sidebar -->
        <aside class="details-sidebar">
          <!-- Technical Spec Table -->
          <div class="card" style="margin-bottom: 1.25rem;">
            <h3 style="font-size: 1rem; margin-bottom: 0.85rem;">Authentication &amp; Pricing</h3>
            <dl class="spec-dl">
              <dt>Authentication</dt>
              <dd>{{ AUTH_LABELS[api.auth_type] }}</dd>

              <template v-if="api.auth_details">
                <dt>Auth Header / Flow</dt>
                <dd class="mono" style="font-size: 0.79rem;">{{ api.auth_details }}</dd>
              </template>

              <dt>Pricing Model</dt>
              <dd>{{ PRICING_LABELS[api.pricing_model] }}</dd>

              <template v-if="api.pricing_details">
                <dt>Pricing Notes</dt>
                <dd>{{ api.pricing_details }}</dd>
              </template>

              <template v-if="api.rate_limit_info">
                <dt>Rate Limits</dt>
                <dd>{{ api.rate_limit_info }}</dd>
              </template>

              <dt>HTTPS / Browser CORS</dt>
              <dd>
                {{ api.https_supported ? 'HTTPS Yes' : 'HTTP' }} · CORS: {{ api.cors_supported }}
              </dd>

              <dt>Data Source</dt>
              <dd style="text-transform: capitalize;">
                {{ api.source_type }}
                <span v-if="api.source_name">({{ api.source_name }})</span>
              </dd>

              <template v-if="api.license_name || api.attribution_note">
                <dt>License &amp; Attribution</dt>
                <dd>
                  <span v-if="api.license_name">{{ api.license_name }}</span>
                  <div v-if="api.attribution_note" style="font-size: 0.76rem; color: var(--text-muted);">
                    {{ api.attribution_note }}
                  </div>
                </dd>
              </template>
            </dl>

            <div v-if="canEdit" style="margin-top: 1rem; padding-top: 0.85rem; border-top: 1px solid var(--border-subtle);">
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                style="width: 100%;"
                :disabled="checkingStatus"
                @click="runLiveHealthCheck"
              >
                <AppIcon name="activity" :size="14" />
                <span>{{ checkingStatus ? 'Checking endpoint...' : 'Run live reachability check' }}</span>
              </button>
              <div v-if="api.last_response_ms" class="form-hint" style="text-align: center;">
                Last checked: {{ api.last_response_ms }}ms ({{ api.operational_status }})
              </div>
            </div>
          </div>

          <!-- Provider Information Card -->
          <div class="card" style="margin-bottom: 1.25rem;">
            <h3 style="font-size: 1rem; margin-bottom: 0.65rem;">Provider Information</h3>
            <p style="margin-bottom: 0.4rem;">
              <strong>{{ api.provider_company_name || api.provider_name }}</strong>
              <span
                v-if="api.provider_verification_status === 'verified'"
                class="badge badge-free"
                style="margin-left: 0.4rem;"
              >
                ✓ Verified Provider
              </span>
            </p>
            <p v-if="api.provider_description" style="font-size: 0.84rem;">
              {{ api.provider_description }}
            </p>
            <router-link
              v-if="api.provider_slug"
              :to="`/providers/${api.provider_slug}`"
              class="btn btn-secondary btn-sm"
              style="width: 100%;"
            >
              View Provider Profile →
            </router-link>
          </div>

          <!-- Quality Checklist Card -->
          <div class="card">
            <h3 style="font-size: 1rem; margin-bottom: 0.65rem;">Specification Quality</h3>
            <ul class="quality-list">
              <li>
                <span>{{ api.quality_indicators?.is_verified ? '✓' : '○' }}</span>
                Moderated &amp; Verified Spec
              </li>
              <li>
                <span>{{ api.quality_indicators?.has_docs_url ? '✓' : '○' }}</span>
                Official Documentation Link
              </li>
              <li>
                <span>{{ api.quality_indicators?.has_base_url ? '✓' : '○' }}</span>
                Documented Base URL
              </li>
              <li>
                <span>{{ api.quality_indicators?.has_known_auth ? '✓' : '○' }}</span>
                Explicit Auth Mechanism
              </li>
              <li>
                <span>{{ api.quality_indicators?.has_endpoints ? '✓' : '○' }}</span>
                Endpoint Payload Examples
              </li>
            </ul>
          </div>
        </aside>
      </div>

      <!-- Modals -->
      <CollectionModal
        v-if="showCollectionModal"
        :api="api"
        @close="showCollectionModal = false"
      />
      <ReportApiModal
        v-if="showReportModal"
        :api="api"
        @close="showReportModal = false"
      />
      </template>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToastStore } from '../../stores/toastStore';
import CollectionModal from '../../components/CollectionModal.vue';
import ReportApiModal from '../../components/ReportApiModal.vue';
import AppIcon from '../../components/AppIcon.vue';
import {
  AUTH_LABELS,
  PRICING_LABELS,
  VERIFICATION_LABELS,
  formatPricingBadgeClass,
  formatDate,
  getInitials
} from '../../utils/formatters';
import { findFreeApi } from '../../data/freeApiCatalog';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const workspace = useWorkspaceStore();
const toast = useToastStore();

const api = ref(null);
const reviews = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const logoError = ref(false);
const detailLogoUrl = computed(() => {
  if (api.value?.logo_url) return api.value.logo_url;
  try {
    const website = api.value?.provider_website_url || api.value?.website_url;
    if (!website) return '';
    const host = new URL(website).hostname.replace(/^www\./, '');
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=128`;
  } catch (_) {
    return '';
  }
});
const copied = ref(false);
const savingReview = ref(false);
const checkingStatus = ref(false);
const showCollectionModal = ref(false);
const showReportModal = ref(false);

const reviewForm = reactive({
  rating: 5,
  title: '',
  comment: ''
});

const isFavorited = computed(
  () =>
    (api.value && workspace.favoriteIdSet.has(api.value.id)) ||
    Boolean(api.value?.is_favorited)
);

const canEdit = computed(() => {
  if (!authStore.isAuthenticated || !api.value) return false;
  return (
    authStore.isAdmin ||
    api.value.owner_user_id === authStore.user?.id ||
    api.value.submitted_by === authStore.user?.id
  );
});

async function loadApiDetails() {
  const previewApi = findFreeApi(route.params.slug);
  logoError.value = false;
  errorMsg.value = '';
  reviews.value = [];
  if (previewApi) {
    api.value = previewApi;
    loading.value = false;
    return;
  }

  api.value = null;
  loading.value = true;
  try {
    const { data } = await http.get(`/apis/${route.params.slug}`, { timeout: 3000 });
    api.value = data.api;
    reviews.value = data.api.reviews || [];
  } catch (err) {
    errorMsg.value = extractErrorMessage(err, 'API listing could not be loaded.');
  } finally {
    loading.value = false;
  }
}

async function handleFavorite() {
  if (!api.value) return;
  const res = await workspace.toggleFavorite(api.value);
  if (res?.requiresLogin) {
    router.push('/login');
  } else if (res && typeof res.favorited === 'boolean') {
    api.value.is_favorited = res.favorited;
    api.value.favorites_count = Math.max(
      0,
      Number(api.value.favorites_count || 0) + (res.favorited ? 1 : -1)
    );
  }
}

function openCollectionModal() {
  if (!authStore.isAuthenticated) {
    toast.warning('Please log in to organize APIs into collections.');
    router.push('/login');
    return;
  }
  showCollectionModal.value = true;
}

function openReportModal() {
  if (!authStore.isAuthenticated) {
    toast.warning('Please log in to submit an issue report.');
    router.push('/login');
    return;
  }
  showReportModal.value = true;
}

async function copyBaseUrl() {
  if (!api.value?.base_url) return;
  try {
    await navigator.clipboard.writeText(api.value.base_url);
    copied.value = true;
    setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch (_) {
    toast.info(api.value.base_url);
  }
}

async function submitReview() {
  if (!api.value) return;
  savingReview.value = true;
  try {
    await http.post(`/apis/${api.value.id}/reviews`, reviewForm);
    toast.success('Your review has been saved!');
    await loadApiDetails();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    savingReview.value = false;
  }
}

async function runLiveHealthCheck() {
  if (!api.value) return;
  checkingStatus.value = true;
  try {
    const { data } = await http.post(`/apis/${api.value.id}/check-status`);
    api.value.operational_status = data.check.operational_status;
    api.value.last_response_ms = data.check.response_ms;
    toast.success(
      `Status: ${data.check.operational_status} (${data.check.response_ms}ms)`
    );
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    checkingStatus.value = false;
  }
}

watch(() => route.params.slug, loadApiDetails);
onMounted(loadApiDetails);
</script>

<style scoped>
.simple-api-detail {
  width: min(100%, 760px);
  margin: 0 auto;
}

.simple-api-back {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  margin-bottom: 0.75rem;
  color: var(--text-secondary);
}

.simple-api-card {
  padding: clamp(1.1rem, 4vw, 2rem);
}

.simple-api-labels {
  margin-bottom: 1rem;
}

.simple-api-provider {
  margin: 0 0 0.35rem;
}

.simple-api-title {
  font-size: clamp(1.65rem, 5vw, 2.3rem);
  overflow-wrap: anywhere;
}

.simple-api-description {
  color: var(--text-primary);
  font-size: 1.05rem;
  line-height: 1.7;
}

.simple-api-full-description {
  margin-top: 0.8rem;
  white-space: pre-line;
}

.simple-api-info-row {
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr);
  gap: 0.7rem;
  padding: 0.8rem 0;
  border-top: 1px solid var(--border-subtle);
}

.simple-api-info-row code {
  overflow-wrap: anywhere;
}

.simple-api-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 1.2rem;
}

@media (max-width: 480px) {
  .simple-api-info-row { grid-template-columns: 1fr; gap: 0.25rem; }
  .simple-api-actions > * { width: 100%; }
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.84rem;
  color: var(--text-muted);
  margin-bottom: 1.15rem;
}

.details-hero {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.details-hero-left {
  display: flex;
  align-items: flex-start;
  gap: 1.2rem;
  flex: 1;
}

.hero-logo {
  width: 58px;
  height: 58px;
  border-radius: var(--radius-md);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--text-secondary);
  flex-shrink: 0;
  overflow: hidden;
}

.hero-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.details-title {
  font-size: 1.85rem;
  margin: 0.2rem 0 0.4rem;
}

.details-short {
  font-size: 1rem;
  margin: 0;
}

.details-actions {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  min-width: 220px;
}

.details-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 330px;
  gap: 1.5rem;
  align-items: start;
}

.endpoints-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.endpoint-item {
  padding: 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface-alt);
}

.endpoint-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 0.5rem;
}

.endpoint-path {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.endpoint-summary {
  margin: 0 0 0.4rem;
  font-size: 0.9rem;
}

.code-caption {
  display: block;
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  margin-bottom: 0.3rem;
}

.review-form {
  padding: 1rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  margin-bottom: 1.25rem;
}

.reviews-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.review-card {
  padding: 0.9rem 1rem;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
}

.spec-dl {
  margin: 0;
  display: grid;
  gap: 0.65rem;
}

.spec-dl dt {
  font-size: 0.74rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.spec-dl dd {
  margin: 0.1rem 0 0;
  font-size: 0.88rem;
  color: var(--text-primary);
}

.quality-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.quality-list span {
  color: var(--success);
  font-weight: 600;
  margin-right: 0.4rem;
}

@media (max-width: 960px) {
  .details-hero {
    flex-direction: column;
  }

  .details-actions {
    width: 100%;
  }

  .details-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
