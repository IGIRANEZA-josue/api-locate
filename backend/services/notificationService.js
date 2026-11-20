const { pool } = require('../config/db');

async function createNotification(executor, { userId, type, title, message, linkUrl = null }) {
  if (!userId) return null;
  const db = executor || pool;
  const [result] = await db.query(
    `INSERT INTO notifications (user_id, type, title, message, link_url)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, type, String(title).slice(0, 180), String(message), linkUrl ? String(linkUrl).slice(0, 300) : null]
  );
  return result.insertId;
}

module.exports = {
  createNotification
};
