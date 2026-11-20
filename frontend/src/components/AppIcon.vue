<template>
  <svg
    class="app-icon"
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'brand-arrows'">
      <path d="M4 8.25h15.5M19.5 8.25l-4-4M19.5 8.25l-4 4" stroke-width="2" />
      <path d="M20 15.75H4.5M4.5 15.75l4-4M4.5 15.75l4 4" stroke-width="2" />
    </template>

    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </template>

    <template v-else-if="name === 'sun'">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M3 12h2M19 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </template>

    <template v-else-if="name === 'moon'">
      <path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
    </template>

    <template v-else-if="name === 'monitor'">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </template>

    <template v-else-if="name === 'bookmark'">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
    </template>

    <template v-else-if="name === 'bookmark-solid'">
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" fill="currentColor" />
    </template>

    <template v-else-if="name === 'terminal'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="m8 10 3 2.5L8 15M13 15h3" />
    </template>

    <template v-else-if="name === 'layers'">
      <path d="m12 3 9 4.5-9 4.5-9-4.5L12 3Z" />
      <path d="m3 12 9 4.5 9-4.5" />
      <path d="m3 16.5 9 4.5 9-4.5" />
    </template>

    <template v-else-if="name === 'shield'">
      <path d="M12 3 5 6v6c0 4.5 3 7.8 7 9 4-1.2 7-4.5 7-9V6l-7-3Z" />
      <path d="m9.5 12 1.8 1.8 3.4-3.6" />
    </template>

    <template v-else-if="name === 'arrow-up-right'">
      <path d="M7 17 17 7M9 7h8v8" />
    </template>

    <template v-else-if="name === 'arrow-right'">
      <path d="M4.5 12h15M13.5 6l6 6-6 6" />
    </template>

    <template v-else-if="name === 'eye'">
      <path d="M2.2 12S5.8 5.5 12 5.5 21.8 12 21.8 12 18.2 18.5 12 18.5 2.2 12 2.2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </template>

    <template v-else-if="name === 'eye-off'">
      <path d="M17.94 17.94A10.1 10.1 0 0 1 12 19c-6.2 0-9.8-7-9.8-7a18.4 18.4 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.2 9.2 0 0 1 12 4c6.2 0 9.8 8 9.8 8a18.5 18.5 0 0 1-2.16 3.19" />
      <path d="m14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <path d="m3 3 18 18" />
    </template>

    <template v-else-if="name === 'copy'">
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </template>

    <template v-else-if="name === 'sliders'">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="var(--bg-surface)" />
      <circle cx="15" cy="12" r="2" fill="var(--bg-surface)" />
      <circle cx="10" cy="18" r="2" fill="var(--bg-surface)" />
    </template>

    <template v-else-if="name === 'flag'">
      <path d="M5 4v16M5 4h11l-2 4 2 4H5" />
    </template>

    <template v-else-if="name === 'edit'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </template>

    <template v-else-if="name === 'check'">
      <path d="M20 6 9 17l-5-5" />
    </template>

    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>

    <template v-else-if="name === 'close'">
      <path d="M18 6 6 18M6 6l12 12" />
    </template>

    <template v-else-if="name === 'menu'">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </template>

    <template v-else-if="name === 'star'">
      <path
        d="m12 3.5 2.6 5.3 5.9.8-4.3 4.2 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.2 5.9-.8L12 3.5Z"
        fill="currentColor"
      />
    </template>

    <template v-else-if="name === 'activity'">
      <path d="M3 12h4l2.5-6 5 12 2.5-6H21" />
    </template>

    <template v-else-if="name === 'columns'">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M12 4v16" />
    </template>
  </svg>
</template>

<script setup>
defineProps({
  name: {
    type: String,
    required: true
  },
  size: {
    type: [Number, String],
    default: 16
  }
});
</script>

<style scoped>
.app-icon {
  display: inline-block;
  vertical-align: middle;
  flex-shrink: 0;
}
</style>
