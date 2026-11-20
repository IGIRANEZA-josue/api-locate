<template>
  <div class="container page-section" style="max-width: 920px;">
    <div class="page-header">
      <div>
        <h1 class="page-title">Contact API Locate</h1>
        <p class="page-subtitle">
          Questions about provider verification, OpenAPI repository partnerships, or account support?
        </p>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Send a Message</h3>
        <div v-if="sent" class="alert alert-success">
          Your inquiry has been delivered to our platform administrators. Thank you!
        </div>

        <form @submit.prevent="submitContact">
          <div class="form-group">
            <label class="form-label">Your Name</label>
            <input v-model="form.name" type="text" class="input" required placeholder="Jane Developer" />
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input v-model="form.email" type="email" class="input" required placeholder="jane@example.com" />
          </div>
          <div class="form-group">
            <label class="form-label">Subject</label>
            <input
              v-model="form.subject"
              type="text"
              class="input"
              required
              placeholder="Provider verification / General inquiry"
            />
          </div>
          <div class="form-group">
            <label class="form-label">Message</label>
            <textarea
              v-model="form.message"
              class="textarea"
              required
              minlength="10"
              placeholder="How can our team help?"
            ></textarea>
          </div>
          <button type="submit" class="btn btn-primary" :disabled="sending">
            {{ sending ? 'Sending...' : 'Send Inquiry' }}
          </button>
        </form>
      </div>

      <div class="card">
        <h3>Direct Channels</h3>
        <p style="font-size: 0.9rem;">
          For broken documentation links or inaccurate auth metadata on a specific API, use the
          <strong>Report issue</strong> action directly on that API's details page for fastest
          moderator action.
        </p>

        <div style="margin-top: 1.25rem;">
          <h4>API Providers</h4>
          <p style="font-size: 0.88rem;">
            Register a standard developer account and visit your
            <router-link to="/provider/dashboard">Provider Dashboard</router-link>
            to request company verification and manage your published APIs.
          </p>
        </div>

        <div style="margin-top: 1.25rem;">
          <h4>Public Repository Maintainers</h4>
          <p style="font-size: 0.88rem; margin-bottom: 0;">
            Want your permitted OpenAPI directory indexed with full license attribution? Reach out
            via this form with your feed URL and rate-limit policy.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import http, { extractErrorMessage } from '../../api/http';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '../../stores/toastStore';

const authStore = useAuthStore();
const toast = useToastStore();

const sending = ref(false);
const sent = ref(false);
const form = reactive({
  name: '',
  email: '',
  subject: '',
  message: ''
});

async function submitContact() {
  sending.value = true;
  try {
    const { data } = await http.post('/contact', form);
    sent.value = true;
    form.subject = '';
    form.message = '';
    toast.success(data.message);
  } catch (err) {
    toast.error(extractErrorMessage(err));
  } finally {
    sending.value = false;
  }
}

onMounted(() => {
  if (authStore.user) {
    form.name = authStore.user.full_name || authStore.user.username || '';
    form.email = authStore.user.email || '';
  }
});
</script>
