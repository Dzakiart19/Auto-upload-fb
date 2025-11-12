# 📝 Perubahan Kode untuk Termux

## ✅ Yang Sudah Diubah

Kode sudah dimodifikasi agar **support Termux dan ngrok/serveo**. Berikut perubahannya:

### 1. **Support PUBLIC_URL Environment Variable**

File: `src/mastra/index.ts`

**Fungsi `getPublicUrl()` sekarang punya prioritas:**

```typescript
const getPublicUrl = () => {
  // Priority 1: Custom PUBLIC_URL (untuk Termux dengan ngrok/serveo)
  if (process.env.PUBLIC_URL) {
    return process.env.PUBLIC_URL.trim();
  }
  
  // Priority 2: Replit environment
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }
  
  // Priority 3: Replit legacy
  const replSlug = process.env.REPL_SLUG;
  const replOwner = process.env.REPL_OWNER;
  if (replSlug && replOwner) {
    return `https://${replSlug}.${replOwner}.replit.dev`;
  }
  
  // Fallback: localhost (untuk testing lokal)
  return `http://localhost:${process.env.PORT || 5000}`;
};
```

**Manfaat:**
- ✅ Bisa pakai ngrok/serveo URL di Termux via `PUBLIC_URL` env var
- ✅ Tetap kompatibel dengan Replit
- ✅ Fallback ke localhost jika tidak ada URL publik
- ✅ Tidak crash jika environment variable Replit tidak ada

### 2. **Auto Webhook Setup yang Lebih Pintar**

Sekarang bot bisa:
- ✅ Auto-set webhook menggunakan `PUBLIC_URL` jika tersedia
- ✅ Bisa di-disable dengan `AUTO_WEBHOOK=false`
- ✅ Hanya jalan jika ada URL yang valid (starts with http)

```typescript
const autoWebhook = process.env.AUTO_WEBHOOK !== 'false';

if (telegramToken && autoWebhook && publicUrl.startsWith('http')) {
  // Auto-set webhook ke Telegram
}
```

### 3. **Support untuk Localhost**

Jika tidak ada URL publik, bot akan:
- ✅ Menggunakan `http://localhost:5000` sebagai fallback
- ✅ Tidak crash saat startup
- ✅ Tetap bisa diakses untuk testing lokal

## 🎯 Cara Pakai di Termux

### Setup Environment Variables:

Buat file `.env` dengan isi:

```env
# Telegram Bot Token (WAJIB)
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNOpqrsTUVwxyz

# Facebook Credentials (WAJIB)
FB_USER_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
FB_PAGE_ID=123456789012345

# Public URL dari ngrok/serveo (WAJIB untuk webhook)
# Isi setelah Anda jalankan ngrok
PUBLIC_URL=https://abc123.ngrok.io

# Auto Webhook Setup (OPSIONAL - default: true)
AUTO_WEBHOOK=true

# OpenAI (OPSIONAL - ada fallback tanpa AI)
OPENAI_API_KEY=sk-xxxxxxxxxx

# Database (OPSIONAL - default: postgresql://localhost/mastra)
DATABASE_URL=postgresql://localhost/mastra

# Port (OPSIONAL - default: 5000)
PORT=5000

# Node Environment (OPSIONAL - default: development)
NODE_ENV=production
```

### Workflow di Termux:

1. **Jalankan ngrok** (terminal 1):
```bash
ngrok http 5000
```

2. **Copy URL** yang muncul (misal: `https://abc123.ngrok.io`)

3. **Update `.env`**:
```bash
nano .env
# Edit baris PUBLIC_URL menjadi:
PUBLIC_URL=https://abc123.ngrok.io
```

4. **Jalankan bot** (terminal 2):
```bash
npm run dev
```

5. **Webhook otomatis di-set!** Cek log, harusnya muncul:
```
✅ Telegram webhook berhasil di-set!
   Webhook URL: https://abc123.ngrok.io/webhooks/telegram/action
```

## 🆚 Perbedaan dengan Replit

| Fitur | Replit | Termux |
|-------|--------|--------|
| URL Detection | Otomatis dari env | Manual via `PUBLIC_URL` |
| Webhook Setup | Otomatis saat deploy | Manual set ngrok URL |
| Database | Built-in PostgreSQL | Install sendiri |
| FFmpeg | Pre-installed | Install via pkg |
| Persistent | Always online | Tergantung HP |
| IP Address | Shared/blocked FB | Private/tidak blocked |

## 🔧 Troubleshooting

### Bot tidak bisa set webhook?

Cek:
1. `PUBLIC_URL` sudah di-set di `.env`
2. `AUTO_WEBHOOK` bukan `false`
3. `TELEGRAM_BOT_TOKEN` valid

Set manual:
```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<PUBLIC_URL>/webhooks/telegram/action"
```

### Ngrok URL berubah setiap restart?

Gratis ngrok URL berubah tiap restart. Solusi:
- Upgrade ngrok ke paid (dapat static domain)
- Atau pakai serveo.net
- Atau deploy ke VPS/Railway/Render

### Bot error "Cannot find REPL_SLUG"?

Ini normal di Termux. Pastikan `PUBLIC_URL` sudah di-set, atau bot akan fallback ke localhost.

## ✨ Kesimpulan

Kode sudah **siap untuk Termux** tanpa perlu modifikasi lagi! Yang perlu Anda lakukan:

1. ✅ Export project dari Replit
2. ✅ Setup Termux + dependencies
3. ✅ Buat file `.env` dengan `PUBLIC_URL`
4. ✅ Jalankan ngrok
5. ✅ Jalankan bot

Bot akan otomatis:
- ✅ Detect URL dari `PUBLIC_URL`
- ✅ Set webhook ke Telegram
- ✅ Siap terima request dari Telegram

**Tidak ada kode yang perlu diubah lagi!** 🎉
