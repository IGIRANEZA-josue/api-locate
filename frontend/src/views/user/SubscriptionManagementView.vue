<template>
  <div class="container page-section" style="max-width: 940px;">
    <UserSubnav />

    <div class="page-header">
      <div>
        <h1 class="page-title">Subscription Management</h1>
        <p class="page-subtitle">
          Monitor your active plan, billing period, renewal settings, and subscription history.
        </p>
      </div>
      <router-link to="/pricing" class="btn btn-secondary btn-sm">Compare Plans</router-link>
    </div>

    <div v-if="loading" class="card">Loading subscription details...</div>

    <template v-else>
      <!-- Active Plan Status -->
      <section class="card" style="margin-bottom: 1.5rem;">
        <div class="flex-between" style="flex-wrap: wrap;">
          <div>
            <span
              class="badge"
              :class="activeSub ? 'badge-freemium' : 'badge-neutral'"
              style="margin-bottom: 0.4rem;"
            >
              {{ activeSub ? 'ACTIVE PREMIUM SUBSCRIPTION' : 'FREE DEVELOPER PLAN' }}
            </span>
            <h2 style="margin: 0;">
              {{ activeSub ? activeSub.plan_name : 'Free Developer Tier' }}
            </h2>
            <p v-if="activeSub" style="margin: 0.35rem 0 0; font-size: 0.9rem;">
              Billing Period:
              <strong>{{ formatDate(activeSub.current_period_start) }}</strong>
              to
              <strong>{{ formatDate(activeSub.current_period_end) }}</strong>
              · {{ formatCurrency(activeSub.price_monthly, activeSub.currency) }} / {{ activeSub.billing_interval }}
            </p>
            <p v-else style="margin: 0.35rem 0 0; font-size: 0.9rem;">
              Includes up to 5 favorite APIs, public search, API submission, and community reviews.
            </p>
          </div>

          <div class="flex-row">
            <template v-if="activeSub">
              <button
                v-if="activeSub.cancel_at_period_end"
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="busy"
                @click="reactivateRenewal"
              >
                Re-Enable Auto-Renewal
              </button>
              <button
                v-else
                type="button"
                class="btn btn-danger btn-sm"
                :disabled="busy"
                @click="cancelSubscription(activeSub.id)"
              >
                Cancel Auto-Renewal
              </button>
            </template>
            <router-link v-else to="/pricing" class="btn btn-primary">
              Upgrade to Premium
            </router-link>
          </div>
        </div>

        <div
          v-if="activeSub && activeSub.cancel_at_period_end"
          class="alert alert-warning"
          style="margin: 1rem 0 0;"
        >
          Auto-renewal is turned off. Your Premium benefits remain active until
          <strong>{{ formatDate(activeSub.current_period_end) }}</strong>.
        </div>
      </section>

      <!-- Subscription Records Table -->
      <section class="card">
        <h3 style="margin-bottom: 1rem;">Subscription History</h3>

        <div v-if="subscriptions.length === 0" class="form-hint">
          No paid subscription records yet.
        </div>

        <div v-else class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Plan</th>
                <th>Status</th>
                <th>Auto-Renew</th>
                <th>Period Start</th>
                <th>Period End</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="sub in subscriptions" :key="sub.id">
                <td class="mono">#{{ sub.id }}</td>
                <td><strong>{{ sub.plan_name }}</strong></td>
                <td>
                  <span
                    class="badge"
                    :class="
                      sub.status === 'active'
                        ? 'badge-free'
                        : sub.status === 'pending'
                        ? 'badge-warning'
                        : 'badge-neutral'
                    "
                  >
                    {{ sub.status }}
                  </span>
                </td>
                <td>{{ sub.auto_renew && !sub.cancel_at_period_end ? 'Enabled' : 'Off' }}</td>
                <td>{{ formatDate(sub.current_period_start) }}</td>
                <td>{{ formatDate(sub.current_period_end) }}</td>
                <td>
                  <button
                    v-if="sub.status === 'pending'"
                    type="button"
                    class="btn btn-ghost btn-sm"
                    style="color: var(--danger);"
                    @click="cancelSubscription(sub.id)"
                  >
                    Cancel Pending
                  </button>
                  <span v-else class="form-hint">—</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import { formatDate, formatCurrency } from '../../utils/formatters';

const authStore = useAuthStore();
const toast = useToastStore();

const loading = ref(true);
const busy = ref(false);
const activeSub = ref(null);
const subscriptions = ref([]);

async function loadSubscriptions() {
  loading.value = true;
  try {
    const { data } = await http.get('/subscriptions/me');
    activeSub.value = data.active_subscription || null;
    subscriptions.value = data.subscriptions || [];
    await authStore.refreshProfile();
  } finally {
    loading.value = false;
  }
}

async function cancelSubscription(subId) {
  busy.value = true;
  try {
    const { data } = await http.post('/subscriptions/cancel', { subscription_id: subId });
    toast.info(data.message);
    await loadSubscriptions();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    busy.value = false;
  }
}

async function reactivateRenewal() {
  busy.value = true;
  try {
    const { data } = await http.post('/subscriptions/reactivate');
    toast.success(data.message);
    await loadSubscriptions();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    busy.value = false;
  }
}

onMounted(loadSubscriptions);
</script>
