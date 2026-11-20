<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Advertising Packages &amp; Campaign Moderation</h1>
        <p class="page-subtitle">
          Configure sponsored package pricing &amp; durations dynamically, and review paid provider campaigns.
        </p>
      </div>
    </div>

    <!-- Configurable Advertising Packages -->
    <h3 style="margin-bottom: 0.85rem;">Configurable Advertising Packages</h3>
    <div class="grid-3" style="margin-bottom: 2rem;">
      <form v-for="pkg in packages" :key="pkg.id" class="card" @submit.prevent="savePackage(pkg)">
        <span class="badge badge-sponsored" style="margin-bottom: 0.5rem;">{{ pkg.placement_type }}</span>
        <div class="form-group">
          <label class="form-label">Package Name</label>
          <input v-model="pkg.name" type="text" class="input" required />
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Price ({{ pkg.currency }})</label>
            <input v-model.number="pkg.price" type="number" step="0.5" min="1" class="input" required />
          </div>
          <div class="form-group">
            <label class="form-label">Duration (Days)</label>
            <input v-model.number="pkg.duration_days" type="number" min="1" class="input" required />
          </div>
        </div>
        <button type="submit" class="btn btn-primary btn-sm" style="width: 100%;">
          Save Package
        </button>
      </form>
    </div>

    <!-- Sponsored Campaigns Queue -->
    <section class="card">
      <h3 style="margin-bottom: 1rem;">Sponsored Campaigns Queue</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Campaign &amp; API</th>
              <th>Advertiser</th>
              <th>Package</th>
              <th>Payment</th>
              <th>Approval</th>
              <th>Impr / Clicks</th>
              <th>Moderation</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in campaigns" :key="c.id">
              <td>
                <strong>{{ c.title }}</strong>
                <div class="form-hint">API: {{ c.api_name }}</div>
              </td>
              <td>@{{ c.advertiser_username }}</td>
              <td>{{ c.package_name }} ({{ c.duration_days }}d)</td>
              <td>
                <span class="badge" :class="c.payment_status === 'paid' ? 'badge-free' : 'badge-warning'">
                  {{ c.payment_status }}
                </span>
              </td>
              <td>
                <span
                  class="badge"
                  :class="
                    c.approval_status === 'approved'
                      ? 'badge-free'
                      : c.approval_status === 'rejected'
                      ? 'badge-danger'
                      : 'badge-warning'
                  "
                >
                  {{ c.approval_status }}
                </span>
              </td>
              <td>{{ c.impressions_count }} / {{ c.clicks_count }}</td>
              <td class="flex-row">
                <button
                  v-if="c.approval_status === 'pending'"
                  type="button"
                  class="btn btn-success btn-sm"
                  :disabled="c.payment_status !== 'paid'"
                  :title="c.payment_status !== 'paid' ? 'Payment must be verified before activating' : 'Approve & Activate'"
                  @click="approveCampaign(c)"
                >
                  ✓ Approve
                </button>
                <button
                  v-if="c.approval_status === 'pending'"
                  type="button"
                  class="btn btn-danger btn-sm"
                  @click="rejectCampaign(c)"
                >
                  Reject
                </button>
                <span v-else class="form-hint">{{ c.campaign_status }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';

const toast = useToastStore();
const packages = ref([]);
const campaigns = ref([]);

async function loadData() {
  const [pkgRes, campRes] = await Promise.all([
    http.get('/admin/advertising-packages'),
    http.get('/admin/campaigns')
  ]);
  packages.value = pkgRes.data.packages || [];
  campaigns.value = campRes.data.campaigns || [];
}

async function savePackage(pkg) {
  try {
    await http.put(`/admin/advertising-packages/${pkg.id}`, {
      name: pkg.name,
      price: pkg.price,
      duration_days: pkg.duration_days
    });
    toast.success(`Updated "${pkg.name}" package.`);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function approveCampaign(c) {
  try {
    const { data } = await http.put(`/admin/campaigns/${c.id}/approve`);
    toast.success(data.message);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function rejectCampaign(c) {
  try {
    const { data } = await http.put(`/admin/campaigns/${c.id}/reject`, {
      reason: 'Campaign headline or target API requires revision.'
    });
    toast.info(data.message);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadData);
</script>
