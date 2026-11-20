<template>
  <nav class="user-subnav" aria-label="Workspace Navigation">
    <router-link to="/dashboard" exact-active-class="active">Overview</router-link>
    <router-link to="/dashboard/favorites" active-class="active">Favorites</router-link>
    <router-link to="/dashboard/collections" active-class="active">Collections</router-link>
    <router-link to="/dashboard/compare" active-class="active">Compare</router-link>
    <router-link to="/submit-api" active-class="active">Submit API</router-link>
    <router-link to="/provider/dashboard" active-class="active">Provider Portal</router-link>
    <router-link to="/provider/campaigns" active-class="active">Campaigns</router-link>
    <router-link to="/dashboard/subscription" active-class="active">Subscription</router-link>
    <router-link to="/dashboard/payments" active-class="active">Billing</router-link>
    <router-link to="/dashboard/settings" active-class="active">Settings</router-link>
  </nav>
</template>

<style scoped>
.user-subnav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  overflow-x: auto;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid var(--border-subtle);
}

.user-subnav a {
  padding: 0.55rem 0.75rem;
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-muted);
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: color 0.14s ease, border-color 0.14s ease;
}

.user-subnav a:hover {
  color: var(--text-primary);
}

.user-subnav a.active {
  color: var(--text-primary);
  border-bottom-color: var(--text-primary);
}
</style>
