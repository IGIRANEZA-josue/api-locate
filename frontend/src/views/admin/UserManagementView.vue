<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">User Management</h1>
        <p class="page-subtitle">Manage user accounts, role permissions, and active access states.</p>
      </div>
    </div>

    <form class="card flex-row" style="margin-bottom: 1.25rem;" @submit.prevent="loadUsers">
      <input
        v-model="search"
        type="search"
        class="input"
        style="flex: 1;"
        placeholder="Search by username, email, or full name..."
      />
      <select v-model="roleFilter" class="select" style="width: 180px;" @change="loadUsers">
        <option value="">All Roles</option>
        <option value="user">Normal Users</option>
        <option value="admin">Administrators</option>
      </select>
      <button type="submit" class="btn btn-primary btn-sm">Filter</button>
    </form>

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Plan</th>
            <th>Provider</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in users" :key="u.id">
            <td>
              <strong>@{{ u.username }}</strong>
              <div class="form-hint">{{ u.email }}</div>
            </td>
            <td>
              <span class="badge" :class="u.role === 'admin' ? 'badge-warning' : 'badge-neutral'">
                {{ u.role }}
              </span>
            </td>
            <td>
              <span class="badge" :class="u.has_active_premium ? 'badge-freemium' : 'badge-neutral'">
                {{ u.has_active_premium ? 'Premium' : 'Free' }}
              </span>
            </td>
            <td>{{ u.provider_company || '—' }}</td>
            <td>
              <span class="badge" :class="u.is_active ? 'badge-free' : 'badge-danger'">
                {{ u.is_active ? 'Active' : 'Suspended' }}
              </span>
            </td>
            <td>{{ formatDate(u.created_at) }}</td>
            <td class="flex-row">
              <button
                v-if="u.id !== authStore.user?.id"
                type="button"
                class="btn btn-secondary btn-sm"
                @click="toggleRole(u)"
              >
                {{ u.role === 'admin' ? 'Make User' : 'Make Admin' }}
              </button>
              <button
                v-if="u.id !== authStore.user?.id"
                type="button"
                class="btn btn-sm"
                :class="u.is_active ? 'btn-danger' : 'btn-success'"
                @click="toggleStatus(u)"
              >
                {{ u.is_active ? 'Suspend' : 'Activate' }}
              </button>
              <span v-else class="form-hint">You</span>
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
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';
import { formatDate } from '../../utils/formatters';

const authStore = useAuthStore();
const toast = useToastStore();

const users = ref([]);
const search = ref('');
const roleFilter = ref('');

async function loadUsers() {
  const { data } = await http.get('/admin/users', {
    params: { q: search.value || undefined, role: roleFilter.value || undefined }
  });
  users.value = data.users || [];
}

async function toggleRole(user) {
  const nextRole = user.role === 'admin' ? 'user' : 'admin';
  try {
    const { data } = await http.put(`/admin/users/${user.id}/role`, { role: nextRole });
    toast.success(data.message);
    await loadUsers();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

async function toggleStatus(user) {
  try {
    const { data } = await http.put(`/admin/users/${user.id}/status`, {
      is_active: !user.is_active
    });
    toast.success(data.message);
    await loadUsers();
  } catch (err) {
    toast.error(extractErrorMessage(err));
  }
}

onMounted(loadUsers);
</script>
