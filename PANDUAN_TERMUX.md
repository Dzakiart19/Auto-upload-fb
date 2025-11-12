# 📱 Panduan Migrasi Bot ke Termux

## 🎯 Persiapan

Bot ini adalah aplikasi Node.js yang upload video/foto dari Telegram ke Facebook. Anda akan menjalankannya di HP menggunakan Termux.

## 📋 Langkah 1: Install Termux

1. Download Termux dari F-Droid (JANGAN dari Play Store karena versi lama):
   - Buka: https://f-droid.org/en/packages/com.termux/
   - Install aplikasi Termux

## 🔧 Langkah 2: Setup Termux

Buka Termux, lalu jalankan perintah berikut satu per satu:

```bash
# Update paket
pkg update && pkg upgrade -y

# Install Node.js (versi 20)
pkg install nodejs-lts -y

# Install Git
pkg install git -y

# Install FFmpeg (untuk konversi video)
pkg install ffmpeg -y

# Install PostgreSQL (untuk database)
pkg install postgresql -y

# Berikan izin akses storage
termux-setup-storage
```

## 📥 Langkah 3: Download Kode Project

### Opsi A: Clone dari GitHub (jika Anda sudah push ke GitHub)

```bash
cd ~
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

### Opsi B: Download File dari Replit

Di Replit, klik "Download as zip" lalu pindahkan ke HP. Atau buat folder baru dan copy file manual:

```bash
# Buat folder project
mkdir -p ~/facebook-bot
cd ~/facebook-bot

# Anda perlu copy file-file berikut dari Replit ke folder ini:
# - package.json
# - package-lock.json
# - tsconfig.json
# - src/ (semua folder dan file)
# - groups.txt
```

## 🔐 Langkah 4: Setup Environment Variables

Buat file `.env` di folder project:

```bash
nano .env
```

Isi dengan data berikut (ganti dengan token Anda):

```env
# Telegram Bot Token
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Facebook Credentials
FB_USER_ACCESS_TOKEN=your_facebook_user_access_token_here
FB_PAGE_ID=your_facebook_page_id_here

# OpenAI (opsional - bisa pakai fallback)
OPENAI_API_KEY=your_openai_api_key_here

# Database URL (PostgreSQL)
DATABASE_URL=postgresql://localhost/mastra

# Node Environment
NODE_ENV=production

# Port
PORT=5000
```

Tekan `CTRL + X`, lalu `Y`, lalu `Enter` untuk save.

## 📦 Langkah 5: Install Dependencies

```bash
npm install
```

## 🗄️ Langkah 6: Setup Database PostgreSQL

```bash
# Inisialisasi PostgreSQL
initdb $PREFIX/var/lib/postgresql

# Start PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql start

# Buat database
createdb mastra

# PostgreSQL akan otomatis jalan di background
```

## ▶️ Langkah 7: Jalankan Bot

### Development Mode (dengan hot reload):

```bash
npm run dev
```

### Production Mode:

```bash
npm run build
node .mastra/index.js
```

## 🌐 Langkah 8: Setup Webhook Telegram

Bot sekarang jalan di HP Anda, tapi Telegram perlu tahu cara mengirim pesan ke bot. Anda butuh URL publik.

### Opsi A: Menggunakan Ngrok (Recommended untuk Testing)

1. Install ngrok di Termux:
```bash
pkg install wget -y
wget https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-linux-arm64.tgz
tar xvzf ngrok-v3-stable-linux-arm64.tgz
mv ngrok $PREFIX/bin/
```

2. Signup di https://ngrok.com dan dapatkan authtoken

3. Setup authtoken:
```bash
ngrok config add-authtoken YOUR_NGROK_TOKEN
```

4. Jalankan ngrok (di terminal baru):
```bash
ngrok http 5000
```

5. Copy URL yang muncul (contoh: `https://abcd1234.ngrok.io`)

6. Set webhook Telegram:
```bash
# Ganti YOUR_BOT_TOKEN dan NGROK_URL
curl "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=NGROK_URL/webhooks/telegram/action"
```

### Opsi B: Menggunakan Serveo (Gratis, tanpa signup)

```bash
# Di terminal baru
ssh -R 80:localhost:5000 serveo.net
```

URL akan muncul, lalu set webhook seperti di atas.

### Opsi C: Deploy ke VPS/Hosting (Recommended untuk Produksi)

Untuk penggunaan jangka panjang, deploy ke:
- Railway.app (gratis)
- Render.com (gratis)
- Fly.io (gratis)
- VPS (DigitalOcean, Vultr, dll)

## ✅ Langkah 9: Test Bot

1. Buka Telegram, cari bot Anda
2. Kirim `/start`
3. Kirim video atau foto
4. Bot akan minta judul
5. Bot akan minta deskripsi
6. Bot akan proses dan upload ke Facebook

## 🔄 Auto-Start Bot Saat HP Restart

Install Termux:Boot dari F-Droid, lalu buat script:

```bash
# Buat folder untuk boot scripts
mkdir -p ~/.termux/boot

# Buat script startup
nano ~/.termux/boot/start-bot.sh
```

Isi dengan:

```bash
#!/data/data/com.termux/files/usr/bin/bash
termux-wake-lock
cd ~/facebook-bot
pg_ctl -D $PREFIX/var/lib/postgresql start
npm run dev
```

Buat executable:

```bash
chmod +x ~/.termux/boot/start-bot.sh
```

## 🔍 Troubleshooting

### Bot tidak bisa upload ke Facebook?

Cek koneksi internet HP Anda. Jika masih gagal, coba:

```bash
# Test koneksi ke Facebook
curl -I https://graph.facebook.com
```

### Database error?

```bash
# Restart PostgreSQL
pg_ctl -D $PREFIX/var/lib/postgresql restart
```

### FFmpeg tidak ditemukan?

```bash
# Install ulang FFmpeg
pkg reinstall ffmpeg -y
```

### Port 5000 sudah dipakai?

Edit file `src/mastra/index.ts`, cari `port: 5000` dan ganti ke port lain (misal 3000).

## 💡 Tips Penting

1. **Jangan lock HP**: Bot perlu jalan terus. Matikan battery optimization untuk Termux
2. **Koneksi WiFi**: Gunakan WiFi stabil, bukan mobile data (kecuali unlimited)
3. **Termux:Wake Lock**: Install dari F-Droid agar Termux tidak di-kill sistem
4. **Storage**: Pastikan HP punya space cukup untuk video temporary
5. **Background**: Gunakan `tmux` agar bot tetap jalan saat Anda tutup Termux:

```bash
# Install tmux
pkg install tmux -y

# Jalankan bot di tmux session
tmux new -s bot
npm run dev

# Detach: CTRL+B lalu D
# Attach kembali: tmux attach -t bot
```

## 🎉 Selesai!

Bot sekarang jalan di HP Anda. Keuntungan:
- ✅ Tidak di-block Facebook (IP pribadi)
- ✅ Kontrol penuh
- ✅ Gratis (tidak perlu bayar hosting)

Kekurangan:
- ❌ HP harus terus online
- ❌ Perlu setup ngrok/serveo untuk webhook
- ❌ Konsumsi baterai

## 📝 Catatan Tambahan

Jika Anda merasa Termux terlalu ribet, pertimbangkan untuk deploy ke Railway.app atau Render.com yang lebih mudah dan gratis, cukup connect GitHub repo Anda.
