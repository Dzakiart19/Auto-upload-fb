/**
 * Keep-Alive Server untuk Replit
 * 
 * File ini membuat web server sederhana yang akan menjaga aplikasi tetap aktif
 * dan tidak masuk mode sleep di Replit.
 * 
 * Cara kerja:
 * 1. Server Express berjalan di port 3000
 * 2. Endpoint '/' merespons dengan pesan "Bot is alive!"
 * 3. UptimeRobot atau layanan monitoring lain bisa mem-ping endpoint ini
 *    setiap beberapa menit untuk menjaga aplikasi tetap aktif
 */

const express = require('express');

function keepAlive() {
  const app = express();
  const PORT = process.env.KEEP_ALIVE_PORT || 3000;

  // Endpoint untuk keep-alive ping
  app.get('/', (req, res) => {
    res.send('Bot is alive!');
  });

  // Endpoint tambahan untuk monitoring
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

  // Start server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Keep-Alive server is running on port ${PORT}`);
    console.log(`📡 Ping URL: http://0.0.0.0:${PORT}/`);
    console.log(`❤️  Health check: http://0.0.0.0:${PORT}/health`);
  });
}

module.exports = keepAlive;
