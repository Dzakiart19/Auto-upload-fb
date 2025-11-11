/**
 * Script untuk generate URL OAuth Facebook
 * Jalankan: npx tsx generate-facebook-token-url.ts
 */

import 'dotenv/config';

function generateFacebookOAuthURL() {
  console.log('🔗 Facebook Token Generator\n');
  console.log('═══════════════════════════════════════════════════\n');

  // Prompt for App ID
  console.log('📝 Untuk generate token yang benar, Anda perlu App ID.\n');
  console.log('Cara mendapatkan App ID:');
  console.log('1. Buka: https://developers.facebook.com/apps/');
  console.log('2. Pilih aplikasi Anda');
  console.log('3. Copy "App ID" dari dashboard\n');
  console.log('───────────────────────────────────────────────────\n');

  // The permissions we need
  const permissions = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'pages_manage_engagement',
    'publish_video',
  ];

  console.log('🔑 Permissions yang akan diminta:');
  permissions.forEach(perm => {
    console.log(`   ✓ ${perm}`);
  });
  console.log('\n───────────────────────────────────────────────────\n');

  // Generate URLs for common scenarios
  console.log('📋 COPY URL DI BAWAH INI (ganti YOUR_APP_ID dengan App ID Anda):\n');
  
  const scopeString = permissions.join(',');
  const redirectUri = 'https://www.facebook.com/connect/login_success.html';
  
  const oauthUrl = `https://www.facebook.com/v19.0/dialog/oauth?client_id=YOUR_APP_ID&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopeString}&response_type=token`;
  
  console.log(oauthUrl);
  console.log('\n───────────────────────────────────────────────────\n');

  console.log('📝 LANGKAH-LANGKAH:\n');
  console.log('1. Copy URL di atas');
  console.log('2. Ganti "YOUR_APP_ID" dengan App ID Anda');
  console.log('3. Paste URL di browser dan tekan Enter');
  console.log('4. Login ke Facebook dan approve semua permissions');
  console.log('5. Setelah redirect, lihat URL di address bar');
  console.log('6. Token ada di URL setelah "access_token="');
  console.log('   Contoh: ...#access_token=EAAB...xyz&...');
  console.log('7. Copy token tersebut (dari EAAB sampai sebelum &)');
  console.log('8. Update FB_USER_ACCESS_TOKEN di Secrets\n');

  console.log('═══════════════════════════════════════════════════\n');
  
  // Also generate Graph API Explorer alternative
  console.log('🔧 ALTERNATIF: Gunakan Graph API Explorer Manual\n');
  console.log('1. Buka: https://developers.facebook.com/tools/explorer/\n');
  console.log('2. Di bagian "Permissions", klik "Add a Permission"\n');
  console.log('3. Ketik SATU PER SATU dan tekan Enter setelah setiap permission:');
  permissions.forEach(perm => {
    console.log(`   → ${perm}`);
  });
  console.log('\n4. Setelah SEMUA permissions ditambahkan, klik "Generate Access Token"\n');
  console.log('5. Approve semua permissions yang diminta\n');
  console.log('6. Copy token yang muncul\n');
  console.log('═══════════════════════════════════════════════════\n');
}

generateFacebookOAuthURL();
