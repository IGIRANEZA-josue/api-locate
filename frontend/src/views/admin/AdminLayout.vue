<template>
  <div class="container page-section">
    <div class="admin-shell">
      <aside class="admin-sidebar card">
        <div class="admin-sidebar-head">
          <span class="eyebrow">Administration</span>
          <h3>Platform Console</h3>
        </div>

        <nav class="admin-nav" aria-label="Administration Navigation">
          <span class="nav-group-label">Overview</span>
          <router-link to="/admin" exact-active-class="active">Analytics</router-link>
          <router-link to="/admin/users" active-class="active">Users &amp; Roles</router-link>
          <router-link to="/admin/providers" active-class="active">Provider Verification</router-link>

          <span class="nav-group-label">Directory</span>
          <router-link to="/admin/apis" active-class="active">API Listings</router-link>
          <router-link to="/admin/submissions" active-class="active">Pending Submissions</router-link>
          <router-link to="/admin/moderation" active-class="active">Reviews &amp; Reports</router-link>

          <span class="nav-group-label">Taxonomy &amp; Feeds</span>
          <router-link to="/admin/categories" active-class="active">Categories</router-link>
          <router-link to="/admin/tags" active-class="active">Tags</router-link>
          <router-link to="/admin/imports" active-class="active">Repository Imports</router-link>

          <span class="nav-group-label">Commerce</span>
          <router-link to="/admin/subscriptions" active-class="active">Plans &amp; Subscriptions</router-link>
          <router-link to="/admin/payments" active-class="active">Payments Audit</router-link>
          <router-link to="/admin/advertising" active-class="active">Campaigns &amp; Packages</router-link>
        </nav>
      </aside>

      <main class="admin-main">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.admin-sidebar {
  padding: 1rem;
}

.admin-sidebar-head {
  padding-bottom: 0.75rem;
  margin-bottom: 0.65rem;
  border-bottom: 1px solid var(--border-subtle);
}

.admin-sidebar-head h3 {
  font-size: 0.95rem;
  margin: 0.2rem 0 0;
}

.admin-nav {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.nav-group-label {
  font-size: 0.69rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0.65rem 0.6rem 0.25rem;
}

.admin-nav a {
  padding: 0.42rem 0.6rem;
  border-radius: var(--radius-sm);
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.admin-nav a:hover {
  background: var(--bg-surface-alt);
  color: var(--text-primary);
}

.admin-nav a.active {
  background: var(--bg-surface-alt);
  color: var(--text-primary);
  font-weight: 600;
}

@media (max-width: 960px) {
  .admin-shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .nav-group-label {
    display: none;
  }

  .admin-nav {
    flex-direction: row;
    overflow-x: auto;
    padding-bottom: 0.35rem;
  }

  .admin-nav a {
    white-space: nowrap;
  }
}
</style>
