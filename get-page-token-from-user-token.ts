/**
 * Get Page Access Token from User Access Token
 * Run: npx tsx get-page-token-from-user-token.ts <USER_TOKEN>
 */

const userToken = process.argv[2];

if (!userToken) {
  console.error('❌ Please provide User Access Token as argument');
  console.log('Usage: npx tsx get-page-token-from-user-token.ts <TOKEN>');
  process.exit(1);
}

async function getPageToken() {
  console.log('🔑 Getting Page Access Token from User Token...\n');
  console.log(`📋 User Token Length: ${userToken.length} characters\n`);

  try {
    // Step 1: Verify token and check permissions
    console.log('🔍 Step 1: Verifying token permissions...');
    const debugResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${userToken}&access_token=${userToken}`
    );

    const debugData: any = await debugResponse.json();

    if (debugData.error) {
      console.error('❌ Token tidak valid:', debugData.error.message);
      process.exit(1);
    }

    console.log('✅ Token valid!\n');

    const permissions = debugData.data?.scopes || [];
    console.log('🔑 Permissions:');
    permissions.forEach((perm: string) => {
      console.log(`   ✓ ${perm}`);
    });
    console.log('');

    // Check for pages_manage_posts
    if (permissions.includes('pages_manage_posts')) {
      console.log('✅ pages_manage_posts: ADA! Perfect!\n');
    } else {
      console.log('⚠️ pages_manage_posts: TIDAK ADA\n');
    }

    // Step 2: Get Page Access Token
    console.log('🔍 Step 2: Getting Page Access Token...');
    const pageResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${userToken}`
    );

    if (!pageResponse.ok) {
      const error = await pageResponse.json();
      console.error('❌ Error:', error.error?.message || 'Unknown error');
      process.exit(1);
    }

    const pageData: any = await pageResponse.json();

    if (!pageData.data || pageData.data.length === 0) {
      console.error('❌ Tidak ada Facebook Page yang ditemukan!');
      process.exit(1);
    }

    console.log(`✅ Ditemukan ${pageData.data.length} Facebook Page(s):\n`);

    // Display all pages
    pageData.data.forEach((page: any, index: number) => {
      console.log(`${index + 1}. ${page.name}`);
      console.log(`   Page ID: ${page.id}`);
      console.log(`   Category: ${page.category || 'N/A'}`);
      console.log(`   Access Token: ${page.access_token.substring(0, 30)}...`);
      
      if (page.id === '835519576318859') {
        console.log('   ⭐ MATCH! Ini adalah target page Anda');
      }
      console.log('');
    });

    // Get the target page
    const targetPage = pageData.data.find((p: any) => p.id === '835519576318859') || pageData.data[0];

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ PAGE ACCESS TOKEN');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log(`📄 Page Name: ${targetPage.name}`);
    console.log(`📋 Page ID: ${targetPage.id}\n`);
    
    console.log('🔑 Page Access Token:');
    console.log(targetPage.access_token);
    console.log('');

    console.log('═══════════════════════════════════════════════════');
    console.log('📝 NEXT STEPS:');
    console.log('═══════════════════════════════════════════════════\n');
    
    console.log('1. Copy Page Access Token di atas');
    console.log('2. Buka Replit → Tab Secrets');
    console.log('3. Edit FB_USER_ACCESS_TOKEN');
    console.log('4. Paste Page Access Token');
    console.log('5. Save\n');

    console.log('💡 Page Access Token memiliki FULL permission ke Page,');
    console.log('   jadi upload video seharusnya berhasil!\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

getPageToken();
