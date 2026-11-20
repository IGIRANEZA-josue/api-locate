<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">API Listing Management</h1>
        <p class="page-subtitle">Add, edit, verify, feature, or remove APIs across all data sources.</p>
      </div>
      <router-link to="/submit-api" class="btn btn-primary btn-sm">+ Add New API</router-link>
    </div>

    <form class="card flex-row" style="margin-bottom: 1.25rem;" @submit.prevent="loadApis">
      <input
        v-model="q"
        type="search"
        class="input"
        style="flex: 1;"
        placeholder="Search by API or provider name..."
      />
      <select v-model="statusFilter" class="select" style="width: 160px;" @change="loadApis">
        <option value="">All Statuses</option>
        <option value="approved">Approved</option>
        <option value="pending">Pending</option>
        <option value="rejected">Rejected</option>
      </select>
      <select v-model="sourceFilter" class="select" style="width: 160px;" @change="loadApis">
        <option value="">All Sources</option>
        <option value="admin">Admin</option>
        <option value="community">Community</option>
        <option value="imported">Imported</option>
      </select>
      <button type="submit" class="btn btn-primary btn-sm">Filter</button>
    </form>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>API</th>
            <th>Category</th>
            <th>Source</th>
            <th>Status</th>
            <th>Verification</th>
            <th>Views</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in apis" :key="a.id">
            <td>
              <strong>{{ a.name }}</strong>
              <div class="form-hint">
                {{ a.provider_name }}
                <span v-if="a.is_seed_data"> · [Seed]</span>
                <span v-if="a.is_featured"> · Featured</span>
              </div>
            </td>
            <td>{{ a.category_name }}</td>
            <td style="text-transform: capitalize;">{{ a.source_type }}</td>
            <td>
              <span
                class="badge"
                :class="
                  a.status === 'approved'
                    ? 'badge-free'
                    : a.status === 'rejected'
                    ? 'badge-danger'
                    : 'badge-warning'
                "
              >
                {{ a.status }}
              </span>
            </td>
            <td>{{ VERIFICATION_LABELS[a.verification_level] }}</td>
            <td>{{ a.views_count }}</td>
            <td class="flex-row">
              <router-link :to="`/apis/${a.slug}`" class="btn btn-ghost btn-sm">View</router-link>
              <router-link :to="`/apis/${a.id}/edit`" class="btn btn-secondary btn-sm">Edit</router-link>
              <button type="button" class="btn btn-danger btn-sm" @click="removeApi(a)">Delete</button>
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
import { VERIFICATION_LABELS } from '../../utils/formatters';

const toast = useToastStore();
const apis = ref([]);
const q = ref('');
const statusFilter = ref('');
const sourceFilter = ref('');

async function loadApis() {
  const { data } = await http.get('/admin/apis', {
    params: {
      q: q.value || undefined,
      status: statusFilter.value || undefined,
      source_type: sourceFilter.value || undefined,
      limit: 50
    }
  });
  apis.value = data.apis || [];
}

async function removeApi(api) {
  try {
    await http.delete(`/apis/${api.id}`);
    toast.info(`Deleted "${api.name}".`);
    await loadApis();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadApis);
</script>
