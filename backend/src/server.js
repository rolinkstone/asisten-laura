require('dotenv').config();
const app = require('./app');
const { testConnection } = require('./config/db');
const llmConfig = require('./services/llmConfigService');

const PORT = Number(process.env.PORT) || 5003;

const start = async () => {
  // Pastikan koneksi DB berhasil sebelum server menerima request
  const connected = await testConnection();
  if (!connected) {
    console.warn('⚠️ Server tetap berjalan, tetapi database tidak terhubung. Periksa file .env');
  }

  // Muat konfigurasi LLM runtime (dari tabel settings, fallback .env)
  try {
    await llmConfig.loadConfig();
    console.log('⚙️  Konfigurasi LLM runtime dimuat');
  } catch (err) {
    console.warn('⚠️ Gagal memuat konfigurasi LLM runtime:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`🚀 Server BPOM AI berjalan di http://localhost:${PORT}`);
    console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
    console.log(`   API base    : http://localhost:${PORT}/api`);
  });
};

start();
