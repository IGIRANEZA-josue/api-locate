<template>
  <article
    class="card card-interactive api-card"
    :class="{ 'card-sponsored': api.is_sponsored }"
  >
    <div v-if="api.is_sponsored" class="sponsored-banner">
      <div class="flex-between">
        <span class="badge badge-sponsored">Sponsored</span>
        <span class="sponsored-pkg">{{ api.package_name || 'Partner' }}</span>
      </div>
      <span v-if="api.campaign_headline" class="sponsored-note">{{ api.campaign_headline }}</span>
    </div>

    <div class="api-card-top">
      <div class="api-identity">
        <div class="api-logo-box">
          <img
            v-if="logoIndex < logoCandidates.length"
            :src="logoCandidates[logoIndex]"
            :alt="`${api.provider_name || api.name} logo`"
            loading="lazy"
            referrerpolicy="no-referrer"
            @error="advanceLogo"
          />
          <span v-else class="api-initials">{{ getInitials(api.name) }}</span>
        </div>

        <div class="api-title-wrap">
          <div class="api-title-line">
            <h3 class="api-name">
              <router-link :to="`/apis/${api.slug}`" @click="recordSponsoredClick">
                <span>{{ api.name }}</span>
                <AppIcon name="arrow-up-right" :size="13" class="title-arrow" />
              </router-link>
            </h3>
          </div>

          <div class="api-provider-row">
            <router-link
              v-if="api.provider_slug"
              :to="`/providers/${api.provider_slug}`"
              class="provider-link"
            >
              {{ api.provider_name }}
            </router-link>
            <span v-else class="provider-plain">{{ api.provider_name }}</span>

            <template v-if="endpointHost">
              <span class="meta-dot">·</span>
              <span class="endpoint-host mono" :title="api.base_url || api.docs_url">{{ endpointHost }}</span>
            </template>

            <template v-if="api.verification_level === 'verified'">
              <span class="meta-dot">·</span>
              <span class="verify-chip verified" title="Reviewed specification">Verified</span>
            </template>
            <template v-else-if="api.verification_level === 'unverified' || api.verification_level === 'incomplete'">
              <span class="meta-dot">·</span>
              <span class="verify-chip unverified" title="Community or imported listing">Unverified</span>
            </template>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="fav-btn"
        :class="{ active: isFavorited }"
        :title="isFavorited ? 'Remove saved API' : 'Save API'"
        :aria-label="isFavorited ? 'Remove saved API' : 'Save API'"
        @click="onFavoriteClick"
      >
        <AppIcon :name="isFavorited ? 'bookmark-solid' : 'bookmark'" :size="14" />
      </button>
    </div>

    <p class="api-desc">{{ api.short_description }}</p>

    <div class="api-spec-pills">
      <router-link
        v-if="api.category_slug"
        :to="`/explore?category=${api.category_slug}`"
        class="spec-chip"
      >
        {{ api.category_name }}
      </router-link>
      <span v-else class="spec-chip">{{ api.category_name }}</span>

      <span class="badge" :class="formatPricingBadgeClass(api.pricing_model)">
        {{ PRICING_LABELS[api.pricing_model] || api.pricing_model }}
      </span>
      <span class="spec-chip mono">{{ AUTH_LABELS[api.auth_type] || api.auth_type }}</span>
      <span v-if="api.cors_supported === 'yes'" class="spec-chip mono" title="Browser CORS supported">CORS</span>
      <span v-if="api.is_seed_data" class="spec-chip mono muted" title="Sample seed entry">seed</span>
    </div>

    <div class="api-card-footer">
      <div class="rating-summary">
        <template v-if="Number(api.average_rating || 0) > 0">
          <span class="star-glyph" aria-hidden="true">★</span>
          <span class="rating-num">{{ Number(api.average_rating).toFixed(1) }}</span>
          <span v-if="api.reviews_count > 0" class="muted">({{ api.reviews_count }})</span>
        </template>
        <span v-else class="muted">No reviews</span>
      </div>

      <div class="card-cta-group">
        <button
          type="button"
          class="btn btn-ghost btn-sm"
          :class="{ 'compare-selected': workspace.isInCompare(api.id) }"
          @click="workspace.toggleCompare(api)"
        >
          {{ workspace.isInCompare(api.id) ? 'Comparing' : 'Compare' }}
        </button>
        <router-link
          :to="`/apis/${api.slug}`"
          class="btn btn-secondary btn-sm"
          @click="recordSponsoredClick"
        >
          {{ api.is_sponsored && api.cta_label ? api.cta_label : 'View spec' }}
        </router-link>
      </div>
    </div>
  </article>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import http from '../api/http';
import { useWorkspaceStore } from '../stores/workspaceStore';
import AppIcon from './AppIcon.vue';
import {
  AUTH_LABELS,
  PRICING_LABELS,
  formatPricingBadgeClass,
  getInitials
} from '../utils/formatters';

const props = defineProps({
  api: {
    type: Object,
    required: true
  },
  placement: {
    type: String,
    default: 'directory'
  }
});

const router = useRouter();
const workspace = useWorkspaceStore();
const logoIndex = ref(0);

