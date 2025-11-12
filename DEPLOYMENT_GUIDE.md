# Panduan Deploy ke Koyeb

## Langkah-langkah Deploy

### 1. Persiapan di Koyeb

1. Buka [app.koyeb.com](https://app.koyeb.com)
2. Klik **Create App** atau **New Service**
3. Pilih metode deployment: **GitHub** (disarankan)

### 2. Konfigurasi Build & Run

Pastikan pengaturan berikut di Koyeb:

#### Build Settings:
- **Builder**: `buildpack` (default)
- **Build command**: `npm run build`
- **Run command**: `npx mastra start` (atau biarkan kosong, akan otomatis baca dari Procfile)

#### Environment Settings:
- **Port**: `3000` (default untuk Mastra)
- **Instance type**: Minimal `small` (karena build membutuhkan RAM)

### 3. Environment Variables

Tambahkan environment variables yang diperlukan:

```
NODE_ENV=production
PORT=3000
OPENAI_API_KEY=<your-key>
```

Tambahkan juga environment variables lain yang dibutuhkan aplikasi Anda (database, API keys, dll).

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
- Pastikan Run command menggunakan: `npx mastra start`
- JANGAN gunakan `mastra dev` di production
- JANGAN jalankan file langsung dengan `node .mastra/output/index.mjs`

### Module/Require Errors
- Pastikan `"type": "module"` ada di package.json (sudah ✓)
- Gunakan `npx mastra start` bukan menjalankan file output langsung

## File yang Sudah Diperbaiki

- ✅ `Procfile` - Sudah diupdate untuk production
- ✅ Build output akan dibuat otomatis di Koyeb

## Push ke GitHub

Setelah yakin semua sudah benar, push ke GitHub:

```bash
git add .
git commit -m "Fix: Update Procfile for Koyeb deployment"
git push origin main
```

Lalu deploy ulang di Koyeb!
