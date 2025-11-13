# 🔧 Troubleshooting: Workflow Tidak Execute

## ❓ Gejala Masalah

User kirim URL TikTok/Instagram ke bot, tapi:
- ✅ Bot terima pesan (ada log `"TikTok URL detected"`)
- ✅ Workflow triggered (ada log `"publishing event"`)
- ✅ Event diterima Inngest (ada log `"received event"`)
- ❌ **Tapi tidak ada eksekusi workflow** (tidak ada log download/convert/upload)
- ❌ **User tidak dapat respon dari bot** setelah 5+ menit

## 🔍 Root Cause

**Inngest tidak menjalankan workflow** karena salah satu dari:

### 1. Inngest Functions Tidak Ter-register
**Penyebab:** Mastra start terlalu cepat sebelum Inngest ready, atau `--no-discovery` flag menghalangi auto-discovery

**Solusi yang diterapkan:**
```bash
# BEFORE (PROBLEM):
npx inngest-cli dev --host 0.0.0.0 --port 3000 --no-discovery &
sleep 5
npx mastra start &

# AFTER (FIXED):
npx inngest-cli dev --host 0.0.0.0 --port 3000 &  # Remove --no-discovery
sleep 10  # Increase wait time
npx mastra start &
sleep 5   # Wait for registration
```

### 2. Inngest Base URL Salah
**Penyebab:** Mastra tidak bisa connect ke Inngest server

**Check di log:**
```
src/mastra/inngest/client.ts:
baseUrl: process.env.INNGEST_BASE_URL || "http://localhost:3000"
```

Di Koyeb, karena semua di container yang sama, `localhost:3000` seharusnya OK.

### 3. Event Diterima tapi Function Tidak Execute
**Penyebab:** Function definition atau workflow registration bermasalah

## ✅ Solusi yang Sudah Diterapkan

### 1. Update Startup Script
File: `scripts/start-production.sh`

**Perubahan:**
- ❌ Remove `--no-discovery` flag (biar Inngest auto-discover)
- ⏱️ Increase wait time: `5s` → `10s` untuk Inngest startup
- ➕ Add `sleep 5` setelah Mastra start untuk registrasi

### 2. Cara Verifikasi di Koyeb

Setelah redeploy, cek log untuk memastikan:

#### ✅ Inngest Functions Registered:
```
{"level":"INFO","msg":"apps synced, disabling auto-discovery"}
```
Atau lihat di Inngest dashboard: http://localhost:3000 (jika bisa akses)

#### ✅ Workflow Execution Started:
Setelah kirim URL TikTok, harusnya ada log seperti:
```
{"level":"info","msg":"🚀 [processMediaUpload] Starting video upload process..."}
{"level":"info","msg":"📥 [Step 1] Downloading video from TikTok..."}
{"level":"info","msg":"🔧 [tiktokDownload] Starting execution..."}
```

#### ❌ Red Flags di Log:
```
"Error: Function not found"
"Event handler not registered"
"Connection refused"
"Timeout waiting for Inngest"
```

## 🚀 Cara Deploy Ulang

### Step 1: Push Update ke GitHub

```bash
git add scripts/start-production.sh
git commit -m "Fix Inngest workflow execution: remove no-discovery flag and increase startup delays"
git push origin main
```

### Step 2: Redeploy di Koyeb

1. Buka Koyeb dashboard
2. Click service Anda
3. Click **Redeploy**
4. Tunggu build selesai (3-7 menit)

### Step 3: Monitor Logs di Koyeb

**Logs yang BENAR:**
```
🚀 Starting Inngest Dev Server...
⏳ Waiting for Inngest server to be ready...
   (10 seconds wait)
🎬 Starting Mastra server...
⏳ Waiting for Mastra to register with Inngest...
   (5 seconds wait)
✅ Services started successfully!
...
{"level":"INFO","msg":"apps synced, disabling auto-discovery"}  ← PENTING!
...
✅ Telegram webhook berhasil di-set!
Instance is healthy. All health checks are passing.
```

### Step 4: Test Bot Lagi

1. Buka bot di Telegram
2. Kirim URL TikTok: `https://vt.tiktok.com/ZSynrwyYM/`
3. Tunggu 10-30 detik
4. **Expected:**
   - Bot reply: `🔗 TikTok URL Terdeteksi! ⏳ Sedang memproses...`
   - Workflow execute (lihat di log Koyeb):
     ```
     🚀 [processMediaUpload] Starting...
     📥 Downloading video from TikTok...
     🎬 Converting video...
     📤 Uploading to Facebook...
     📢 Sharing to groups...
     ```
   - Bot kirim konfirmasi: `✅ Video berhasil diupload! Link: ...`

## 🔍 Debugging Lanjutan

### Jika Masih Tidak Execute Setelah Redeploy:

#### 1. Check Inngest Dashboard (Internal)
Di container Koyeb, Inngest dashboard ada di `http://localhost:3000`

Sayangnya tidak bisa diakses dari luar. Tapi bisa cek via logs.

#### 2. Manual Trigger Test via Inngest API
```bash
# Test if Inngest can receive events
curl -X POST http://localhost:3000/e/mastra-telegram-bot \
  -H "Content-Type: application/json" \
  -d '{
    "name": "workflow.facebook-video-workflow",
    "data": {
      "inputData": {
        "chatId": 7390867903,
        "threadId": "test-123",
        "url": "https://vt.tiktok.com/ZSynrwyYM/"
      }
    }
  }'
```

Tapi ini harus dari dalam container, tidak bisa dari luar.

#### 3. Add More Logging
Jika masih bermasalah, kita bisa tambah logging di workflow execution.

## 📋 Checklist Troubleshooting

Jika workflow tidak execute, cek:

- [ ] **Inngest server running?** (cek log: `"starting server","caller":"api"`)
- [ ] **Mastra server running?** (cek log: `"Mastra API running"`)
- [ ] **Functions registered?** (cek log: `"apps synced"`)
- [ ] **Event published?** (cek log: `"publishing event"`)
- [ ] **Event received?** (cek log: `"received event"`)
- [ ] **Workflow execution started?** (cek log: `"processMediaUpload"`)

Jika semua ✅ kecuali yang terakhir → Masalah di Inngest function registration!

## 💡 Alternative Solution (jika masih gagal)

### Option 1: Increase Timeouts
Di `scripts/start-production.sh`:
```bash
sleep 10  # → sleep 15
sleep 5   # → sleep 10
```

### Option 2: Manual Function Registration
Tambah curl command di startup script untuk force register:
```bash
echo "🔄 Registering functions with Inngest..."
sleep 3
curl -s http://localhost:8000/api/inngest || true
```

### Option 3: Use Inngest Cloud (Tidak Recommended)
Ganti self-hosted dengan Inngest Cloud, tapi perlu signup dan API key.

## 🎯 Expected Timeline

Setelah redeploy dengan fix ini:
- Build: 3-7 menit
- Startup: ~20 detik (dengan sleep 10 + 5)
- Test bot: Response dalam 10-30 detik

Total: ~10 menit dari push sampai bot bisa digunakan

---

## 📝 Update Status

**Update terakhir:** 2025-11-13  
**Status:** Fix diterapkan, menunggu redeploy dan testing  
**Next step:** Push ke GitHub → Redeploy di Koyeb → Test bot

**Jika masih bermasalah setelah redeploy, share:**
1. Screenshot full logs Koyeb (dari awal startup)
2. Screenshot bot response di Telegram
3. URL app Koyeb untuk debugging
