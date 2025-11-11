# 🔧 Panduan Setup Aplikasi Facebook untuk Upload Video

## ⚠️ MASALAH YANG DITEMUKAN

Permissions `pages_manage_posts` dan `pages_manage_engagement` **TIDAK TERSEDIA** di aplikasi Facebook Anda.

Ini karena Facebook sekarang mengharuskan aplikasi untuk:
1. Mendaftarkan "Use Case" (kasus penggunaan)
2. Request access untuk Advanced Permissions
3. Atau melakukan App Review untuk permissions tertentu

---

## ✅ SOLUSI UNTUK DEVELOPMENT/TESTING

### Opsi 1: Gunakan Page Access Token Langsung (RECOMMENDED)

Daripada menggunakan User Access Token, kita bisa langsung pakai **Page Access Token** yang memiliki full access ke Page.

#### Cara Mendapatkan Page Access Token:

1. **Buka Graph API Explorer:**
   - https://developers.facebook.com/tools/explorer/

2. **Pilih Page Anda:**
   - Klik dropdown "User or Page" atau "Token Pengguna"
   - Ganti ke "Get Page Access Token"
   - Pilih Facebook Page Anda dari daftar

3. **Generate Token:**
   - Token akan otomatis di-generate untuk Page tersebut
   - Token ini memiliki FULL access ke Page tanpa perlu permissions tambahan
   - Copy token tersebut

4. **Update di Replit:**
   - Buka Secrets di Replit
   - Ganti `FB_USER_ACCESS_TOKEN` dengan Page Access Token ini
   - ATAU buat secret baru `FB_PAGE_ACCESS_TOKEN`

---

### Opsi 2: Request Advanced Access di App Dashboard

1. **Buka App Dashboard:**
   - https://developers.facebook.com/apps/
   - Pilih aplikasi Anda

2. **Ke App Review:**
   - Sidebar kiri → **"App Review"** → **"Permissions and Features"**

3. **Request Permissions:**
   - Cari: `pages_manage_posts`
   - Klik **"Request Advanced Access"**
   - Jika diminta alasan, isi: "For automated video posting from Telegram bot"
   - Ulangi untuk `pages_manage_engagement`

4. **Untuk Development Mode:**
   - Beberapa permissions langsung tersedia untuk Developer/Tester
   - Pastikan akun Anda sudah ditambahkan di **App Roles**

---

### Opsi 3: Tambahkan Use Case

1. **Buka Use Cases:**
   - Di App Dashboard, cari **"Use Cases"** di sidebar

2. **Tambah Use Case:**
   - Klik **"Add Use Case"**
   - Pilih yang berhubungan dengan Pages atau Marketing API

3. **Aktifkan Permissions:**
   - Setelah Use Case ditambahkan, permissions akan tersedia

---

## 🎯 CARA PALING MUDAH: Page Access Token

Karena Anda hanya upload ke 1 Facebook Page, cara paling mudah adalah:

### Langkah-langkah:

1. Buka: https://developers.facebook.com/tools/explorer/

2. Klik dropdown **"Meta App"** dan pilih aplikasi Anda

3. Klik dropdown **"User or Page"** → pilih **"Get Page Access Token"**

4. Pilih Facebook Page Anda dari daftar

5. Facebook akan otomatis generate **Page Access Token** yang memiliki full permission

6. Copy token tersebut (biasanya dimulai dengan `EAAG...` atau `EAAB...`)

7. Di Replit Secrets, update:
   ```
   FB_USER_ACCESS_TOKEN = <page-access-token-yang-baru>
   ```

8. Jalankan test lagi:
   ```bash
   npx tsx check-facebook-permissions.ts
   ```

---

## 📝 Catatan Penting

**Page Access Token vs User Access Token:**

- **User Access Token**: Memerlukan permissions explicit (pages_manage_posts, etc)
- **Page Access Token**: Otomatis punya full access ke Page (tidak perlu permissions tambahan)

Untuk bot yang hanya upload ke 1 Page, **Page Access Token lebih mudah dan lebih stabil**.

---

## 🔒 Token yang Long-lived

Page Access Token yang di-generate lewat Graph API Explorer biasanya:
- Berlaku selama 60 hari (jika dari User Token short-lived)
- Atau PERMANENT (jika Page sudah dikonfigurasi dengan benar)

Untuk membuat token permanent:
1. Generate Page Access Token seperti di atas
2. Token tersebut biasanya sudah long-lived by default
3. Atau exchange token menjadi long-lived token (dijelaskan di dokumentasi Facebook)

---

## 🆘 Troubleshooting

### "This app doesn't have permission to access this Page"
**Solusi:**
- Pastikan Anda adalah Admin dari Facebook Page
- Pastikan aplikasi Facebook sudah terhubung dengan Page
- Tambahkan Page di **Settings** → **Advanced** → **Page Permissions**

### Token masih tidak punya permission setelah pakai Page Access Token
**Solusi:**
- Pastikan Anda pilih "Get Page Access Token", bukan "Get User Access Token"
- Pastikan Page yang dipilih adalah Page yang benar (sesuai FB_PAGE_ID)
