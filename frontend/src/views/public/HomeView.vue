<template>
  <div class="editorial-home">
    <!-- 1. MONOCHROME EDITORIAL HERO + GRAPHITE MIST WAVE + 3D STUDIO DEVICE -->
    <section class="hero-editorial">
      <div class="container hero-copy-wrap">
        <p class="hero-eyebrow serif-italic">Every Endpoint, in Perfect Rhythm.</p>

        <h1 class="hero-display">
          Discover APIs,<br />
          Build Smarter
        </h1>

        <p class="hero-lead">
          Take control of your integrations with our all-in-one API directory. Inspect verified
          specs, compare pricing, and focus on shipping—without the overwhelm.
        </p>

        <div class="hero-cta-group">
          <router-link to="/explore" class="btn-editorial-pill">
            <span>EXPLORE DIRECTORY</span>
            <AppIcon name="arrow-right" :size="13" />
          </router-link>
        </div>

        <!-- Minimal Inline Pill Search -->
        <form class="hero-pill-search" @submit.prevent="runHeroSearch">
          <AppIcon name="search" :size="15" class="pill-search-icon" />
          <input
            v-model="heroQuery"
            type="search"
            class="pill-search-input"
            placeholder="Search APIs, OAuth 2.0, payments, weather, SMS..."
            aria-label="Search APIs"
          />
          <select v-model="heroPricing" class="pill-search-select" aria-label="Pricing filter">
            <option value="">All pricing</option>
            <option value="free">Free</option>
            <option value="free_or_freemium">Free &amp; Freemium</option>
            <option value="paid">Paid</option>
          </select>
          <button type="submit" class="pill-search-submit">Search</button>
        </form>
      </div>

      <!-- Full-Bleed Monochrome Silver-Smoke Wave + Tilted 3D Device -->
      <div class="hero-stage">
        <div class="aurora-ribbon" aria-hidden="true">
          <span class="aurora-layer mist-upper"></span>
          <span class="aurora-layer mist-core"></span>
          <span class="aurora-layer mist-lower"></span>
        </div>

        <div class="device-showcase-wrap">
          <div class="device-3d-frame">
            <!-- Brushed Monochrome Platinum Side Edge & Hardware Buttons -->
            <span class="device-rail-btn btn-vol-up" aria-hidden="true"></span>
            <span class="device-rail-btn btn-vol-dn" aria-hidden="true"></span>
            <span class="device-rail-btn btn-power" aria-hidden="true"></span>

            <div class="device-bezel">
              <div class="device-screen">
                <!-- Sculptural Monochrome Liquid-Mercury & Obsidian Glass Artwork -->
                <div class="screen-fluid-art" aria-hidden="true">
                  <span class="orb orb-white"></span>
                  <span class="orb orb-silver"></span>
                  <span class="orb orb-graphite"></span>
                  <span class="orb orb-obsidian"></span>
                </div>

                <!-- Dynamic Island & Status Row -->
                <div class="screen-top-bar" aria-hidden="true">
                  <span class="screen-time">9:41</span>
                  <span class="dynamic-island"></span>
                  <span class="screen-dots">5G</span>
                </div>

                <!-- Frosted Monochrome Live API Locate Widgets Inside Device -->
                <div class="screen-ui-content">
                  <div class="screen-glass-chip">
                    <AppIcon name="brand-arrows" :size="12" />
                    <span>API Locate · {{ stats.approved_apis || 24 }} Verified Specs</span>
                  </div>

                  <div class="screen-cards-stack">
                    <router-link
                      v-for="item in devicePreviewApis"
                      :key="`dev-${item.id}`"
                      :to="`/apis/${item.slug}`"
                      class="screen-api-pill"
                    >
                      <div class="screen-api-top">
                        <strong>{{ item.name }}</strong>
                        <span class="screen-status">200 OK</span>
                      </div>
                      <div class="screen-api-meta mono">
                        {{ AUTH_LABELS[item.auth_type] || item.auth_type }} · {{ PRICING_LABELS[item.pricing_model] || item.pricing_model }}
                      </div>
                    </router-link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Soft Atmospheric Bottom Dissolve into Canvas -->
          <div class="stage-bottom-fade" aria-hidden="true"></div>
        </div>
      </div>
    </section>

    <!-- 2. EDITORIAL ASYMMETRIC STATEMENT + 3-COLUMN FEATURE ROW -->
    <section class="editorial-statement-section">
      <div class="container">
        <div class="statement-split">
          <h2 class="statement-heading">
            Designed to<br />
            Help You Ship<br />
            More <span class="serif-italic statement-serif">With Less<br />Guesswork</span>
          </h2>

          <p class="statement-aside">
            API Locate is built for modern developers and engineering teams who want verified
            documentation, clear pricing, and organized stacks—focused and in control.
          </p>
        </div>

        <div class="editorial-pillars">
          <div class="editorial-pillar">
            <h3>Smart Spec Discovery</h3>
            <p>
              Search, filter, and rank {{ stats.approved_apis || 24 }} moderated APIs by auth header,
              pricing model, or CORS support with an interface that adapts to your workflow.
            </p>
          </div>

          <div class="editorial-pillar">
            <h3>Collections &amp; Side-by-Side Diff</h3>
            <p>
              Stay ahead of architecture decisions with project collections and a 4-way comparison
              table that evaluates auth, rate limits, and endpoints before you commit.
            </p>
          </div>

          <div class="editorial-pillar">
            <h3>Moderated Clarity</h3>
            <p>
              Eliminate dead documentation links with verified provider profiles, clear provenance
              tags, and disclosed partner placements that never alter organic search—fast.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. LIVE DIRECTORY SHOWCASE -->
    <section class="showcase-directory-section">
      <div class="container">
        <div class="showcase-header">
          <div>
            <span class="eyebrow">Curated Specifications</span>
            <h2 class="showcase-title">Explore the Registry</h2>
          </div>

          <div class="showcase-controls">
            <div class="editorial-tabs" role="tablist" aria-label="API Feed">
              <button
                type="button"
                class="ed-tab"
                :class="{ active: activeFeed === 'featured' }"
                @click="activeFeed = 'featured'"
              >
                Featured
              </button>
              <button
                type="button"
                class="ed-tab"
                :class="{ active: activeFeed === 'recent' }"
                @click="activeFeed = 'recent'"
              >
                Newest
              </button>
              <button
                type="button"
                class="ed-tab"
                :class="{ active: activeFeed === 'free' }"
                @click="activeFeed = 'free'"
              >
                Free &amp; Freemium
              </button>
            </div>

            <router-link to="/explore" class="btn-editorial-pill pill-compact">
              <span>VIEW ALL APIS</span>
              <AppIcon name="arrow-right" :size="12" />
            </router-link>
          </div>
        </div>

        <!-- Category Quick-Pills -->
        <div v-if="categories.length > 0" class="category-pills-bar">
          <router-link
            v-for="cat in categories.slice(0, 8)"
            :key="cat.id"
            :to="`/explore?category=${cat.slug}`"
            class="domain-pill"
          >
            <span>{{ cat.name }}</span>
            <span class="domain-pill-num mono">{{ cat.api_count }}</span>
          </router-link>
          <router-link to="/categories" class="domain-pill domain-pill-all">
            All {{ categories.length }} categories →
          </router-link>
        </div>

        <div v-if="loading" class="card">Loading specifications...</div>
        <div v-else class="grid-3">
          <ApiCard
            v-for="api in visibleFeedApis"
            :key="`${activeFeed}-${api.id}`"
            :api="api"
            :placement="`homepage_${activeFeed}`"
          />
        </div>
      </div>
    </section>

    <!-- 4. PARTNER SHOWCASE (Explicitly Labeled Sponsored Slots) -->
    <section v-if="sponsoredApis.length > 0" class="partner-section">
      <div class="container">
        <div class="flex-between" style="margin-bottom: 1.25rem; flex-wrap: wrap;">
          <div class="flex-row">
            <span class="badge badge-sponsored">Sponsored</span>
            <span class="partner-note">
              Partner placements · Never alters organic search relevance
            </span>
          </div>
          <router-link to="/provider/promote" class="partner-cta-link">
            Promote your API →
          </router-link>
        </div>

        <div class="grid-3">
          <ApiCard
            v-for="api in sponsoredApis"
            :key="`spon-${api.campaign_id}-${api.id}`"
            :api="api"
            placement="homepage"
          />
        </div>
      </div>
    </section>

    <!-- 5. EDITORIAL CALLOUT BEFORE MONOCHROME MIST FOOTER -->
    <section class="closing-cta-section">
      <div class="container">
        <div class="closing-cta-box">
          <p class="eyebrow">Ready when your team is.</p>
          <h2 class="closing-headline">
            Organize every integration <span class="serif-italic">in one calm place.</span>
          </h2>
          <p class="closing-sub">
            Start free with instant search and bookmarks, submit community APIs, or upgrade to
            Workspace Pro for unlimited collections and 4-way spec comparisons.
          </p>
          <div class="closing-btns">
            <router-link
              :to="authStore.isAuthenticated ? '/dashboard' : '/register'"
              class="btn-editorial-pill"
            >
              <span>{{ authStore.isAuthenticated ? 'OPEN WORKSPACE' : 'TRY IT FOR FREE' }}</span>
              <AppIcon name="arrow-right" :size="13" />
            </router-link>
            <router-link to="/submit-api" class="closing-secondary-link">
              Submit an API →
            </router-link>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import http from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import ApiCard from '../../components/ApiCard.vue';
