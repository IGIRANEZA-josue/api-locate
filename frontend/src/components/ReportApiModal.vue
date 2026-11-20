<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-panel">
      <div class="flex-between" style="margin-bottom: 1rem;">
        <h3 style="margin: 0;">Report Issue: {{ api.name }}</h3>
        <button type="button" class="btn btn-ghost btn-sm" @click="$emit('close')">✕</button>
      </div>

      <form @submit.prevent="submitReport">
        <div class="form-group">
          <label class="form-label">Problem Category</label>
          <select v-model="reason" class="select" required>
            <option value="broken_docs">Broken Documentation Link</option>
            <option value="incorrect_info">Incorrect API Information (Auth, Pricing, URL)</option>
            <option value="security_concern">Security or Phishing Concern</option>
            <option value="duplicate_listing">Duplicate Listing</option>
            <option value="other">Other Issue</option>
          </select>
        </div>

        <div class="form-group">
          <label class="form-label">Details (minimum 10 characters)</label>
          <textarea
            v-model="details"
            class="textarea"
            placeholder="Describe what needs correction so our moderation team can verify it..."
            required
            minlength="10"
          ></textarea>
        </div>

        <div class="flex-row" style="justify-content: flex-end;">
          <button type="button" class="btn btn-ghost" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn btn-danger" :disabled="submitting">
            {{ submitting ? 'Submitting...' : 'Submit Report' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import http, { extractErrorMessage } from '../api/http';
import { useToastStore } from '../stores/toastStore';

const props = defineProps({
  api: { type: Object, required: true }
});
const emit = defineEmits(['close']);
const toast = useToastStore();

const reason = ref('broken_docs');
const details = ref('');
const submitting = ref(false);

async function submitReport() {
  submitting.value = true;
  try {
    const { data } = await http.post(`/apis/${props.api.id}/reports`, {
      reason: reason.value,
      details: details.value
    });
    toast.success(data.message || 'Report submitted.');
    emit('close');
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    submitting.value = false;
  }
}
</script>
