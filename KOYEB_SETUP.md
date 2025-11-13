# Panduan Setup Koyeb - Step by Step

## ✅ Checklist Deployment

### 1. Push Code ke GitHub

```bash
git add .
git commit -m "Fix Koyeb port configuration"
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

#### C. Health Checks
- **HTTP Path**: `/health` ATAU `/ping`
- **Port**: `8000`
- **Initial delay**: `30` seconds (untuk memberikan waktu startup)
- **Timeout**: `5` seconds

#### D. Environment Variables

Tambahkan **SEMUA** environment variables berikut:

```
PORT=8000
PUBLIC_URL=https://biological-malanie-dzeckyete-91da18c7.koyeb.app
TELEGRAM_BOT_TOKEN=<your-telegram-bot-token>
OPENAI_API_KEY=<your-openai-key>
FB_PAGE_ID=<your-facebook-page-id>
FB_ACCESS_TOKEN=<your-facebook-access-token>
```

**PENTING**: 
- Ganti nilai yang di dalam `<...>` dengan kredensial Anda!
- **JANGAN set NODE_ENV** - biarkan kosong
- Inngest dev server akan berjalan otomatis di container (port 3000 internal)

### 3. Instance Settings

- **Instance Type**: **Small** (minimum, karena build membutuhkan RAM)
- **Regions**: Pilih region terdekat
- **Scaling**: Auto (default)

### 4. Deploy

1. Klik **Deploy** atau **Redeploy**
2. Tunggu build selesai (2-5 menit)
3. Cek logs untuk memastikan:
   - ✅ "Telegram webhook berhasil di-set!"
   - ✅ "Mastra API running on port http://0.0.0.0:8000/api"
   - ✅ Tidak ada "TCP health check failed"

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