function websiteOrigin(value) {
  if (!value) return '';
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
}

const logoCandidates = computed(() => {
  const explicit = [props.api.logo_url, props.api.provider_logo_url].filter(Boolean);
  const companyHost = websiteOrigin(
    props.api.provider_website_url || props.api.base_url || props.api.docs_url
  );
  if (companyHost) {
    explicit.push(`https://www.google.com/s2/favicons?domain=${encodeURIComponent(companyHost)}&sz=128`);
  }
  return [...new Set(explicit)];
});

function advanceLogo() {
  if (logoIndex.value < logoCandidates.value.length) logoIndex.value += 1;
}

watch(logoCandidates, () => { logoIndex.value = 0; });

const isFavorited = computed(
  () => workspace.favoriteIdSet.has(props.api.id) || Boolean(props.api.is_favorited)
);

const endpointHost = computed(() => {
  const raw = props.api.base_url || props.api.docs_url || '';
  if (!raw) return '';
  try {
    const u = new URL(raw);
    return u.host.replace(/^www\./, '');
  } catch (_) {
    return '';
  }
});

async function onFavoriteClick() {
  const res = await workspace.toggleFavorite(props.api);
  if (res?.requiresLogin) {
    router.push('/login');
  } else if (res && typeof res.favorited === 'boolean') {
    props.api.is_favorited = res.favorited;
  }
}

function recordSponsoredClick() {
  if (props.api.is_sponsored && props.api.campaign_id) {
    http
      .post(`/promotions/${props.api.campaign_id}/event`, {
        event_type: 'click',
        placement: props.placement
      })
      .catch(() => {});
  }
}

onMounted(() => {
  if (props.api.is_sponsored && props.api.campaign_id) {
    http
      .post(`/promotions/${props.api.campaign_id}/event`, {
        event_type: 'impression',
        placement: props.placement
      })
      .catch(() => {});
  }
});
</script>

<style scoped>
.api-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.8rem;
  height: 100%;
  padding: 1.15rem;
}

.sponsored-banner {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding-bottom: 0.6rem;
  border-bottom: 1px solid var(--border-subtle);
}

.sponsored-pkg {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--text-muted);
}

.sponsored-note {
  font-size: 0.77rem;
  color: var(--text-secondary);
}

.api-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.7rem;
}

.api-identity {
  display: flex;
  align-items: flex-start;
  gap: 0.72rem;
  min-width: 0;
}

.api-logo-box {
  width: 36px;
  height: 36px;
  border-radius: 7px;
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  margin-top: 1px;
}

.api-logo-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.api-initials {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 0.74rem;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.api-title-wrap {
  min-width: 0;
}

.api-name {
  font-size: 0.94rem;
  font-weight: 600;
  letter-spacing: -0.018em;
  margin: 0;
  line-height: 1.3;
}

.api-name a {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  color: var(--text-primary);
}

.title-arrow {
  opacity: 0;
  transform: translate(-2px, 2px);
  transition: opacity 0.14s ease, transform 0.14s ease;
  color: var(--text-muted);
}

.api-card:hover .title-arrow {
  opacity: 1;
  transform: translate(0, 0);
}

.api-provider-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.32rem;
  margin-top: 0.18rem;
  font-size: 0.75rem;
  line-height: 1.35;
}

.provider-link,
.provider-plain {
  color: var(--text-secondary);
}

.provider-link:hover {
  color: var(--text-primary);
  text-decoration: underline;
}

.meta-dot {
  color: var(--border-strong);
}

.endpoint-host {
  font-size: 0.71rem;
  color: var(--text-muted);
  max-width: 155px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.verify-chip {
  font-size: 0.71rem;
  font-weight: 500;
}

.verify-chip.verified {
  color: var(--success);
}

.verify-chip.unverified {
  color: var(--warning);
}

.fav-btn {
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.14s ease, border-color 0.14s ease, background-color 0.14s ease;
}

.fav-btn:hover {
  color: var(--text-primary);
  border-color: var(--border-strong);
  background: var(--bg-surface-alt);
}

.fav-btn.active {
  color: var(--text-primary);
  border-color: var(--text-primary);
  background: var(--bg-surface-alt);
}

.api-desc {
  font-size: 0.83rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.api-spec-pills {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.34rem;
}

.spec-chip {
  display: inline-flex;
  align-items: center;
  height: 21px;
  padding: 0 0.46rem;
  border-radius: 4px;
  border: 1px solid var(--border-subtle);
  background: var(--bg-canvas);
  color: var(--text-secondary);
  font-size: 0.71rem;
}

a.spec-chip:hover {
  border-color: var(--border-strong);
  color: var(--text-primary);
}

.api-card-footer {
  padding-top: 0.68rem;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.rating-summary {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  font-size: 0.75rem;
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}

.star-glyph {
  color: var(--text-primary);
  font-size: 0.76rem;
}

.rating-num {
  font-weight: 600;
  color: var(--text-primary);
}

.muted {
  color: var(--text-muted);
}

.card-cta-group {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.compare-selected {
  color: var(--text-primary);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-strong);
}
</style>
