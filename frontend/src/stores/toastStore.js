import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);
  let nextId = 1;

  function show(message, type = 'info', duration = 4200) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    if (duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  }

  return {
    toasts,
    show,
    dismiss,
    success: (msg) => show(msg, 'success'),
    error: (msg) => show(msg, 'error', 5500),
    warning: (msg) => show(msg, 'warning', 5000),
    info: (msg) => show(msg, 'info')
  };
});
