import { Downloader } from "@tobyg74/tiktok-api-dl";

const testUrl = "https://vt.tiktok.com/ZSytCgaHh/";

console.log("Testing TikTok download with v1...\n");

try {
  const result = await Downloader(testUrl, { version: "v1" });
  console.log("Status:", result.status);
  console.log("\nResult structure:");
  console.log("Keys in result:", Object.keys(result));
  if (result.result) {
    console.log("Keys in result.result:", Object.keys(result.result));
    console.log("\nFull result.result:");
    console.log(JSON.stringify(result.result, null, 2).substring(0, 1000));
  }
} catch (error) {
  console.error("Error:", error.message);
}
