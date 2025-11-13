# Penjelasan: Duplicate URL Detection

## ⚠️ Apa yang Terjadi di Log Koyeb?

Log Koyeb menunjukkan:
```
⚠️ [Telegram] Duplicate URL request detected dan diabaikan
Instance is stopping.
npm error signal SIGTERM
```

## ✅ Ini BUKAN Bug - Ini Fitur Keamanan!

### Kenapa Ada Duplicate URL Detection?

Fitur ini **mencegah pemrosesan berulang** dari URL yang sama dalam waktu 5 menit. Ini penting untuk:

1. **Mencegah double upload** ke Facebook
2. **Menghemat API calls** ke TikTok/Instagram/Facebook
3. **Menghindari spam** di Facebook Groups
4. **Melindungi rate limits** dari platform

### Bagaimana Cara Kerjanya?

```typescript
// Di telegramTriggers.ts, baris 220-250

// Saat URL TikTok/Instagram terdeteksi:
const urlKey = `${chatId}-${cleanUrl}`; // e.g., "7390867903-https://vt.tiktok.com/ZSynrwyYM/"
const now = Date.now();

// Cek apakah URL ini sedang diproses
if (processingUrls.has(urlKey)) {
  const processingTime = processingUrls.get(urlKey)!;
  const elapsedTime = now - processingTime;
  
  // Jika masih dalam 5 menit, ABAIKAN
  if (elapsedTime < PROCESSING_TIMEOUT) { // 5 menit
    logger?.warn(`⚠️ Duplicate URL request detected dan diabaikan`);
    
    // Kirim pesan ke user
    await sendTelegramMessage(
      chatId,
      `⚠️ Video dari ${platform} ini sedang diproses.\n\nMohon tunggu beberapa saat...`
    );
    
    return c.text("OK", 200); // Tidak diproses
  }
}

// Mark URL sebagai sedang diproses
processingUrls.set(urlKey, now); // Lock untuk 5 menit

// Proses video...
```

### Kapan URL Dianggap Duplicate?

URL dianggap duplicate jika:
- ✅ **Chat ID sama** DAN
- ✅ **URL sama persis** DAN
- ✅ **Dalam waktu 5 menit** sejak URL pertama kali diproses

### Kapan Lock Dibersihkan?

Ada 2 cara lock dibersihkan:

1. **Auto cleanup setiap 10 menit**
   ```typescript
   setInterval(() => {
     const now = Date.now();
     for (const [key, timestamp] of processingUrls.entries()) {
       if (now - timestamp > PROCESSING_TIMEOUT) { // 5 menit
         processingUrls.delete(key);
       }
     }
   }, 10 * 60 * 1000); // 10 menit
   ```

2. **Restart server** - semua lock dihapus (karena Map di memory)

## 🔍 Analisis Log Koyeb Anda

### Log yang Normal:
```json
{"level":"info","msg":"📝 [Telegram] payload"}
{"level":"info","msg":"🔍 [Telegram] Checking for TikTok/Instagram URLs in text..."}
{"level":"info","msg":"🎯 [Telegram] TikTok URL detected in message"}
```
✅ **Ini bagus!** Bot menerima URL dan mendeteksinya dengan benar.

### Log Warning (NORMAL):
```json
{"level":"warn","msg":"⚠️ [Telegram] Duplicate URL request detected dan diabaikan"}
```
✅ **Ini juga normal!** Berarti user mengirim URL yang sama 2x dalam 5 menit.

**Kemungkinan skenario:**
1. User forward message yang sama 2x
2. User copy-paste URL yang sama
3. Bot masih memproses video dari URL tersebut

### Log Error (INI MASALAHNYA):
```
Instance is stopping.
npm error signal SIGTERM
```
❌ **Ini masalah deployment**, BUKAN karena duplicate detection!

## 🛠️ Solusi untuk Instance Stopping

### Penyebab Instance Stopping:

1. **Health check gagal** di Koyeb
   - Koyeb tidak bisa reach `/health` endpoint
   - Port tidak match (harus 8000)
   - Initial delay terlalu pendek

2. **Process exit unexpectedly**
   - Inngest server crash
   - Mastra server crash
   - Memory limit exceeded

3. **Signal handling issue**
   - SIGTERM tidak ditangani dengan baik
   - Script exit sebelum waktunya

### Solusi yang Sudah Diterapkan:

#### 1. Update `scripts/start-production.sh`
```bash
# Sebelum (MASALAH):
wait -n  # Exit saat salah satu process selesai

# Sesudah (FIXED):
wait     # Tunggu SEMUA process selesai
```

#### 2. Update Health Check di Koyeb
Lihat `KOYEB_SETUP.md` untuk konfigurasi health check yang benar:
- Initial delay: **60 seconds** (cukup waktu untuk startup)
- Interval: **30 seconds**
- Timeout: **10 seconds**

#### 3. Auto Webhook Setup
Tambah environment variable:
```
AUTO_WEBHOOK=true
```

## 📋 Checklist Sebelum Push ke GitHub

- [x] Update `scripts/start-production.sh` dengan `wait` command
- [x] Review health check configuration di `KOYEB_SETUP.md`
- [x] Pastikan environment variables lengkap
- [ ] Test di Replit dulu (opsional)
- [ ] Push ke GitHub
- [ ] Deploy ulang di Koyeb
- [ ] Monitor logs untuk memastikan no errors

## 🎯 Expected Behavior Setelah Fix

### Logs yang Sehat di Koyeb:
```
🚀 Starting Inngest Dev Server...
⏳ Waiting for Inngest server to be ready...
🎬 Starting Mastra server...
✅ Services started successfully!
📊 Inngest PID: 123
📊 Mastra PID: 456
⏳ Waiting for processes...
```

### Saat Ada Duplicate URL:
1. User kirim URL TikTok: `https://vt.tiktok.com/ZSynrwyYM/`
2. Bot proses video (5-30 detik)
3. User kirim URL yang sama lagi (dalam 5 menit)
4. Bot reply: `⚠️ Video dari TikTok ini sedang diproses. Mohon tunggu...`
5. **Instance TETAP HIDUP** ✅

## 💡 Tips

1. **Jangan kirim URL yang sama 2x** dalam 5 menit
2. Tunggu notifikasi sukses dari bot sebelum kirim URL baru
3. Jika perlu force re-process, tunggu 5 menit atau restart bot
4. Monitor logs di Koyeb untuk troubleshooting

## 🚀 Ready to Deploy!

Ikuti langkah di `KOYEB_SETUP.md` untuk deploy dengan konfigurasi yang sudah diperbaiki.
