const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'api_locate',
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  queueLimit: 0,
  charset: 'utf8mb4',
  timezone: 'Z',
  decimalNumbers: true
};

const pool = mysql.createPool(dbConfig);

/**
 * Safely parse a MySQL JSON column regardless of whether mysql2 returned
 * a string (MySQL 5.7) or an already-parsed object/array (MySQL 8.0+).
 */
function parseJson(value, fallback = null) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'object') return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_) {
      return fallback;
    }
  }
  return fallback;
}

/**
 * Execute an async callback inside a MySQL transaction.
 * Automatically commits on success and rolls back on any error.
 */
async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

/**
 * Verify connectivity to the MySQL server and api_locate schema.
 */
async function testConnection() {
  const connection = await pool.getConnection();
  try {
    const [rows] = await connection.query('SELECT DATABASE() AS db, VERSION() AS version');
    return rows[0];
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  dbConfig,
  parseJson,
  withTransaction,
  testConnection
};
