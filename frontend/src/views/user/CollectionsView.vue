<template>
  <div class="container page-section">
    <UserSubnav />

    <div class="page-header">
      <div>
        <span class="badge badge-freemium" style="margin-bottom: 0.35rem;">Premium Workspace</span>
        <h1 class="page-title">Personal API Collections</h1>
        <p class="page-subtitle">
          Group APIs by project, client stack, or engineering domain (e.g., My AI APIs, Payment Tools, School Projects).
        </p>
      </div>
    </div>

    <div v-if="!authStore.isPremium" class="empty-state">
      <h2>Unlock Personal API Collections</h2>
      <p style="max-width: 560px; margin: 0 auto 1.25rem;">
        Collections are a Premium developer feature allowing you to organize unlimited APIs into
        custom stacks, add integration notes, and manage project architectures cleanly.
      </p>
      <router-link to="/pricing" class="btn btn-primary">Upgrade to Premium</router-link>
    </div>

    <template v-else>
      <!-- Create Collection Bar -->
      <form class="card create-col-bar" @submit.prevent="createCollection">
        <div class="grid-2" style="flex: 1;">
          <input
            v-model="newCol.name"
            type="text"
            class="input"
            placeholder="Collection Name (e.g., Payment Integration Tools)"
            required
          />
          <input
            v-model="newCol.description"
            type="text"
            class="input"
            placeholder="Optional description or project notes..."
          />
        </div>
        <button type="submit" class="btn btn-primary" :disabled="creating">
          + Create Collection
        </button>
      </form>

      <div v-if="workspace.collections.length === 0" class="empty-state" style="margin-top: 1.5rem;">
        <h3>No collections created yet</h3>
        <p>Create your first collection above or click "+ Add to Collection" on any API Details page.</p>
      </div>

      <div v-else class="collections-stack">
        <section v-for="col in workspace.collections" :key="col.id" class="card collection-box">
          <div class="flex-between" style="margin-bottom: 0.75rem;">
            <div v-if="editingId !== col.id">
              <h2 style="font-size: 1.25rem; margin: 0;">{{ col.name }}</h2>
              <p v-if="col.description" style="margin: 0.2rem 0 0; font-size: 0.86rem;">
                {{ col.description }}
              </p>
            </div>

            <form
              v-else
              class="flex-row"
              style="flex: 1;"
              @submit.prevent="saveRename(col.id)"
            >
              <input v-model="editForm.name" type="text" class="input" style="max-width: 260px;" required />
              <input v-model="editForm.description" type="text" class="input" style="max-width: 320px;" placeholder="Description" />
              <button type="submit" class="btn btn-primary btn-sm">Save</button>
              <button type="button" class="btn btn-ghost btn-sm" @click="editingId = null">Cancel</button>
            </form>

            <div class="flex-row" v-if="editingId !== col.id">
              <button type="button" class="btn btn-secondary btn-sm" @click="startRename(col)">
                Rename
              </button>
              <button type="button" class="btn btn-danger btn-sm" @click="removeCollection(col)">
                Delete
              </button>
            </div>
          </div>

          <!-- Quick Add API into Collection -->
          <div class="quick-add-row">
            <select v-model="selectedApiToAdd[col.id]" class="select" style="max-width: 320px;">
              <option value="">+ Add an API from directory...</option>
              <option v-for="a in directoryApis" :key="a.id" :value="a.id">
                {{ a.name }} ({{ a.category_name }})
              </option>
            </select>
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              :disabled="!selectedApiToAdd[col.id]"
              @click="addSelectedApi(col.id)"
            >
              Add API
            </button>
          </div>

          <!-- Saved APIs Table -->
          <div v-if="!col.apis || col.apis.length === 0" class="form-hint" style="margin-top: 0.85rem;">
            This collection is empty. Select an API above or add from any API Details page.
          </div>
          <div v-else class="grid-2" style="margin-top: 1rem;">
            <div v-for="item in col.apis" :key="item.api_id" class="saved-api-tile">
              <div>
                <router-link :to="`/apis/${item.slug}`" style="font-weight: 700; color: var(--text-primary);">
                  {{ item.name }}
                </router-link>
                <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 0.15rem;">
                  {{ item.category_name }} · {{ PRICING_LABELS[item.pricing_model] }} · {{ AUTH_LABELS[item.auth_type] }}
                </div>
                <p style="font-size: 0.82rem; margin: 0.35rem 0 0;">{{ item.short_description }}</p>
              </div>
              <button
                type="button"
                class="btn btn-ghost btn-sm"
                style="color: var(--danger);"
                @click="removeApiFromCol(col.id, item.api_id)"
              >
                Remove
              </button>
            </div>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { useToastStore } from '../../stores/toastStore';
import UserSubnav from '../../components/UserSubnav.vue';
import { AUTH_LABELS, PRICING_LABELS } from '../../utils/formatters';

const authStore = useAuthStore();
const workspace = useWorkspaceStore();
const toast = useToastStore();

const creating = ref(false);
const newCol = reactive({ name: '', description: '' });
const editingId = ref(null);
const editForm = reactive({ name: '', description: '' });
const directoryApis = ref([]);
const selectedApiToAdd = reactive({});

async function createCollection() {
  creating.value = true;
  try {
    await http.post('/collections', newCol);
    newCol.name = '';
    newCol.description = '';
    await workspace.fetchCollections();
    toast.success('Collection created!');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    creating.value = false;
  }
}

function startRename(col) {
  editingId.value = col.id;
  editForm.name = col.name;
  editForm.description = col.description || '';
}

async function saveRename(colId) {
  try {
    await http.put(`/collections/${colId}`, editForm);
    editingId.value = null;
    await workspace.fetchCollections();
    toast.success('Collection updated.');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function removeCollection(col) {
  try {
    await http.delete(`/collections/${col.id}`);
    await workspace.fetchCollections();
    toast.info(`Deleted "${col.name}".`);
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function addSelectedApi(colId) {
  const apiId = selectedApiToAdd[colId];
  if (!apiId) return;
  try {
    await http.post(`/collections/${colId}/apis/${apiId}`);
    selectedApiToAdd[colId] = '';
    await workspace.fetchCollections();
    toast.success('API added to collection.');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function removeApiFromCol(colId, apiId) {
  try {
    await http.delete(`/collections/${colId}/apis/${apiId}`);
    await workspace.fetchCollections();
    toast.info('API removed from collection.');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(async () => {
  if (authStore.isPremium) {
    await Promise.all([
      workspace.fetchCollections(),
      http.get('/apis?limit=48').then((res) => {
        directoryApis.value = res.data.apis || [];
      })
    ]);
  }
});
</script>

<style scoped>
.create-col-bar {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.collections-stack {
  margin-top: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.quick-add-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--border-subtle);
}

.saved-api-tile {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem;
  border-radius: var(--radius-sm);
  background: var(--bg-surface-alt);
  border: 1px solid var(--border-subtle);
}
</style>
