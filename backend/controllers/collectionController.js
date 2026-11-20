const { pool } = require('../config/db');
const { AppError, asyncHandler } = require('../middleware/errorMiddleware');
const { sanitizeText } = require('../middleware/validationMiddleware');
const { generateUniqueSlug } = require('../utils/slugify');
const { attachTagsAndFavorites } = require('./apiController');

const getCollections = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const [collections] = await pool.query(
    `SELECT c.id, c.name, c.slug, c.description, c.is_public, c.created_at, c.updated_at,
            COUNT(ca.id) AS api_count
     FROM collections c
     LEFT JOIN collection_apis ca ON ca.collection_id = c.id
     WHERE c.user_id = ?
     GROUP BY c.id
     ORDER BY c.updated_at DESC, c.id DESC`,
    [userId]
  );

  // Also return lightweight list of api_ids in each collection for fast UI checkboxes
  let itemsMap = new Map();
  if (collections.length > 0) {
    const colIds = collections.map((c) => c.id);
    const [itemRows] = await pool.query(
      `SELECT ca.collection_id, ca.api_id, ca.notes, ca.added_at,
              a.name, a.slug, a.logo_url, a.pricing_model, a.auth_type, a.short_description,
              cat.name AS category_name
       FROM collection_apis ca
       INNER JOIN apis a ON a.id = ca.api_id
       INNER JOIN categories cat ON cat.id = a.category_id
       WHERE ca.collection_id IN (?)
       ORDER BY ca.added_at DESC`,
      [colIds]
    );
    for (const row of itemRows) {
      if (!itemsMap.has(row.collection_id)) itemsMap.set(row.collection_id, []);
      itemsMap.get(row.collection_id).push(row);
    }
  }

  res.json({
    success: true,
    collections: collections.map((col) => ({
      ...col,
      is_public: Boolean(col.is_public),
      apis: itemsMap.get(col.id) || []
    }))
  });
});

const getCollectionById = asyncHandler(async (req, res) => {
  const colId = Number(req.params.id);
  const [rows] = await pool.query(
    'SELECT * FROM collections WHERE id = ? AND user_id = ? LIMIT 1',
    [colId, req.user.id]
  );

  if (rows.length === 0) {
    throw new AppError('Collection not found.', 404, 'COLLECTION_NOT_FOUND');
  }

  const [apiRows] = await pool.query(
    `SELECT a.*, c.name AS category_name, c.slug AS category_slug,
            ca.notes AS collection_notes, ca.added_at
     FROM collection_apis ca
     INNER JOIN apis a ON a.id = ca.api_id
     INNER JOIN categories c ON c.id = a.category_id
     WHERE ca.collection_id = ?
     ORDER BY ca.added_at DESC`,
    [colId]
  );

  const enrichedApis = await attachTagsAndFavorites(apiRows, req.user.id);

  res.json({
    success: true,
    collection: {
      ...rows[0],
      is_public: Boolean(rows[0].is_public),
      apis: enrichedApis
    }
  });
});

const createCollection = asyncHandler(async (req, res) => {
  const name = sanitizeText(req.body.name, 120);
  const description = sanitizeText(req.body.description, 500);
  const isPublic = req.body.is_public ? 1 : 0;

  if (!name) {
    throw new AppError('Collection name is required.', 400, 'NAME_REQUIRED');
  }

  const slug = await generateUniqueSlug(
    pool,
    'collections',
    name,
    null,
    `AND user_id = ${Number(req.user.id)}`
  );

  const [result] = await pool.query(
    `INSERT INTO collections (user_id, name, slug, description, is_public)
     VALUES (?, ?, ?, ?, ?)`,
    [req.user.id, name, slug, description, isPublic]
  );

  const [created] = await pool.query('SELECT * FROM collections WHERE id = ?', [result.insertId]);

  res.status(201).json({
    success: true,
    message: 'Collection created successfully.',
    collection: {
      ...created[0],
      is_public: Boolean(created[0].is_public),
      api_count: 0,
      apis: []
    }
  });
});

