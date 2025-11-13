# Solusi: Error INNGEST_EVENT_KEY di Koyeb

## 🔍 Masalah yang Ditemukan

Error yang muncul:
```
❌ Failed to send event
We couldn't find an event key to use to send events to Inngest.
```

## 🎯 Akar Masalah

Workflow Mastra menggunakan Inngest untuk eksekusi. Ada 2 mode Inngest:

### Mode 1: Inngest Cloud (Memerlukan INNGEST_EVENT_KEY)
- Client connect ke cloud Inngest
- Butuh API key berbayar
- ❌ Tidak cocok untuk deployment gratis

### Mode 2: Inngest Dev Server (Self-hosted, Gratis)
- Server Inngest berjalan lokal
- Tidak butuh API key
- ✅ Cocok untuk deployment di Koyeb!

## ✅ Solusi yang Diterapkan

### 1. Dockerfile Diupdate
- Menjalankan **2 service** dalam 1 container:
  - **Inngest Dev Server** (port 3000 internal)
  - **Mastra Server** (port 8000 eksternal)
- Startup script otomatis menjalankan keduanya

### 2. Inngest Client Configuration
File: `src/mastra/inngest/client.ts`
```typescript
// Selalu gunakan dev mode dengan local server
export const inngest = new Inngest({
  id: "mastra-telegram-bot",
  name: "Telegram to Facebook Bot",
  baseUrl: "http://localhost:3000",  // Connect ke Inngest dev server
  isDev: true,                       // Always dev mode
  middleware: [realtimeMiddleware()],
});
```

### 3. Startup Script
File: `scripts/start-production.sh`
- Start Inngest dev server di background (port 3000)
- Tunggu 5 detik agar Inngest siap
- Start Mastra server (port 8000)
- Handle graceful shutdown

## 📦 File yang Diubah

1. ✅ `Dockerfile` - Multi-service startup
2. ✅ `scripts/start-production.sh` - Startup orchestration
3. ✅ `src/mastra/inngest/client.ts` - Force dev mode
4. ✅ `DEPLOYMENT_GUIDE.md` - Updated instructions
5. ✅ `KOYEB_SETUP.md` - Updated instructions

## 🚀 Cara Deploy

### Step 1: Push ke GitHub
```bash
git add .
git commit -m "Fix: Run Inngest dev server in Docker for Koyeb"
git push origin main
```

### Step 2: Environment Variables di Koyeb
```
PORT=8000
PUBLIC_URL=https://biological-malanie-dzeckyete-91da18c7.koyeb.app
TELEGRAM_BOT_TOKEN=<your-token>
OPENAI_API_KEY=<your-key>
FB_PAGE_ID=<your-page-id>
FB_ACCESS_TOKEN=<your-access-token>
```

**PENTING**: JANGAN set `NODE_ENV`!

### Step 3: Redeploy
Klik **Redeploy** di Koyeb

### Step 4: Verifikasi Logs
Logs yang benar:
```
🚀 Starting Inngest Dev Server...
⏳ Waiting for Inngest server to be ready...
🎬 Starting Mastra server...
✅ Telegram webhook berhasil di-set!
```

Logs yang salah (error):
```
❌ Failed to send event
```

## 🎉 Expected Result

Setelah deployment berhasil:
- ✅ Health check PASS
- ✅ Webhook Telegram berhasil di-set
- ✅ Bot bisa terima pesan
- ✅ Workflow berjalan (download + upload ke Facebook)
- ✅ Tidak ada error INNGEST_EVENT_KEY

## 🔧 Troubleshooting

### Jika masih error "Failed to send event"
1. Pastikan `NODE_ENV` TIDAK di-set di Koyeb
2. Check logs untuk "Starting Inngest Dev Server"
3. Pastikan script `start-production.sh` executable (sudah di-set di Dockerfile)

### Jika "command not found: inngest-cli"
- Package `inngest-cli` ada di `package.json`
- Rebuild Docker image

### Jika container crash
- Check logs Koyeb untuk error message
- Pastikan semua env vars sudah diset

---

**Catatan**: Solusi ini menggunakan Inngest dev server yang berjalan di dalam container, sehingga TIDAK memerlukan Inngest Cloud atau API key berbayar. Cocok untuk deployment gratis di Koyeb!
