<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">API Repository Import Management</h1>
        <p class="page-subtitle">
          Manage permitted OpenAPI feeds, license attribution, duplicate prevention, and import job history.
        </p>
      </div>
      <button type="button" class="btn btn-primary btn-sm" @click="showAddForm = !showAddForm">
        {{ showAddForm ? 'Close Form' : '+ Add Permitted Source' }}
      </button>
    </div>

    <!-- Add Source Form -->
    <form v-if="showAddForm" class="card" style="margin-bottom: 1.5rem;" @submit.prevent="createSource">
      <h3 style="margin-bottom: 0.85rem;">Register Permitted Public API Source</h3>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Source Name *</label>
          <input v-model="newSource.name" type="text" class="input" required placeholder="Official OpenAPI Catalog" />
        </div>
        <div class="form-group">
          <label class="form-label">Source Type</label>
          <select v-model="newSource.source_type" class="select">
            <option value="openapi_directory">OpenAPI Directory</option>
            <option value="github_repo">GitHub Repository</option>
            <option value="public_catalog">Public JSON Catalog</option>
            <option value="official_feed">Official Provider Feed</option>
          </select>
        </div>
      </div>
      <div class="grid-2">
        <div class="form-group">
          <label class="form-label">Base URL *</label>
          <input v-model="newSource.base_url" type="url" class="input" required placeholder="https://api.github.com" />
        </div>
        <div class="form-group">
          <label class="form-label">JSON Feed URL *</label>
          <input v-model="newSource.feed_url" type="url" class="input" required placeholder="https://..." />
        </div>
      </div>
      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">License Name</label>
          <input v-model="newSource.license_name" type="text" class="input" placeholder="MIT / CC0-1.0" />
        </div>
        <div class="form-group">
          <label class="form-label">Hourly Rate Limit</label>
          <input v-model.number="newSource.rate_limit_per_hour" type="number" class="input" min="1" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; padding-top: 1.4rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem;">
            <input v-model="newSource.auto_publish" type="checkbox" />
            <span>Auto-Publish (Skip Moderation)</span>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Attribution Text</label>
        <input v-model="newSource.attribution_text" type="text" class="input" placeholder="Required attribution credit..." />
      </div>
      <button type="submit" class="btn btn-primary btn-sm">Save API Source</button>
    </form>

    <!-- Configured Sources -->
    <div class="grid-3" style="margin-bottom: 2rem;">
      <div v-for="s in sources" :key="s.id" class="card">
        <div class="flex-between" style="margin-bottom: 0.5rem;">
          <span class="badge" :class="s.is_enabled ? 'badge-free' : 'badge-neutral'">
            {{ s.is_enabled ? 'Enabled' : 'Disabled' }}
          </span>
          <span class="badge badge-neutral">{{ s.imported_apis_count }} APIs</span>
        </div>
        <h3 style="font-size: 1.05rem;">{{ s.name }}</h3>
        <p style="font-size: 0.78rem; word-break: break-all; margin-bottom: 0.6rem;" class="mono">
          {{ s.feed_url }}
        </p>
        <div class="form-hint" style="margin-bottom: 0.85rem;">
          License: {{ s.license_name || 'See source' }} · Mode: {{ s.auto_publish ? 'Auto-Publish' : 'Stage as Pending' }}
        </div>

        <div class="flex-row">
          <button
            type="button"
            class="btn btn-primary btn-sm"
            :disabled="!s.is_enabled || runningId === s.id"
            @click="runImport(s)"
          >
            {{ runningId === s.id ? 'Importing...' : 'Run import' }}
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-sm"
            @click="toggleSourceEnabled(s)"
          >
            {{ s.is_enabled ? 'Disable' : 'Enable' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Import Job History -->
    <section class="card">
      <h3 style="margin-bottom: 1rem;">Import Execution History</h3>
      <div v-if="jobs.length === 0" class="form-hint">No import jobs executed yet.</div>
      <div v-else class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Job</th>
              <th>Source</th>
              <th>Status</th>
              <th>Fetched</th>
              <th>Imported</th>
              <th>Skipped (Dedup)</th>
              <th>Failed</th>
              <th>Started</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="j in jobs" :key="j.id">
              <td class="mono">#{{ j.id }}</td>
              <td><strong>{{ j.source_name }}</strong></td>
              <td>
                <span
                  class="badge"
                  :class="
                    j.status === 'completed'
                      ? 'badge-free'
                      : j.status === 'failed'
                      ? 'badge-danger'
                      : 'badge-warning'
                  "
                >
                  {{ j.status }}
                </span>
                <div v-if="j.error_summary" class="form-hint">{{ j.error_summary }}</div>
              </td>
              <td>{{ j.total_fetched }}</td>
              <td><strong>{{ j.imported_count }}</strong></td>
              <td>{{ j.skipped_count }}</td>
              <td>{{ j.failed_count }}</td>
              <td>{{ formatDate(j.started_at) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';
import { formatDate } from '../../utils/formatters';

const toast = useToastStore();
const sources = ref([]);
const jobs = ref([]);
const showAddForm = ref(false);
const runningId = ref(null);

const newSource = reactive({
  name: '',
  source_type: 'openapi_directory',
  base_url: '',
  feed_url: '',
  license_name: '',
  attribution_text: '',
  rate_limit_per_hour: 30,
  auto_publish: false
});

async function loadData() {
  const [srcRes, jobRes] = await Promise.all([
    http.get('/admin/api-sources'),
    http.get('/admin/import-jobs')
  ]);
  sources.value = srcRes.data.sources || [];
  jobs.value = jobRes.data.jobs || [];
}

async function createSource() {
  try {
    await http.post('/admin/api-sources', newSource);
    showAddForm.value = false;
    newSource.name = '';
    newSource.base_url = '';
    newSource.feed_url = '';
    toast.success('Import source added.');
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function toggleSourceEnabled(source) {
  try {
    await http.put(`/admin/api-sources/${source.id}`, {
      is_enabled: !source.is_enabled
    });
    toast.info(`Source "${source.name}" ${!source.is_enabled ? 'enabled' : 'disabled'}.`);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function runImport(source) {
  runningId.value = source.id;
  try {
    const { data } = await http.post(`/admin/api-sources/${source.id}/import`);
    toast.success(data.message);
    await loadData();
  } catch (err) {
    toast.error(extractErrorMessage(err));
    await loadData();
  } finally {
    runningId.value = null;
  }
}

onMounted(loadData);
</script>
