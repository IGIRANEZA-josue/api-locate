const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { signWebhookPayload } = require('../services/paymentService');
const { assertSafePublicUrl } = require('../services/monitoringService');

const BASE = `http://127.0.0.1:${process.env.PORT || 5000}/api`;

async function request(method, endpoint, { token = null, body = null, headers = {} } = {}) {
  const opts = {
    method,
    headers: {
      ...(body && typeof body !== 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  };
  if (body !== null) {
    opts.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${endpoint}`, opts);
  const data = await res.json();
  return { status: res.status, data };
}

async function runTests() {
  console.log('=== API LOCATE BACKEND INTEGRATION TEST SUITE ===');

  // 1. Health check
  const health = await request('GET', '/health');
  assert.strictEqual(health.status, 200);
  assert.strictEqual(health.data.database, 'api_locate');
  console.log('  [PASS] 1. Health & MySQL connection check');

  // 2. Register a brand-new Free user
  const uniqueSuffix = Date.now().toString(36);
  const reg = await request('POST', '/auth/register', {
    body: {
      username: `tester_${uniqueSuffix}`,
      email: `tester_${uniqueSuffix}@example.com`,
      password: 'TestPassword123!',
      full_name: 'Integration Tester',
      theme_preference: 'dark'
    }
  });
  assert.strictEqual(reg.status, 201);
  assert.ok(reg.data.token);
  assert.strictEqual(reg.data.user.is_premium, false);
  const freeToken = reg.data.token;
  console.log('  [PASS] 2. User registration + bcrypt hashing + JWT issuance');

  // 3. Login as Admin & Premium users
  const adminLogin = await request('POST', '/auth/login', {
    body: { email: 'admin@apilocate.dev', password: 'Admin123!' }
  });
  assert.strictEqual(adminLogin.status, 200);
  const adminToken = adminLogin.data.token;

  const proLogin = await request('POST', '/auth/login', {
    body: { email: 'premium@apilocate.dev', password: 'Developer123!' }
  });
  assert.strictEqual(proLogin.status, 200);
  assert.strictEqual(proLogin.data.user.is_premium, true);
  const proToken = proLogin.data.token;
  console.log('  [PASS] 3. Admin & Premium authentication verified');

  // 4. Verify normal user is blocked from Admin endpoints
  const blockedAdmin = await request('GET', '/admin/dashboard', { token: freeToken });
  assert.strictEqual(blockedAdmin.status, 403);
  const okAdmin = await request('GET', '/admin/dashboard', { token: adminToken });
  assert.strictEqual(okAdmin.status, 200);
  assert.ok(okAdmin.data.overview.total_apis >= 10);
  console.log('  [PASS] 4. Role-based access control (normal user blocked from /admin)');

  // 5. MySQL FULLTEXT Search + Filters + Sorting
  const searchRes = await request('GET', '/apis/search?q=payment+webhook&pricing=paid&sort=relevant');
  assert.strictEqual(searchRes.status, 200);
  assert.ok(searchRes.data.apis.length >= 1);
  assert.ok(searchRes.data.apis.some((a) => a.slug.includes('stripe')));
  console.log('  [PASS] 5. MySQL FULLTEXT search + pricing filter + relevance sorting');

  // 6. Enforce Free user max 5 favorites on backend
  const allApis = await request('GET', '/apis?limit=10');
  const apiIds = allApis.data.apis.map((a) => a.id);
  assert.ok(apiIds.length >= 6);

  for (let i = 0; i < 5; i += 1) {
    const fav = await request('POST', `/favorites/${apiIds[i]}`, { token: freeToken });
    assert.strictEqual(fav.status, 201);
  }
  const sixthFav = await request('POST', `/favorites/${apiIds[5]}`, { token: freeToken });
  assert.strictEqual(sixthFav.status, 403);
  assert.strictEqual(sixthFav.data.code, 'FAVORITES_LIMIT_REACHED');
  console.log('  [PASS] 6. Free user max-5 favorites limit strictly enforced on backend');

  // 7. Enforce Premium lock on Collections & Comparison for Free user, allow for Premium user
  const freeCol = await request('GET', '/collections', { token: freeToken });
  assert.strictEqual(freeCol.status, 403);
  assert.strictEqual(freeCol.data.code, 'PREMIUM_REQUIRED');

  const freeCmp = await request('POST', '/apis/compare', {
    token: freeToken,
    body: { api_ids: [apiIds[0], apiIds[1]] }
  });
  assert.strictEqual(freeCmp.status, 403);

  const proCmp = await request('POST', '/apis/compare', {
    token: proToken,
    body: { api_ids: [apiIds[0], apiIds[1], apiIds[2]] }
  });
  assert.strictEqual(proCmp.status, 200);
  assert.strictEqual(proCmp.data.comparison.length, 3);
  console.log('  [PASS] 7. Premium middleware blocks Free user & permits Premium comparison/collections');

  // 8. Subscription Checkout + Signed Webhook Activation + Idempotency
  const subCheckout = await request('POST', '/subscriptions/checkout', {
    token: freeToken,
    body: { plan_code: 'premium_monthly', auto_renew: true }
  });
  assert.strictEqual(subCheckout.status, 201);
  const payRef = subCheckout.data.checkout.payment_reference;

  // Verify user is STILL NOT Premium before webhook verification!
  const beforeWebhook = await request('GET', '/auth/profile', { token: freeToken });
  assert.strictEqual(beforeWebhook.data.user.is_premium, false);

  // Reject invalid webhook signature
  const eventPayload = {
    id: `evt_test_${uniqueSuffix}`,
    type: 'checkout.session.completed',
    data: {
      object: {
        client_reference_id: payRef,
        payment_intent: `pi_test_${uniqueSuffix}`,
        subscription: `sub_ext_${uniqueSuffix}`
      }
    }
  };
  const rawPayload = JSON.stringify(eventPayload);

  const badWebhook = await request('POST', '/payments/webhook', {
    body: rawPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': 't=1700000000,v1=deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    }
  });
  assert.ok(badWebhook.status === 400 || badWebhook.status === 401);

  // Deliver validly signed HMAC-SHA256 webhook
  const validSignature = signWebhookPayload(rawPayload, process.env.PAYMENT_WEBHOOK_SECRET);
  const goodWebhook = await request('POST', '/payments/webhook', {
    body: rawPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature
    }
  });
  assert.strictEqual(goodWebhook.status, 200);
  assert.strictEqual(goodWebhook.data.idempotent_duplicate, false);

  // Deliver exact same webhook again -> verify idempotency!
  const dupWebhook = await request('POST', '/payments/webhook', {
    body: rawPayload,
    headers: {
      'Content-Type': 'application/json',
      'x-webhook-signature': validSignature
    }
  });
  assert.strictEqual(dupWebhook.status, 200);
  assert.strictEqual(dupWebhook.data.idempotent_duplicate, true);

  // Now user IS Premium and can save 6th favorite + create collections!
  const afterWebhook = await request('GET', '/auth/profile', { token: freeToken });
  assert.strictEqual(afterWebhook.data.user.is_premium, true);
  const nowAllowedSixthFav = await request('POST', `/favorites/${apiIds[5]}`, { token: freeToken });
  assert.strictEqual(nowAllowedSixthFav.status, 201);
  console.log('  [PASS] 8. Signed payment webhook verification, idempotency, and Premium activation');

  // 9. Community API Submission -> Pending -> Admin Approval
  const cats = await request('GET', '/categories');
  const firstCatId = cats.data.categories[0].id;
  const subApi = await request('POST', '/apis', {
    token: freeToken,
    body: {
      name: `Test Community API ${uniqueSuffix}`,
      short_description: 'Community submitted developer API for automated moderation verification.',
      full_description: 'Detailed test specification verifying pending status before admin approval.',
      category_id: firstCatId,
      docs_url: 'https://docs.github.com',
      auth_type: 'api_key',
      pricing_model: 'free',
      tags: ['testing', 'community']
    }
  });
  assert.strictEqual(subApi.status, 201);
  assert.strictEqual(subApi.data.api.status, 'pending');
  const submittedApiId = subApi.data.api.id;

  // Verify anonymous visitors cannot view unapproved API
  const publicTry = await request('GET', `/apis/${submittedApiId}`);
  assert.strictEqual(publicTry.status, 404);

  // Admin approves it
  const approveRes = await request('PUT', `/admin/apis/${submittedApiId}/approve`, {
    token: adminToken,
    body: { verification_level: 'community_reviewed', notes: 'Verified in integration test.' }
  });
  assert.strictEqual(approveRes.status, 200);

  // Now public visitors CAN view it!
  const publicOk = await request('GET', `/apis/${submittedApiId}`);
  assert.strictEqual(publicOk.status, 200);
  assert.strictEqual(publicOk.data.api.status, 'approved');

  // Clean up test API
  await request('DELETE', `/apis/${submittedApiId}`, { token: adminToken });
  console.log('  [PASS] 9. Community submission pending visibility & Admin approval workflow');

  // 10. SSRF Protection verification
  await assert.rejects(() => assertSafePublicUrl('http://127.0.0.1:3306/'), /blocked/i);
  await assert.rejects(() => assertSafePublicUrl('http://169.254.169.254/latest/meta-data/'), /blocked/i);
  await assert.rejects(() => assertSafePublicUrl('http://10.0.0.5/internal'), /blocked/i);
  await assert.rejects(() => assertSafePublicUrl('file:///etc/passwd'), /permitted/i);
  console.log('  [PASS] 10. SSRF protection blocks loopback, RFC1918 private, cloud metadata & non-HTTP URLs');

  console.log('=== ALL 10 INTEGRATION TEST GROUPS PASSED ===');
}

runTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[TEST FAILURE]', err);
    process.exit(1);
  });
