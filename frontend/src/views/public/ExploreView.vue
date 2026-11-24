<template>
  <div class="container page-section">
    <div class="page-header">
      <div>
        <span class="eyebrow">API Registry</span>
        <h1 class="page-title" style="margin-top: 0.25rem;">Directory</h1>
        <p class="page-subtitle">
          <template v-if="isPreviewCatalog">Browse {{ pagination.total }} free public API examples with no-key endpoints.</template>
          <template v-else>Search across {{ pagination.total }} moderated developer APIs using full-text relevance and technical filters.</template>
        </p>
      </div>

      <router-link to="/submit-api" class="btn btn-primary btn-sm">
        Submit an API
      </router-link>
    </div>

    <!-- Top Search & Sort Bar -->
    <form class="explore-search-bar card" @submit.prevent="applySearch">
      <input
        v-model="filters.q"
        type="search"
        class="input explore-q"
        placeholder="Search by API name, keyword, description, tag, or provider..."
      />

      <select v-model="filters.sort" class="select explore-sort" @change="applySearch">
        <option value="relevant">Sort: Most Relevant</option>
        <option value="recent">Sort: Recently Added</option>
        <option value="alphabetical">Sort: Alphabetical (A–Z)</option>
        <option value="most_reviewed">Sort: Most Reviewed</option>
        <option value="highest_rated">Sort: Highest Rated</option>
      </select>

      <button type="submit" class="btn btn-primary">Search</button>
      <button
        type="button"
        class="btn btn-secondary mobile-filter-btn"
        @click="mobileFiltersOpen = !mobileFiltersOpen"
      >
        Filters {{ activeFilterCount > 0 ? `(${activeFilterCount})` : '' }}
      </button>
    </form>

    <div class="explore-layout">
      <!-- Filter Sidebar -->
      <aside class="filter-sidebar card" :class="{ open: mobileFiltersOpen }">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0; font-size: 1rem;">Filters</h3>
          <button
            v-if="activeFilterCount > 0"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="resetFilters"
          >
            Reset All
          </button>
        </div>

        <div class="form-group">
          <label class="form-label">Category</label>
          <select v-model="filters.category" class="select" @change="applySearch">
            <option value="">All Categories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.slug">
              {{ cat.name }} ({{ cat.api_count }})
            </option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Pricing Model</label>
          <select v-model="filters.pricing" class="select" @change="applySearch">
            <option value="">Any Pricing</option>
            <option value="free">Free</option>
            <option value="free_or_freemium">Free or Freemium</option>
            <option value="freemium">Freemium</option>
            <option value="paid">Paid</option>
            <option value="contact">Contact Provider</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Authentication Type</label>
          <select v-model="filters.auth_type" class="select" @change="applySearch">
            <option value="">Any Authentication</option>
            <option value="none">No Authentication</option>
            <option value="api_key">API Key</option>
            <option value="oauth2">OAuth 2.0</option>
            <option value="bearer">Bearer Token</option>
            <option value="basic">Basic Authentication</option>
            <option value="custom">Custom Authentication</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">API Provider</label>
          <input
            v-model="filters.provider"
            type="text"
            class="input"
            placeholder="e.g., Stripe, GitHub, KigaliPay"
            @keyup.enter="applySearch"
          />
        </div>

        <div class="form-group">
          <label class="form-label">Popular Tags</label>
          <div class="tag-cloud">
            <button
              v-for="t in tags.slice(0, 14)"
              :key="t.id"
              type="button"
              class="tag-btn"
              :class="{ active: filters.tag === t.slug }"
              @click="toggleTag(t.slug)"
            >
              {{ t.name }}
            </button>
          </div>
        </div>

        <!-- Premium Advanced Technical Filters -->
        <div class="advanced-box">
          <div class="flex-between" style="margin-bottom: 0.55rem;">
            <span class="form-label" style="margin: 0;">Technical Filters</span>
            <span class="badge badge-neutral">Pro</span>
          </div>

          <template v-if="authStore.isPremium">
            <label class="check-row">
              <input v-model="filters.verified_only" type="checkbox" @change="applySearch" />
              <span>Verified Specifications Only</span>
            </label>
            <label class="check-row">
              <input v-model="filters.https_only" type="checkbox" @change="applySearch" />
              <span>HTTPS Enforced</span>
            </label>
            <label class="check-row">
              <input v-model="filters.cors_only" type="checkbox" @change="applySearch" />
              <span>Browser CORS Supported</span>
            </label>
            <label class="check-row">
              <input v-model="filters.has_openapi" type="checkbox" @change="applySearch" />
              <span>OpenAPI / Swagger Spec Available</span>
            </label>
          </template>
          <div v-else class="pro-upsell-mini">
            <p>Filter by Browser CORS, OpenAPI specs, and Verified-only status with Premium.</p>
            <router-link to="/pricing" class="btn btn-secondary btn-sm" style="width: 100%;">
              Unlock Advanced Filters
            </router-link>
          </div>
        </div>
      </aside>

      <!-- Main Results Column -->
      <div class="results-column">
        <div v-if="isPreviewCatalog" class="alert alert-info" role="status">
          Free API preview · showing public, no-key listings locally until the directory backend is connected.
        </div>
        <!-- Explicitly Separated Sponsored Strip -->
        <div v-if="sponsored.length > 0 && pagination.page === 1" class="sponsored-strip">
          <div class="flex-between" style="margin-bottom: 0.65rem;">
            <span class="badge badge-sponsored">Sponsored Listings</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">
              Shown separately from organic results
            </span>
          </div>
          <div class="grid-2">
            <ApiCard
              v-for="item in sponsored"
              :key="`exp-spon-${item.campaign_id}-${item.id}`"
              :api="item"
              placement="explore"
            />
          </div>
        </div>

        <!-- Organic Results Header -->
        <div class="flex-between" style="margin-bottom: 1rem;">
          <span style="font-size: 0.88rem; color: var(--text-muted);">
            Showing <strong>{{ apis.length }}</strong> of <strong>{{ pagination.total }}</strong> organic API results
            <template v-if="filters.q"> for "<strong>{{ filters.q }}</strong>"</template>
          </span>
        </div>

        <div v-if="loading" class="card">Searching API directory...</div>

        <div v-else-if="apis.length === 0" class="empty-state">
          <h3>No matching APIs found</h3>
          <p>Try broadening your search terms or clearing active filters.</p>
          <button type="button" class="btn btn-secondary" @click="resetFilters">
            Clear Filters
          </button>
        </div>

        <div v-else class="grid-2">
          <ApiCard v-for="api in apis" :key="api.id" :api="api" placement="explore_organic" />
        </div>

        <!-- Pagination -->
        <div v-if="pagination.total_pages > 1" class="pagination-bar">
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page <= 1"
            @click="changePage(pagination.page - 1)"
          >
            ← Previous
          </button>
          <span class="page-indicator">
            Page {{ pagination.page }} of {{ pagination.total_pages }}
          </span>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            :disabled="pagination.page >= pagination.total_pages"
            @click="changePage(pagination.page + 1)"
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import ApiCard from '../../components/ApiCard.vue';
import { FREE_API_CATALOG, FREE_API_CATEGORIES, FREE_API_TAGS, searchFreeApis } from '../../data/freeApiCatalog';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const categories = ref(FREE_API_CATEGORIES);
const tags = ref(FREE_API_TAGS);
const apis = ref(FREE_API_CATALOG);
const sponsored = ref([]);
const loading = ref(false);
const mobileFiltersOpen = ref(false);
const isPreviewCatalog = ref(true);
const backendHasCatalog = ref(false);
const hasLoadedOnce = ref(false);

