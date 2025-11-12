import { igApi } from "insta-fetcher";
import axios from "axios";

async function testInstagramDownload() {
  console.log('🧪 Testing Instagram download fix...');
  
  const testUrl = 'https://www.instagram.com/reel/DOfoOsOEd3g/?igsh=MWo4MzVpZmFrd210eg==';
  
  try {
    // Step 1: Fetch metadata
    console.log('📝 Step 1: Fetching Instagram metadata...');
    const instagramCookie = process.env.INSTAGRAM_COOKIE || '';
    const ig = new igApi(instagramCookie);
    
    const result = await ig.fetchPost(testUrl);
    
    if (!result || !result.links || result.links.length === 0) {
      console.error('❌ No data returned from Instagram');
      return;
    }
    
    console.log('✅ Metadata fetched successfully');
    console.log('   Caption:', result.caption?.substring(0, 100));
    console.log('   Links count:', result.links.length);
    
    // Step 2: Test download with improved headers
    const videoUrl = typeof result.links[0] === 'string' ? result.links[0] : result.links[0].url;
    
    console.log('📥 Step 2: Testing download with improved headers...');
    console.log('   URL:', videoUrl.substring(0, 100));
    
    const response = await axios.get(videoUrl, {
      responseType: 'arraybuffer',
      timeout: 60000,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'video/webm,video/ogg,video/*;q=0.9,application/ogg;q=0.7,audio/*;q=0.6,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com',
        'Sec-Fetch-Dest': 'video',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'cross-site',
        'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        ...(instagramCookie ? { 'Cookie': instagramCookie } : {}),
      },
    });
    
    const fileSize = response.data.length;
    const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
    
    console.log('✅ Download SUCCESSFUL!');
    console.log('   Status:', response.status);
    console.log('   File size:', fileSizeMB, 'MB');
    console.log('   Content-Type:', response.headers['content-type']);
    
    console.log('\n🎉 Instagram download fix VERIFIED - 403 error resolved!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
    }
    console.log('\n❌ Instagram download FAILED - 403 error still exists');
  }
}

testInstagramDownload();
