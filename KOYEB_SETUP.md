# Panduan Setup Koyeb - Step by Step

## ✅ Checklist Deployment

### 1. Push Code ke GitHub

```bash
git add .
git commit -m "Update production configuration for Koyeb"
git push origin main
```

### 2. Konfigurasi di Koyeb Dashboard

#### A. Builder Settings
- **Builder**: Pilih **Docker** (BUKAN Buildpack!)
- **Dockerfile path**: `Dockerfile`
- **Build context**: `.` (root)

#### B. Exposed Ports
- **Internal Port**: `8000`
- **Protocol**: HTTP

#### C. Health Checks (PENTING!)
- **Enabled**: ✅ YES
- **HTTP Path**: `/health`
- **Port**: `8000`
- **Protocol**: HTTP
- **Initial delay**: `60` seconds (beri waktu cukup untuk startup)
- **Timeout**: `10` seconds
- **Interval**: `30` seconds
- **Unhealthy threshold**: `3`

#### D. Environment Variables

Tambahkan **SEMUA** environment variables berikut:

```
PORT=8000
PUBLIC_URL=https://<your-app-name>.koyeb.app
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
OPENAI_API_KEY=<your-openai-key>
FB_PAGE_ID=<your-facebook-page-id>
FB_ACCESS_TOKEN=<your-facebook-access-token>
AUTO_WEBHOOK=true
```

**PENTING**: 
- Ganti `<your-app-name>` dengan nama app Koyeb Anda
- Ganti nilai yang di dalam `<...>` dengan kredensial Anda!
- **JANGAN set NODE_ENV** - biarkan kosong atau set ke `development`
- **AUTO_WEBHOOK=true** akan otomatis set Telegram webhook saat startup
- Inngest dev server akan berjalan otomatis di container (port 3000 internal)

### 3. Instance Settings

- **Instance Type**: **Small** atau **Medium** (Small minimal, Medium lebih stabil)
- **Regions**: Pilih region terdekat dengan user (Frankfurt untuk EU, Singapore untuk Asia)
- **Scaling**: 
  - **Min instances**: 1
  - **Max instances**: 1 (cukup untuk bot Telegram)
  - **Auto-scaling**: Disabled (tidak perlu untuk bot)

### 4. Deploy

1. Klik **Deploy** atau **Redeploy**
2. Tunggu build selesai (3-7 menit untuk first build)
3. Cek logs untuk memastikan:
   - ✅ "🚀 Starting Inngest Dev Server..."
   - ✅ "🎬 Starting Mastra server..."
   - ✅ "✅ Services started successfully!"
   - ✅ "✅ Telegram webhook berhasil di-set!" (jika AUTO_WEBHOOK=true)
   - ✅ "mastra 0.14.0-alpha.0 ready in XXXXms"
   - ❌ TIDAK ADA "TCP health check failed"
   - ❌ TIDAK ADA error messages

### 5. Verifikasi

Setelah deployment berhasil:

1. **Cek Status Endpoint**:
   ```
   https://biological-malanie-dzeckyete-91da18c7.koyeb.app/status
   ```
   Harusnya return JSON dengan status "online"

2. **Cek Health**:
   ```
   https://biological-malanie-dzeckyete-91da18c7.koyeb.app/health
   ```
   Harusnya return JSON dengan status "healthy"

3. **Test Bot Telegram**:
   - Buka bot Anda di Telegram
   - Kirim video link dari TikTok atau Instagram
   - Bot harusnya respond dan upload ke Facebook

## 🔧 Troubleshooting

### Health Check Masih Gagal?

Periksa di Koyeb dashboard:
1. **Service Settings** → **Ports**
   - Pastikan exposed port adalah `8000`
   
2. **Service Settings** → **Health Checks**
   - Path: `/health` atau `/ping`
   - Port: `8000`
   - Protocol: HTTP
   
3. **Environment Variables**
   - Pastikan `PORT=8000` sudah diset

### App Crash setelah Deploy?

Cek logs untuk error messages. Biasanya karena:
- Environment variables belum diset
- Credentials salah (Telegram, OpenAI, Facebook)

### Webhook Telegram Error?

Pastikan:
- `PUBLIC_URL` sudah diset ke URL Koyeb yang benar
- `TELEGRAM_BOT_TOKEN` valid dan benar

### Workflow Tidak Jalan?

Di logs Anda seharusnya melihat:
```
🚀 Starting Inngest Dev Server...
⏳ Waiting for Inngest server to be ready...
🎬 Starting Mastra server...
```

Jika tidak muncul, berarti startup script gagal.

## 📊 Monitoring

Setelah deployment sukses, monitor:
- **Logs** di Koyeb dashboard untuk error
- **Metrics** untuk CPU/Memory usage
- **Bot responses** di Telegram untuk functionality

---

**URL Bot Anda**: https://biological-malanie-dzeckyete-91da18c7.koyeb.app

Selamat mencoba! 🚀