const pagination = ref({ page: 1, limit: 12, total: FREE_API_CATALOG.length, total_pages: 1 });

const filters = reactive({
  q: '',
  category: '',
  pricing: '',
  auth_type: '',
  provider: '',
  tag: '',
  sort: 'relevant',
  verified_only: false,
  https_only: false,
  cors_only: false,
  has_openapi: false,
  page: 1
});

const activeFilterCount = computed(() => {
  let c = 0;
  if (filters.category) c++;
  if (filters.pricing) c++;
  if (filters.auth_type) c++;
  if (filters.provider) c++;
  if (filters.tag) c++;
  if (filters.verified_only) c++;
  if (filters.https_only) c++;
  if (filters.cors_only) c++;
  if (filters.has_openapi) c++;
  return c;
});

function syncFiltersFromRoute() {
  filters.q = String(route.query.q || '');
  filters.category = String(route.query.category || '');
  filters.pricing = String(route.query.pricing || '');
  filters.auth_type = String(route.query.auth_type || '');
  filters.provider = String(route.query.provider || '');
  filters.tag = String(route.query.tag || '');
  filters.sort = String(route.query.sort || (route.query.q ? 'relevant' : 'recent'));
  filters.verified_only = route.query.verified_only === 'true';
  filters.https_only = route.query.https_only === 'true';
  filters.cors_only = route.query.cors_only === 'true';
  filters.has_openapi = route.query.has_openapi === 'true';
  filters.page = Math.max(1, Number(route.query.page || 1));
}

function showLocalFreeApis() {
  isPreviewCatalog.value = true;
  const matches = searchFreeApis(filters);
  const pageSize = pagination.value.limit;
  const totalPages = Math.max(1, Math.ceil(matches.length / pageSize));
  pagination.value = {
    page: Math.min(filters.page, totalPages),
    limit: pageSize,
    total: matches.length,
    total_pages: totalPages
  };
  apis.value = matches.slice((pagination.value.page - 1) * pageSize, pagination.value.page * pageSize);
  sponsored.value = [];
}

