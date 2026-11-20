<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Pending API Submissions ({{ pendingApis.length }})</h1>
        <p class="page-subtitle">
          Review community submissions and staged repository imports before public publication.
        </p>
      </div>
    </div>

    <div v-if="loading" class="card">Loading moderation queue...</div>

    <div v-else-if="pendingApis.length === 0" class="empty-state">
      <h3>Moderation queue is clear!</h3>
      <p>All community and imported API submissions have been reviewed.</p>
    </div>

    <div v-else class="pending-stack">
      <section v-for="item in pendingApis" :key="item.id" class="card">
        <div class="flex-between" style="flex-wrap: wrap; margin-bottom: 0.75rem;">
          <div>
            <div class="flex-row" style="margin-bottom: 0.25rem;">
              <span class="badge badge-warning">{{ item.source_type }} submission</span>
              <span class="badge badge-neutral">{{ item.category_name }}</span>
            </div>
            <h3 style="margin: 0; font-size: 1.2rem;">{{ item.name }}</h3>
            <div class="form-hint">
              Provider: <strong>{{ item.provider_name }}</strong>
              <span v-if="item.submitter_username"> · Submitted by @{{ item.submitter_username }}</span>
              <span v-if="item.import_source_name"> · Source: {{ item.import_source_name }}</span>
            </div>
          </div>

          <div class="flex-row">
            <a :href="item.docs_url" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
              Inspect Docs ↗
            </a>
            <router-link :to="`/apis/${item.id}/edit`" class="btn btn-ghost btn-sm">Edit Spec</router-link>
          </div>
        </div>

        <p style="font-size: 0.9rem; margin-bottom: 0.85rem;">{{ item.short_description }}</p>

        <div class="flex-between" style="padding-top: 0.85rem; border-top: 1px solid var(--border-subtle); flex-wrap: wrap;">
          <div class="flex-row">
            <select v-model="verificationChoice[item.id]" class="select" style="width: 210px;">
              <option value="community_reviewed">Approve as Community Reviewed</option>
              <option value="verified">Approve as Verified Spec</option>
              <option value="unverified">Approve as Unverified</option>
            </select>
            <button type="button" class="btn btn-success btn-sm" @click="approve(item)">
              ✓ Approve &amp; Publish
            </button>
          </div>

          <div class="flex-row">
            <input
              v-model="rejectReason[item.id]"
              type="text"
              class="input"
              style="width: 240px;"
              placeholder="Rejection reason..."
            />
            <button type="button" class="btn btn-danger btn-sm" @click="reject(item)">
              ✕ Reject
            </button>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';

const toast = useToastStore();
const pendingApis = ref([]);
const loading = ref(true);
const verificationChoice = reactive({});
const rejectReason = reactive({});

async function loadPending() {
  loading.value = true;
  try {
    const { data } = await http.get('/admin/apis/pending');
    pendingApis.value = data.pending_apis || [];
    for (const a of pendingApis.value) {
      if (!verificationChoice[a.id]) {
        verificationChoice[a.id] = 'community_reviewed';
      }
    }
  } finally {
    loading.value = false;
  }
}

async function approve(item) {
  try {
    const { data } = await http.put(`/admin/apis/${item.id}/approve`, {
      verification_level: verificationChoice[item.id] || 'community_reviewed'
    });
    toast.success(data.message);
    await loadPending();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function reject(item) {
  const reason = (rejectReason[item.id] || '').trim() || 'Documentation URL could not be verified.';
  try {
    const { data } = await http.put(`/admin/apis/${item.id}/reject`, { reason });
    toast.info(data.message);
    await loadPending();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadPending);
</script>

<style scoped>
.pending-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
