# Panduan Deploy ke Koyeb

## ⚠️ PENTING: Gunakan Docker Deployment

Aplikasi Mastra memiliki issue dengan buildpack standard Koyeb karena bundler Mastra menggunakan `require('crypto')` yang tidak kompatibel dengan ES modules. Solusinya adalah menggunakan Docker deployment.

## Langkah-langkah Deploy

### 1. Persiapan di Koyeb

1. Buka [app.koyeb.com](https://app.koyeb.com)
2. Klik **Create App** atau **New Service**
3. Pilih metode deployment: **GitHub**

### 2. Konfigurasi Build & Run

**PENTING**: Pilih Docker sebagai builder!

#### Build Settings:
- **Builder**: **Docker** (JANGAN gunakan buildpack!)
- **Dockerfile**: `Dockerfile` (default)
- **Docker build context**: `.` (root directory)

#### Environment Settings:
- **Port**: `8000` (default Koyeb)
- **Health check**: Path `/health` atau `/ping`, Port `8000`
- **Instance type**: Minimal `small` (karena build membutuhkan RAM)

### 3. Environment Variables

**PENTING**: Tambahkan environment variables berikut di Koyeb:

```
NODE_ENV=production
PORT=8000
PUBLIC_URL=https://your-app-name.koyeb.app
OPENAI_API_KEY=<your-key>
TELEGRAM_BOT_TOKEN=<your-telegram-token>
FB_PAGE_ID=<your-facebook-page-id>
FB_ACCESS_TOKEN=<your-facebook-access-token>
```

**Catatan Penting**:
- Ganti `https://your-app-name.koyeb.app` dengan URL Koyeb Anda yang sebenarnya!
- PORT harus 8000 (default Koyeb health check port)
- Health check path: `/health` atau `/ping`

Tambahkan juga environment variables lain yang dibutuhkan aplikasi Anda.

### 4. Advanced Settings (Opsional)

- **Health check path**: `/health` (jika ada)
- **Regions**: Pilih region terdekat dengan user Anda
- **Auto-scaling**: Aktifkan untuk traffic yang tinggi

### 5. Deploy

1. Klik **Deploy**
2. Tunggu proses build selesai (biasanya 2-5 menit)
3. Aplikasi akan tersedia di URL: `https://your-app-name.koyeb.app`

## Troubleshooting

### Build Gagal
- Pastikan `npm run build` ada di package.json
- Cek instance type minimal `small` untuk build yang membutuhkan RAM

### Runtime Error
- Cek logs di Koyeb dashboard
- Pastikan semua environment variables sudah diset
- Verify PORT environment variable di set ke 3000

### Application Exit Code 127
- Pastikan menggunakan Docker deployment (BUKAN buildpack)
- JANGAN gunakan `mastra dev` di production

### Module/Require Errors (crypto/eval issues)
- **Solusi**: Gunakan Docker deployment
- Issue ini adalah bug yang diketahui di Mastra (GitHub #5169)
- Buildpack standard tidak mendukung eval dengan require di ES modules
- Docker memberikan full Node.js runtime yang diperlukan

## File yang Sudah Dibuat/Diperbaiki

- ✅ `Dockerfile` - Konfigurasi Docker untuk deployment
- ✅ `.dockerignore` - Exclude file yang tidak perlu di container
- ✅ `Procfile` - Sudah diupdate (tapi tidak dipakai saat Docker deployment)
- ✅ Build output akan dibuat otomatis di dalam Docker container

## Kenapa Harus Docker?

Mastra framework memiliki issue dengan bundler yang menggunakan `require('crypto')` di dalam eval. Ini tidak kompatibel dengan ES module di buildpack standard. Docker memberikan full Node.js runtime sehingga aplikasi bisa berjalan dengan sempurna.

**GitHub Issue**: https://github.com/mastra-ai/mastra/issues/5169

## Push ke GitHub

Setelah yakin semua sudah benar, push ke GitHub:

```bash
git add .
git commit -m "Fix: Update Procfile for Koyeb deployment"
git push origin main
```

Lalu deploy ulang di Koyeb!