import AppIcon from '../../components/AppIcon.vue';
import { AUTH_LABELS, PRICING_LABELS } from '../../utils/formatters';

const router = useRouter();
const authStore = useAuthStore();

const heroQuery = ref('');
const heroPricing = ref('');
const loading = ref(true);
const activeFeed = ref('featured');

const stats = ref({});
const categories = ref([]);
const featuredApis = ref([]);
const recentApis = ref([]);
const sponsoredApis = ref([]);

const devicePreviewApis = computed(() => {
  const source = featuredApis.value.length > 0 ? featuredApis.value : recentApis.value;
  if (source.length > 0) return source.slice(0, 3);
  return [
    { id: 1, name: 'Stripe Payments', slug: 'stripe-payments', auth_type: 'bearer', pricing_model: 'paid' },
    { id: 2, name: 'Open-Meteo Forecast', slug: 'open-meteo', auth_type: 'none', pricing_model: 'free' },
    { id: 3, name: 'GitHub REST API', slug: 'github-rest-api', auth_type: 'oauth2', pricing_model: 'freemium' }
  ];
});

const visibleFeedApis = computed(() => {
  if (activeFeed.value === 'recent') {
    return recentApis.value;
  }
  if (activeFeed.value === 'free') {
    const merged = [...featuredApis.value, ...recentApis.value];
    const seen = new Set();
    const out = [];
    for (const item of merged) {
      if (!seen.has(item.id) && (item.pricing_model === 'free' || item.pricing_model === 'freemium')) {
        seen.add(item.id);
        out.push(item);
      }
    }
    return out.length > 0 ? out.slice(0, 6) : featuredApis.value;
  }
  return featuredApis.value;
});

