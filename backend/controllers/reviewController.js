const { pool, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const { sanitizeText, validateEnum } = require('../middleware/validationMiddleware');

const REPORT_REASONS = [
  'broken_docs',
  'incorrect_info',
  'security_concern',
  'duplicate_listing',
  'other'
];

async function recalculateApiRating(conn, apiId) {
  const [[agg]] = await conn.query(
    `SELECT COUNT(*) AS count, COALESCE(AVG(rating), 0) AS avg_rating
     FROM api_reviews
     WHERE api_id = ? AND status = 'visible'`,
    [apiId]
  );

  await conn.query(
    'UPDATE apis SET reviews_count = ?, average_rating = ? WHERE id = ?',
    [agg.count, Number(Number(agg.avg_rating || 0).toFixed(2)), apiId]
  );
}

const getApiReviews = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);

  const [[reviews], [distribution]] = await Promise.all([
    pool.query(
      `SELECT r.id, r.api_id, r.user_id, r.rating, r.title, r.comment,
              r.created_at, r.updated_at,
              u.username, u.full_name, u.avatar_url
       FROM api_reviews r
       INNER JOIN users u ON u.id = r.user_id
       WHERE r.api_id = ? AND r.status = 'visible'
       ORDER BY r.created_at DESC`,
      [apiId]
    ),
    pool.query(
      `SELECT rating, COUNT(*) AS count
       FROM api_reviews
       WHERE api_id = ? AND status = 'visible'
       GROUP BY rating`,
      [apiId]
    )
  ]);

  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  for (const row of distribution) {
    breakdown[row.rating] = row.count;
  }

  res.json({
    success: true,
    total_reviews: reviews.length,
    breakdown,
    reviews
  });
});

const upsertApiReview = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const rating = Number(req.body.rating);
  const title = sanitizeText(req.body.title, 150);
  const comment = sanitizeText(req.body.comment, 3000);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new AppError('Rating must be a whole number between 1 and 5.', 400, 'INVALID_RATING');
  }

  const [apiRows] = await pool.query(
    "SELECT id, name FROM apis WHERE id = ? AND status = 'approved' LIMIT 1",
    [apiId]
  );
  if (apiRows.length === 0) {
    throw new AppError('Approved API listing not found.', 404, 'API_NOT_FOUND');
  }

  await withTransaction(async (conn) => {
    await conn.query(
      `INSERT INTO api_reviews (api_id, user_id, rating, title, comment, status)
       VALUES (?, ?, ?, ?, ?, 'visible')
       ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         title = VALUES(title),
         comment = VALUES(comment),
         status = 'visible'`,
      [apiId, req.user.id, rating, title, comment]
    );

    await recalculateApiRating(conn, apiId);
  });

  const [saved] = await pool.query(
    `SELECT r.id, r.api_id, r.user_id, r.rating, r.title, r.comment, r.created_at, r.updated_at,
            u.username, u.full_name, u.avatar_url
     FROM api_reviews r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.api_id = ? AND r.user_id = ?
     LIMIT 1`,
    [apiId, req.user.id]
  );

  res.status(201).json({
    success: true,
    message: 'Your review has been saved.',
    review: saved[0]
  });
});

const deleteApiReview = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const reviewId = Number(req.params.reviewId);

  await withTransaction(async (conn) => {
    const [rows] = await conn.query(
      'SELECT * FROM api_reviews WHERE id = ? AND api_id = ? LIMIT 1',
      [reviewId, apiId]
    );

    if (rows.length === 0) {
      throw new AppError('Review not found.', 404, 'REVIEW_NOT_FOUND');
    }

    if (rows[0].user_id !== req.user.id && req.user.role !== 'admin') {
      throw new AppError('You can only delete your own reviews.', 403, 'FORBIDDEN');
    }

    await conn.query('DELETE FROM api_reviews WHERE id = ?', [reviewId]);
    await recalculateApiRating(conn, apiId);
  });

  res.json({
    success: true,
    message: 'Review deleted.'
  });
});

const createApiReport = asyncHandler(async (req, res) => {
  const apiId = Number(req.params.id);
  const reason = validateEnum(req.body.reason, REPORT_REASONS, 'Report reason');
  const details = sanitizeText(req.body.details, 3000);

  if (!details || details.length < 10) {
    throw new AppError(
      'Please provide at least 10 characters explaining the issue.',
      400,
      'REPORT_DETAILS_REQUIRED'
    );
  }

  const [apiRows] = await pool.query('SELECT id, name FROM apis WHERE id = ? LIMIT 1', [apiId]);
  if (apiRows.length === 0) {
    throw new AppError('API listing not found.', 404, 'API_NOT_FOUND');
  }

  const [ins] = await pool.query(
    `INSERT INTO api_reports (api_id, reporter_user_id, reason, details, status)
     VALUES (?, ?, ?, ?, 'open')`,
    [apiId, req.user.id, reason, details]
  );

  res.status(201).json({
    success: true,
    message: 'Thank you. Your report has been submitted for administrator review.',
    report_id: ins.insertId
  });
});

module.exports = {
  getApiReviews,
  upsertApiReview,
  deleteApiReview,
  createApiReport,
  recalculateApiRating
};
