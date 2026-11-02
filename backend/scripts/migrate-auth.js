// One-off runner: creates users table (migration_auth.sql) + seeds demo accounts.
// Usage: node scripts/migrate-auth.js
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hr_db',
};

(async () => {
  const c = new Client(cfg);
  await c.connect();

  const sql = fs.readFileSync(path.join(__dirname, '..', '..', 'database', 'migration_auth.sql'), 'utf8');
  await c.query(sql);

  const hrHash = await bcrypt.hash('hr12345', 10);
  const execHash = await bcrypt.hash('exec12345', 10);
  await c.query(
    `INSERT INTO users (username, email, password_hash, full_name, role)
     VALUES
       ('hr_admin', 'hr@company.com', $1, 'Somsi HR Admin', 'hr'),
       ('executive', 'exec@company.com', $2, 'Khun Executive', 'executive')
     ON CONFLICT (email) DO NOTHING`,
    [hrHash, execHash]
  );

  const { rows } = await c.query('SELECT username, email, role FROM users ORDER BY user_id');
  console.log('AUTH MIGRATION OK. USERS:', JSON.stringify(rows));
  await c.end();
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
