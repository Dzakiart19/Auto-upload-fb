/**
 * Test script untuk upload video ke Facebook
 * Jalankan dengan: npx tsx test-facebook-upload.ts
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as https from 'https';
import FormData from 'form-data';
import { getFacebookCredentials } from './src/mastra/tools/facebookHelpers';

dotenv.config();

// Download a small test video from a public URL
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

// Create a minimal test video using pure JavaScript/Node
async function createTestVideo(filePath: string): Promise<void> {
  // Use a tiny sample video URL (public domain)
  const sampleVideoUrl = 'https://sample-videos.com/video123/mp4/240/big_buck_bunny_240p_1mb.mp4';
  
  console.log('📥 Downloading test video...');
  try {
    await downloadTestVideo(sampleVideoUrl, filePath);
    console.log('✅ Test video downloaded successfully');
  } catch (error) {
    console.log('⚠️ Failed to download sample video, creating minimal file...');
    // If download fails, create a minimal placeholder
    fs.writeFileSync(filePath, Buffer.from([0x00, 0x00, 0x00, 0x18, 0x66, 0x74, 0x79, 0x70]));
  }
}

async function testFacebookUpload() {
  console.log('🧪 Testing Facebook Video Upload...\n');

  const testVideoPath = './test-video.mp4';

  try {
    // Step 1: Get Facebook credentials
    console.log('🔑 Step 1: Getting Facebook credentials...');
    const mockLogger = {
      info: (...args: any[]) => console.log('[INFO]', ...args),
      error: (...args: any[]) => console.error('[ERROR]', ...args),
      warn: (...args: any[]) => console.warn('[WARN]', ...args),
    };

    const credentials = await getFacebookCredentials(mockLogger);
    console.log(`✅ Got credentials for Page ID: ${credentials.pageId}\n`);

    // Step 2: Create/download test video
    console.log('📹 Step 2: Preparing test video...');
    if (!fs.existsSync(testVideoPath)) {
      await createTestVideo(testVideoPath);
    }

    const stats = fs.statSync(testVideoPath);
    console.log(`✅ Test video ready (${stats.size} bytes)\n`);

    // Step 3: Upload to Facebook
    console.log('📤 Step 3: Uploading to Facebook Page...');
    
    const formData = new FormData();
    formData.append('source', fs.createReadStream(testVideoPath));
    formData.append('title', 'Test Upload - Bot Telegram');
    formData.append('description', 'Video test dari bot Telegram untuk Facebook. #test #automated');
    formData.append('access_token', credentials.pageAccessToken);

    const uploadUrl = `https://graph-video.facebook.com/v19.0/${credentials.pageId}/videos`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      body: formData as any,
      headers: formData.getHeaders(),
    });

    const uploadResult = await uploadResponse.json();

    if (!uploadResponse.ok || uploadResult.error) {
      console.error('❌ Upload failed:', uploadResult);
      throw new Error(`Upload gagal: ${uploadResult.error?.message || JSON.stringify(uploadResult)}`);
    }

    const videoId = uploadResult.id;
    const videoUrl = `https://www.facebook.com/${credentials.pageId}/videos/${videoId}`;

    console.log('\n🎉 UPLOAD BERHASIL!');
    console.log('==================');
    console.log(`📹 Video ID: ${videoId}`);
    console.log(`🔗 Video URL: ${videoUrl}`);
    console.log(`📄 Page ID: ${credentials.pageId}`);
    console.log('\n✅ Bot Telegram sudah siap untuk upload video ke Facebook!');
    console.log('✅ Silakan test dengan mengirim video ke bot Telegram Anda\n');

    // Clean up
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
      console.log('🗑️ Test video cleaned up\n');
    }

  } catch (error: any) {
    console.error('\n❌ TEST GAGAL!');
    console.error('Error:', error.message);
    
    if (error.message.includes('Invalid OAuth')) {
      console.log('\n📝 Token mungkin sudah expired. Generate token baru di:');
      console.log('https://developers.facebook.com/tools/explorer/\n');
    }

    // Clean up on error
    if (fs.existsSync(testVideoPath)) {
      fs.unlinkSync(testVideoPath);
    }

    process.exit(1);
  }
}

testFacebookUpload();
