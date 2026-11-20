const { pool, withTransaction } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const { attachTagsAndFavorites } = require('./apiController');

async function getFreePlanMaxFavorites(executor) {
  const [rows] = await executor.query(
    "SELECT max_favorites FROM plans WHERE code = 'free' LIMIT 1"
  );
  return rows.length > 0 && rows[0].max_favorites !== null
    ? Number(rows[0].max_favorites)
    : 5;
}

const getFavorites = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [rows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
            pp.slug AS provider_slug, pp.verification_status AS provider_verification_status,
            f.created_at AS favorited_at
     FROM favorites f
     INNER JOIN apis a ON a.id = f.api_id
     INNER JOIN categories c ON c.id = a.category_id
     LEFT JOIN provider_profiles pp ON pp.id = a.provider_profile_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );

  const enriched = await attachTagsAndFavorites(rows, userId);
  const maxFavorites = req.user.is_premium ? null : await getFreePlanMaxFavorites(pool);

  res.json({
    success: true,
    quota: {
      current_count: enriched.length,
      max_favorites: maxFavorites,
      is_unlimited: req.user.is_premium
    },
    favorites: enriched
  });
});

const addFavorite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const apiId = Number(req.params.apiId);

  if (!apiId) {
    throw new AppError('Valid API ID is required.', 400, 'INVALID_API_ID');
  }

  const result = await withTransaction(async (conn) => {
    const [apiRows] = await conn.query(
      "SELECT id, name FROM apis WHERE id = ? AND status = 'approved' LIMIT 1",
      [apiId]
    );
    if (apiRows.length === 0) {
      throw new AppError('Approved API listing not found.', 404, 'API_NOT_FOUND');
    }

    const [existing] = await conn.query(
      'SELECT id FROM favorites WHERE user_id = ? AND api_id = ? LIMIT 1 FOR UPDATE',
      [userId, apiId]
    );
    if (existing.length > 0) {
      return { alreadySaved: true, apiName: apiRows[0].name };
    }

    if (!req.user.is_premium) {
      const maxFavorites = await getFreePlanMaxFavorites(conn);
      const [[countRow]] = await conn.query(
        'SELECT COUNT(*) AS count FROM favorites WHERE user_id = ? FOR UPDATE',
        [userId]
      );
      if (countRow.count >= maxFavorites) {
        throw new AppError(
          `Free accounts can save up to ${maxFavorites} favorite APIs. Upgrade to Premium for unlimited favorites.`,
          403,
          'FAVORITES_LIMIT_REACHED',
          {
            max_favorites: maxFavorites,
            current_count: countRow.count,
            upgrade_url: '/pricing'
          }
        );
      }
    }

    await conn.query('INSERT INTO favorites (user_id, api_id) VALUES (?, ?)', [userId, apiId]);
    await conn.query('UPDATE apis SET favorites_count = favorites_count + 1 WHERE id = ?', [apiId]);

    const [[updatedCount]] = await conn.query(
      'SELECT COUNT(*) AS count FROM favorites WHERE user_id = ?',
      [userId]
    );
    return { alreadySaved: false, apiName: apiRows[0].name, count: updatedCount.count };
  });

  res.status(result.alreadySaved ? 200 : 201).json({
    success: true,
    message: result.alreadySaved
      ? `${result.apiName} is already in your favorites.`
      : `${result.apiName} saved to favorites.`,
    favorites_count: result.count
  });
});

const removeFavorite = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const apiId = Number(req.params.apiId);

  await withTransaction(async (conn) => {
    const [delResult] = await conn.query(
      'DELETE FROM favorites WHERE user_id = ? AND api_id = ?',
      [userId, apiId]
    );
    if (delResult.affectedRows > 0) {
      await conn.query(
        'UPDATE apis SET favorites_count = GREATEST(0, favorites_count - 1) WHERE id = ?',
        [apiId]
      );
    }
  });

  res.json({
    success: true,
    message: 'API removed from favorites.'
  });
});

module.exports = {
  getFavorites,
  addFavorite,
  removeFavorite
};
