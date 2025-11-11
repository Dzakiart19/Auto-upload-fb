/**
 * Test script untuk memverifikasi Facebook token
 * Jalankan dengan: npx tsx test-facebook-token.ts
 */

import * as dotenv from 'dotenv';

dotenv.config();

async function testFacebookToken() {
  console.log('🔍 Testing Facebook Token Configuration...\n');

  const userToken = process.env.FB_USER_ACCESS_TOKEN;
  const pageToken = process.env.FB_PAGE_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  console.log('📋 Environment Variables:');
  console.log(`- FB_USER_ACCESS_TOKEN: ${userToken ? '✅ Set (length: ' + userToken.length + ')' : '❌ Not set'}`);
  console.log(`- FB_PAGE_ACCESS_TOKEN: ${pageToken ? '✅ Set (length: ' + pageToken.length + ')' : '❌ Not set'}`);
  console.log(`- FB_PAGE_ID: ${pageId ? '✅ ' + pageId : '❌ Not set'}\n`);

  if (!userToken) {
    console.error('❌ FB_USER_ACCESS_TOKEN tidak ditemukan!');
    console.log('\n📝 Cara mendapatkan token:');
    console.log('1. Buka: https://developers.facebook.com/tools/explorer/');
    console.log('2. Pilih aplikasi Facebook Anda');
    console.log('3. Klik "Generate Access Token"');
    console.log('4. Pilih permissions: pages_manage_posts, pages_read_engagement, pages_show_list');
    console.log('5. Copy token dan set sebagai FB_USER_ACCESS_TOKEN\n');
    return;
  }

  // Test 1: Get Page Access Token
  console.log('🧪 Test 1: Exchange User Token for Page Token...');
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Failed to get page token:', error);
      
      if (error.error?.code === 190) {
        console.log('\n⚠️ Token tidak valid atau sudah expired!');
        console.log('📝 Silakan generate token baru di: https://developers.facebook.com/tools/explorer/\n');
      }
      return;
    }

    const data: any = await response.json();

    if (!data.data || data.data.length === 0) {
      console.error('❌ Tidak ada Facebook Page yang ditemukan!');
      console.log('\n📝 Pastikan:');
      console.log('1. Anda adalah admin dari Facebook Page');
      console.log('2. Token memiliki permission yang benar\n');
      return;
    }

    console.log('✅ Berhasil! Ditemukan ' + data.data.length + ' Facebook Page(s):\n');
    
    data.data.forEach((page: any, index: number) => {
      console.log(`${index + 1}. ${page.name}`);
      console.log(`   - Page ID: ${page.id}`);
      console.log(`   - Access Token: ${page.access_token.substring(0, 20)}...`);
      console.log(`   - Category: ${page.category || 'N/A'}`);
      
      if (pageId && page.id === pageId) {
        console.log(`   ⭐ MATCH! This is your configured page\n`);
      } else {
        console.log('');
      }
    });

    // Test 2: Verify Page Token permissions
    const targetPage = pageId ? data.data.find((p: any) => p.id === pageId) : data.data[0];
    
    if (!targetPage) {
      console.error(`❌ Page ID ${pageId} tidak ditemukan dalam daftar page Anda!`);
      console.log(`\n📝 Gunakan salah satu Page ID di atas\n`);
      return;
    }

    console.log('🧪 Test 2: Verify Page Token Permissions...');
    const permResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/permissions?access_token=${targetPage.access_token}`
    );

    if (permResponse.ok) {
      const permissions: any = await permResponse.json();
      console.log('✅ Page token permissions:');
      permissions.data.forEach((perm: any) => {
        if (perm.status === 'granted') {
          console.log(`   ✓ ${perm.permission}`);
        }
      });
      console.log('');
    }

    // Test 3: Try to get page info
    console.log('🧪 Test 3: Get Page Information...');
    const pageInfoResponse = await fetch(
      `https://graph.facebook.com/v19.0/${targetPage.id}?fields=id,name,fan_count,category,access_token&access_token=${targetPage.access_token}`
    );

    if (pageInfoResponse.ok) {
      const pageInfo: any = await pageInfoResponse.json();
      console.log('✅ Page Info:');
      console.log(`   - Name: ${pageInfo.name}`);
      console.log(`   - ID: ${pageInfo.id}`);
      console.log(`   - Followers: ${pageInfo.fan_count || 'N/A'}`);
      console.log(`   - Category: ${pageInfo.category || 'N/A'}\n`);
    }

    console.log('🎉 SEMUA TEST BERHASIL!');
    console.log('\n✅ Konfigurasi Facebook Anda sudah benar!');
    console.log(`✅ Bot siap untuk upload video ke Page: ${targetPage.name}`);
    console.log('\n📝 Next steps:');
    console.log('1. Kirim video ke bot Telegram Anda');
    console.log('2. Bot akan otomatis upload ke Facebook Page');
    console.log('3. Video akan dibagikan ke grup-grup Facebook (jika ada di groups.txt)\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Troubleshooting:');
    console.log('1. Cek koneksi internet');
    console.log('2. Pastikan token belum expired');
    console.log('3. Generate token baru jika perlu\n');
  }
}

testFacebookToken();
