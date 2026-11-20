<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <div class="flex-row" style="margin-bottom: 0.35rem;">
          <span class="badge" :class="authStore.isPremium ? 'badge-freemium' : 'badge-neutral'">
            {{ authStore.isPremium ? 'Workspace Pro' : 'Free Plan' }}
          </span>
          <span v-if="authStore.isAdmin" class="badge badge-warning">Administrator</span>
        </div>
        <h1 class="page-title">
          Welcome, {{ authStore.user?.full_name || authStore.user?.username }}
        </h1>
        <p class="page-subtitle">
          Manage your saved APIs, community submissions, notifications, and developer resources.
        </p>
      </div>

      <div class="flex-row">
        <router-link to="/explore" class="btn btn-secondary btn-sm">Explore APIs</router-link>
        <router-link to="/submit-api" class="btn btn-primary btn-sm">+ Submit API</router-link>
      </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid-4" style="margin-bottom: 2rem;">
      <div class="stat-card">
        <div class="stat-label">Saved Favorites</div>
        <div class="stat-value">
          {{ stats.favorites_count || 0 }}
          <span v-if="stats.max_favorites !== null" style="font-size: 0.95rem; color: var(--text-muted);">
            / {{ stats.max_favorites }}
          </span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-label">API Collections</div>
        <div class="stat-value">{{ stats.collections_count || 0 }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Submitted APIs</div>
        <div class="stat-value">{{ stats.submissions_count || 0 }}</div>
      </div>

      <div class="stat-card">
        <div class="stat-label">Reviews Written</div>
        <div class="stat-value">{{ stats.reviews_count || 0 }}</div>
      </div>
    </div>

    <div class="grid-2" style="margin-bottom: 2rem;">
      <!-- Recent Favorites -->
      <section class="card">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0;">Recent Favorites</h3>
          <router-link to="/dashboard/favorites" class="btn btn-ghost btn-sm">View All →</router-link>
        </div>

        <div v-if="recentFavorites.length === 0" class="form-hint">
          No favorite APIs saved yet. Select the bookmark icon on any API card to save it here.
        </div>
        <div v-else class="mini-stack">
          <div v-for="fav in recentFavorites" :key="fav.id" class="mini-item">
            <div>
              <router-link :to="`/apis/${fav.slug}`" style="font-weight: 700; color: var(--text-primary);">
                {{ fav.name }}
              </router-link>
              <div style="font-size: 0.78rem; color: var(--text-muted);">
                {{ fav.category_name }} · {{ PRICING_LABELS[fav.pricing_model] }}
              </div>
            </div>
            <router-link :to="`/apis/${fav.slug}`" class="btn btn-secondary btn-sm">Open</router-link>
          </div>
        </div>
      </section>

      <!-- Notifications Feed -->
      <section class="card">
        <div class="flex-between" style="margin-bottom: 1rem;">
          <h3 style="margin: 0;">Notifications</h3>
          <button
            v-if="notifications.some((n) => !n.is_read)"
            type="button"
            class="btn btn-ghost btn-sm"
            @click="markAllRead"
          >
            Mark All Read
          </button>
        </div>

        <div v-if="notifications.length === 0" class="form-hint">
          No notifications yet.
        </div>
        <div v-else class="mini-stack">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="mini-item"
            :class="{ unread: !n.is_read }"
          >
            <div>
              <strong style="font-size: 0.86rem;">{{ n.title }}</strong>
              <p style="margin: 0.15rem 0 0; font-size: 0.8rem;">{{ n.message }}</p>
            </div>
            <span style="font-size: 0.72rem; color: var(--text-muted); flex-shrink: 0;">
              {{ formatDate(n.created_at) }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Community Submissions Status -->
    <section class="card" style="margin-bottom: 2rem;">
      <div class="flex-between" style="margin-bottom: 1rem;">
        <h3 style="margin: 0;">My API Submissions</h3>
        <router-link to="/submit-api" class="btn btn-secondary btn-sm">+ Submit New API</router-link>
      </div>

      <div v-if="mySubmissions.length === 0" class="form-hint">
        You haven't submitted any APIs yet. Contribute a useful developer API to the community!
      </div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>API Name</th>
              <th>Category</th>
              <th>Moderation Status</th>
              <th>Verification</th>
              <th>Submitted</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sub in mySubmissions" :key="sub.id">
              <td><strong>{{ sub.name }}</strong></td>
              <td>{{ sub.category_name }}</td>
              <td>
                <span
                  class="badge"
                  :class="
                    sub.status === 'approved'
                      ? 'badge-free'
                      : sub.status === 'rejected'
                      ? 'badge-danger'
                      : 'badge-warning'
                  "
                >
                  {{ sub.status }}
                </span>
                <div v-if="sub.rejection_reason" class="form-hint">{{ sub.rejection_reason }}</div>
              </td>
              <td>{{ VERIFICATION_LABELS[sub.verification_level] }}</td>
              <td>{{ formatDate(sub.created_at) }}</td>
              <td>
                <router-link :to="`/apis/${sub.slug}`" class="btn btn-ghost btn-sm">View</router-link>
                <router-link :to="`/apis/${sub.id}/edit`" class="btn btn-ghost btn-sm">Edit</router-link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Premium Personalized Recommendations -->
    <section class="card">
      <div class="flex-between" style="margin-bottom: 1rem;">
        <div>
          <span class="badge badge-freemium" style="margin-bottom: 0.3rem;">Premium Intelligence</span>
          <h3 style="margin: 0;">Recommended APIs for Your Stack</h3>
        </div>
        <router-link v-if="!authStore.isPremium" to="/pricing" class="btn btn-primary btn-sm">
          Upgrade to Unlock
        </router-link>
      </div>

      <div v-if="!authStore.isPremium" class="form-hint">
        Upgrade to API Locate Premium to receive personalized API recommendations tailored to your saved categories and collections.
      </div>
      <div v-else-if="recommendations.length === 0" class="form-hint">
        Save a few favorites to generate personalized API recommendations!
      </div>
      <div v-else class="grid-2">
        <div v-for="rec in recommendations" :key="rec.id" class="mini-item">
          <div>
            <router-link :to="`/apis/${rec.slug}`" style="font-weight: 700; color: var(--text-primary);">
              {{ rec.name }}
            </router-link>
            <p style="margin: 0.2rem 0 0; font-size: 0.82rem;">{{ rec.short_description }}</p>
          </div>
          <router-link :to="`/apis/${rec.slug}`" class="btn btn-secondary btn-sm">Details →</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import { PRICING_LABELS, VERIFICATION_LABELS, formatDate } from '../../utils/formatters';

const authStore = useAuthStore();
const toast = useToastStore();

const stats = ref({ favorites_count: 0, max_favorites: 5 });
const recentFavorites = ref([]);
const mySubmissions = ref([]);
const notifications = ref([]);
const recommendations = ref([]);

async function loadOverview() {
  const { data } = await http.get('/users/dashboard');
  stats.value = data.stats || {};
  recentFavorites.value = data.recent_favorites || [];
  mySubmissions.value = data.my_submissions || [];
  notifications.value = data.notifications || [];
  recommendations.value = data.recommendations || [];
}

async function markAllRead() {
  await http.put('/users/notifications/read-all');
  notifications.value = notifications.value.map((n) => ({ ...n, is_read: true }));
  toast.success('All notifications marked as read.');
}

onMounted(loadOverview);
</script>

<style scoped>
.mini-stack {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.mini-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 0.7rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
}

.mini-item.unread {
  border-left: 3px solid var(--accent);
}
</style>
