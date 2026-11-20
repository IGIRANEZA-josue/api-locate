const { pool, parseJson } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

const getDashboardOverview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const [
    [[favCount]],
    [[colCount]],
    [[subCount]],
    [[revCount]],
    [[campCount]],
    [freePlanRows],
    [recentFavorites],
    [mySubmissions],
    [notifications]
  ] = await Promise.all([
    pool.query('SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?', [userId]),
    pool.query('SELECT COUNT(*) AS count FROM collections WHERE user_id = ?', [userId]),
    pool.query('SELECT COUNT(*) AS count FROM apis WHERE submitted_by = ?', [userId]),
    pool.query('SELECT COUNT(*) AS count FROM api_reviews WHERE user_id = ?', [userId]),
    pool.query('SELECT COUNT(*) AS count FROM sponsored_campaigns WHERE advertiser_user_id = ?', [userId]),
    pool.query("SELECT max_favorites FROM plans WHERE code = 'free' LIMIT 1"),
    pool.query(
      `SELECT a.id, a.name, a.slug, a.logo_url, a.short_description, a.pricing_model,
              a.auth_type, a.verification_level, c.name AS category_name, c.slug AS category_slug,
              f.created_at AS favorited_at
       FROM favorites f
       INNER JOIN apis a ON a.id = f.api_id
       INNER JOIN categories c ON c.id = a.category_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC
       LIMIT 6`,
      [userId]
    ),
    pool.query(
      `SELECT a.id, a.name, a.slug, a.status, a.source_type, a.verification_level,
              a.rejection_reason, a.created_at, c.name AS category_name
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       WHERE a.submitted_by = ?
       ORDER BY a.created_at DESC
       LIMIT 8`,
      [userId]
    ),
    pool.query(
      `SELECT id, type, title, message, link_url, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    )
  ]);

  // Personalized API recommendations for Premium users
  let recommendations = [];
  if (req.user.is_premium) {
    const [recRows] = await pool.query(
      `SELECT a.id, a.name, a.slug, a.logo_url, a.short_description, a.provider_name,
              a.pricing_model, a.auth_type, a.verification_level, a.average_rating, a.reviews_count,
              c.name AS category_name, c.slug AS category_slug
       FROM apis a
       INNER JOIN categories c ON c.id = a.category_id
       WHERE a.status = 'approved'
         AND a.id NOT IN (SELECT api_id FROM favorites WHERE user_id = ?)
       ORDER BY
         (a.category_id IN (
           SELECT a2.category_id
           FROM favorites f2
           INNER JOIN apis a2 ON a2.id = f2.api_id
           WHERE f2.user_id = ?
         )) DESC,
         a.average_rating DESC,
         a.views_count DESC
       LIMIT 4`,
      [userId, userId]
    );
    recommendations = recRows;
  }

  const maxFavorites = req.user.is_premium
    ? null
    : (freePlanRows[0]?.max_favorites ?? 5);

  res.json({
    success: true,
    stats: {
      favorites_count: favCount.count,
      max_favorites: maxFavorites,
      collections_count: colCount.count,
      submissions_count: subCount.count,
      reviews_count: revCount.count,
      campaigns_count: campCount.count,
      is_premium: req.user.is_premium
    },
    recent_favorites: recentFavorites,
    my_submissions: mySubmissions,
    notifications: notifications.map((n) => ({ ...n, is_read: Boolean(n.is_read) })),
    recommendations
  });
});

const getMySubmissions = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug
     FROM apis a
     INNER JOIN categories c ON c.id = a.category_id
     WHERE a.submitted_by = ? OR a.owner_user_id = ?
     ORDER BY a.created_at DESC`,
    [req.user.id, req.user.id]
  );

  res.json({
    success: true,
    apis: rows.map((r) => ({
      ...r,
      features_json: parseJson(r.features_json, {})
    }))
  });
});

const getNotifications = asyncHandler(async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, type, title, message, link_url, is_read, read_at, created_at
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50`,
    [req.user.id]
  );

  const unreadCount = rows.filter((n) => !n.is_read).length;
  res.json({
    success: true,
    unread_count: unreadCount,
    notifications: rows.map((n) => ({ ...n, is_read: Boolean(n.is_read) }))
  });
});

const markNotificationRead = asyncHandler(async (req, res) => {
  const notifId = Number(req.params.id);
  const [result] = await pool.query(
    `UPDATE notifications
     SET is_read = 1, read_at = UTC_TIMESTAMP()
     WHERE id = ? AND user_id = ?`,
    [notifId, req.user.id]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Notification not found.', 404, 'NOTIFICATION_NOT_FOUND');
  }

  res.json({ success: true, message: 'Notification marked as read.' });
});

const markAllNotificationsRead = asyncHandler(async (req, res) => {
  await pool.query(
    `UPDATE notifications
     SET is_read = 1, read_at = UTC_TIMESTAMP()
     WHERE user_id = ? AND is_read = 0`,
    [req.user.id]
  );
  res.json({ success: true, message: 'All notifications marked as read.' });
});

module.exports = {
  getDashboardOverview,
  getMySubmissions,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead
};
