<template>
  <div class="container page-section">
    <div class="page-header">
      <div>
        <span class="eyebrow">Simple, transparent plans.</span>
        <h1 class="page-title" style="margin-top: 0.15rem;">
          Pricing Built for <span class="serif-italic" style="font-size: 1.08em;">Every Stack</span>
        </h1>
        <p class="page-subtitle">
          Search the directory and submit APIs for free, or upgrade to Pro for unlimited saved APIs,
          collections, and 4-way side-by-side specification comparisons.
        </p>
      </div>
    </div>

    <div v-if="!providerConfigured" class="alert alert-info" style="margin-bottom: 1.5rem;">
      <strong>Sandbox billing mode:</strong> Live payment gateway keys (<code>STRIPE_SECRET_KEY</code>) are not configured in
      <code>backend/.env</code>. Checkout creates a pending MySQL reference verified via signed webhook.
    </div>

    <!-- Plans Grid -->
    <div class="grid-2" style="margin-bottom: 2.75rem;">
      <div
        v-for="plan in plans"
        :key="plan.id"
        class="card plan-card"
        :class="{ 'plan-card-pro': plan.code !== 'free' }"
      >
        <div>
          <div class="flex-between" style="margin-bottom: 0.45rem;">
            <h2 style="margin: 0; font-size: 1.2rem;">{{ plan.name }}</h2>
            <span v-if="plan.code !== 'free'" class="badge badge-paid">Workspace Pro</span>
            <span v-else class="badge badge-neutral">Free forever</span>
          </div>
          <p style="font-size: 0.86rem; color: var(--text-secondary);">{{ plan.description }}</p>

          <div class="plan-price">
            <strong>{{ formatCurrency(plan.price_monthly, plan.currency) }}</strong>
            <span>/ {{ plan.billing_interval }}</span>
          </div>

          <ul class="plan-features">
            <li v-for="(item, idx) in (plan.features?.highlights || [])" :key="idx">
              <AppIcon name="check" :size="14" class="check-ic" />
              <span>{{ item }}</span>
            </li>
          </ul>
        </div>

        <div style="margin-top: 1.75rem;">
          <template v-if="plan.code === 'free'">
            <router-link
              v-if="!authStore.isAuthenticated"
              to="/register"
              class="btn btn-secondary"
              style="width: 100%;"
            >
              Create free account
            </router-link>
            <span v-else class="btn btn-secondary" style="width: 100%; cursor: default;">
              Included with your account
            </span>
          </template>

          <template v-else>
            <router-link
              v-if="authStore.isPremium"
              to="/dashboard/subscription"
              class="btn btn-secondary"
              style="width: 100%;"
            >
              Active — Manage subscription
            </router-link>
            <button
              v-else
              type="button"
              class="btn btn-primary"
              style="width: 100%;"
              :disabled="subscribing"
              @click="startCheckout(plan)"
            >
              {{ subscribing ? 'Preparing checkout...' : `Upgrade to ${plan.name}` }}
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Provider Sponsored Packages -->
    <section>
      <div class="page-header" style="margin-bottom: 1.25rem;">
        <div>
          <span class="eyebrow">For API Providers</span>
          <h2 style="font-size: 1.25rem; margin: 0.2rem 0 0;">Sponsored Placement Packages</h2>
          <p class="page-subtitle">
            Moderator-reviewed visibility for verified APIs with daily click and impression reporting.
          </p>
        </div>
      </div>

      <div class="grid-3">
        <div v-for="pkg in packages" :key="pkg.id" class="card pkg-card">
          <div>
            <span class="badge badge-sponsored" style="margin-bottom: 0.6rem;">
              {{ pkg.placement_type }}
            </span>
            <h3 style="font-size: 1.02rem; margin-bottom: 0.25rem;">{{ pkg.name }}</h3>
            <div class="plan-price" style="margin: 0.45rem 0 0.7rem;">
              <strong style="font-size: 1.55rem;">{{ formatCurrency(pkg.price, pkg.currency) }}</strong>
              <span>/ {{ pkg.duration_days }} days</span>
            </div>
            <p style="font-size: 0.83rem; color: var(--text-secondary);">{{ pkg.description }}</p>
          </div>
          <router-link
            :to="`/provider/promote?package=${pkg.id}`"
            class="btn btn-secondary btn-sm"
            style="width: 100%; margin-top: 0.75rem;"
          >
            Select package →
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import AppIcon from '../../components/AppIcon.vue';
import { formatCurrency } from '../../utils/formatters';

const router = useRouter();
const authStore = useAuthStore();
const toast = useToastStore();

const plans = ref([]);
const packages = ref([]);
const providerConfigured = ref(false);
const subscribing = ref(false);

async function startCheckout(plan) {
  if (!authStore.isAuthenticated) {
    toast.info('Please sign in or create an account first to upgrade to Pro.');
    router.push('/login?redirect=/pricing');
    return;
  }

  subscribing.value = true;
  try {
    const { data } = await http.post('/subscriptions/checkout', {
      plan_id: plan.id,
      auto_renew: true
    });

    if (data.checkout?.checkout_url) {
      window.location.href = data.checkout.checkout_url;
      return;
    }

    toast.info(data.message);
    router.push('/dashboard/subscription');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    subscribing.value = false;
  }
}

onMounted(async () => {
  const [plansRes, pkgRes] = await Promise.all([
    http.get('/plans'),
    http.get('/advertising-packages')
  ]);
  plans.value = plansRes.data.plans || [];
  providerConfigured.value = Boolean(plansRes.data.payment_provider_configured);
  packages.value = pkgRes.data.packages || [];
});
</script>

<style scoped>
.plan-card {
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.plan-card-pro {
  border-color: var(--text-primary);
}

.pkg-card {
  padding: 1.45rem;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.plan-price {
  margin: 1.15rem 0;
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
  font-variant-numeric: tabular-nums;
}

.plan-price strong {
  font-size: 2.15rem;
  font-weight: 650;
  letter-spacing: -0.035em;
  color: var(--text-primary);
}

.plan-price span {
  color: var(--text-muted);
  font-size: 0.84rem;
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 0.52rem;
}

.check-ic {
  color: var(--text-primary);
}
</style>
