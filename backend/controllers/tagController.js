const { pool } = require('../config/db');
const { asyncHandler } = require('../middleware/errorMiddleware');

const getTags = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT t.id, t.name, t.slug, COUNT(a.id) AS api_count
     FROM tags t
     LEFT JOIN api_tags at ON at.tag_id = t.id
     LEFT JOIN apis a ON a.id = at.api_id AND a.status = 'approved'
     GROUP BY t.id
     ORDER BY api_count DESC, t.name ASC
     LIMIT 100`
  );

  res.json({
    success: true,
    tags: rows
  });
});

module.exports = {
  getTags
};
