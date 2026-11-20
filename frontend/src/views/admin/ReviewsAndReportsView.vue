<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Reviews &amp; Issue Reports Moderation</h1>
        <p class="page-subtitle">
          Resolve developer accuracy/broken-link reports and moderate public API reviews.
        </p>
      </div>
    </div>

    <!-- Reported APIs Queue -->
    <section class="card" style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem;">API Issue Reports ({{ reports.length }})</h3>
      <div v-if="reports.length === 0" class="form-hint">No API reports submitted yet.</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>API</th>
              <th>Reason</th>
              <th>Details</th>
              <th>Reporter</th>
              <th>Status</th>
              <th>Resolution</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="rp in reports" :key="rp.id">
              <td>
                <router-link :to="`/apis/${rp.api_slug}`"><strong>{{ rp.api_name }}</strong></router-link>
              </td>
              <td>{{ REPORT_REASON_LABELS[rp.reason] || rp.reason }}</td>
              <td style="max-width: 300px;">{{ rp.details }}</td>
              <td>@{{ rp.reporter_username }}</td>
              <td>
                <span
                  class="badge"
                  :class="
                    rp.status === 'resolved'
                      ? 'badge-free'
                      : rp.status === 'dismissed'
                      ? 'badge-neutral'
                      : 'badge-danger'
                  "
                >
                  {{ rp.status }}
                </span>
              </td>
              <td class="flex-row">
                <button
                  v-if="rp.status !== 'resolved'"
                  type="button"
                  class="btn btn-success btn-sm"
                  @click="resolveReport(rp.id, 'resolved')"
                >
                  Resolve
                </button>
                <button
                  v-if="rp.status === 'open'"
                  type="button"
                  class="btn btn-ghost btn-sm"
                  @click="resolveReport(rp.id, 'dismissed')"
                >
                  Dismiss
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Reviews Moderation -->
    <section class="card">
      <h3 style="margin-bottom: 1rem;">Developer Reviews ({{ reviews.length }})</h3>
      <div v-if="reviews.length === 0" class="form-hint">No reviews posted yet.</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>API</th>
              <th>Author</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Visibility</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in reviews" :key="r.id">
              <td><strong>{{ r.api_name }}</strong></td>
              <td>@{{ r.username }}</td>
              <td class="mono">{{ r.rating }} / 5</td>
              <td style="max-width: 320px;">
                <strong>{{ r.title }}</strong>
                <div class="form-hint">{{ r.comment }}</div>
              </td>
              <td>
                <span
                  class="badge"
                  :class="r.status === 'visible' ? 'badge-free' : 'badge-warning'"
                >
                  {{ r.status }}
                </span>
              </td>
              <td>
                <button
                  type="button"
                  class="btn btn-secondary btn-sm"
                  @click="toggleReviewVisibility(r)"
                >
                  {{ r.status === 'visible' ? 'Hide' : 'Show' }}
                </button>
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
import { REPORT_REASON_LABELS } from '../../utils/formatters';

const toast = useToastStore();
const reports = ref([]);
const reviews = ref([]);

async function loadModeration() {
  const [repRes, revRes] = await Promise.all([
    http.get('/admin/reports'),
    http.get('/admin/reviews')
  ]);
  reports.value = repRes.data.reports || [];
  reviews.value = revRes.data.reviews || [];
}

async function resolveReport(id, status) {
  try {
    const { data } = await http.put(`/admin/reports/${id}/resolve`, {
      status,
      resolution_notes: `Report ${status} by administrator.`
    });
    toast.success(data.message);
    await loadModeration();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function toggleReviewVisibility(rev) {
  const next = rev.status === 'visible' ? 'hidden' : 'visible';
  try {
    const { data } = await http.put(`/admin/reviews/${rev.id}/status`, { status: next });
    toast.info(data.message);
    await loadModeration();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadModeration);
</script>
