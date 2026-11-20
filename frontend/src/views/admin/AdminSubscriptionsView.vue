<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Plans &amp; Subscription Management</h1>
        <p class="page-subtitle">
          Configure Free &amp; Premium plan pricing and quotas dynamically, and monitor subscriber lifecycles.
        </p>
      </div>
    </div>

    <!-- Configurable Plans -->
    <div class="grid-2" style="margin-bottom: 2rem;">
      <form v-for="p in plans" :key="p.id" class="card" @submit.prevent="savePlan(p)">
        <div class="flex-between" style="margin-bottom: 0.75rem;">
          <h3 style="margin: 0;">{{ p.name }} (<code class="mono">{{ p.code }}</code>)</h3>
          <span class="badge badge-freemium">{{ p.currency }}</span>
        </div>

        <div class="grid-2">
          <div class="form-group">
            <label class="form-label">Monthly Price ({{ p.currency }})</label>
            <input
              v-model.number="p.price_monthly"
              type="number"
              step="0.01"
              min="0"
              class="input"
              :disabled="p.code === 'free'"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Max Favorites (empty = unlimited)</label>
            <input
              v-model="p.max_favorites"
              type="number"
              min="0"
              class="input"
              placeholder="Unlimited"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="form-label">Plan Description</label>
          <input v-model="p.description" type="text" class="input" />
        </div>

        <button type="submit" class="btn btn-primary btn-sm">Save Plan Configuration</button>
      </form>
    </div>

    <!-- User Subscriptions Table -->
    <section class="card">
      <h3 style="margin-bottom: 1rem;">Subscriber Records</h3>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>User</th>
              <th>Plan</th>
              <th>Status</th>
              <th>Auto-Renew</th>
              <th>Period End</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in subscriptions" :key="s.id">
              <td class="mono">#{{ s.id }}</td>
              <td>
                <strong>@{{ s.username }}</strong>
                <div class="form-hint">{{ s.email }}</div>
              </td>
              <td>{{ s.plan_name }}</td>
              <td>
                <span
                  class="badge"
                  :class="s.status === 'active' ? 'badge-free' : 'badge-warning'"
                >
                  {{ s.status }}
                </span>
              </td>
              <td>{{ s.auto_renew && !s.cancel_at_period_end ? 'On' : 'Off' }}</td>
              <td>{{ formatDate(s.current_period_end) }}</td>
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
import { formatDate } from '../../utils/formatters';

const toast = useToastStore();
const plans = ref([]);
const subscriptions = ref([]);

async function loadData() {
  const [pRes, sRes] = await Promise.all([
    http.get('/admin/plans'),
    http.get('/admin/subscriptions')
  ]);
  plans.value = pRes.data.plans || [];
  subscriptions.value = sRes.data.subscriptions || [];
}

async function savePlan(plan) {
  try {
    await http.put(`/admin/plans/${plan.id}`, {
      name: plan.name,
      description: plan.description,
      price_monthly: plan.price_monthly,
      max_favorites: plan.max_favorites === '' ? null : plan.max_favorites
    });
    toast.success(`Saved ${plan.name} configuration.`);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadData);
</script>
