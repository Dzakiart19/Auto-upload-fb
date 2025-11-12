import { IGDownloader } from "@mrnima/instagram-downloader";
import axios from "axios";
import fs from "fs";

async function testIGDownloader() {
  console.log('🧪 Testing @mrnima/instagram-downloader...');
  
  const testUrl = 'https://www.instagram.com/reel/DOfoOsOEd3g/?igsh=MWo4MzVpZmFrd210eg==';
  
  try {
    console.log('📥 Fetching Instagram data...');
    const downloader = new IGDownloader();
    const result = await downloader.getPostData(testUrl);
    
    console.log('✅ Data fetched successfully!');
    console.log('   Caption:', result.caption?.substring(0, 100));
    console.log('   Username:', result.username);
    console.log('   Download links:', result.downloadLinks?.length);
    
    if (result.downloadLinks && result.downloadLinks.length > 0) {
      const downloadUrl = result.downloadLinks[0];
      console.log('📥 Testing video download...');
      console.log('   URL:', downloadUrl.substring(0, 100));
      
      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: 60000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
      });
      
      const fileSize = response.data.length;
      const fileSizeMB = (fileSize / 1024 / 1024).toFixed(2);
      
      console.log('✅ Download SUCCESSFUL!');
      console.log('   File size:', fileSizeMB, 'MB');
      console.log('   Content-Type:', response.headers['content-type']);
      
      console.log('\n🎉 Instagram download dengan @mrnima/instagram-downloader BERHASIL!');
    } else {
      console.error('❌ No download links found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Status Text:', error.response.statusText);
    }
    console.log('\n❌ Instagram download GAGAL');
  }
}

testIGDownloader();
