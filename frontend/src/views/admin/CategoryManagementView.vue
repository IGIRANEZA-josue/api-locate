<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Category Management</h1>
        <p class="page-subtitle">Create, reorder, edit, or deactivate API discovery categories.</p>
      </div>
    </div>

    <form class="card" style="margin-bottom: 1.5rem;" @submit.prevent="saveCategory">
      <h3 style="margin-bottom: 0.85rem;">{{ editingId ? 'Edit Category' : 'Add New Category' }}</h3>
      <div class="grid-3">
        <div class="form-group">
          <label class="form-label">Name *</label>
          <input v-model="form.name" type="text" class="input" required placeholder="Blockchain & Web3" />
        </div>
        <div class="form-group">
          <label class="form-label">Display Order</label>
          <input v-model.number="form.display_order" type="number" class="input" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; padding-top: 1.4rem;">
          <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
            <input v-model="form.is_active" type="checkbox" />
            <strong>Active in Public Directory</strong>
          </label>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Description</label>
        <input v-model="form.description" type="text" class="input" placeholder="Short explanation of APIs in this category" />
      </div>
      <div class="flex-row">
        <button type="submit" class="btn btn-primary btn-sm">
          {{ editingId ? 'Update Category' : '+ Create Category' }}
        </button>
        <button v-if="editingId" type="button" class="btn btn-ghost btn-sm" @click="resetForm">
          Cancel
        </button>
      </div>
    </form>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Category Name</th>
            <th>Slug</th>
            <th>APIs</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in categories" :key="c.id">
            <td>{{ c.display_order }}</td>
            <td>
              <strong>{{ c.name }}</strong>
              <div class="form-hint">{{ c.description }}</div>
            </td>
            <td class="mono">{{ c.slug }}</td>
            <td>{{ c.total_apis }}</td>
            <td>
              <span class="badge" :class="c.is_active ? 'badge-free' : 'badge-neutral'">
                {{ c.is_active ? 'Active' : 'Hidden' }}
              </span>
            </td>
            <td class="flex-row">
              <button type="button" class="btn btn-secondary btn-sm" @click="startEdit(c)">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" @click="removeCat(c)">Delete</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useToastStore } from '../../stores/toastStore';

const toast = useToastStore();
const categories = ref([]);
const editingId = ref(null);
const form = reactive({
  name: '',
  description: '',
  display_order: 15,
  is_active: true
});

function resetForm() {
  editingId.value = null;
  form.name = '';
  form.description = '';
  form.display_order = 15;
  form.is_active = true;
}

function startEdit(c) {
  editingId.value = c.id;
  form.name = c.name;
  form.description = c.description || '';
  form.display_order = c.display_order;
  form.is_active = Boolean(c.is_active);
}

async function loadCategories() {
  const { data } = await http.get('/admin/categories');
  categories.value = data.categories || [];
}

async function saveCategory() {
  try {
    if (editingId.value) {
      await http.put(`/admin/categories/${editingId.value}`, form);
      toast.success('Category updated.');
    } else {
      await http.post('/admin/categories', form);
      toast.success('Category created.');
    }
    resetForm();
    await loadCategories();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function removeCat(c) {
  try {
    await http.delete(`/admin/categories/${c.id}`);
    toast.info('Category deleted.');
    await loadCategories();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadCategories);
</script>
