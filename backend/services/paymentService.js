const crypto = require('crypto');
const { withTransaction, parseJson } = require('../config/db');
const { AppError } = require('../middleware/errorMiddleware');
const { createNotification } = require('./notificationService');

function generatePaymentReference(prefix = 'PAY') {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(6).toString('hex').toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

function isStripeConfigured() {
  const key = (process.env.STRIPE_SECRET_KEY || '').trim();
  return Boolean(key && (key.startsWith('sk_test_') || key.startsWith('sk_live_')));
}

/**
 * Creates a real Stripe Checkout Session via Stripe REST API when STRIPE_SECRET_KEY is configured.
 * Never invents credentials or fakes successful payment when unconfigured.
 */
async function createProviderCheckoutSession({
  paymentReference,
  amount,
  currency = 'USD',
  productName,
  productDescription,
  customerEmail,
  mode = 'payment',
  billingInterval = 'month',
  successPath = '/dashboard/subscription',
  cancelPath = '/pricing',
  metadata = {}
}) {
  if (!isStripeConfigured()) {
    return {
      provider: process.env.PAYMENT_PROVIDER || 'stripe',
      provider_configured: false,
      checkout_url: null,
      session_id: null,
      configuration_notice:
        'Live payment provider credentials are not configured in backend/.env. Set STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET to enable hosted Stripe Checkout.'
    };
  }

  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const unitAmountCents = Math.round(Number(amount) * 100);

  const form = new URLSearchParams();
  form.append('mode', mode);
  form.append('client_reference_id', paymentReference);
  if (customerEmail) {
    form.append('customer_email', customerEmail);
  }
  form.append('success_url', `${frontendUrl}${successPath}?ref=${encodeURIComponent(paymentReference)}`);
  form.append('cancel_url', `${frontendUrl}${cancelPath}?canceled=1`);
  form.append('line_items[0][quantity]', '1');
  form.append('line_items[0][price_data][currency]', String(currency).toLowerCase());
  form.append('line_items[0][price_data][unit_amount]', String(unitAmountCents));
  form.append('line_items[0][price_data][product_data][name]', productName);
  if (productDescription) {
    form.append('line_items[0][price_data][product_data][description]', productDescription);
  }
  if (mode === 'subscription') {
    form.append(
      'line_items[0][price_data][recurring][interval]',
      billingInterval === 'year' ? 'year' : 'month'
    );
  }

  const allMeta = { payment_reference: paymentReference, ...metadata };
  for (const [key, val] of Object.entries(allMeta)) {
    if (val !== undefined && val !== null) {
      form.append(`metadata[${key}]`, String(val));
    }
  }

  const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY.trim()}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: form.toString()
  });

  const data = await response.json();
  if (!response.ok) {
    throw new AppError(
      data?.error?.message || 'Payment provider failed to create checkout session.',
      502,
      'PAYMENT_PROVIDER_ERROR'
    );
  }

  return {
    provider: 'stripe',
    provider_configured: true,
    checkout_url: data.url,
    session_id: data.id,
    configuration_notice: null
  };
}

/**
 * Verifies an HMAC-SHA256 signed webhook header (`t=<unix>,v1=<hex>`) using constant-time comparison.
 * Supports Stripe-Signature with STRIPE_WEBHOOK_SECRET or X-Webhook-Signature with PAYMENT_WEBHOOK_SECRET.
 */
