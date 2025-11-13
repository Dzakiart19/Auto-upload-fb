# ✅ Siap Deploy ke Koyeb

## 📦 Perubahan yang Sudah Dilakukan

### 1. Fix Script Startup (`scripts/start-production.sh`)
**MASALAH:** Instance stopping setelah workflow triggered
**SOLUSI:** Ganti `wait -n` dengan `wait` untuk menunggu semua process

```bash
# SEBELUM (SALAH):
wait -n          # Exit saat salah satu process exit
cleanup

# SESUDAH (BENAR):
wait            # Tunggu SEMUA process, keep container alive
```

### 2. Update Dokumentasi
- ✅ `KOYEB_SETUP.md` - Panduan lengkap deployment
- ✅ `PENJELASAN_DUPLICATE_URL.md` - Penjelasan fitur duplicate detection
- ✅ `SIAP_DEPLOY_KOYEB.md` - File ini

## 🔍 Tentang Log Error yang Anda Alami

### Log Anda di Koyeb:
```json
{"level":"warn","msg":"⚠️ [Telegram] Duplicate URL request detected dan diabaikan"}
Instance is stopping.
npm error signal SIGTERM
```

### Penjelasan:
1. **Duplicate URL Detection** = ✅ **FITUR**, bukan bug!
   - Mencegah upload video yang sama 2x ke Facebook
   - Lock berlaku 5 menit per URL
   - User dapat mencoba lagi setelah 5 menit

2. **Instance Stopping** = ❌ **BUG** (sudah diperbaiki)
   - Penyebab: Script `start-production.sh` exit terlalu cepat
   - Solusi: Update script dengan `wait` command
   - Sekarang container akan tetap hidup

## 🚀 Langkah Deploy

### 1. Push ke GitHub

```bash
# Review changes dulu
git status
git diff

# Add semua changes
git add .

# Commit dengan message yang jelas
git commit -m "Fix Koyeb deployment: update startup script and health checks"

# Push ke GitHub
git push origin main
```

### 2. Konfigurasi di Koyeb

Buka Koyeb dashboard dan pastikan konfigurasi berikut:

#### Environment Variables (WAJIB):
```env
PORT=8000
PUBLIC_URL=https://<your-app-name>.koyeb.app
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
OPENAI_API_KEY=<your-openai-api-key>
FB_PAGE_ID=<your-facebook-page-id>
FB_ACCESS_TOKEN=<your-facebook-access-token>
AUTO_WEBHOOK=true
```

**CATATAN:**
- Ganti `<your-app-name>` dengan nama app Koyeb Anda
- Ganti semua `<...>` dengan kredensial yang benar
- `AUTO_WEBHOOK=true` akan auto-set Telegram webhook saat startup

#### Health Check Settings:
```
Enabled: YES
Path: /health
Port: 8000
Protocol: HTTP
Initial delay: 60 seconds
Timeout: 10 seconds
Interval: 30 seconds
Unhealthy threshold: 3
```

#### Instance Settings:
```
Type: Small atau Medium
Region: Singapore / Frankfurt (pilih yang terdekat)
Min instances: 1
Max instances: 1
Auto-scaling: Disabled
```

### 3. Deploy & Monitor

1. **Klik "Redeploy"** di Koyeb
2. **Tunggu build** (3-7 menit)
3. **Monitor logs** untuk memastikan:

#### ✅ Logs yang BENAR:
```
🚀 Starting Inngest Dev Server...
🎬 Starting Mastra server...
✅ Services started successfully!
📊 Inngest PID: 123
📊 Mastra PID: 456
⏳ Waiting for processes...
✅ Telegram webhook berhasil di-set!
mastra 0.14.0-alpha.0 ready in XXXXms
```

#### ❌ Logs yang SALAH (jika masih muncul, ada masalah):
```
TCP health check failed
Instance is stopping
npm error signal SIGTERM
Error: ECONNREFUSED
```

### 4. Verifikasi Deployment

Setelah deployment sukses, test dengan:

#### A. Check Health Endpoint:
```bash
curl https://<your-app-name>.koyeb.app/health
```

Expected response:
```json
{
  "status": "healthy",
  "uptime": 123.456,
  "timestamp": "2025-11-13T...",
  "service": "telegram-facebook-bot"
}
```

#### B. Check Status:
```bash
curl https://<your-app-name>.koyeb.app/status
```

Expected response:
```json
{
  "status": "online",
  "publicUrl": "https://...",
  "webhookUrl": "https://.../webhooks/telegram/action",
  "timestamp": "..."
}
```

#### C. Test Bot di Telegram:
1. Buka bot Anda di Telegram
2. Kirim `/start`
3. Kirim URL TikTok atau Instagram
4. Bot harusnya respond dan proses video

## ⚠️ Troubleshooting

### Jika Instance Masih Stopping:

1. **Cek Health Check di Koyeb**
   - Pastikan path = `/health`
   - Pastikan port = `8000`
   - Pastikan initial delay >= 60 seconds

2. **Cek Environment Variables**
   - Pastikan `PORT=8000` diset
   - Pastikan `PUBLIC_URL` benar
   - Pastikan semua credentials valid

3. **Cek Logs di Koyeb**
   - Lihat error messages
   - Cari "SIGTERM", "ECONNREFUSED", dll
   - Hubungi saya jika ada error baru

### Jika Webhook Gagal Auto-Setup:

Manual setup webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook?url=https://<your-app-name>.koyeb.app/webhooks/telegram/action"
```

Verify webhook:
```bash
curl "https://api.telegram.org/bot<YOUR_TOKEN>/getWebhookInfo"
```

### Jika Duplicate URL Warning Terus Muncul:

**Ini NORMAL!** Duplicate detection adalah fitur untuk mencegah double upload.

Solusi:
- Tunggu 5 menit sebelum kirim URL yang sama lagi
- Atau restart bot di Koyeb untuk clear cache

## 📚 Dokumentasi Lengkap

- `KOYEB_SETUP.md` - Panduan setup detail
- `PENJELASAN_DUPLICATE_URL.md` - Penjelasan fitur duplicate detection
- `DEPLOYMENT_GUIDE.md` - General deployment guide

## 🎯 Expected Result

Setelah deployment sukses:
- ✅ Bot Telegram online dan responsive
- ✅ Health check passing di Koyeb
- ✅ Auto webhook setup sukses
- ✅ Video dari TikTok/Instagram otomatis ter-upload ke Facebook
- ✅ Duplicate URL detection bekerja (warning saja, tidak crash)
- ✅ Instance tetap running (tidak stopping)

## 💪 Checklist Akhir

Sebelum push ke GitHub, pastikan:
- [x] `scripts/start-production.sh` sudah diupdate
- [x] Baca `KOYEB_SETUP.md` untuk konfigurasi
- [x] Siapkan semua environment variables
- [ ] Push ke GitHub
- [ ] Deploy di Koyeb dengan config yang benar
- [ ] Monitor logs untuk memastikan sukses
- [ ] Test bot di Telegram

---

## 🚀 Ready? Let's Deploy!

```bash
git add .
git commit -m "Fix Koyeb deployment: update startup script"
git push origin main
```

Setelah push, pergi ke Koyeb dashboard dan click **Redeploy**!

Good luck! 🎉
