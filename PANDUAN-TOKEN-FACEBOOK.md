# 🔑 Panduan Lengkap: Generate Facebook Token dengan Permissions yang Benar

## ⚠️ MASALAH SAAT INI

Token Anda **TIDAK MEMILIKI** permissions ini:
- ❌ `pages_manage_posts` 
- ❌ `pages_manage_engagement`

Tanpa 2 permissions ini, upload video ke Facebook TIDAK AKAN BISA dan akan muncul error:
```
(#100) No permission to publish the video
```

---

## ✅ SOLUSI: Generate Token Baru dengan Permissions Lengkap

### 🎯 CARA 1: Menggunakan URL OAuth Langsung (RECOMMENDED)

#### Langkah 1: Dapatkan App ID
1. Buka: https://developers.facebook.com/apps/
2. Login dengan akun Facebook Anda
3. Pilih aplikasi Anda (atau buat baru jika belum punya)
4. Klik **Settings** → **Basic** di sidebar kiri
5. Copy **App ID** (angka panjang di bagian atas)

#### Langkah 2: Generate Token dengan URL
1. Copy URL ini dan **GANTI `YOUR_APP_ID`** dengan App ID Anda:

```
https://www.facebook.com/v19.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=https://www.facebook.com/connect/login_success.html&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,publish_video&response_type=token
```

**CONTOH:**
Jika App ID Anda adalah `123456789`, maka URL menjadi:
```
https://www.facebook.com/v19.0/dialog/oauth?client_id=123456789&redirect_uri=https://www.facebook.com/connect/login_success.html&scope=pages_show_list,pages_read_engagement,pages_manage_posts,pages_manage_engagement,publish_video&response_type=token
```

2. **Paste URL tersebut di browser** dan tekan Enter
3. Facebook akan meminta Anda untuk approve permissions - **KLIK APPROVE/IZINKAN SEMUA**
4. Setelah itu, browser akan redirect ke halaman sukses
5. **Lihat URL di address bar** - akan seperti ini:
   ```
   https://www.facebook.com/connect/login_success.html#access_token=EAABxyz123...&expires_in=...
   ```
6. **Copy token** yang ada setelah `access_token=` sampai sebelum `&`
   - Token dimulai dengan `EAAB...` atau `EAAG...`
   - Panjangnya biasanya 200-300 karakter

---

### 🎯 CARA 2: Menggunakan Graph API Explorer (Manual)

#### Langkah 1: Buka Graph API Explorer
1. Buka: https://developers.facebook.com/tools/explorer/
2. Pilih aplikasi Anda dari dropdown **"Meta App"** atau **"Application"**

#### Langkah 2: Tambahkan Permissions SATU PER SATU
⚠️ **PENTING:** Jangan cari di daftar! Ketik MANUAL!

1. Klik tombol **"Add a Permission"** atau **"Tambahkan Izin"**
2. **Ketik** `pages_manage_posts` dan tekan **Enter** ✅
3. Klik lagi **"Add a Permission"**
4. **Ketik** `pages_manage_engagement` dan tekan **Enter** ✅
5. Klik lagi **"Add a Permission"**
6. **Ketik** `pages_show_list` dan tekan **Enter** ✅
7. Klik lagi **"Add a Permission"**
8. **Ketik** `pages_read_engagement` dan tekan **Enter** ✅
9. Klik lagi **"Add a Permission"**
10. **Ketik** `publish_video` dan tekan **Enter** ✅

#### Langkah 3: Generate Token
1. Pastikan SEMUA 5 permissions sudah tercantum
2. Klik tombol **"Generate Access Token"**
3. Facebook akan meminta Anda untuk approve - **KLIK APPROVE/IZINKAN SEMUA**
4. Token akan muncul di field **"Access Token"**
5. **Copy token tersebut**

---

## 🔒 Update Token di Replit Secrets

Setelah dapat token baru:

1. Buka tab **"Secrets"** di Replit (ikon kunci di sidebar kiri)
2. Cari secret bernama **`FB_USER_ACCESS_TOKEN`**
3. **Edit** dan paste token baru
4. **Save**

---

## ✅ Verifikasi Token

Setelah update token, jalankan script ini untuk verifikasi:

```bash
npx tsx check-facebook-permissions.ts
```

Jika berhasil, Anda akan melihat:
```
✅ Semua permissions yang diperlukan sudah ada!
✅ Token memiliki permission yang cukup untuk upload video!
```

---

## 🆘 Troubleshooting

### Problem: "No pages found for this user access token"
**Solusi:** 
- Pastikan Anda adalah **Admin** dari Facebook Page
- Login dengan akun Facebook yang sama dengan yang manage Page tersebut

### Problem: Permissions tidak muncul di Graph API Explorer
**Solusi:**
- Jangan cari di daftar dropdown!
- **KETIK MANUAL** nama permission dan tekan Enter
- Graph API Explorer tidak menampilkan semua permissions di daftar

### Problem: Token tetap tidak punya permission setelah di-generate
**Solusi:**
- Aplikasi Facebook Anda mungkin belum di-approve untuk permissions tersebut
- Untuk **Development Mode**: Pastikan akun Facebook Anda ditambahkan sebagai **Developer/Tester** di aplikasi
- Buka **App Review** di Facebook Developers Console
- Jika aplikasi masih dalam mode development, permissions `pages_manage_posts` seharusnya tersedia tanpa review

### Problem: "(#200) Requires pages_manage_posts permission"
**Solusi:**
- Berarti token memang tidak memiliki permission yang benar
- Ulangi proses generate token dari awal
- Pastikan saat approve, SEMUA permissions di-approve

---

## 📞 Butuh Bantuan?

Jika masih mengalami masalah:

1. Kirim screenshot dari halaman Graph API Explorer yang menunjukkan:
   - Permissions yang ditambahkan
   - Token yang di-generate

2. Jalankan script verifikasi dan kirim output-nya:
   ```bash
   npx tsx check-facebook-permissions.ts
   ```

3. Cek apakah aplikasi Facebook dalam mode **Development** atau **Live**:
   - Buka: https://developers.facebook.com/apps/
   - Pilih aplikasi → lihat toggle di bagian atas
