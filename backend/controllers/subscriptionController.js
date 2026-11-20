const { pool, parseJson, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  generatePaymentReference,
  isStripeConfigured,
  createProviderCheckoutSession
} = require('../services/paymentService');
const { createNotification } = require('../services/notificationService');

const getPlans = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT id, code, name, description, price_monthly, currency,
            billing_interval, max_favorites, features_json, is_active
     FROM plans
     WHERE is_active = 1
     ORDER BY price_monthly ASC, id ASC`
  );

  res.json({
    success: true,
    payment_provider: process.env.PAYMENT_PROVIDER || 'stripe',
    payment_provider_configured: isStripeConfigured(),
    plans: rows.map((plan) => ({
      ...plan,
      features: parseJson(plan.features_json, {})
    }))
  });
});

const createSubscriptionCheckout = asyncHandler(async (req, res) => {
  const planId = req.body.plan_id ? Number(req.body.plan_id) : null;
  const planCode = req.body.plan_code ? String(req.body.plan_code).trim() : 'premium_monthly';
  const autoRenew = req.body.auto_renew !== false;

  const [plans] = await pool.query(
    `SELECT * FROM plans
     WHERE is_active = 1 AND ${planId ? 'id = ?' : 'code = ?'}
     LIMIT 1`,
    [planId || planCode]
  );

  if (plans.length === 0) {
    throw new AppError('Selected subscription plan was not found.', 404, 'PLAN_NOT_FOUND');
  }

  const plan = plans[0];
  if (Number(plan.price_monthly) <= 0 || plan.code === 'free') {
    throw new AppError('The Free plan does not require payment checkout.', 400, 'FREE_PLAN_NO_CHECKOUT');
  }

  // Prevent duplicate active subscription unless renewing
  const [activeSubs] = await pool.query(
    `SELECT id, current_period_end, cancel_at_period_end
     FROM subscriptions
     WHERE user_id = ?
       AND status = 'active'
       AND (current_period_end IS NULL OR current_period_end > UTC_TIMESTAMP())
     LIMIT 1`,
    [req.user.id]
  );

  if (activeSubs.length > 0 && !req.body.is_renewal) {
    throw new AppError(
      'You already have an active Premium subscription.',
      409,
      'ALREADY_SUBSCRIBED'
    );
  }

  const paymentReference = generatePaymentReference('PAY-SUB');
  const provider = process.env.PAYMENT_PROVIDER || 'stripe';

  const { subscriptionId, paymentId } = await withTransaction(async (conn) => {
    const [subIns] = await conn.query(
      `INSERT INTO subscriptions (user_id, plan_id, status, payment_provider, auto_renew)
       VALUES (?, ?, 'pending', ?, ?)`,
      [req.user.id, plan.id, provider, autoRenew ? 1 : 0]
    );

    const [payIns] = await conn.query(
      `INSERT INTO payments
       (user_id, payment_for, subscription_id, payment_reference, provider, amount, currency, status, metadata_json)
       VALUES (?, 'subscription', ?, ?, ?, ?, ?, 'pending', ?)`,
      [
        req.user.id,
        subIns.insertId,
        paymentReference,
        provider,
        plan.price_monthly,
        plan.currency || 'USD',
        JSON.stringify({
          plan_id: plan.id,
          plan_code: plan.code,
          plan_name: plan.name,
          billing_interval: plan.billing_interval
        })
      ]
    );

    return { subscriptionId: subIns.insertId, paymentId: payIns.insertId };
  });

  const checkout = await createProviderCheckoutSession({
    paymentReference,
    amount: plan.price_monthly,
    currency: plan.currency || 'USD',
    productName: `API Locate - ${plan.name}`,
    productDescription: plan.description,
    customerEmail: req.user.email,
    mode: autoRenew ? 'subscription' : 'payment',
    billingInterval: plan.billing_interval,
    successPath: '/dashboard/subscription',
    cancelPath: '/pricing',
    metadata: {
      subscription_id: subscriptionId,
      payment_id: paymentId,
      user_id: req.user.id
    }
  });

  if (checkout.session_id) {
    await pool.query('UPDATE payments SET provider_session_id = ? WHERE id = ?', [
      checkout.session_id,
      paymentId
    ]);
  }

  res.status(201).json({
    success: true,
    message: checkout.provider_configured
      ? 'Checkout session created. Complete payment with the provider to activate Premium.'
      : 'Pending subscription order created. Configure Stripe keys in backend/.env for live card checkout, or verify via signed payment webhook.',
    checkout: {
      subscription_id: subscriptionId,
      payment_id: paymentId,
      payment_reference: paymentReference,
      amount: plan.price_monthly,
      currency: plan.currency,
      status: 'pending',
      ...checkout
    }
  });
});

const getMySubscription = asyncHandler(async (req, res) => {
  // Expire overdue records first
  await pool.query(
    `UPDATE subscriptions
     SET status = 'expired'
     WHERE user_id = ?
       AND status = 'active'
       AND current_period_end IS NOT NULL
       AND current_period_end <= UTC_TIMESTAMP()`,
    [req.user.id]
  );

  const [subs] = await pool.query(
    `SELECT s.*, p.code AS plan_code, p.name AS plan_name, p.price_monthly,
            p.currency, p.billing_interval, p.max_favorites, p.features_json
     FROM subscriptions s
     INNER JOIN plans p ON p.id = s.plan_id
     WHERE s.user_id = ?
     ORDER BY FIELD(s.status, 'active', 'past_due', 'pending', 'canceled', 'expired', 'failed'),
              s.created_at DESC
     LIMIT 15`,
    [req.user.id]
  );

  const formatted = subs.map((s) => ({
    ...s,
    auto_renew: Boolean(s.auto_renew),
    cancel_at_period_end: Boolean(s.cancel_at_period_end),
    features: parseJson(s.features_json, {})
  }));

  const currentActive = formatted.find(
    (s) =>
      s.status === 'active' &&
      (!s.current_period_end || new Date(s.current_period_end) > new Date())
  ) || null;

  res.json({
    success: true,
    is_premium: req.user.is_premium,
    active_subscription: currentActive,
    subscriptions: formatted,
    payment_provider_configured: isStripeConfigured()
  });
});

const cancelSubscription = asyncHandler(async (req, res) => {
  const subscriptionId = req.body.subscription_id ? Number(req.body.subscription_id) : null;

  const [rows] = await pool.query(
    `SELECT * FROM subscriptions
     WHERE user_id = ?
       AND status IN ('active', 'past_due', 'pending')
       ${subscriptionId ? 'AND id = ?' : ''}
     ORDER BY FIELD(status, 'active', 'past_due', 'pending'), id DESC
     LIMIT 1`,
    subscriptionId ? [req.user.id, subscriptionId] : [req.user.id]
  );

  if (rows.length === 0) {
    throw new AppError('No active or pending subscription found to cancel.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  const sub = rows[0];

  if (sub.status === 'pending') {
    await withTransaction(async (conn) => {
      await conn.query(
        "UPDATE subscriptions SET status = 'canceled', auto_renew = 0, canceled_at = UTC_TIMESTAMP() WHERE id = ?",
        [sub.id]
      );
      await conn.query(
        "UPDATE payments SET status = 'canceled' WHERE subscription_id = ? AND status = 'pending'",
        [sub.id]
      );
    });

    return res.json({
      success: true,
      message: 'Pending subscription order has been canceled.'
    });
  }

  const immediate = Boolean(req.body.immediate);
  if (immediate) {
    await pool.query(
      `UPDATE subscriptions
       SET status = 'canceled', auto_renew = 0, cancel_at_period_end = 0, canceled_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [sub.id]
    );
  } else {
    await pool.query(
      `UPDATE subscriptions
       SET auto_renew = 0, cancel_at_period_end = 1, canceled_at = UTC_TIMESTAMP()
       WHERE id = ?`,
      [sub.id]
    );
  }

  await createNotification(pool, {
    userId: req.user.id,
    type: 'subscription_canceled',
    title: 'Subscription Cancellation Updated',
    message: immediate
      ? 'Your Premium subscription was canceled immediately.'
      : 'Auto-renewal has been turned off. You retain Premium access until the end of your current billing period.',
    linkUrl: '/dashboard/subscription'
  });

  res.json({
    success: true,
    message: immediate
      ? 'Subscription canceled immediately.'
      : 'Auto-renewal canceled. Your Premium benefits remain active until the end of your current billing period.'
  });
});

const reactivateAutoRenew = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT * FROM subscriptions
     WHERE user_id = ? AND status = 'active' AND cancel_at_period_end = 1
     ORDER BY id DESC LIMIT 1`,
    [req.user.id]
  );

  if (rows.length === 0) {
    throw new AppError('No active canceling subscription found to reactivate.', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  await pool.query(
    'UPDATE subscriptions SET auto_renew = 1, cancel_at_period_end = 0, canceled_at = NULL WHERE id = ?',
    [rows[0].id]
  );

  res.json({
    success: true,
    message: 'Automatic renewal has been re-enabled for your subscription.'
  });
});

module.exports = {
  getPlans,
  createSubscriptionCheckout,
  getMySubscription,
  cancelSubscription,
  reactivateAutoRenew
};
