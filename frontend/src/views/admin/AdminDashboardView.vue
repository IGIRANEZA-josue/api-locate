<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Administrator Analytics</h1>
        <p class="page-subtitle">Real-time platform health, moderation queues, search insights, and verified revenue.</p>
      </div>
      <router-link to="/submit-api" class="btn btn-primary btn-sm">+ Add Verified API</router-link>
    </div>

    <div class="grid-4" style="margin-bottom: 1.5rem;">
      <div class="stat-card">
        <div class="stat-label">Total Users</div>
        <div class="stat-value">{{ overview.total_users || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Approved / Pending APIs</div>
        <div class="stat-value">{{ overview.approved_apis || 0 }} / {{ overview.pending_apis || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Active Premium Subs</div>
        <div class="stat-value">{{ overview.active_subscriptions || 0 }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Verified Revenue</div>
        <div class="stat-value">{{ formatCurrency(overview.total_revenue || 0) }}</div>
      </div>
    </div>

    <div class="grid-3" style="margin-bottom: 1.5rem;">
      <router-link to="/admin/submissions" class="card card-interactive">
        <div class="stat-label">Pending API Submissions</div>
        <div class="stat-value" style="color: var(--warning);">{{ overview.pending_apis || 0 }}</div>
        <span style="font-size: 0.8rem;">Review queue →</span>
      </router-link>

      <router-link to="/admin/advertising" class="card card-interactive">
        <div class="stat-label">Pending Ad Campaigns</div>
        <div class="stat-value" style="color: var(--accent);">{{ overview.pending_campaigns || 0 }}</div>
        <span style="font-size: 0.8rem;">Moderate campaigns →</span>
      </router-link>

      <router-link to="/admin/moderation" class="card card-interactive">
        <div class="stat-label">Open Issue Reports</div>
        <div class="stat-value" style="color: var(--danger);">{{ overview.open_reports || 0 }}</div>
        <span style="font-size: 0.8rem;">Resolve reports →</span>
      </router-link>
    </div>

    <div class="grid-2" style="margin-bottom: 1.5rem;">
      <!-- Top Search Queries -->
      <section class="card">
        <h3 style="margin-bottom: 0.85rem;">Top Developer Search Queries</h3>
        <div v-if="topSearches.length === 0" class="form-hint">No search logs recorded yet.</div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Query</th>
                <th>Searches</th>
                <th>Avg Results</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in topSearches" :key="s.search_query">
                <td class="mono">{{ s.search_query }}</td>
                <td>{{ s.searches }}</td>
                <td>{{ s.avg_results }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <!-- Recent Moderation Activity -->
      <section class="card">
        <h3 style="margin-bottom: 0.85rem;">Recent Moderation Audit Log</h3>
        <div v-if="recentModeration.length === 0" class="form-hint">No moderation actions yet.</div>
        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>API</th>
                <th>Action</th>
                <th>By</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in recentModeration.slice(0, 6)" :key="m.id">
                <td><strong>{{ m.api_name }}</strong></td>
                <td><span class="badge badge-neutral">{{ m.action }}</span></td>
                <td>{{ m.moderator_username || 'system' }}</td>
                <td>{{ formatDate(m.created_at) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../../api/http';
import { formatCurrency, formatDate } from '../../utils/formatters';

const overview = ref({});
const topSearches = ref([]);
const recentModeration = ref([]);

onMounted(async () => {
  const { data } = await http.get('/admin/dashboard');
  overview.value = data.overview || {};
  topSearches.value = data.top_searches || [];
  recentModeration.value = data.recent_moderation || [];
});
</script>
