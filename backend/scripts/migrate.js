const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

async function runMigrations() {
  const schemaPath = path.resolve(__dirname, '../../database/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    charset: 'utf8mb4',
    multipleStatements: true
  });

  try {
    console.log('[Migrate] Executing database/schema.sql...');
    await connection.query(sql);

    const dbName = process.env.DB_NAME || 'api_locate';
    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
      [dbName]
    );

    console.log(`[Migrate] Successfully verified ${tables.length} tables in '${dbName}':`);
    console.log('  ' + tables.map((t) => t.TABLE_NAME).join(', '));
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[Migrate] Failed:', err);
      process.exit(1);
    });
}

module.exports = { runMigrations };
