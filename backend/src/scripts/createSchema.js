/**
 * Script untuk membuat database & tabel dari sql/schema.sql
 * Jalankan: npm run db:schema
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

const run = async () => {
  let connection;
  try {
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', '..', 'sql', 'schema.sql'), 'utf8');

    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      multipleStatements: true
    });

    await connection.query(schemaSql);
    console.log('✅ Database & tabel berhasil dibuat/divalidasi di bbpom_ai');
    console.log('   Tabel: roles, users, sources, document_categories, documents,');
    console.log('   document_chunks, faq, chat_sessions, chat_messages, ai_logs, feedback');
  } catch (err) {
    console.error('❌ Gagal membuat schema:', err.message);
    process.exitCode = 1;
  } finally {
    if (connection) await connection.end();
  }
};

run();
