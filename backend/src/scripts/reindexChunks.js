/**
 * Re-index chunk + embedding untuk dokumen yang sudah ada.
 * (Berguna setelah menambahkan kolom page_number/section/embedding,
 *  atau mengganti model embedding.)
 *
 * Jalankan: node src/scripts/reindexChunks.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/db');
const { UPLOAD_DIR } = require('../config/multer');
const { extractPages } = require('../services/pdfService');
const { chunkPages } = require('../services/textProcessor');
const { embedBatch, MODEL } = require('../services/embeddingService');

const run = async () => {
  try {
    const [docs] = await pool.query(
      `SELECT id, title, file_path FROM documents
       WHERE file_path IS NOT NULL
       ORDER BY id ASC`
    );
    console.log(`📄 Ditemukan ${docs.length} dokumen untuk di-reindex.\n`);

    for (const doc of docs) {
      const filePath = path.join(UPLOAD_DIR, doc.file_path);
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File tidak ada untuk dokumen ${doc.id} — dilewati.`);
        continue;
      }

      console.log(`⏳ Proses dokumen ${doc.id}: ${doc.title}`);

      const { pages, numPages } = await extractPages(filePath);
      const chunks = chunkPages(pages);

      if (chunks.length === 0) {
        console.log(`⚠️  Tidak ada teks untuk dokumen ${doc.id} — status failed.`);
        await pool.query("UPDATE documents SET status = 'failed' WHERE id = ?", [doc.id]);
        continue;
      }

      const embeddings = await embedBatch(chunks.map((c) => c.content), 'passage: ');

      await pool.query('DELETE FROM document_chunks WHERE document_id = ?', [doc.id]);

      for (let i = 0; i < chunks.length; i++) {
        const c = chunks[i];
        await pool.query(
          `INSERT INTO document_chunks
             (document_id, chunk_index, content, page_number, section, embedding, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [doc.id, c.chunk_index, c.content, c.page, c.section,
           JSON.stringify(embeddings[i]),
           JSON.stringify({ embedding_model: MODEL, page: c.page, section: c.section })]
        );
      }

      const charCount = pages.reduce((sum, p) => sum + p.text.length, 0);
      await pool.query(
        `UPDATE documents
         SET status = 'ready',
             metadata = JSON_SET(
               COALESCE(metadata, JSON_OBJECT()),
               '$.numPages', ?,
               '$.charCount', ?,
               '$.chunkCount', ?,
               '$.embeddingModel', ?,
               '$.embeddingDim', ?
             )
         WHERE id = ?`,
        [numPages, charCount, chunks.length, MODEL, (embeddings[0] || []).length, doc.id]
      );

      console.log(`✅ Dokumen ${doc.id}: ${chunks.length} chunk | embedding ${(embeddings[0] || []).length} dim`);
    }

    console.log('\n🎉 Reindex selesai.');
  } catch (err) {
    console.error('❌ Gagal reindex:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

run();
