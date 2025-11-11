/**
 * Simple test untuk Facebook video upload capability
 * Run: npx tsx test-facebook-upload-simple.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import FormData from 'form-data';
import { getFacebookCredentials } from './src/mastra/tools/facebookHelpers';

// Create a minimal valid MP4 file (just headers, won't play but valid for API test)
function createMinimalMP4(filePath: string) {
  // Minimal MP4 file structure
  const buffer = Buffer.from([
    // ftyp box
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    0x6d, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08,
    // mdat box (empty)
    0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74
  ]);
  fs.writeFileSync(filePath, buffer);
}

async function testFacebookPermissions() {
  console.log('🧪 Testing Facebook Upload Permissions...\n');

  const testVideoPath = './minimal-test.mp4';

  try {
    // Step 1: Get credentials
    console.log('🔑 Getting Facebook credentials...');
    const mockLogger = {
      info: () => {},
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      warn: () => {},
    };

    const credentials = await getFacebookCredentials(mockLogger);
    console.log(`✅ Page ID: ${credentials.pageId}`);
    console.log(`✅ Token length: ${credentials.pageAccessToken.length}\n`);

    // Step 2: Check Page info and permissions
    console.log('🔍 Checking Page permissions...');
    const pageInfoResponse = await fetch(
      `https://graph.facebook.com/v19.0/${credentials.pageId}?fields=name,access_token,tasks&access_token=${credentials.pageAccessToken}`
    );

    const pageInfo: any = await pageInfoResponse.json();

    if (pageInfo.error) {
      console.error('❌ Error getting page info:', pageInfo.error.message);
      process.exit(1);
    }

    console.log(`✅ Page Name: ${pageInfo.name}`);
    
    if (pageInfo.tasks) {
      console.log('✅ Page Tasks/Permissions:');
      pageInfo.tasks.forEach((task: string) => {
        console.log(`   ✓ ${task}`);
      });
      
      const canCreateContent = pageInfo.tasks.includes('CREATE_CONTENT') || 
                              pageInfo.tasks.includes('MANAGE');
      
      if (!canCreateContent) {
        console.log('\n⚠️ WARNING: Token tidak memiliki CREATE_CONTENT atau MANAGE permission');
        console.log('Upload video mungkin gagal.\n');
      } else {
        console.log('\n✅ Token memiliki permission untuk create content!\n');
      }
    }

    // Step 3: Test upload with minimal file
    console.log('📤 Testing video upload...');
    createMinimalMP4(testVideoPath);
    console.log(`✅ Created minimal test video (${fs.statSync(testVideoPath).size} bytes)`);

    const formData = new FormData();
    formData.append('source', fs.createReadStream(testVideoPath));
    formData.append('title', 'Permission Test');
    formData.append('description', 'Testing upload permissions');

    const uploadUrl = `https://graph-video.facebook.com/v19.0/${credentials.pageId}/videos?access_token=${encodeURIComponent(credentials.pageAccessToken)}`;

    console.log('🔄 Attempting upload...\n');
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const uploadResult = await uploadResponse.json();

    // Cleanup test file
    fs.unlinkSync(testVideoPath);

    if (!uploadResponse.ok || uploadResult.error) {
      console.error('❌ UPLOAD GAGAL!\n');
      console.error('Error Details:');
      console.error(`   Code: ${uploadResult.error?.code}`);
      console.error(`   Message: ${uploadResult.error?.message}`);
      console.error(`   Type: ${uploadResult.error?.type}\n`);
      
      if (uploadResult.error?.code === 100) {
        console.log('💡 Error 100 - Permission Denied');
        console.log('Kemungkinan penyebab:');
        console.log('1. Token tidak memiliki pages_manage_engagement permission');
        console.log('2. Aplikasi Facebook belum di-approve untuk video upload');
        console.log('3. Page tidak memiliki permission yang cukup\n');
      } else if (uploadResult.error?.code === 200) {
        console.log('💡 Error 200 - Permission Issue');
        console.log('Token mungkin perlu permission tambahan untuk video upload\n');
      }
      
      process.exit(1);
    }

    console.log('✅ UPLOAD BERHASIL! 🎉\n');
    console.log('Upload Result:');
    console.log(`   Video ID: ${uploadResult.id}`);
    console.log(`   Post ID: ${uploadResult.post_id || 'N/A'}`);
    console.log(`   URL: https://www.facebook.com/${credentials.pageId}/videos/${uploadResult.id}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOKEN BERFUNGSI SEMPURNA!');
    console.log('Bot Telegram sekarang bisa upload video ke Facebook.');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    
    // Cleanup on error
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
    
    process.exit(1);
  }
}

testFacebookPermissions();
