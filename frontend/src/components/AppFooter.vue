<template>
  <footer class="footer">
    <!-- Pure Monochrome Silver-Smoke Atmospheric Bottom Wash -->
    <div class="footer-aurora" aria-hidden="true"></div>

    <div class="container footer-inner">
      <div class="footer-grid">
        <div class="footer-brand-col">
          <router-link to="/" class="footer-logo">
            <AppIcon name="brand-arrows" :size="17" />
            <span>API Locate</span>
          </router-link>
          <p class="footer-tagline serif-italic">
            Discover APIs. Organize Resources. Build More.
          </p>
          <p class="footer-desc">
            A calm, moderated workspace for inspecting developer APIs, authentication models, and side-by-side endpoint specs.
          </p>
        </div>

        <div>
          <h4>Directory</h4>
          <ul class="footer-list">
            <li><router-link to="/explore">Browse APIs</router-link></li>
            <li><router-link to="/categories">Categories</router-link></li>
            <li><router-link to="/pricing">Plans &amp; Pricing</router-link></li>
            <li><router-link to="/submit-api">Submit an API</router-link></li>
          </ul>
        </div>

        <div>
          <h4>Workspace</h4>
          <ul class="footer-list">
            <li><router-link to="/dashboard/favorites">Saved APIs</router-link></li>
            <li><router-link to="/dashboard/collections">Collections</router-link></li>
            <li><router-link to="/dashboard/compare">Side-by-Side Compare</router-link></li>
            <li><router-link to="/provider/dashboard">Provider Portal</router-link></li>
          </ul>
        </div>

        <div>
          <h4>Platform</h4>
          <ul class="footer-list">
            <li><router-link to="/about">Moderation &amp; Sources</router-link></li>
            <li><router-link to="/provider/promote">Sponsored Listings</router-link></li>
            <li><router-link to="/contact">Contact</router-link></li>
            <li><router-link to="/login">Sign in</router-link></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>© {{ new Date().getFullYear() }} API Locate. Sponsored placements are clearly labeled and never alter organic ranking.</span>

        <div class="footer-theme-pill" role="group" aria-label="Theme selector">
          <button
            type="button"
            :class="{ active: themeStore.mode === 'system' }"
            title="System theme"
            @click="themeStore.setTheme('system')"
          >
            <AppIcon name="monitor" :size="13" />
          </button>
          <button
            type="button"
            :class="{ active: themeStore.mode === 'light' }"
            title="Light theme"
            @click="themeStore.setTheme('light')"
          >
            <AppIcon name="sun" :size="13" />
          </button>
          <button
            type="button"
            :class="{ active: themeStore.mode === 'dark' }"
            title="Dark theme"
            @click="themeStore.setTheme('dark')"
          >
            <AppIcon name="moon" :size="13" />
          </button>
        </div>
      </div>
    </div>
  </footer>
</template>

<script setup>
import { useThemeStore } from '../stores/themeStore';
import AppIcon from './AppIcon.vue';

const themeStore = useThemeStore();
</script>

<style scoped>
.footer {
  position: relative;
  overflow: hidden;
  background: var(--bg-canvas);
  padding: 4rem 0 2.25rem;
}

.footer-aurora {
  position: absolute;
  left: -10%;
  right: -10%;
  bottom: -55%;
  height: 320px;
  background:
    radial-gradient(ellipse 52% 75% at 24% 86%, rgba(0, 0, 0, 0.10), transparent 72%),
    radial-gradient(ellipse 52% 75% at 76% 88%, rgba(0, 0, 0, 0.07), transparent 72%),
    radial-gradient(ellipse 45% 60% at 50% 95%, rgba(0, 0, 0, 0.06), transparent 70%);
  filter: blur(44px);
  pointer-events: none;
  z-index: 0;
}

[data-theme="dark"] .footer-aurora {
  background:
    radial-gradient(ellipse 52% 75% at 24% 86%, rgba(255, 255, 255, 0.08), transparent 72%),
    radial-gradient(ellipse 52% 75% at 76% 88%, rgba(255, 255, 255, 0.06), transparent 72%);
}

.footer-inner {
  position: relative;
  z-index: 1;
}

.footer-grid {
  display: grid;
  grid-template-columns: 1.75fr 1fr 1fr 1fr;
  gap: 2.25rem;
}

.footer-logo {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-weight: 700;
  font-size: 1.02rem;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: 0.45rem;
}

.footer-tagline {
  font-size: 1.12rem;
  color: var(--text-primary);
  margin: 0 0 0.45rem;
}

.footer-desc {
  font-size: 0.83rem;
  color: var(--text-secondary);
  max-width: 310px;
  margin: 0;
}

.footer h4 {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 0.8rem;
}

.footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.48rem;
}

.footer-list a {
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.footer-list a:hover {
  color: var(--text-primary);
}

.footer-bottom {
  margin-top: 2.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  font-size: 0.78rem;
  color: var(--text-secondary);
}

[data-theme="dark"] .footer-bottom {
  border-top-color: var(--border-subtle);
}

.footer-theme-pill {
  display: inline-flex;
  align-items: center;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-pill);
  padding: 2px;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(8px);
}

[data-theme="dark"] .footer-theme-pill {
  background: var(--bg-surface);
}

.footer-theme-pill button {
  width: 27px;
  height: 27px;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.footer-theme-pill button.active {
  background: var(--btn-primary-bg);
  color: var(--btn-primary-fg);
}

@media (max-width: 900px) {
  .footer-grid {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 560px) {
  .footer-grid {
    grid-template-columns: 1fr;
  }
}
</style>