function verifyWebhookSignature(rawBodyBuffer, headers) {
  const stripeSig = headers['stripe-signature'];
  const customSig = headers['x-webhook-signature'];
  const signatureHeader = stripeSig || customSig;

  if (!signatureHeader) {
    throw new AppError('Missing webhook signature header.', 400, 'MISSING_WEBHOOK_SIGNATURE');
  }

  const secret = stripeSig
    ? (process.env.STRIPE_WEBHOOK_SECRET || process.env.PAYMENT_WEBHOOK_SECRET || '').trim()
    : (process.env.PAYMENT_WEBHOOK_SECRET || process.env.STRIPE_WEBHOOK_SECRET || '').trim();

  if (!secret) {
    throw new AppError(
      'Webhook secret is not configured on the server (STRIPE_WEBHOOK_SECRET / PAYMENT_WEBHOOK_SECRET).',
      500,
      'WEBHOOK_SECRET_NOT_CONFIGURED'
    );
  }

  const parts = String(signatureHeader)
    .split(',')
    .reduce((acc, item) => {
      const [k, v] = item.trim().split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {});

  const timestamp = parts.t;
  const providedSig = parts.v1;

  if (!timestamp || !providedSig) {
    throw new AppError(
      'Invalid webhook signature format. Expected "t=<unix_timestamp>,v1=<hmac_sha256>".',
      400,
      'INVALID_WEBHOOK_SIGNATURE_FORMAT'
    );
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const tsSeconds = Number(timestamp);
  if (Number.isNaN(tsSeconds) || Math.abs(nowSeconds - tsSeconds) > 300) {
    throw new AppError('Webhook timestamp outside allowable 5-minute tolerance window.', 400, 'WEBHOOK_TIMESTAMP_EXPIRED');
  }

  const rawString = Buffer.isBuffer(rawBodyBuffer)
    ? rawBodyBuffer.toString('utf8')
    : String(rawBodyBuffer);

  const signedPayload = `${timestamp}.${rawString}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  const expectedBuf = Buffer.from(expectedSig, 'hex');
  const providedBuf = Buffer.from(providedSig, 'hex');

  if (expectedBuf.length !== providedBuf.length || !crypto.timingSafeEqual(expectedBuf, providedBuf)) {
    throw new AppError('Webhook cryptographic signature verification failed.', 401, 'INVALID_WEBHOOK_SIGNATURE');
  }

  return {
    verified: true,
    provider: stripeSig ? 'stripe' : (process.env.PAYMENT_PROVIDER || 'stripe')
  };
}

/**
 * Helper to create an HMAC signature (useful for automated tests & documented webhook testing).
 */
function signWebhookPayload(rawString, secret, timestampSeconds = Math.floor(Date.now() / 1000)) {
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${timestampSeconds}.${rawString}`, 'utf8')
    .digest('hex');
  return `t=${timestampSeconds},v1=${sig}`;
}

/**
 * Processes a verified payment event idempotently inside a MySQL transaction.
 */
async function processVerifiedWebhookEvent({ provider, eventPayload, signatureVerified = true }) {
  const eventId = eventPayload?.id;
  const eventType = eventPayload?.type;

  if (!eventId || !eventType) {
    throw new AppError('Webhook payload must contain event id and type.', 400, 'INVALID_WEBHOOK_PAYLOAD');
  }

  const dataObject = eventPayload?.data?.object || eventPayload?.data || {};
  const paymentReference =
    dataObject.client_reference_id ||
    dataObject.payment_reference ||
    dataObject?.metadata?.payment_reference ||
    null;
  const providerTransactionId = dataObject.payment_intent || dataObject.transaction_id || dataObject.id || null;
  const externalSubscriptionId = dataObject.subscription || dataObject.external_subscription_id || null;

  return withTransaction(async (conn) => {
    // 1. Idempotency check in payment_events
    const [existingEvents] = await conn.query(
      'SELECT id, processing_status FROM payment_events WHERE provider = ? AND event_id = ? LIMIT 1 FOR UPDATE',
      [provider, eventId]
    );

    if (existingEvents.length > 0) {
      return {
        idempotent_duplicate: true,
        event_id: eventId,
        status: existingEvents[0].processing_status
      };
    }

    // 2. Locate associated payment record
    let payment = null;
    if (paymentReference) {
      const [payments] = await conn.query(
        'SELECT * FROM payments WHERE payment_reference = ? LIMIT 1 FOR UPDATE',
        [paymentReference]
      );
      if (payments.length > 0) {
        payment = payments[0];
      }
    } else if (externalSubscriptionId) {
      const [subs] = await conn.query(
        'SELECT * FROM subscriptions WHERE external_subscription_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
        [externalSubscriptionId]
      );
      if (subs.length > 0) {
        const [payments] = await conn.query(
          'SELECT * FROM payments WHERE subscription_id = ? ORDER BY id DESC LIMIT 1 FOR UPDATE',
          [subs[0].id]
        );
        if (payments.length > 0) payment = payments[0];
      }
    }

    // Sanitize stored event metadata so secrets/card details are never persisted
    const safeSummary = {
      id: eventId,
      type: eventType,
      payment_reference: paymentReference,
      provider_transaction_id: providerTransactionId
    };

    if (!payment) {
      await conn.query(
        `INSERT INTO payment_events
         (provider, event_id, event_type, payment_id, signature_verified, processing_status, payload_json, processed_at)
         VALUES (?, ?, ?, NULL, ?, 'ignored', ?, UTC_TIMESTAMP())`,
        [provider, eventId, eventType, signatureVerified ? 1 : 0, JSON.stringify(safeSummary)]
      );
      return {
        idempotent_duplicate: false,
        event_id: eventId,
        status: 'ignored',
        reason: 'No matching payment_reference found.'
      };
    }

    // 3. Handle payment state transitions
    const isSuccessEvent = [
      'checkout.session.completed',
      'payment.succeeded',
      'payment_intent.succeeded',
      'invoice.payment_succeeded'
    ].includes(eventType);

    const isFailureEvent = [
      'payment.failed',
      'payment_intent.payment_failed',
      'invoice.payment_failed'
    ].includes(eventType);

    if (isSuccessEvent) {
      await conn.query(
        `UPDATE payments
         SET status = 'succeeded',
             provider_transaction_id = COALESCE(?, provider_transaction_id),
             paid_at = COALESCE(paid_at, UTC_TIMESTAMP()),
             failure_reason = NULL
         WHERE id = ?`,
        [providerTransactionId, payment.id]
      );

      if (payment.payment_for === 'subscription' && payment.subscription_id) {
        const [subRows] = await conn.query(
          `SELECT s.*, p.billing_interval, p.name AS plan_name
           FROM subscriptions s
           INNER JOIN plans p ON p.id = s.plan_id
           WHERE s.id = ? LIMIT 1 FOR UPDATE`,
          [payment.subscription_id]
        );

        if (subRows.length > 0) {
          const sub = subRows[0];
          const intervalSql = sub.billing_interval === 'year' ? 'INTERVAL 1 YEAR' : 'INTERVAL 30 DAY';

          // Expire any other active subscriptions for this user before activating the new/renewed one
          await conn.query(
            `UPDATE subscriptions
             SET status = 'expired'
             WHERE user_id = ? AND id != ? AND status = 'active'`,
            [payment.user_id, sub.id]
          );

          // If renewing an already active future-dated subscription, extend from current_period_end; else from UTC_TIMESTAMP()
          await conn.query(
            `UPDATE subscriptions
             SET status = 'active',
                 external_subscription_id = COALESCE(?, external_subscription_id),
                 cancel_at_period_end = 0,
                 current_period_start = CASE
                   WHEN status = 'active' AND current_period_end > UTC_TIMESTAMP() THEN current_period_start
                   ELSE UTC_TIMESTAMP()
                 END,
                 current_period_end = CASE
                   WHEN status = 'active' AND current_period_end > UTC_TIMESTAMP()
                     THEN DATE_ADD(current_period_end, ${intervalSql})
                   ELSE DATE_ADD(UTC_TIMESTAMP(), ${intervalSql})
                 END
             WHERE id = ?`,
            [externalSubscriptionId, sub.id]
          );

          await createNotification(conn, {
            userId: payment.user_id,
            type: 'subscription_activated',
            title: `${sub.plan_name} Activated`,
            message: `Your payment (${payment.payment_reference}) was verified and your ${sub.plan_name} subscription is now active.`,
            linkUrl: '/dashboard/subscription'
          });
        }
      } else if (payment.payment_for === 'campaign' && payment.campaign_id) {
        await conn.query(
          `UPDATE sponsored_campaigns
           SET payment_status = 'paid',
               campaign_status = CASE
                 WHEN approval_status = 'approved' THEN 'active'
                 ELSE 'pending_review'
               END
           WHERE id = ?`,
          [payment.campaign_id]
        );

        await createNotification(conn, {
          userId: payment.user_id,
          type: 'campaign_paid',
          title: 'Sponsored Campaign Payment Verified',
          message: `Payment ${payment.payment_reference} succeeded. Your sponsored campaign has been queued for administrator review.`,
          linkUrl: '/provider/campaigns'
        });
      }
    } else if (isFailureEvent) {
      const failureMessage =
        dataObject.failure_message ||
        dataObject?.last_payment_error?.message ||
        'Payment declined or failed at payment provider.';

      await conn.query(
        `UPDATE payments
         SET status = 'failed',
             failure_reason = ?
         WHERE id = ?`,
        [String(failureMessage).slice(0, 300), payment.id]
      );

      if (payment.payment_for === 'subscription' && payment.subscription_id) {
        await conn.query(
          `UPDATE subscriptions
           SET status = CASE WHEN status = 'active' THEN 'past_due' ELSE 'failed' END
           WHERE id = ?`,
          [payment.subscription_id]
        );

        await createNotification(conn, {
          userId: payment.user_id,
          type: 'payment_failed',
          title: 'Subscription Payment Failed',
          message: `We could not verify payment ${payment.payment_reference}: ${failureMessage}`,
          linkUrl: '/dashboard/subscription'
        });
      } else if (payment.payment_for === 'campaign' && payment.campaign_id) {
        await conn.query(
          `UPDATE sponsored_campaigns
           SET payment_status = 'failed'
           WHERE id = ?`,
          [payment.campaign_id]
        );
      }
    }

    // 4. Record processed event in payment_events to guarantee idempotency
    await conn.query(
      `INSERT INTO payment_events
       (provider, event_id, event_type, payment_id, signature_verified, processing_status, payload_json, processed_at)
       VALUES (?, ?, ?, ?, ?, 'processed', ?, UTC_TIMESTAMP())`,
      [provider, eventId, eventType, payment.id, signatureVerified ? 1 : 0, JSON.stringify(safeSummary)]
    );

    const existingMeta = parseJson(payment.metadata_json, {});
    return {
      idempotent_duplicate: false,
      event_id: eventId,
      payment_id: payment.id,
      payment_reference: payment.payment_reference,
      payment_for: payment.payment_for,
      metadata: existingMeta,
      status: 'processed'
    };
  });
}

module.exports = {
  generatePaymentReference,
  isStripeConfigured,
  createProviderCheckoutSession,
  verifyWebhookSignature,
  signWebhookPayload,
  processVerifiedWebhookEvent
};
