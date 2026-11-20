<template>
  <div class="container page-section">
    <div v-if="loading" class="card">Loading provider profile...</div>

    <div v-else-if="errorMsg" class="empty-state">
      <h2>Provider Not Found</h2>
      <p>{{ errorMsg }}</p>
      <router-link to="/explore" class="btn btn-primary">Explore Directory</router-link>
    </div>

    <template v-else-if="provider">
      <section class="card provider-header">
        <div class="provider-logo">
          <img
            v-if="provider.logo_url && !logoError"
            :src="provider.logo_url"
            :alt="provider.company_name"
            @error="logoError = true"
          />
          <span v-else>{{ getInitials(provider.company_name) }}</span>
        </div>

        <div style="flex: 1;">
          <div class="flex-row" style="margin-bottom: 0.35rem;">
            <span
              class="badge"
              :class="provider.verification_status === 'verified' ? 'badge-free' : 'badge-neutral'"
            >
              {{ provider.verification_status === 'verified' ? 'Verified Provider' : `Status: ${provider.verification_status}` }}
            </span>
            <span class="badge badge-neutral">
              {{ publishedApis.length }} Published {{ publishedApis.length === 1 ? 'API' : 'APIs' }}
            </span>
          </div>

          <h1 style="font-size: 1.6rem; margin-bottom: 0.35rem;">{{ provider.company_name }}</h1>
          <p v-if="provider.description" style="max-width: 740px; margin-bottom: 0.85rem; font-size: 0.9rem;">
            {{ provider.description }}
          </p>

          <div class="flex-row">
            <a
              v-if="provider.website_url"
              :href="provider.website_url"
              target="_blank"
              rel="noopener noreferrer"
              class="btn btn-secondary btn-sm"
            >
              Official website ↗
            </a>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              Registered {{ formatDate(provider.created_at) }}
            </span>
          </div>
        </div>
      </section>

      <h2 style="margin: 2rem 0 1rem; font-size: 1.2rem;">
        Published APIs
      </h2>

      <div v-if="publishedApis.length === 0" class="empty-state">
        <p>This provider does not have any approved public APIs yet.</p>
      </div>
      <div v-else class="grid-3">
        <ApiCard v-for="api in publishedApis" :key="api.id" :api="api" placement="provider_profile" />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import http, { extractErrorMessage } from '../../api/http';
import ApiCard from '../../components/ApiCard.vue';
import { formatDate, getInitials } from '../../utils/formatters';

const route = useRoute();
const provider = ref(null);
const publishedApis = ref([]);
const loading = ref(true);
const errorMsg = ref('');
const logoError = ref(false);

async function loadProvider() {
  loading.value = true;
  errorMsg.value = '';
  try {
    const { data } = await http.get(`/providers/${route.params.slug}`);
    provider.value = data.provider;
    publishedApis.value = data.published_apis || [];
  } catch (err) {
    errorMsg.value = extractErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

watch(() => route.params.slug, loadProvider);
onMounted(loadProvider);
</script>

<style scoped>
.provider-header {
  display: flex;
  align-items: flex-start;
  gap: 1.25rem;
}

.provider-logo {
  width: 60px;
  height: 60px;
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

.provider-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

@media (max-width: 640px) {
  .provider-header {
    flex-direction: column;
  }
}
</style>
