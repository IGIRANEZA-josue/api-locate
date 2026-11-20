function slugify(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 150) || 'item';
}

async function generateUniqueSlug(executor, tableName, baseText, excludeId = null, extraWhere = '') {
  const baseSlug = slugify(baseText);
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const params = [candidate];
    let sql = `SELECT id FROM \`${tableName}\` WHERE slug = ?`;
    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }
    if (extraWhere) {
      sql += ` ${extraWhere}`;
    }
    sql += ' LIMIT 1';

    const [rows] = await executor.query(sql, params);
    if (rows.length === 0) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug.slice(0, 140)}-${counter}`;
  }
}

module.exports = {
  slugify,
  generateUniqueSlug
};
