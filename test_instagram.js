const { igApi } = require("insta-fetcher");

async function test() {
  try {
    const ig = new igApi("");
    const result = await ig.fetchPost("https://www.instagram.com/reel/DOfoOsOEd3g/");
    console.log("=== Result Structure ===");
    console.log("Keys:", Object.keys(result));
    console.log("\n=== Full Result ===");
    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);
  }
}

test();