function runHeroSearch() {
  const query = {};
  if (heroQuery.value.trim()) query.q = heroQuery.value.trim();
  if (heroPricing.value) query.pricing = heroPricing.value;
  router.push({ path: '/explore', query });
}

onMounted(async () => {
  try {
    const { data } = await http.get('/apis/homepage');
    stats.value = data.stats || {};
    categories.value = data.categories || [];
    featuredApis.value = data.featured_apis || [];
    recentApis.value = data.recent_apis || [];
    sponsoredApis.value = data.sponsored_apis || [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
/* 1. MONOCHROME EDITORIAL HERO */
.hero-editorial {
  position: relative;
  padding-top: 3.6rem;
  overflow: hidden;
}

.hero-copy-wrap {
  position: relative;
  z-index: 3;
  text-align: center;
  max-width: 720px;
  margin: 0 auto;
}

.hero-eyebrow {
  font-size: clamp(1.28rem, 2.2vw, 1.55rem);
  color: var(--text-primary);
  margin: 0 0 0.55rem;
}

.hero-display {
  font-family: var(--font-sans);
  font-size: clamp(2.85rem, 6vw, 4.55rem);
  font-weight: 700;
  line-height: 1.03;
  letter-spacing: -0.044em;
  color: var(--text-primary);
  margin: 0 auto 1.2rem;
}

.hero-lead {
  max-width: 520px;
  margin: 0 auto 1.65rem;
  font-size: 0.94rem;
  line-height: 1.62;
  color: var(--text-secondary);
}

.hero-cta-group {
  display: flex;
  justify-content: center;
  margin-bottom: 1.35rem;
}

.hero-pill-search {
  display: flex;
  align-items: center;
  max-width: 540px;
  margin: 0 auto;
  padding: 0.28rem 0.32rem 0.28rem 0.95rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-strong);
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(12px);
  box-shadow: 0 8px 28px -10px rgba(0, 0, 0, 0.1);
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

[data-theme="dark"] .hero-pill-search {
  background: rgba(18, 18, 18, 0.9);
}

.hero-pill-search:focus-within {
  border-color: var(--text-primary);
  box-shadow: 0 12px 32px -10px rgba(0, 0, 0, 0.16);
}

.pill-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.pill-search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.84rem;
  padding: 0.45rem 0.55rem;
}

.pill-search-input:focus {
  outline: none;
}

.pill-search-select {
  border: none;
  border-left: 1px solid var(--border-subtle);
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  padding: 0.35rem 0.6rem;
  cursor: pointer;
}

.pill-search-select:focus {
  outline: none;
}

.pill-search-submit {
  height: 34px;
  padding: 0 1rem;
  border-radius: var(--radius-pill);
  border: none;
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
}

/* FULL-BLEED MONOCHROME SILVER-SMOKE STUDIO WAVE */
.hero-stage {
  position: relative;
  margin-top: 1.5rem;
  padding: 2.2rem 0 2.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
}

.aurora-ribbon {
  position: absolute;
  inset: -10px -14vw 10px -14vw;
  transform: rotate(-7deg);
  pointer-events: none;
  z-index: 1;
}

.aurora-layer {
  position: absolute;
  border-radius: 50%;
  filter: blur(48px);
}

.mist-upper {
  top: 8%;
  left: 6%;
  right: 4%;
  height: 44%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.09) 52%, rgba(0, 0, 0, 0.05) 100%);
}

.mist-core {
  top: 28%;
  left: 2%;
  right: 6%;
  height: 48%;
  background: linear-gradient(92deg, rgba(0, 0, 0, 0.09) 0%, rgba(0, 0, 0, 0.16) 48%, rgba(0, 0, 0, 0.09) 100%);
}

.mist-lower {
  top: 54%;
  left: 10%;
  right: 10%;
  height: 36%;
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 0%, rgba(0, 0, 0, 0.06) 100%);
}

