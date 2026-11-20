<template>
  <div class="container page-section" style="max-width: 980px;">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">Payment History</h1>
        <p class="page-subtitle">
          Verified transaction references for your Premium subscriptions and sponsored campaigns.
        </p>
      </div>
    </div>

    <div v-if="loading" class="card">Loading payment records...</div>

    <div v-else-if="payments.length === 0" class="empty-state">
      <h3>No payment transactions yet</h3>
      <p>Subscription checkouts and sponsored campaign invoices will appear here.</p>
    </div>

    <div v-else class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>Type</th>
            <th>Description</th>
            <th>Amount</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id">
            <td class="mono" style="font-size: 0.78rem;">{{ p.payment_reference }}</td>
            <td style="text-transform: capitalize;">{{ p.payment_for }}</td>
            <td>{{ p.plan_name || p.campaign_title || 'Platform Order' }}</td>
            <td><strong>{{ formatCurrency(p.amount, p.currency) }}</strong></td>
            <td>{{ p.provider }}</td>
            <td>
              <span
                class="badge"
                :class="
                  p.status === 'succeeded'
                    ? 'badge-free'
                    : p.status === 'failed'
                    ? 'badge-danger'
                    : 'badge-warning'
                "
              >
                {{ p.status }}
              </span>
            </td>
            <td>{{ formatDate(p.paid_at || p.created_at) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../../api/http';
import UserSubnav from '../../components/UserSubnav.vue';
import { formatCurrency, formatDate } from '../../utils/formatters';

const payments = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await http.get('/payments/history');
    payments.value = data.payments || [];
  } finally {
    loading.value = false;
  }
});
</script>
