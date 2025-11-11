/**
 * Script untuk mendapatkan Page Access Token dari User Access Token
 * Run: npx tsx get-page-access-token.ts
 */

import 'dotenv/config';

async function getPageAccessToken() {
  console.log('🔑 Mendapatkan Page Access Token...\n');

  const userToken = process.env.FB_USER_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  if (!userToken) {
    console.error('❌ FB_USER_ACCESS_TOKEN tidak ditemukan di Secrets!\n');
    return;
  }

  console.log(`📋 User Token Length: ${userToken.length} characters`);
  console.log(`📋 Target Page ID: ${pageId || 'Not set'}\n`);

  try {
    // Get all pages managed by this user
    console.log('🔍 Mengambil daftar Facebook Pages...');
    const response = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error:', error.error?.message || 'Unknown error');
      console.log('\n💡 Kemungkinan penyebab:');
      console.log('1. Token sudah expired');
      console.log('2. Token tidak valid');
      console.log('3. Akun tidak memiliki akses ke Facebook Page\n');
      return;
    }

    const data: any = await response.json();

    if (!data.data || data.data.length === 0) {
      console.error('❌ Tidak ada Facebook Page yang ditemukan!\n');
      console.log('💡 Pastikan:');
      console.log('1. Anda adalah Admin dari Facebook Page');
      console.log('2. Token memiliki permission pages_show_list\n');
      return;
    }

    console.log(`✅ Ditemukan ${data.data.length} Facebook Page(s):\n`);

    // Display all pages
    data.data.forEach((page: any, index: number) => {
      const isTarget = pageId && page.id === pageId;
      console.log(`${index + 1}. ${page.name}`);
      console.log(`   Page ID: ${page.id}`);
      console.log(`   Category: ${page.category || 'N/A'}`);
      console.log(`   Access Token: ${page.access_token.substring(0, 30)}...`);
      console.log(`   Token Length: ${page.access_token.length} characters`);
      
      if (isTarget) {
        console.log('   ⭐ MATCH! Ini adalah page yang dikonfigurasi');
      }
      console.log('');
    });

    // Get the target page token
    const targetPage = data.data.find((p: any) => p.id === pageId) || data.data[0];

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ PAGE ACCESS TOKEN UNTUK: ' + targetPage.name);
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('📋 Page ID:');
    console.log(targetPage.id);
    console.log('');
    
    console.log('🔑 Page Access Token:');
    console.log(targetPage.access_token);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('📝 LANGKAH SELANJUTNYA:');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('1. Copy Page Access Token di atas');
    console.log('2. Buka Replit Secrets (ikon kunci di sidebar)');
    console.log('3. Ganti nilai FB_USER_ACCESS_TOKEN dengan Page Access Token');
    console.log('4. ATAU tambahkan secret baru: FB_PAGE_ACCESS_TOKEN');
    console.log('5. Pastikan FB_PAGE_ID sesuai: ' + targetPage.id);
    console.log('6. Save dan restart aplikasi\n');

    console.log('💡 CATATAN:');
    console.log('Page Access Token memiliki full permission ke Page,');
    console.log('jadi tidak perlu pages_manage_posts atau permissions lainnya!\n');

    // Test the page token
    console.log('🧪 Testing Page Access Token...');
    const testResponse = await fetch(
      `https://graph.facebook.com/v19.0/${targetPage.id}?fields=name,access_token,tasks&access_token=${targetPage.access_token}`
    );

    const testData: any = await testResponse.json();

    if (testData.tasks) {
      console.log('✅ Page permissions:');
      testData.tasks.forEach((task: string) => {
        console.log(`   ✓ ${task}`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

getPageAccessToken();
