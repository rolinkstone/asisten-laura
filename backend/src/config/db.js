const mysql = require('mysql2/promise');

/**
 * MySQL connection pool menggunakan mysql2/promise.
 * Konfigurasi diambil dari environment variables (.env).
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bbpom_ai',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  // Mengembalikan DATE/DATETIME sebagai string agar konsisten
  dateStrings: true
});

/**
 * Uji koneksi ke database.
 * @returns {Promise<boolean>} true jika berhasil terhubung
 */
const testConnection = async () => {
  try {
    const conn = await pool.getConnection();
    await conn.ping();
    console.log('✅ Koneksi ke database berhasil terhubung');
    console.log(`   Host : ${process.env.DB_HOST || 'localhost'}:${Number(process.env.DB_PORT) || 3306}`);
    console.log(`   DB   : ${process.env.DB_NAME || 'bbpom_ai'}`);
    conn.release();
    return true;
  } catch (err) {
    console.error('❌ Gagal terhubung ke database:', err.message);
    return false;
  }
};

module.exports = { pool, testConnection };
