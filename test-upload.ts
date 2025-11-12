import { mastra } from './src/mastra/index.js';
import { facebookUploadPhoto } from './src/mastra/tools/facebookUploadPhoto.js';
import { facebookUploadVideoSmart } from './src/mastra/tools/facebookUploadVideoSmart.js';

const logger = mastra.getLogger();

async function testPhotoUpload() {
  console.log('🔵 ========================================');
  console.log('📸 Testing Photo Upload to Facebook');
  console.log('🔵 ========================================');
  
  try {
    const result = await facebookUploadPhoto.execute({
      context: {
        photoPath: '/tmp/test_media/test_photo.jpg',
        caption: '🎉 Test upload foto dari Replit Bot!\n\n#TestUpload #ReplitBot #FacebookAPI',
      },
      mastra,
    });
    
    console.log('✅ Photo Upload Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Photo Upload Failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

async function testVideoUpload() {
  console.log('\n🔵 ========================================');
  console.log('🎬 Testing Video Upload to Facebook');
  console.log('🔵 ========================================');
  
  try {
    const result = await facebookUploadVideoSmart.execute({
      context: {
        videoPath: '/tmp/test_media/test_video.mp4',
        title: 'Test Video dari Replit Bot',
        description: '🎬 Video test upload otomatis\n\n#TestVideo #ReplitBot #FacebookAPI',
      },
      mastra,
    });
    
    console.log('✅ Video Upload Result:', JSON.stringify(result, null, 2));
    return result;
  } catch (error: any) {
    console.error('❌ Video Upload Failed:', error.message);
    console.error('Stack:', error.stack);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 Starting Upload Tests...\n');
  
  // Test 1: Upload Photo
  const photoResult = await testPhotoUpload();
  
  // Test 2: Upload Video
  const videoResult = await testVideoUpload();
  
  console.log('\n🔵 ========================================');
  console.log('📊 Test Summary');
  console.log('🔵 ========================================');
  console.log('Photo Upload:', photoResult.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('Video Upload:', videoResult.success ? '✅ SUCCESS' : '❌ FAILED');
  
  if (photoResult.success) {
    console.log('\n📸 Photo URL:', photoResult.photoUrl);
    console.log('📝 Post ID:', photoResult.postId);
  }
  
  if (videoResult.success) {
    console.log('\n🎬 Video ID:', videoResult.videoId);
  }
  
  process.exit(photoResult.success && videoResult.success ? 0 : 1);
}

main().catch(console.error);
