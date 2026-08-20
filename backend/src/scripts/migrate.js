/**
 * Script migrasi ringan: memastikan kolom tabel sesuai versi terbaru schema.
 * Idempotent — aman dijalankan berulang kali.
 * Jalankan: node src/scripts/migrate.js
 */
require('dotenv').config();
const { pool } = require('../config/db');

const DB_NAME = process.env.DB_NAME || 'bbpom_ai';

// Tabel yang dipastikan ada (CREATE TABLE IF NOT EXISTS)
const tables = [
  `CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    setting_key VARCHAR(100) NOT NULL UNIQUE,
    setting_value TEXT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`
];

const migrations = [
  {
    table: 'documents',
    column: 'document_date',
    ddl: 'ALTER TABLE documents ADD COLUMN document_date DATE NULL AFTER file_type'
  },
  {
    table: 'documents',
    column: 'effective_date',
    ddl: 'ALTER TABLE documents ADD COLUMN effective_date DATE NULL AFTER document_date'
  },
  {
    table: 'documents',
    column: 'is_active',
    ddl: 'ALTER TABLE documents ADD COLUMN is_active TINYINT(1) NOT NULL DEFAULT 1 AFTER status'
  },
  {
    table: 'document_chunks',
    column: 'page_number',
    ddl: 'ALTER TABLE document_chunks ADD COLUMN page_number INT NULL AFTER content'
  },
  {
    table: 'document_chunks',
    column: 'section',
    ddl: 'ALTER TABLE document_chunks ADD COLUMN section VARCHAR(255) NULL AFTER page_number'
  }
];

const run = async () => {
  try {
    for (const ddl of tables) {
      await pool.query(ddl);
    }
    console.log('✅ Tabel dipastikan ada.');

    for (const m of migrations) {
      const [rows] = await pool.query(
        `SELECT COUNT(*) AS n FROM information_schema.columns
         WHERE table_schema = ? AND table_name = ? AND column_name = ?`,
        [DB_NAME, m.table, m.column]
      );

      if (rows[0].n === 0) {
        await pool.query(m.ddl);
        console.log(`✅ Kolom ditambahkan: ${m.table}.${m.column}`);
      } else {
        console.log(`ℹ️ Kolom sudah ada: ${m.table}.${m.column}`);
      }
    }
    console.log('🎉 Migrasi selesai.');
  } catch (err) {
    console.error('❌ Gagal migrasi:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
