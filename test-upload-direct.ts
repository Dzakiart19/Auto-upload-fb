/**
 * Direct test untuk Facebook video upload
 * Run: npx tsx test-upload-direct.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import FormData from 'form-data';
import { getFacebookCredentials } from './src/mastra/tools/facebookHelpers';

// Create a minimal valid MP4 file
function createMinimalMP4(filePath: string) {
  const buffer = Buffer.from([
    // ftyp box
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70,
    0x69, 0x73, 0x6f, 0x6d, 0x00, 0x00, 0x02, 0x00,
    0x69, 0x73, 0x6f, 0x6d, 0x69, 0x73, 0x6f, 0x32,
    0x6d, 0x70, 0x34, 0x31, 0x00, 0x00, 0x00, 0x08,
    // mdat box
    0x00, 0x00, 0x00, 0x08, 0x6d, 0x64, 0x61, 0x74
  ]);
  fs.writeFileSync(filePath, buffer);
}

async function testUpload() {
  console.log('🧪 Testing Facebook Video Upload\n');

  const testVideoPath = './test-minimal.mp4';

  try {
    console.log('🔑 Step 1: Getting credentials...');
    const credentials = await getFacebookCredentials();
    console.log(`✅ Page ID: ${credentials.pageId}\n`);

    console.log('📝 Step 2: Creating test video...');
    createMinimalMP4(testVideoPath);
    console.log(`✅ Test file created (${fs.statSync(testVideoPath).size} bytes)\n`);

    console.log('📤 Step 3: Uploading to Facebook...');
    
    const formData = new FormData();
    formData.append('source', fs.createReadStream(testVideoPath));
    formData.append('title', 'Test Upload');
    formData.append('description', 'Testing permissions');

    const uploadUrl = `https://graph-video.facebook.com/v19.0/${credentials.pageId}/videos?access_token=${encodeURIComponent(credentials.pageAccessToken)}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const result = await uploadResponse.json();

    // Cleanup
    fs.unlinkSync(testVideoPath);

    if (!uploadResponse.ok || result.error) {
      console.error('❌ UPLOAD GAGAL\n');
      console.error('Error:');
      console.error(`   Code: ${result.error?.code}`);
      console.error(`   Message: ${result.error?.message}\n`);
      
      if (result.error?.message?.includes('permission')) {
        console.log('💡 Masalah Permission:');
        console.log('Token perlu permission pages_manage_engagement juga');
        console.log('untuk upload video ke Facebook Page.\n');
      }
      
      process.exit(1);
    }

    console.log('✅ BERHASIL! 🎉\n');
    console.log(`Video ID: ${result.id}`);
    console.log(`URL: https://www.facebook.com/${credentials.pageId}/videos/${result.id}\n`);

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ Upload video ke Facebook SUKSES!');
    console.log('Bot Telegram sekarang siap digunakan.');
    console.log('═══════════════════════════════════════════════════\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }
    process.exit(1);
  }
}

testUpload();