async function fetchApis() {
  loading.value = !hasLoadedOnce.value;
  try {
    const params = {
      page: filters.page,
      limit: 12,
      sort: filters.sort
    };
    if (filters.q.trim()) params.q = filters.q.trim();
    if (filters.category) params.category = filters.category;
    if (filters.pricing) params.pricing = filters.pricing;
    if (filters.auth_type) params.auth_type = filters.auth_type;
    if (filters.provider.trim()) params.provider = filters.provider.trim();
    if (filters.tag) params.tag = filters.tag;
    if (authStore.isPremium) {
      if (filters.verified_only) params.verified_only = 'true';
      if (filters.https_only) params.https_only = 'true';
      if (filters.cors_only) params.cors_only = 'true';
      if (filters.has_openapi) params.has_openapi = 'true';
    }

    const { data } = await http.get('/apis/search', { params });
    const serverApis = data.apis || [];
    if (serverApis.length || Number(data.pagination?.total || 0) > 0) {
      backendHasCatalog.value = true;
      isPreviewCatalog.value = false;
      apis.value = serverApis;
      sponsored.value = data.sponsored || [];
      pagination.value = data.pagination || pagination.value;
    } else if (!backendHasCatalog.value) {
      showLocalFreeApis();
    } else {
      isPreviewCatalog.value = false;
      apis.value = serverApis;
      sponsored.value = data.sponsored || [];
      pagination.value = data.pagination || pagination.value;
    }
  } catch (_) {
    backendHasCatalog.value = false;
    showLocalFreeApis();
  } finally {
    hasLoadedOnce.value = true;
    loading.value = false;
  }
}

function pushQueryState() {
  const query = {};
  if (filters.q.trim()) query.q = filters.q.trim();
  if (filters.category) query.category = filters.category;
  if (filters.pricing) query.pricing = filters.pricing;
  if (filters.auth_type) query.auth_type = filters.auth_type;
  if (filters.provider.trim()) query.provider = filters.provider.trim();
  if (filters.tag) query.tag = filters.tag;
  if (filters.sort) query.sort = filters.sort;
  if (filters.verified_only) query.verified_only = 'true';
  if (filters.https_only) query.https_only = 'true';
  if (filters.cors_only) query.cors_only = 'true';
  if (filters.has_openapi) query.has_openapi = 'true';
  if (filters.page > 1) query.page = String(filters.page);

  router.push({ path: '/explore', query });
}

function applySearch() {
  filters.page = 1;
  mobileFiltersOpen.value = false;
  pushQueryState();
}

function toggleTag(slug) {
  filters.tag = filters.tag === slug ? '' : slug;
  applySearch();
}

function resetFilters() {
  filters.q = '';
  filters.category = '';
  filters.pricing = '';
  filters.auth_type = '';
  filters.provider = '';
  filters.tag = '';
  filters.sort = 'recent';
  filters.verified_only = false;
  filters.https_only = false;
  filters.cors_only = false;
  filters.has_openapi = false;
  filters.page = 1;
  pushQueryState();
}

function changePage(nextPage) {
  filters.page = nextPage;
  pushQueryState();
}

watch(
  () => route.query,
  () => {
    syncFiltersFromRoute();
    fetchApis();
  }
);

onMounted(async () => {
  syncFiltersFromRoute();
  const [catResult, tagResult] = await Promise.allSettled([
    http.get('/categories'),
    http.get('/tags')
  ]);
  if (catResult.status === 'fulfilled') {
    const serverCategories = catResult.value.data.categories || [];
    if (serverCategories.length) {
      categories.value = serverCategories;
      backendHasCatalog.value = serverCategories.some((category) => Number(category.api_count || 0) > 0);
    }
  }
  if (tagResult.status === 'fulfilled' && tagResult.value.data.tags?.length) {
    tags.value = tagResult.value.data.tags;
  }
  await fetchApis();
});
</script>

<style scoped>
.explore-search-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.explore-q {
  flex: 1;
}

.explore-sort {
  width: 225px;
}

.mobile-filter-btn {
  display: none;
}

.explore-layout {
  display: grid;
  grid-template-columns: 280px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.38rem;
}

.tag-btn {
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 0.74rem;
  padding: 0.22rem 0.55rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
}

.tag-btn.active,
.tag-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
  background: var(--accent-soft);
}

.advanced-box {
  margin-top: 1.15rem;
  padding-top: 1.15rem;
  border-top: 1px solid var(--border-subtle);
}

.check-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.pro-upsell-mini p {
  font-size: 0.79rem;
  color: var(--text-muted);
  margin-bottom: 0.6rem;
}

.sponsored-strip {
  margin-bottom: 1.75rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-subtle);
}

.pagination-bar {
  margin-top: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.page-indicator {
  font-size: 0.88rem;
  color: var(--text-secondary);
  font-weight: 600;
}

@media (max-width: 960px) {
  .explore-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .filter-sidebar {
    display: none;
  }

  .filter-sidebar.open {
    display: block;
  }

  .mobile-filter-btn {
    display: inline-flex;
  }

  .explore-search-bar {
    flex-wrap: wrap;
  }

  .explore-q {
    width: 100%;
    flex: auto;
  }

  .explore-sort {
    flex: 1;
  }
}
</style>