[data-theme="dark"] .mist-upper,
[data-theme="dark"] .mist-lower {
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.08) 52%, rgba(255, 255, 255, 0.04) 100%);
}

[data-theme="dark"] .mist-core {
  background: linear-gradient(92deg, rgba(255, 255, 255, 0.07) 0%, rgba(255, 255, 255, 0.14) 48%, rgba(255, 255, 255, 0.07) 100%);
}

/* FLOATING 3D BRUSHED-SILVER & OBSIDIAN STUDIO DEVICE */
.device-showcase-wrap {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 0.5rem 1rem 1.5rem;
}

.device-3d-frame {
  position: relative;
  width: 286px;
  height: 556px;
  border-radius: 48px;
  padding: 5px;
  background: linear-gradient(
    135deg,
    #ffffff 0%,
    #d4d4d4 24%,
    #666666 52%,
    #e6e6e6 78%,
    #999999 100%
  );
  box-shadow:
    14px 18px 0 -2px rgba(140, 140, 140, 0.42),
    24px 38px 68px -12px rgba(0, 0, 0, 0.36),
    0 8px 24px rgba(0, 0, 0, 0.12);
  transform: perspective(1250px) rotateY(-15deg) rotateX(7deg) rotateZ(9deg);
  transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1);
}

.device-3d-frame:hover {
  transform: perspective(1250px) rotateY(-9deg) rotateX(4deg) rotateZ(6deg) translateY(-4px);
}

