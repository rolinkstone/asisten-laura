/**
 * Cek kemampuan vector/search MySQL yang tersedia.
 * Jalankan: node src/scripts/checkMysql.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

const run = async () => {
  let conn;
  try {
    conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'bbpom_ai'
    });

    const [ver] = await conn.query('SELECT VERSION() AS v');
    console.log('Versi MySQL:', ver[0].v);

    const major = Number(ver[0].v.split('.')[0]);
    const minor = Number(ver[0].v.split('.')[1] || 0);

    const vectorSupported = major > 9 || (major === 9 && minor >= 0);

    // Cek dukungan tipe VECTOR
    let vectorType = false;
    if (vectorSupported) {
      try {
        await conn.query('CREATE TEMPORARY TABLE _vtest (v VECTOR(4))');
        await conn.query('DROP TEMPORARY TABLE _vtest');
        vectorType = true;
      } catch {
        vectorType = false;
      }
    }

    // Cek fungsi DISTANCE
    let distanceFn = false;
    try {
      const [r] = await conn.query("SELECT COUNT(*) AS n FROM information_schema.routines WHERE routine_name = 'DISTANCE'");
      distanceFn = r[0].n > 0;
    } catch {
      distanceFn = false;
    }

    // Cek dukungan index HNSW
    let hnsw = false;
    if (vectorType) {
      try {
        await conn.query('CREATE TEMPORARY TABLE _vtest2 (id INT PRIMARY KEY, v VECTOR(4) NOT NULL, VECTOR INDEX v_idx (v) USING HNSW)');
        await conn.query('DROP TEMPORARY TABLE _vtest2');
        hnsw = true;
      } catch {
        hnsw = false;
      }
    }

    console.log('──────────────────────────────────────');
    console.log('Native VECTOR type  :', vectorType ? '✅ didukung' : '❌ tidak didukung');
    console.log('Fungsi DISTANCE()   :', distanceFn ? '✅ tersedia' : '❌ tidak tersedia');
    console.log('Index HNSW          :', hnsw ? '✅ didukung' : '❌ tidak didukung');

    if (vectorType) {
      console.log('\n👉 Gunakan tipe kolom VECTOR(384) dengan index HNSW.');
    } else {
      console.log('\n👉 MySQL versi ini tidak punya native VECTOR.');
      console.log('   Fallback: simpan embedding sebagai JSON + kalkulasi cosine similarity di Node.js.');
    }
  } catch (err) {
    console.error('❌ Gagal terhubung ke MySQL:', err.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
};

run();
