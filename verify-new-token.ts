/**
 * Verify the new Facebook token
 * Run: npx tsx verify-new-token.ts <TOKEN>
 */

const newToken = process.argv[2];

if (!newToken) {
  console.error('❌ Please provide token as argument');
  process.exit(1);
}

async function verifyToken() {
  console.log('🔍 Verifying new Facebook token...\n');
  console.log(`Token length: ${newToken.length} characters\n`);

  // Check token validity and permissions
  try {
    const debugResponse = await fetch(
      `https://graph.facebook.com/v19.0/debug_token?input_token=${newToken}&access_token=${newToken}`
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

    // Check required permissions
    const required = [
      'pages_manage_posts',
      'pages_manage_engagement',
    ];

    const missing = required.filter(req => !permissions.includes(req));

    if (missing.length > 0) {
      console.log('⚠️ Masih ada permissions yang hilang:');
      missing.forEach((perm: string) => {
        console.log(`   ❌ ${perm}`);
      });
      console.log('\n❌ Token belum siap untuk upload video!\n');
      process.exit(1);
    }

    console.log('✅ Semua permissions lengkap!\n');

    // Try to get page token
    const pageResponse = await fetch(
      `https://graph.facebook.com/v19.0/me/accounts?access_token=${newToken}`
    );

    const pageData: any = await pageResponse.json();

    if (pageData.data && pageData.data.length > 0) {
      console.log(`✅ Ditemukan ${pageData.data.length} Facebook Page(s):\n`);
      pageData.data.forEach((page: any, index: number) => {
        console.log(`${index + 1}. ${page.name} (ID: ${page.id})`);
      });
      console.log('');
    }

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOKEN SIAP DIGUNAKAN!');
    console.log('═══════════════════════════════════════════════════\n');
    console.log('Silakan update FB_USER_ACCESS_TOKEN di Secrets dengan token ini.\n');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

verifyToken();
