<template>
  <div class="container page-section" style="max-width: 920px;">
    <UserSubnav />

    <div class="page-header">
      <div>
        <span class="badge badge-sponsored" style="margin-bottom: 0.35rem;">Sponsored Promotion</span>
        <h1 class="page-title">Promote Your API</h1>
        <p class="page-subtitle">
          Select an approved API you manage, choose a configurable advertising package, and launch a moderated campaign.
        </p>
      </div>
      <router-link to="/provider/campaigns" class="btn btn-secondary btn-sm">My Campaigns →</router-link>
    </div>

    <div v-if="eligibleApis.length === 0 && !loading" class="empty-state">
      <h3>No Approved Owned APIs Yet</h3>
      <p>
        You can only promote approved APIs that you own or manage. Submit an API first and wait for moderator approval!
      </p>
      <router-link to="/submit-api" class="btn btn-primary">Submit an API</router-link>
    </div>

    <form v-else class="card" @submit.prevent="submitCampaign">
      <div class="form-group">
        <label class="form-label">1. Select Approved API to Promote *</label>
        <select v-model="form.api_id" class="select" required>
          <option value="">Choose one of your approved APIs...</option>
          <option v-for="a in eligibleApis" :key="a.id" :value="a.id">
            {{ a.name }} ({{ a.category_name }})
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">2. Select Advertising Package *</label>
        <div class="grid-3">
          <label
            v-for="pkg in packages"
            :key="pkg.id"
            class="pkg-option"
            :class="{ selected: Number(form.package_id) === pkg.id }"
          >
            <input
              v-model="form.package_id"
              type="radio"
              :value="pkg.id"
              name="package_id"
              required
            />
            <div>
              <strong style="display: block; font-size: 1rem;">{{ pkg.name }}</strong>
              <span style="font-size: 1.2rem; font-weight: 600; color: var(--text-primary);">
                {{ formatCurrency(pkg.price, pkg.currency) }}
              </span>
              <span style="font-size: 0.8rem; color: var(--text-muted);"> / {{ pkg.duration_days }} days</span>
              <p style="font-size: 0.8rem; margin: 0.45rem 0 0;">{{ pkg.description }}</p>
            </div>
          </label>
        </div>
      </div>

      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Campaign Title *</label>
          <input
            v-model="form.title"
            type="text"
            class="input"
            required
            placeholder="e.g., Q4 Developer Sandbox Launch"
          />
        </div>
        <div class="form-group">
          <label class="form-label">Call-to-Action Button Label</label>
          <input
            v-model="form.cta_label"
            type="text"
            class="input"
            maxlength="40"
            placeholder="Explore API"
          />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Promotional Headline (Shown with Sponsored Badge)</label>
        <input
          v-model="form.headline"
          type="text"
          class="input"
          maxlength="220"
          placeholder="Concise developer value proposition (e.g., Free sandbox + 5-minute Node.js SDK setup)"
        />
      </div>

      <div class="alert alert-info">
        <strong>Workflow:</strong> After payment verification, your campaign enters the Administrator
        Moderation Queue. Once approved, it runs automatically for the package duration and tracks
        impressions and clicks in real time.
      </div>

      <div class="flex-row" style="justify-content: flex-end;">
        <button type="submit" class="btn btn-primary" :disabled="submitting">
          {{ submitting ? 'Creating Campaign...' : 'Continue to Payment & Submit for Review' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import { formatCurrency } from '../../utils/formatters';

const route = useRoute();
const router = useRouter();
const toast = useToastStore();

const loading = ref(true);
const submitting = ref(false);
const eligibleApis = ref([]);
const packages = ref([]);

const form = reactive({
  api_id: '',
  package_id: '',
  title: '',
  headline: '',
  cta_label: 'Explore API'
});

async function submitCampaign() {
  submitting.value = true;
  try {
    const { data } = await http.post('/promotions', form);
    if (data.campaign?.checkout_url) {
      window.location.href = data.campaign.checkout_url;
      return;
    }
    toast.info(data.message);
    router.push('/provider/campaigns');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
}

onMounted(async () => {
  try {
    const [provRes, pkgRes] = await Promise.all([
      http.get('/providers/me/dashboard'),
      http.get('/advertising-packages')
    ]);
    eligibleApis.value = (provRes.data.managed_apis || []).filter((a) => a.status === 'approved');
    packages.value = pkgRes.data.packages || [];

    if (route.query.api) {
      form.api_id = Number(route.query.api);
    } else if (eligibleApis.value.length > 0) {
      form.api_id = eligibleApis.value[0].id;
    }

    if (route.query.package) {
      form.package_id = Number(route.query.package);
    } else if (packages.value.length > 0) {
      form.package_id = packages.value[0].id;
    }
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.pkg-option {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-strong);
  background: var(--bg-surface-alt);
  cursor: pointer;
}

.pkg-option.selected {
  border-color: var(--accent);
  background: var(--accent-soft);
}
</style>
