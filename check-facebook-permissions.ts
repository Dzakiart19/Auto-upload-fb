/**
 * Script untuk mengecek Facebook Token Permissions
 * Jalankan: npx tsx check-facebook-permissions.ts
 */

import 'dotenv/config';

async function checkFacebookPermissions() {
  console.log('🔍 Mengecek Facebook Token Permissions...\n');

  const userToken = process.env.FB_USER_ACCESS_TOKEN;
  const pageId = process.env.FB_PAGE_ID;

  if (!userToken) {
    console.error('❌ FB_USER_ACCESS_TOKEN tidak ditemukan!\n');
    return;
  }

  console.log('📋 Token Info:');
  console.log(`- Token Length: ${userToken.length} characters`);
  console.log(`- Page ID: ${pageId || 'Not set'}\n`);

  // Step 1: Check token validity and permissions
  console.log('🧪 Step 1: Mengecek validitas token...');
  try {
    const debugResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${userToken}`
    );

    const debugData: any = await debugResponse.json();

    if (debugData.error) {
      console.error('❌ Token tidak valid:', debugData.error.message);
      console.log('\n💡 Token mungkin sudah expired atau tidak valid.\n');
      printTokenInstructions();
      return;
    }

    console.log('✅ Token valid!\n');

    // Check permissions
    console.log('🔑 Permissions yang dimiliki token:');
    const permissions = debugData.data?.scopes || [];
    
    if (permissions.length === 0) {
      console.log('   (Tidak ada permissions yang terdeteksi)\n');
    } else {
      permissions.forEach((perm: string) => {
        console.log(`   ✓ ${perm}`);
      });
      console.log('');
    }

    // Check required permissions for video upload
    const requiredPermissions = [
      'pages_show_list',
      'pages_read_engagement', 
      'pages_manage_posts',
      'pages_manage_engagement',
    ];

    const missingPermissions = requiredPermissions.filter(
      (req) => !permissions.includes(req)
    );

    if (missingPermissions.length > 0) {
      console.log('⚠️ MASALAH DITEMUKAN: Permissions yang hilang:');
      missingPermissions.forEach((perm) => {
        console.log(`   ❌ ${perm}`);
      });
      console.log('\n💡 Ini adalah penyebab error "(#100) No permission to publish the video"\n');
      printTokenInstructions();
      return;
    }

    console.log('✅ Semua permissions yang diperlukan sudah ada!\n');

  } catch (error: any) {
    console.error('❌ Error mengecek token:', error.message);
    return;
  }

  // Step 2: Try to get page access token
  console.log('🧪 Step 2: Mencoba mendapatkan Page Access Token...');
  try {
    const pageResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );

    if (!pageResponse.ok) {
      const error = await pageResponse.json();
      console.error('❌ Gagal mendapatkan page token:', error);
      return;
    }

    const pageData: any = await pageResponse.json();

    if (!pageData.data || pageData.data.length === 0) {
      console.error('❌ Tidak ada Facebook Page yang ditemukan!');
      console.log('\n💡 Pastikan:');
      console.log('1. Anda adalah admin dari Facebook Page');
      console.log('2. Token memiliki permission yang benar\n');
      return;
    }

    console.log(`✅ Berhasil! Ditemukan ${pageData.data.length} Facebook Page(s):\n`);
    
    pageData.data.forEach((page: any, index: number) => {
      console.log(`${index + 1}. ${page.name}`);
      console.log(`   - Page ID: ${page.id}`);
      console.log(`   - Tasks: ${page.tasks?.join(', ') || 'N/A'}`);
      
      if (pageId && page.id === pageId) {
        console.log(`   ⭐ MATCH! Ini adalah page yang dikonfigurasi`);
      }
      console.log('');
    });

    // Step 3: Test page token permissions
    const targetPage = pageData.data.find((p: any) => p.id === pageId) || pageData.data[0];
    
    console.log('🧪 Step 3: Testing page token permissions...');
    console.log(`Using page: ${targetPage.name} (${targetPage.id})\n`);
    
    const pageTokenPermResponse = await fetch(
      `https://graph.facebook.com/v19.0/${targetPage.id}?fields=access_token,name,tasks,category&access_token=${userToken}`
    );
    
    const pagePermData: any = await pageTokenPermResponse.json();
    
    if (pagePermData.tasks) {
      console.log('✅ Page permissions:');
      pagePermData.tasks.forEach((task: string) => {
        console.log(`   ✓ ${task}`);
      });
      console.log('');
      
      // Check if MANAGE or CREATE_CONTENT is available
      const canManage = pagePermData.tasks.includes('MANAGE') || 
                       pagePermData.tasks.includes('CREATE_CONTENT') ||
                       pagePermData.tasks.includes('MODERATE');
      
      if (!canManage) {
        console.log('⚠️ WARNING: Token tidak memiliki permission MANAGE atau CREATE_CONTENT');
        console.log('Anda mungkin tidak bisa upload video ke page ini.\n');
      } else {
        console.log('✅ Token memiliki permission yang cukup untuk upload video!\n');
      }
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ KESIMPULAN:');
    console.log('Token valid dan siap digunakan untuk upload video!');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('❌ Error saat test:', error.message);
  }
}

function printTokenInstructions() {
  console.log('═══════════════════════════════════════════════════');
  console.log('📝 CARA MENDAPATKAN TOKEN YANG BENAR:');
  console.log('═══════════════════════════════════════════════════');
  console.log('\n1. Buka Facebook Graph API Explorer:');
  console.log('   https://developers.facebook.com/tools/explorer/\n');
  
  console.log('2. Pilih aplikasi Facebook Anda dari dropdown\n');
  
  console.log('3. Klik "Generate Access Token" atau "Get Token"\n');
  
  console.log('4. ⚠️ PENTING: Pilih permissions berikut:');
  console.log('   ✓ pages_show_list');
  console.log('   ✓ pages_read_engagement');
  console.log('   ✓ pages_manage_posts');
  console.log('   ✓ pages_manage_engagement\n');
  
  console.log('5. Klik "Generate Access Token" dan approve permissions\n');
  
  console.log('6. Copy token yang baru dan update di Secrets:');
  console.log('   FB_USER_ACCESS_TOKEN=<token-baru>\n');
  
  console.log('7. OPTIONAL: Untuk token yang tidak expire, convert ke');
  console.log('   Long-lived token (60 hari) atau Page Access Token (permanent)\n');
  
  console.log('═══════════════════════════════════════════════════\n');
}

// Run the check
checkFacebookPermissions();
