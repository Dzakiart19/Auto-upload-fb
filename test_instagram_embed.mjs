import axios from "axios";

async function testInstagramEmbed() {
  console.log('🧪 Testing Instagram Embed API method...');
  
  const testUrl = 'https://www.instagram.com/reel/DOfoOsOEd3g/?igsh=MWo4MzVpZmFrd210eg==';
  
  try {
    // Extract post ID
    const urlMatch = testUrl.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    
    if (!urlMatch) {
      console.error('❌ Invalid Instagram URL format');
      return;
    }
    
    const postId = urlMatch[2];
    console.log('📝 Extracted post ID:', postId);
    
    // Fetch embed page
    const embedUrl = `https://www.instagram.com/p/${postId}/embed/captioned/`;
    console.log('📥 Fetching:', embedUrl);
    
    const embedResponse = await axios.get(embedUrl, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': 'https://www.instagram.com/',
      },
    });
    
    console.log('✅ Embed page fetched successfully');
    console.log('   Status:', embedResponse.status);
    console.log('   Content length:', embedResponse.data.length);
    
    // Extract video URL
    const htmlContent = embedResponse.data;
    let videoUrl = null;
    
    // Method 1: video_url
    const videoUrlMatch = htmlContent.match(/"video_url":"([^"]+)"/);
    if (videoUrlMatch) {
      videoUrl = videoUrlMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
      console.log('✅ Video URL found (method 1 - video_url)');
    }
    
    // Method 2: og:video
    if (!videoUrl) {
      const ogVideoMatch = htmlContent.match(/<meta property="og:video" content="([^"]+)"/);
      if (ogVideoMatch) {
        videoUrl = ogVideoMatch[1];
        console.log('✅ Video URL found (method 2 - og:video)');
      }
    }
    
    // Method 3: videoUrl
    if (!videoUrl) {
      const scriptMatch = htmlContent.match(/"videoUrl":"([^"]+)"/);
      if (scriptMatch) {
        videoUrl = scriptMatch[1].replace(/\\u0026/g, '&').replace(/\\\//g, '/');
        console.log('✅ Video URL found (method 3 - videoUrl)');
      }
    }
    
    if (!videoUrl) {
      console.error('❌ No video URL found in embed page');
      console.log('📄 First 500 chars of HTML:', htmlContent.substring(0, 500));
      return;
    }
    
    console.log('📝 Video URL:', videoUrl.substring(0, 100) + '...');
    
    // Test download
    console.log('📥 Testing download...');
    const videoResponse = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Referer': 'https://www.instagram.com/',
      },
    });
    
    const fileSize = videoResponse.data.length;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    
    console.log('✅ Download SUCCESSFUL!');
    console.log('   Status:', videoResponse.status);
    console.log('   File size:', fileSizeMB, 'MB');
    console.log('   Content-Type:', videoResponse.headers['content-type']);
    
    console.log('\n🎉 Instagram Embed API method WORKS - 403 error FIXED!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
    }
    console.log('\n❌ Instagram download FAILED');
  }
}

testInstagramEmbed();