const updateCollection = asyncHandler(async (req, res) => {
  const colId = Number(req.params.id);
  const [existing] = await pool.query(
    'SELECT * FROM collections WHERE id = ? AND user_id = ? LIMIT 1',
    [colId, req.user.id]
  );

  if (existing.length === 0) {
    throw new AppError('Collection not found.', 404, 'COLLECTION_NOT_FOUND');
  }

  const name = sanitizeText(req.body.name, 120) || existing[0].name;
  const description =
    req.body.description !== undefined
      ? sanitizeText(req.body.description, 500)
      : existing[0].description;
  const isPublic =
    req.body.is_public !== undefined
      ? req.body.is_public ? 1 : 0
      : existing[0].is_public;

  const slug =
    name !== existing[0].name
      ? await generateUniqueSlug(
          pool,
          'collections',
          name,
          colId,
          `AND user_id = ${Number(req.user.id)}`
        )
      : existing[0].slug;

  await pool.query(
    'UPDATE collections SET name = ?, slug = ?, description = ?, is_public = ? WHERE id = ?',
    [name, slug, description, isPublic, colId]
  );

  const [updated] = await pool.query('SELECT * FROM collections WHERE id = ?', [colId]);
  res.json({
    success: true,
    message: 'Collection updated successfully.',
    collection: {
      ...updated[0],
      is_public: Boolean(updated[0].is_public)
    }
  });
});

const deleteCollection = asyncHandler(async (req, res) => {
  const colId = Number(req.params.id);
  const [result] = await pool.query(
    'DELETE FROM collections WHERE id = ? AND user_id = ?',
    [colId, req.user.id]
  );

  if (result.affectedRows === 0) {
    throw new AppError('Collection not found.', 404, 'COLLECTION_NOT_FOUND');
  }

  res.json({
    success: true,
    message: 'Collection deleted successfully.'
  });
});

const addApiToCollection = asyncHandler(async (req, res) => {
  const colId = Number(req.params.id);
  const apiId = Number(req.params.apiId);
  const notes = sanitizeText(req.body?.notes, 300);

  const [[colCheck], [apiCheck]] = await Promise.all([
    pool.query('SELECT id, name FROM collections WHERE id = ? AND user_id = ? LIMIT 1', [
      colId,
      req.user.id
    ]),
    pool.query("SELECT id, name FROM apis WHERE id = ? AND status = 'approved' LIMIT 1", [apiId])
  ]);

  if (colCheck.length === 0) {
    throw new AppError('Collection not found.', 404, 'COLLECTION_NOT_FOUND');
  }
  if (apiCheck.length === 0) {
    throw new AppError('Approved API listing not found.', 404, 'API_NOT_FOUND');
  }

  await pool.query(
    `INSERT INTO collection_apis (collection_id, api_id, notes)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE notes = COALESCE(VALUES(notes), notes)`,
    [colId, apiId, notes]
  );

  await pool.query('UPDATE collections SET updated_at = UTC_TIMESTAMP() WHERE id = ?', [colId]);

  res.status(201).json({
    success: true,
    message: `${apiCheck[0].name} saved to "${colCheck[0].name}".`
  });
});

const removeApiFromCollection = asyncHandler(async (req, res) => {
  const colId = Number(req.params.id);
  const apiId = Number(req.params.apiId);

  const [colCheck] = await pool.query(
    'SELECT id FROM collections WHERE id = ? AND user_id = ? LIMIT 1',
    [colId, req.user.id]
  );

  if (colCheck.length === 0) {
    throw new AppError('Collection not found.', 404, 'COLLECTION_NOT_FOUND');
  }

  await pool.query(
    'DELETE FROM collection_apis WHERE collection_id = ? AND api_id = ?',
    [colId, apiId]
  );

  res.json({
    success: true,
    message: 'API removed from collection.'
  });
});

module.exports = {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addApiToCollection,
  removeApiFromCollection
};
