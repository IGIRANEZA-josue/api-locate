<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Tag Management</h1>
        <p class="page-subtitle">Manage discovery tags and inspect tag usage across APIs.</p>
      </div>
    </div>

    <form class="card flex-row" style="margin-bottom: 1.25rem;" @submit.prevent="saveTag">
      <input
        v-model="tagName"
        type="text"
        class="input"
        style="max-width: 320px;"
        placeholder="New or updated tag (e.g., passkeys)"
        required
      />
      <button type="submit" class="btn btn-primary btn-sm">
        {{ editingId ? 'Rename Tag' : '+ Create Tag' }}
      </button>
      <button v-if="editingId" type="button" class="btn btn-ghost btn-sm" @click="cancelEdit">
        Cancel
      </button>
    </form>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Tag</th>
            <th>Slug</th>
            <th>API Usage Count</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tags" :key="t.id">
            <td class="mono">#{{ t.name }}</td>
            <td class="mono">{{ t.slug }}</td>
            <td>{{ t.usage_count }}</td>
            <td class="flex-row">
              <button type="button" class="btn btn-secondary btn-sm" @click="startEdit(t)">Rename</button>
              <button type="button" class="btn btn-danger btn-sm" @click="removeTag(t)">Delete</button>
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
const tags = ref([]);
const tagName = ref('');
const editingId = ref(null);

async function loadTags() {
  const { data } = await http.get('/admin/tags');
  tags.value = data.tags || [];
}

function startEdit(t) {
  editingId.value = t.id;
  tagName.value = t.name;
}

function cancelEdit() {
  editingId.value = null;
  tagName.value = '';
}

async function saveTag() {
  try {
    if (editingId.value) {
      await http.put(`/admin/tags/${editingId.value}`, { name: tagName.value });
      toast.success('Tag renamed.');
    } else {
      await http.post('/admin/tags', { name: tagName.value });
      toast.success('Tag created.');
    }
    cancelEdit();
    await loadTags();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function removeTag(t) {
  try {
    await http.delete(`/admin/tags/${t.id}`);
    toast.info(`Deleted tag #${t.name}.`);
    await loadTags();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadTags);
</script>
