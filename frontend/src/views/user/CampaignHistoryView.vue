<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">Sponsored Campaign History &amp; Performance</h1>
        <p class="page-subtitle">
          Track payment verification, moderator approval, scheduled dates, impressions, clicks, and CTR.
        </p>
      </div>
      <router-link to="/provider/promote" class="btn btn-primary btn-sm">+ New Campaign</router-link>
    </div>

    <div v-if="loading" class="card">Loading campaigns...</div>

    <div v-else-if="campaigns.length === 0" class="empty-state">
      <h3>No sponsored campaigns yet</h3>
      <p>Promote an approved API to reach developers actively searching for tools.</p>
      <router-link to="/provider/promote" class="btn btn-primary">Create First Campaign</router-link>
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Campaign &amp; API</th>
            <th>Package</th>
            <th>Payment</th>
            <th>Approval</th>
            <th>Status</th>
            <th>Schedule</th>
            <th>Impressions</th>
            <th>Clicks (CTR)</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in campaigns" :key="c.id">
            <td>
              <strong>{{ c.title }}</strong>
              <div class="form-hint">
                API: <router-link :to="`/apis/${c.api_slug}`">{{ c.api_name }}</router-link>
              </div>
            </td>
            <td>
              {{ c.package_name }}
              <div class="form-hint">{{ formatCurrency(c.package_price, c.package_currency) }} · {{ c.duration_days }}d</div>
            </td>
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
            <td>
              <span class="badge badge-neutral">{{ c.campaign_status }}</span>
            </td>
            <td style="font-size: 0.78rem;">
              <template v-if="c.starts_at">
                {{ formatDate(c.starts_at) }} → {{ formatDate(c.ends_at) }}
              </template>
              <span v-else class="form-hint">Starts on approval</span>
            </td>
            <td><strong>{{ c.impressions_count }}</strong></td>
            <td>
              <strong>{{ c.clicks_count }}</strong>
              <span class="form-hint"> ({{ c.ctr_percent }}%)</span>
            </td>
            <td>
              <button type="button" class="btn btn-secondary btn-sm" @click="inspectCampaign(c.id)">
                Analytics
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Campaign Detail Modal -->
    <div v-if="selectedDetail" class="modal-backdrop" @click.self="selectedDetail = null">
      <div class="modal-panel">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0;">{{ selectedDetail.title }}</h3>
          <button type="button" class="btn btn-ghost btn-sm" @click="selectedDetail = null">✕</button>
        </div>

        <p style="font-size: 0.86rem;">
          <strong>Payment Reference:</strong> <code class="mono">{{ selectedDetail.payment_reference || 'N/A' }}</code>
        </p>

        <div class="grid-3" style="margin-bottom: 1rem;">
          <div class="stat-card">
            <div class="stat-label">Impressions</div>
            <div class="stat-value">{{ selectedDetail.impressions_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Clicks</div>
            <div class="stat-value">{{ selectedDetail.clicks_count }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">CTR</div>
            <div class="stat-value">{{ selectedDetail.ctr_percent }}%</div>
          </div>
        </div>

        <div v-if="selectedDetail.rejection_reason" class="alert alert-error">
          <strong>Rejection Note:</strong> {{ selectedDetail.rejection_reason }}
        </div>

        <h4 style="font-size: 0.9rem;">Daily Telemetry</h4>
        <div v-if="!selectedDetail.daily_metrics?.length" class="form-hint">
          No impression/click events recorded yet.
        </div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Impressions</th>
                <th>Clicks</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="d in selectedDetail.daily_metrics" :key="d.event_date">
                <td>{{ formatDate(d.event_date) }}</td>
                <td>{{ d.impressions }}</td>
                <td>{{ d.clicks }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import { formatCurrency, formatDate } from '../../utils/formatters';

const toast = useToastStore();
const campaigns = ref([]);
const loading = ref(true);
const selectedDetail = ref(null);

async function inspectCampaign(id) {
  try {
    const { data } = await http.get(`/promotions/${id}`);
    selectedDetail.value = data.campaign;
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(async () => {
  try {
    const { data } = await http.get('/promotions/my-campaigns');
    campaigns.value = data.campaigns || [];
  } finally {
    loading.value = false;
  }
});
</script>
