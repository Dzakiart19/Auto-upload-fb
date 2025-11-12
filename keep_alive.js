/**
 * ⚠️ FILE INI TIDAK PERLU DIGUNAKAN ⚠️
 * 
 * Server Mastra yang berjalan di port 5000 SUDAH memiliki endpoint keep-alive yang sempurna!
 * 
 * ✅ ENDPOINT KEEP-ALIVE YANG TERSEDIA (di server utama port 5000):
 * - /ping        → Returns "pong" (paling sederhana untuk monitoring)
 * - /health      → Returns health status JSON
 * - /status      → Returns status info lengkap
 * - /            → Returns server info lengkap
 * 
 * 📝 CARA SETUP UPTIME MONITORING:
 * 1. Dapatkan URL Replit Anda dari Webview (biasanya: https://nama-proyek.username.replit.dev)
 * 2. Setup UptimeRobot dengan URL: https://nama-proyek.username.replit.dev/ping
 * 3. Set interval monitoring: 5 menit
 * 4. Selesai! Bot akan tetap aktif 24/7
 * 
 * ❌ JANGAN gunakan file ini karena:
 * - Server Mastra sudah punya endpoint keep-alive
 * - Replit hanya memetakan 1 port publik (port 5000)
 * - Menjalankan 2 server bersamaan akan membingungkan
 * 
 * File ini dibiarkan sebagai referensi saja.
 */

const express = require('express');

function keepAlive() {
  console.warn('⚠️  PERINGATAN: keep_alive.js tidak diperlukan!');
  console.warn('⚠️  Server Mastra di port 5000 sudah punya endpoint keep-alive.');
  console.warn('⚠️  Gunakan URL: https://<REPLIT_DOMAIN>/ping untuk monitoring.');
  
  // Kode di bawah ini TIDAK DIJALANKAN karena tidak perlu
  // Server Mastra sudah menyediakan endpoint yang sama
  
  /* 
  const app = express();
  const PORT = process.env.KEEP_ALIVE_PORT || 3000;

  app.get('/', (req, res) => {
    res.send('Bot is alive!');
  });

  app.get('/health', (req, res) => {
    res.json({
      status: 'alive',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      message: 'Keep-Alive Server is running'
    });
  });

  app.get('/ping', (req, res) => {
    res.send('pong');
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Keep-Alive server is running on port ${PORT}`);
    console.log(`📡 Ping URL: http://0.0.0.0:${PORT}/`);
    console.log(`❤️  Health check: http://0.0.0.0:${PORT}/health`);
  });
  */
}

// JANGAN panggil fungsi ini!
// Gunakan endpoint Mastra server yang sudah ada di port 5000
module.exports = keepAlive;
