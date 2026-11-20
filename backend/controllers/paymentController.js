const { pool, parseJson } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const {
  verifyWebhookSignature,
  processVerifiedWebhookEvent
} = require('../services/paymentService');

const getPaymentHistory = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT p.id, p.payment_for, p.subscription_id, p.campaign_id, p.payment_reference,
            p.provider, p.amount, p.currency, p.status, p.failure_reason,
            p.metadata_json, p.paid_at, p.created_at,
            pl.name AS plan_name,
            sc.title AS campaign_title
     FROM payments p
     LEFT JOIN subscriptions s ON s.id = p.subscription_id
     LEFT JOIN plans pl ON pl.id = s.plan_id
     LEFT JOIN sponsored_campaigns sc ON sc.id = p.campaign_id
     WHERE p.user_id = ?
     ORDER BY p.created_at DESC
     LIMIT 50`,
    [req.user.id]
  );

  res.json({
    success: true,
    payments: rows.map((p) => ({
      ...p,
      metadata: parseJson(p.metadata_json, {})
    }))
  });
});

const handlePaymentWebhook = asyncHandler(async (req, res) => {
  const rawBody = req.rawBody;
  if (!rawBody) {
    throw new AppError(
      'Raw request payload is required for cryptographic webhook signature verification.',
      400,
      'RAW_BODY_MISSING'
    );
  }

  const { verified, provider } = verifyWebhookSignature(rawBody, req.headers);

  let eventPayload;
  try {
    eventPayload = JSON.parse(rawBody.toString('utf8'));
  } catch (_) {
    throw new AppError('Invalid JSON in webhook body.', 400, 'INVALID_WEBHOOK_JSON');
  }

  const outcome = await processVerifiedWebhookEvent({
    provider,
    eventPayload,
    signatureVerified: verified
  });

  res.json({
    success: true,
    received: true,
    ...outcome
  });
});

module.exports = {
  getPaymentHistory,
  handlePaymentWebhook
};
