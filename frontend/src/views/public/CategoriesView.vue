<template>
  <div class="container page-section">
    <div class="page-header">
      <div>
        <span class="eyebrow">Directory Index</span>
        <h1 class="page-title" style="margin-top: 0.2rem;">API Categories</h1>
        <p class="page-subtitle">
          Browse moderated APIs across {{ categories.length }} functional categories.
        </p>
      </div>
      <router-link to="/explore" class="btn btn-secondary btn-sm">
        Search full directory →
      </router-link>
    </div>

    <div v-if="loading" class="card">Loading categories...</div>
    <div v-else class="categories-index">
      <router-link
        v-for="cat in categories"
        :key="cat.id"
        :to="`/explore?category=${cat.slug}`"
        class="category-cell"
      >
        <div class="flex-between">
          <h2 class="cat-heading">{{ cat.name }}</h2>
          <span class="cat-count mono">{{ cat.api_count }} {{ cat.api_count === 1 ? 'spec' : 'specs' }}</span>
        </div>
        <p class="cat-body">{{ cat.description }}</p>
        <span class="cat-link">View APIs →</span>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import http from '../../api/http';

const categories = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    const { data } = await http.get('/categories');
    categories.value = data.categories || [];
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.categories-index {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  background: var(--border-subtle);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.category-cell {
  background: var(--bg-surface);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 1.5rem;
  transition: background-color 0.14s ease;
}

.category-cell:hover {
  background: var(--bg-canvas);
}

.cat-heading {
  font-size: 0.98rem;
  font-weight: 600;
  margin: 0;
}

.cat-count {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.cat-body {
  font-size: 0.84rem;
  color: var(--text-secondary);
  margin: 0;
  flex: 1;
}

.cat-link {
  font-size: 0.79rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.category-cell:hover .cat-link {
  color: var(--text-primary);
  text-decoration: underline;
}

@media (max-width: 960px) {
  .categories-index {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .categories-index {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
