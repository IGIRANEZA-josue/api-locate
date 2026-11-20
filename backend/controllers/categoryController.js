const { pool } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');

const getCategories = asyncHandler(async (_req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, c.icon, c.display_order,
            COUNT(a.id) AS api_count
     FROM categories c
     LEFT JOIN apis a ON a.category_id = c.id AND a.status = 'approved'
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.display_order ASC, c.name ASC`
  );

  res.json({
    success: true,
    categories: rows
  });
});

const getCategoryBySlug = asyncHandler(async (req, res) => {
  const slug = String(req.params.slug || '').trim();
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, c.icon, c.display_order,
            COUNT(a.id) AS api_count
     FROM categories c
     LEFT JOIN apis a ON a.category_id = c.id AND a.status = 'approved'
     WHERE c.slug = ? AND c.is_active = 1
     GROUP BY c.id
     LIMIT 1`,
    [slug]
  );

  if (rows.length === 0) {
    throw new AppError('Category not found.', 404, 'CATEGORY_NOT_FOUND');
  }

  res.json({
    success: true,
    category: rows[0]
  });
});

module.exports = {
  getCategories,
  getCategoryBySlug
};
