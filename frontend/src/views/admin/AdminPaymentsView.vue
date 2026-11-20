<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Payment Transactions Audit</h1>
        <p class="page-subtitle">
          Monitor subscription and campaign payment references. Administrators can also verify audited manual/invoice settlements.
        </p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Reference</th>
            <th>User</th>
            <th>Type &amp; Target</th>
            <th>Amount</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Date</th>
            <th>Admin Action</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in payments" :key="p.id">
            <td class="mono" style="font-size: 0.76rem;">{{ p.payment_reference }}</td>
            <td>
              <strong>@{{ p.username }}</strong>
              <div class="form-hint">{{ p.email }}</div>
            </td>
            <td>
              <span style="text-transform: capitalize;">{{ p.payment_for }}</span>
              <div class="form-hint">{{ p.plan_name || p.campaign_title }}</div>
            </td>
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
            <td>
              <button
                v-if="p.status === 'pending'"
                type="button"
                class="btn btn-success btn-sm"
                @click="verifyManual(p)"
              >
                Verify Invoice
              </button>
              <span v-else class="form-hint">—</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';
import { formatCurrency, formatDate } from '../../utils/formatters';

const toast = useToastStore();
const payments = ref([]);

async function loadPayments() {
  const { data } = await http.get('/admin/payments');
  payments.value = data.payments || [];
}

async function verifyManual(payment) {
  try {
    const { data } = await http.put(`/admin/payments/${payment.id}/verify-manual`);
    toast.success(data.message);
    await loadPayments();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadPayments);
</script>
