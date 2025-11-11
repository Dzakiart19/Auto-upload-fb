# 🎯 SOLUSI FINAL: Cara Mendapatkan Facebook Token yang Benar

## ❌ MASALAH YANG TERJADI

1. **Token sudah tidak valid** - "The session was invalidated previously using an API call"
2. **Permissions tidak lengkap** - `pages_manage_posts` dan `pages_manage_engagement` tidak tersedia
3. **Upload video gagal** - Error: "(#100) No permission to publish the video"

---

## ✅ SOLUSI: Dapatkan Page Access Token Baru

### 🔧 CARA TERMUDAH: Lewat Access Token Tool

1. **Buka Facebook Access Token Tool:**
   ```
   https://developers.facebook.com/tools/accesstoken/
   ```

2. **Pilih aplikasi Anda** dari dropdown

3. **Lihat bagian "Page Access Tokens"**
   - Akan muncul daftar semua Facebook Page yang Anda kelola
   - Cari Page dengan nama yang sesuai (ID: 835519576318859)

4. **Copy Page Access Token**
   - Klik tombol "Copy" atau salin token yang ditampilkan
   - Token ini adalah **Page Access Token** yang memiliki full permission

5. **Update di Replit:**
   - Buka tab **Secrets** di Replit
   - Edit `FB_USER_ACCESS_TOKEN`
   - Paste Page Access Token yang baru
   - Save

---

### 🔧 CARA ALTERNATIF: Lewat Graph API Explorer

#### Langkah 1: Buka Graph API Explorer
```
https://developers.facebook.com/tools/explorer/
```

#### Langkah 2: Pilih Aplikasi
- Dropdown **"Meta App"** → Pilih aplikasi Anda

#### Langkah 3: Generate User Access Token BARU
- Klik **"Generate Access Token"** 
- Login dan approve permissions (pilih semua yang tersedia)
- **PENTING**: Jangan gunakan token lama yang sudah invalidated!

#### Langkah 4: Dapatkan Page Access Token
Setelah mendapat User Access Token baru, jalankan command ini di terminal:

```bash
# Ganti <USER_TOKEN> dengan token yang baru di-generate
curl -X GET "https://graph.facebook.com/v19.0/me/accounts?access_token=<USER_TOKEN>"
```

Output akan menampilkan Page Access Token untuk setiap Page yang Anda kelola.

Copy Page Access Token untuk Page ID: 835519576318859

---

### 🔧 CARA PALING GAMPANG: Manual di Browser

1. **Buka URL ini di browser** (ganti `<USER_TOKEN>` dengan token dari Graph API Explorer):
   ```
   https://graph.facebook.com/v19.0/me/accounts?access_token=<USER_TOKEN>
   ```

2. **Browser akan menampilkan JSON** seperti ini:
   ```json
   {
     "data": [
       {
         "access_token": "EAAG...(ini adalah Page Access Token)...",
         "category": "...",
         "name": "Nama Page Anda",
         "id": "835519576318859",
         "tasks": ["ANALYZE", "ADVERTISE", "MODERATE", "CREATE_CONTENT", "MANAGE"]
       }
     ]
   }
   ```

3. **Copy value dari `access_token`** (bukan User Token, tapi Page Access Token)

4. **Update di Replit Secrets:**
   - FB_USER_ACCESS_TOKEN = `<Page Access Token yang baru>`

---

## 📝 KENAPA HARUS PAKAI PAGE ACCESS TOKEN?

| Aspek | User Access Token | Page Access Token |
|-------|------------------|------------------|
| **Permissions Required** | ❌ pages_manage_posts, pages_manage_engagement (TIDAK TERSEDIA) | ✅ Tidak perlu permissions tambahan |
| **Access Level** | ⚠️ Terbatas, perlu permissions explicit | ✅ Full access ke Page |
| **Stability** | ⚠️ Mudah expired/invalidated | ✅ Lebih stabil |
| **Untuk Bot** | ❌ Tidak cocok | ✅ RECOMMENDED |

---

## 🧪 SETELAH UPDATE TOKEN

Setelah mendapatkan dan mengupdate Page Access Token, jalankan test:

```bash
npx tsx check-facebook-permissions.ts
```

Jika berhasil, output akan menunjukkan:
```
✅ Token valid!
✅ Semua permissions lengkap!
```

Lalu test upload video dengan menjalankan bot Telegram Anda.

---

## 🔄 JIKA TOKEN MASIH BERMASALAH

Jika setelah mengikuti langkah di atas masih ada masalah, kemungkinan:

1. **Aplikasi Facebook belum setup dengan benar**
   - Pastikan aplikasi dalam Development Mode
   - Tambahkan diri Anda sebagai Admin/Developer di App Roles

2. **Bukan Admin dari Facebook Page**
   - Pastikan akun Facebook Anda adalah Admin (bukan Editor atau Moderator)
   - Cek di Page Settings → Page Roles

3. **Token sudah expired**
   - Generate token baru
   - Atau convert ke Long-lived token (60 hari)

---

## 🎯 RINGKASAN LANGKAH

1. Generate **User Access Token BARU** di Graph API Explorer
2. Gunakan token tersebut untuk mendapatkan **Page Access Token**
3. Update `FB_USER_ACCESS_TOKEN` dengan **Page Access Token** (bukan User Token!)
4. Test dengan `npx tsx check-facebook-permissions.ts`
5. Coba upload video dari bot Telegram

---

## 📞 JIKA MASIH STUCK

Kirimkan screenshot dari:
1. Graph API Explorer setelah generate token
2. Output dari: `npx tsx check-facebook-permissions.ts`
3. Error message yang muncul saat upload video
