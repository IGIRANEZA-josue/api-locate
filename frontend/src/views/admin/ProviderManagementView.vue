<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Provider Profile Verification</h1>
        <p class="page-subtitle">Verify or manage API provider company profiles.</p>
      </div>
    </div>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Company</th>
            <th>Owner</th>
            <th>Website</th>
            <th>Published APIs</th>
            <th>Verification</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in providers" :key="p.id">
            <td>
              <router-link :to="`/providers/${p.slug}`"><strong>{{ p.company_name }}</strong></router-link>
              <div class="form-hint">{{ p.contact_email }}</div>
            </td>
            <td>@{{ p.username }}</td>
            <td>
              <a v-if="p.website_url" :href="p.website_url" target="_blank" rel="noopener noreferrer">
                Visit ↗
              </a>
              <span v-else>—</span>
            </td>
            <td>{{ p.apis_count }}</td>
            <td>
              <span
                class="badge"
                :class="
                  p.verification_status === 'verified'
                    ? 'badge-free'
                    : p.verification_status === 'rejected'
                    ? 'badge-danger'
                    : 'badge-warning'
                "
              >
                {{ p.verification_status }}
              </span>
            </td>
            <td class="flex-row">
              <button
                v-if="p.verification_status !== 'verified'"
                type="button"
                class="btn btn-success btn-sm"
                @click="setStatus(p.id, 'verified')"
              >
                ✓ Verify
              </button>
              <button
                v-if="p.verification_status !== 'rejected'"
                type="button"
                class="btn btn-danger btn-sm"
                @click="setStatus(p.id, 'rejected')"
              >
                Reject
              </button>
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

const toast = useToastStore();
const providers = ref([]);

async function loadProviders() {
  const { data } = await http.get('/admin/providers');
  providers.value = data.providers || [];
}

async function setStatus(id, status) {
  try {
    const { data } = await http.put(`/admin/providers/${id}/verify`, {
      verification_status: status
    });
    toast.success(data.message);
    await loadProviders();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadProviders);
</script>
