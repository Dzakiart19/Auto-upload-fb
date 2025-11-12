# 📦 Cara Export Project dari Replit

## Metode 1: Download Langsung

1. Di Replit, klik icon **☰** (hamburger menu) di kiri atas
2. Klik **Download as ZIP**
3. Save file ZIP ke komputer/HP Anda
4. Extract ZIP tersebut

## Metode 2: Git Clone (Recommended)

### Push ke GitHub dari Replit:

1. Di Replit, buka Shell
2. Jalankan:

```bash
# Setup git (jika belum)
git config --global user.email "your-email@example.com"
git config --global user.name "Your Name"

# Init git (jika belum ada .git)
git init
git add .
git commit -m "Initial commit"

# Create repo di GitHub dulu, lalu:
git remote add origin https://github.com/USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

### Clone di Termux:

```bash
cd ~
git clone https://github.com/USERNAME/REPO_NAME.git
cd REPO_NAME
```

## Metode 3: Manual Copy via Termux (Tanpa Git)

Jika Anda tidak mau repot dengan Git:

1. **Di Replit Shell**, compress semua file:

```bash
tar -czf project.tar.gz \
  package.json \
  package-lock.json \
  tsconfig.json \
  src/ \
  groups.txt \
  .env.example
```

2. Download file `project.tar.gz`

3. **Di HP**, pindahkan file tersebut ke folder Termux:
   - Pindahkan ke `/storage/emulated/0/Download/`
   
4. **Di Termux**, extract:

```bash
cd ~
mkdir facebook-bot
cd facebook-bot
cp /storage/emulated/0/Download/project.tar.gz .
tar -xzf project.tar.gz
```

## Metode 4: Copy-Paste Manual

Jika semua metode di atas gagal, copy manual:

### File yang HARUS di-copy:

1. `package.json`
2. `package-lock.json` 
3. `tsconfig.json`
4. `groups.txt`
5. Seluruh folder `src/`

### Cara manual:

1. Buat struktur folder di Termux:

```bash
mkdir -p ~/facebook-bot/src/mastra/{agents,tools,workflows,inngest,storage}
mkdir -p ~/facebook-bot/src/triggers
cd ~/facebook-bot
```

2. Buat setiap file dengan `nano`:

```bash
nano package.json
# Copy isi dari Replit, paste di sini
# CTRL+X, Y, Enter untuk save

nano tsconfig.json
# Copy isi dari Replit, paste di sini
# CTRL+X, Y, Enter untuk save

# Dan seterusnya untuk semua file...
```

## ✅ Checklist File yang Dibutuhkan

Pastikan folder Anda punya struktur seperti ini:

```
facebook-bot/
├── package.json              ✅ WAJIB
├── package-lock.json         ✅ WAJIB
├── tsconfig.json             ✅ WAJIB
├── groups.txt                ✅ WAJIB (berisi ID grup Facebook)
├── .env                      ✅ WAJIB (buat manual, isi token)
└── src/
    ├── global.d.ts
    ├── mastra/
    │   ├── index.ts          ✅ WAJIB
    │   ├── agents/
    │   │   └── facebookVideoAgent.ts
    │   ├── tools/
    │   │   ├── telegramDownloadVideo.ts
    │   │   ├── telegramDownloadPhoto.ts
    │   │   ├── telegramSendMessage.ts
    │   │   ├── ffmpegConvertVideo.ts
    │   │   ├── facebookUploadVideo.ts
    │   │   ├── facebookUploadPhoto.ts
    │   │   ├── facebookUploadVideoResumable.ts
    │   │   ├── facebookUploadVideoSmart.ts
    │   │   ├── facebookShareToGroups.ts
    │   │   └── facebookHelpers.ts
    │   ├── workflows/
    │   │   └── facebookVideoWorkflow.ts
    │   ├── inngest/
    │   │   ├── client.ts
    │   │   └── index.ts
    │   └── storage/
    │       └── index.ts
    └── triggers/
        └── telegramTriggers.ts
```

## 🔑 Setup .env File

Setelah copy project, WAJIB buat file `.env`:

```bash
cd ~/facebook-bot
nano .env
```

Isi dengan (ganti nilai sesuai token Anda):

```env
TELEGRAM_BOT_TOKEN=123456:ABCdefGHIjklMNOpqrsTUVwxyz
FB_USER_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
FB_PAGE_ID=123456789012345
OPENAI_API_KEY=sk-xxxxxxxxxx
DATABASE_URL=postgresql://localhost/mastra
NODE_ENV=production
PORT=5000
```

Save dengan `CTRL+X`, `Y`, `Enter`.

## ⚡ Quick Start Setelah Export

```bash
cd ~/facebook-bot

# Install dependencies
npm install

# Setup database
initdb $PREFIX/var/lib/postgresql
pg_ctl -D $PREFIX/var/lib/postgresql start
createdb mastra

# Run bot
npm run dev
```

## 🆘 Jika Ada Masalah

### Error: "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### Error: "Permission denied"
```bash
chmod -R 755 ~/facebook-bot
```

### Database connection error
```bash
pg_ctl -D $PREFIX/var/lib/postgresql restart
```

Selamat mencoba! 🚀
