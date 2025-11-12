import { Downloader } from "@tobyg74/tiktok-api-dl";

const testUrl = "https://vt.tiktok.com/ZSytCgaHh/";

console.log("Testing TikTok download with all versions...\n");

for (const version of ["v1", "v2", "v3"]) {
  console.log(`\n========== Testing ${version} ==========`);
  try {
    const result = await Downloader(testUrl, { version });
    console.log("Status:", result.status);
    
    if (result.status === "success" && result.result) {
      console.log("Keys in result.result:", Object.keys(result.result));
      
      // Look for video URLs
      const r = result.result;
      const possibleUrls = [
        r.video, r.download, r.videoHD, r.videoSD, 
        r.video1, r.video2, r.play, r.downloadAddr
      ];
      
      console.log("\nPossible video URL properties:");
      possibleUrls.forEach((url, i) => {
        if (url) console.log(`  Found: ${Object.keys(r)[i]} =`, typeof url === 'string' ? url.substring(0, 50) + '...' : url);
      });
      
      // Show first 500 chars of result
      console.log("\nResult preview:");
      console.log(JSON.stringify(result.result, null, 2).substring(0, 500) + "...");
    } else {
      console.log("Error:", result.message);
    }
  } catch (error) {
    console.error("Exception:", error.message);
  }
}