.device-rail-btn {
  position: absolute;
  background: linear-gradient(180deg, #e5e5e5, #666666);
  border-radius: 3px;
}

.btn-vol-up {
  left: -3px;
  top: 118px;
  width: 3px;
  height: 36px;
}

.btn-vol-dn {
  left: -3px;
  top: 164px;
  width: 3px;
  height: 36px;
}

.btn-power {
  right: -7px;
  top: 142px;
  width: 4px;
  height: 54px;
}

.device-bezel {
  width: 100%;
  height: 100%;
  border-radius: 43px;
  padding: 9px;
  background: #050505;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.16);
}

.device-screen {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 35px;
  overflow: hidden;
  background: #0b0b0b;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0.75rem 0.9rem 1.15rem;
}

/* Monochrome Liquid-Mercury & Obsidian Glass Spheres */
.screen-fluid-art {
  position: absolute;
  inset: 0;
  background: linear-gradient(165deg, #2a2a2a 0%, #080808 50%, #dcdcdc 100%);
  pointer-events: none;
}

.orb {
  position: absolute;
  border-radius: 50%;
}

.orb-white {
  width: 220px;
  height: 220px;
  top: -45px;
  left: -35px;
  background: radial-gradient(circle at 40% 40%, #ffffff 0%, #9e9e9e 52%, transparent 74%);
  filter: blur(10px);
}

.orb-silver {
  width: 240px;
  height: 240px;
  top: 45px;
  right: -55px;
  background: radial-gradient(circle at 50% 45%, #d9d9d9 0%, #3a3a3a 62%, transparent 78%);
  filter: blur(8px);
}

.orb-graphite {
  width: 210px;
  height: 210px;
  top: 185px;
  right: -30px;
  background: radial-gradient(circle at 45% 45%, #f0f0f0 0%, #525252 58%, transparent 76%);
  filter: blur(12px);
}

.orb-obsidian {
  width: 235px;
  height: 235px;
  bottom: -45px;
  left: -25px;
  background: radial-gradient(circle at 32% 28%, #f5f5f5 0%, #4a4a4a 42%, #050505 85%);
  box-shadow: 0 -6px 24px rgba(255, 255, 255, 0.42);
}

.screen-top-bar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.1rem 0.35rem;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 700;
}

.dynamic-island {
  width: 76px;
  height: 21px;
  border-radius: 9999px;
  background: #000000;
}

.screen-dots {
  font-size: 0.62rem;
  opacity: 0.9;
}

.screen-ui-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: auto;
}

.screen-glass-chip {
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.28rem 0.65rem;
  border-radius: var(--radius-pill);
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(14px);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #ffffff;
  font-size: 0.67rem;
  font-weight: 600;
}

.screen-cards-stack {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.screen-api-pill {
  display: block;
  padding: 0.58rem 0.72rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.75);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.22);
  color: #000000;
  text-decoration: none;
  transition: transform 0.16s ease, background-color 0.16s ease;
}

.screen-api-pill:hover {
  transform: translateX(3px);
  background: #ffffff;
  color: #000000;
}

.screen-api-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.4rem;
  font-size: 0.74rem;
}

.screen-api-top strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.screen-status {
  font-family: var(--font-mono);
  font-size: 0.58rem;
  font-weight: 700;
  color: #ffffff;
  background: #000000;
  padding: 0.08rem 0.4rem;
  border-radius: var(--radius-pill);
  flex-shrink: 0;
}

.screen-api-meta {
  font-size: 0.63rem;
  color: #4a4a4a;
  margin-top: 0.12rem;
}

.stage-bottom-fade {
  position: absolute;
  left: -20vw;
  right: -20vw;
  bottom: -14px;
  height: 92px;
  background: linear-gradient(to top, var(--bg-canvas) 18%, transparent 100%);
  pointer-events: none;
  z-index: 3;
}

/* 2. EDITORIAL ASYMMETRIC STATEMENT + 3-COLUMN PILLARS */
.editorial-statement-section {
  padding: 4.5rem 0 4.25rem;
}

.statement-split {
  display: grid;
  grid-template-columns: 1.25fr 0.95fr;
  gap: 2.5rem;
  align-items: end;
  margin-bottom: 4.25rem;
}

.statement-heading {
  font-size: clamp(2.35rem, 4.7vw, 3.65rem);
  font-weight: 700;
  line-height: 1.05;
  letter-spacing: -0.04em;
  margin: 0;
  color: var(--text-primary);
}

.statement-serif {
  font-size: 1.07em;
  font-weight: 400;
  line-height: 1.02;
}

.statement-aside {
  font-size: clamp(1.02rem, 1.45vw, 1.18rem);
  line-height: 1.52;
  color: var(--text-primary);
  font-weight: 500;
  max-width: 390px;
  margin: 0 0 0.35rem;
}

.editorial-pillars {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 2.5rem;
  padding-top: 2.25rem;
  border-top: 1px solid var(--border-subtle);
}

.editorial-pillar h3 {
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin: 0 0 0.55rem;
  color: var(--text-primary);
}

.editorial-pillar p {
  font-size: 0.84rem;
  line-height: 1.62;
  color: var(--text-secondary);
  margin: 0;
}

/* 3. LIVE DIRECTORY SHOWCASE */
.showcase-directory-section {
  padding: 2.5rem 0 3.5rem;
}

.showcase-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin-bottom: 1.35rem;
}

.showcase-title {
  font-size: clamp(1.65rem, 2.8vw, 2.15rem);
  margin: 0.15rem 0 0;
}

.showcase-controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.editorial-tabs {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: var(--radius-pill);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
}

.ed-tab {
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.95rem;
  border-radius: var(--radius-pill);
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.ed-tab:hover {
  color: var(--text-primary);
}

.ed-tab.active {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
}

.pill-compact {
  height: 36px;
  padding: 0 1.15rem;
  font-size: 0.67rem;
}

.category-pills-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.48rem;
  margin-bottom: 1.65rem;
}

.domain-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
  height: 32px;
  padding: 0 0.85rem;
  border-radius: var(--radius-pill);
  border: 1px solid var(--border-subtle);
  background: var(--bg-surface);
  color: var(--text-secondary);
  font-size: 0.8rem;
  font-weight: 500;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.domain-pill:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.domain-pill-num {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.domain-pill-all {
  color: var(--text-primary);
  font-weight: 600;
}

/* 4. PARTNER SECTION */
.partner-section {
  padding: 0.5rem 0 3.25rem;
}

.partner-note {
  font-size: 0.78rem;
  color: var(--text-muted);
}

.partner-cta-link {
  font-size: 0.83rem;
  font-weight: 600;
  color: var(--text-primary);
}

.partner-cta-link:hover {
  text-decoration: underline;
}

/* 5. CLOSING EDITORIAL CTA */
.closing-cta-section {
  padding: 2.5rem 0 2.5rem;
}

.closing-cta-box {
  text-align: center;
  max-width: 640px;
  margin: 0 auto;
  padding: 2.75rem 1.5rem 1.5rem;
  border-top: 1px solid var(--border-subtle);
}

.closing-headline {
  font-size: clamp(1.95rem, 3.6vw, 2.75rem);
  line-height: 1.1;
  margin: 0.35rem 0 0.85rem;
}

.closing-headline .serif-italic {
  font-size: 1.08em;
}

.closing-sub {
  font-size: 0.92rem;
  max-width: 500px;
  margin: 0 auto 1.6rem;
}

.closing-btns {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 1.25rem;
}

.closing-secondary-link {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.closing-secondary-link:hover {
  text-decoration: underline;
}

@media (max-width: 900px) {
  .statement-split {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.35rem;
    margin-bottom: 2.75rem;
  }

  .editorial-pillars {
    grid-template-columns: minmax(0, 1fr);
    gap: 1.65rem;
  }
}

@media (max-width: 680px) {
  .hero-editorial {
    padding-top: 2.25rem;
  }

  .hero-pill-search {
    flex-wrap: wrap;
    border-radius: var(--radius-md);
    padding: 0.5rem;
    gap: 0.4rem;
  }

  .pill-search-select {
    border-left: none;
    border-top: 1px solid var(--border-subtle);
    width: 100%;
    padding: 0.45rem 0.25rem;
  }

  .pill-search-submit {
    width: 100%;
  }

  .device-3d-frame {
    width: 248px;
    height: 486px;
    transform: perspective(1100px) rotateY(-10deg) rotateX(5deg) rotateZ(6deg);
  }
}
</style>
