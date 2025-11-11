/**
 * Test Facebook video upload dengan token yang ada
 * Run: npx tsx test-facebook-video-upload.ts
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as https from 'https';
import FormData from 'form-data';
import { getFacebookCredentials } from './src/mastra/tools/facebookHelpers';

async function downloadTestVideo(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function testUpload() {
  console.log('🧪 Testing Facebook Video Upload with Current Token...\n');

  const testVideoPath = './test-upload-video.mp4';

  try {
    // Step 1: Get credentials
    console.log('🔑 Step 1: Getting Facebook credentials...');
    const mockLogger = {
      info: (...args: any[]) => console.log('[INFO]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
    };

    const credentials = await getFacebookCredentials(mockLogger);
    console.log(`✅ Credentials obtained`);
    console.log(`   Page ID: ${credentials.pageId}`);
    console.log(`   Token length: ${credentials.pageAccessToken.length}\n`);

    // Step 2: Download test video
    console.log('📥 Step 2: Downloading test video...');
    const videoUrl = 'https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4';
    
    if (!fs.existsSync(testVideoPath)) {
      await downloadTestVideo(videoUrl, testVideoPath);
      console.log(`✅ Test video downloaded (${fs.statSync(testVideoPath).size} bytes)\n`);
    } else {
      console.log(`✅ Using existing test video (${fs.statSync(testVideoPath).size} bytes)\n`);
    }

    // Step 3: Upload to Facebook
    console.log('📤 Step 3: Uploading video to Facebook Page...');
    
    const formData = new FormData();
    formData.append('source', fs.createReadStream(testVideoPath));
    formData.append('title', 'Test Upload - Telegram Bot');
    formData.append('description', 'Video test dari Telegram bot untuk memverifikasi permissions. #test #automated');

    const uploadUrl = `https://graph-video.facebook.com/v19.0/${credentials.pageId}/videos?access_token=${encodeURIComponent(credentials.pageAccessToken)}`;

    console.log('🔄 Uploading...');
    
    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || uploadResult.error) {
      console.error('\n❌ UPLOAD GAGAL!');
      console.error('Error:', JSON.stringify(uploadResult, null, 2));
      
      if (uploadResult.error?.code === 100) {
        console.error('\n⚠️ Error Code 100 - Permission Issue');
        console.error('Meskipun ada pages_manage_posts, mungkin perlu pages_manage_engagement juga.');
      }
      
      process.exit(1);
    }

    console.log('\n✅ UPLOAD BERHASIL! 🎉\n');
    console.log('📋 Upload Result:');
    console.log(`   Video ID: ${uploadResult.id}`);
    console.log(`   Post ID: ${uploadResult.post_id || uploadResult.id}`);
    console.log(`   URL: https://www.facebook.com/${credentials.pageId}/videos/${uploadResult.id}\n`);

    // Cleanup
    fs.unlinkSync(testVideoPath);
    console.log('🗑️ Test video cleaned up\n');

    console.log('═══════════════════════════════════════════════════');
    console.log('✅ TOKEN BERFUNGSI DENGAN BAIK!');
    console.log('Bot Telegram Anda seharusnya bisa upload video sekarang.');
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

testUpload();
