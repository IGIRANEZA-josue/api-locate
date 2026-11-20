<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-panel">
      <div class="flex-between" style="margin-bottom: 1rem;">
        <h3 style="margin: 0;">Save to Collection</h3>
        <button type="button" class="btn btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </div>

      <div v-if="!authStore.isPremium" class="alert alert-warning">
        <strong>Premium Feature:</strong> Personal API Collections are available on API Locate Premium.
        <div style="margin-top: 0.75rem;">
          <router-link to="/pricing" class="btn btn-primary btn-sm" @click="$emit('close')">
            View Premium Plans
          </router-link>
        </div>
      </div>

      <template v-else>
        <p style="font-size: 0.88rem;">
          Organize <strong>{{ api.name }}</strong> into one of your developer collections:
        </p>

        <div v-if="workspace.collections.length > 0" class="collection-list">
          <div
            v-for="col in workspace.collections"
            :key="col.id"
            class="collection-row"
          >
            <div>
              <strong>{{ col.name }}</strong>
              <span class="col-count">({{ col.api_count || col.apis?.length || 0 }} APIs)</span>
            </div>
            <button
              type="button"
              class="btn btn-sm"
              :class="hasApi(col) ? 'btn-secondary' : 'btn-primary'"
              :disabled="busyId === col.id"
              @click="toggleCollectionMembership(col)"
            >
              {{ hasApi(col) ? 'Remove' : '+ Add' }}
            </button>
          </div>
        </div>
        <div v-else class="alert alert-info">
          You don't have any collections yet. Create your first collection below!
        </div>

        <form class="create-inline" @submit.prevent="createNewAndSave">
          <label class="form-label">Or Create a New Collection</label>
          <div style="display: flex; gap: 0.5rem;">
            <input
              v-model="newName"
              type="text"
              class="input"
              placeholder="e.g., My AI Stack, School Project APIs"
              required
            />
            <button type="submit" class="btn btn-primary" :disabled="creating">
              Create & Add
            </button>
          </div>
        </form>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../api/http';
import { useAuthStore } from '../stores/authStore';
import { useWorkspaceStore } from '../stores/workspaceStore';
import { useToastStore } from '../stores/toastStore';

const props = defineProps({
  api: { type: Object, required: true }
});
const emit = defineEmits(['close']);

const authStore = useAuthStore();
const workspace = useWorkspaceStore();
const toast = useToastStore();

const newName = ref('');
const busyId = ref(null);
const creating = ref(false);

function hasApi(col) {
  return Array.isArray(col.apis) && col.apis.some((item) => item.api_id === props.api.id || item.id === props.api.id);
}

async function toggleCollectionMembership(col) {
  busyId.value = col.id;
  try {
    if (hasApi(col)) {
      await http.delete(`/collections/${col.id}/apis/${props.api.id}`);
      toast.info(`Removed from "${col.name}".`);
    } else {
      await http.post(`/collections/${col.id}/apis/${props.api.id}`);
      toast.success(`Saved to "${col.name}".`);
    }
    await workspace.fetchCollections();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    busyId.value = null;
  }
}

async function createNewAndSave() {
  if (!newName.value.trim()) return;
  creating.value = true;
  try {
    const { data } = await http.post('/collections', { name: newName.value.trim() });
    await http.post(`/collections/${data.collection.id}/apis/${props.api.id}`);
    newName.value = '';
    await workspace.fetchCollections();
    toast.success(`Created "${data.collection.name}" and added ${props.api.name}.`);
    emit('close');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    creating.value = false;
  }
}

onMounted(() => {
  if (authStore.isPremium) {
    workspace.fetchCollections();
  }
});
</script>

<style scoped>
.collection-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.25rem;
  max-height: 240px;
  overflow-y: auto;
}

.collection-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
}

.col-count {
  font-size: 0.78rem;
  color: var(--text-muted);
  margin-left: 0.4rem;
}

.create-inline {
  padding-top: 1rem;
  border-top: 1px solid var(--border-subtle);
}
</style>
