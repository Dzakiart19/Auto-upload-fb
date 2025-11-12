import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const generateTrendingHashtags = createTool({
  id: "generate-trending-hashtags",
  description: "Generate trending and relevant hashtags to maximize video discoverability and reach on Facebook",
  
  inputSchema: z.object({
    title: z.string().describe("Video title or main topic"),
    category: z.enum([
      "meme", 
      "comedy", 
      "tutorial", 
      "motivasi", 
      "gaming", 
      "lifestyle", 
      "teknologi",
      "kuliner",
      "travel",
      "music",
      "sports",
      "brainrot",
      "absurd",
      "random",
      "perfectcut",
      "general"
    ]).optional().default("general").describe("Content category"),
    language: z.enum(["id", "en", "both"]).optional().default("both").describe("Hashtag language preference"),
    maxHashtags: z.number().optional().default(15).describe("Maximum number of hashtags to generate"),
  }),
  
  outputSchema: z.object({
    hashtags: z.string(),
    count: z.number(),
    categories: z.array(z.string()),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [generateTrendingHashtags] Starting execution with params:', context);
    
    const { title, category, language, maxHashtags } = context;
    
    // Trending hashtags per category (Indonesian + English)
    // OPTIMIZED for Indonesian meme absurd/random/brainrot niche groups
    const categoryHashtags: Record<string, { id: string[], en: string[], universal: string[] }> = {
      meme: {
        id: ["memeindo", "memeabsurd", "memeindonesia", "randomvideo", "brainrot", "humorabsurd", "videolucu", "randompost", "perfectcut", "humorreceh", "ngakak", "ketawa", "memelucu", "alay", "reelsindonesia", "grupmemerandom"],
        en: ["absurdhumor", "brainrotmemes", "randomvideos", "perfectlycut", "memesid"],
        universal: ["reels", "video", "randomcontent"],
      },
      comedy: {
        id: ["lucu", "humor", "ngakak", "kocak", "videolucu", "humorreceh", "randompost"],
        en: ["funny", "humor", "randomhumor"],
        universal: ["reels", "video"],
      },
      tutorial: {
        id: ["tutorial", "tips", "belajar", "edukasi", "howto", "caranya", "panduan"],
        en: ["tutorial", "howto", "learn", "education", "tips", "guide", "diy"],
        universal: ["educational", "learning", "knowledge", "skills"],
      },
      motivasi: {
        id: ["motivasi", "inspirasi", "semangat", "sukses", "quotes", "bijak", "positif"],
        en: ["motivation", "inspiration", "success", "mindset", "goals", "positive"],
        universal: ["motivated", "inspired", "hustle", "grind", "nevergiveup"],
      },
      gaming: {
        id: ["gaming", "game", "gamers", "mobilelegends", "pubg", "freefire", "esports"],
        en: ["gaming", "gamer", "gameplay", "videogames", "esports", "twitch"],
        universal: ["gamingcommunity", "gaminglife", "pro", "gg"],
      },
      lifestyle: {
        id: ["lifestyle", "kehidupan", "daily", "vlog", "ootd", "aesthetic"],
        en: ["lifestyle", "life", "daily", "vlog", "aesthetic", "vibes"],
        universal: ["instagood", "photooftheday", "love", "beautiful"],
      },
      teknologi: {
        id: ["teknologi", "tech", "gadget", "hp", "smartphone", "tipsteknologi"],
        en: ["technology", "tech", "gadgets", "innovation", "techreview"],
        universal: ["techy", "instatech", "android", "ios"],
      },
      kuliner: {
        id: ["kuliner", "makanan", "food", "jajanan", "makananenak", "foodie"],
        en: ["food", "foodie", "foodporn", "yummy", "delicious", "instafood"],
        universal: ["foodlover", "foodstagram", "foodblogger"],
      },
      travel: {
        id: ["travel", "traveling", "jalan", "wisata", "liburan", "explore"],
        en: ["travel", "traveling", "wanderlust", "adventure", "vacation"],
        universal: ["travelphotography", "instatravel", "travelgram"],
      },
      music: {
        id: ["musik", "lagu", "music", "song", "cover", "singing"],
        en: ["music", "song", "musician", "singer", "cover", "musicvideo"],
        universal: ["musiclover", "instamusic", "musicislife"],
      },
      sports: {
        id: ["olahraga", "sport", "fitness", "workout", "gym", "sehat"],
        en: ["sports", "fitness", "workout", "gym", "athlete", "training"],
        universal: ["fitnessmotivation", "sport", "healthy"],
      },
      brainrot: {
        id: ["brainrot", "brainrotmeme", "randomvideo", "absurd", "receh", "memeabsurd", "randompost", "humorabsurd", "videolucu", "alay"],
        en: ["brainrotmemes", "absurdhumor", "randomcontent"],
        universal: ["reels", "video"],
      },
      absurd: {
        id: ["humorabsurd", "memeabsurd", "absurd", "kocak", "receh", "randomvideo", "videolucu", "randompost", "brainrot", "alay"],
        en: ["absurdhumor", "randomvideos", "brainrotmemes"],
        universal: ["reels", "video"],
      },
      random: {
        id: ["randomvideo", "randompost", "randomcontent", "videorandom", "videolucu", "memeabsurd", "humorabsurd", "reelsindonesia"],
        en: ["randomvideos", "randomcontent", "absurdhumor"],
        universal: ["reels", "video"],
      },
      perfectcut: {
        id: ["perfectcut", "perfectlycut", "videolucu", "cutperfect", "randomvideo", "memeindo"],
        en: ["perfectlycutscreams", "perfectlycutvideo", "perfectlycut"],
        universal: ["reels", "video"],
      },
      general: {
        id: ["videolucu", "randomvideo", "reelsindonesia", "memeindo", "randompost", "videorandom"],
        en: ["randomvideos", "randomcontent"],
        universal: ["reels", "video"],
      },
    };
    
    // Global trending hashtags optimized for Indonesian meme absurd/random niche
    const globalTrending = [
      "randomvideo", "videolucu", "memeindo", "randompost", "reelsindonesia",
      "humorabsurd", "memeabsurd", "brainrot", "perfectcut", "alay",
    ];
    
    const hashtagSet = new Set<string>();
    const categories: string[] = [];
    
    // Add category-specific hashtags
    const categoryData = categoryHashtags[category] || categoryHashtags.general;
    
    if (language === "id" || language === "both") {
      categoryData.id.forEach(tag => hashtagSet.add(tag));
      categories.push("category-id");
    }
    
    if (language === "en" || language === "both") {
      categoryData.en.forEach(tag => hashtagSet.add(tag));
      categories.push("category-en");
    }
    
    // Always add universal hashtags
    categoryData.universal.forEach(tag => hashtagSet.add(tag));
    categories.push("universal");
    
    // Extract keywords from title and add as hashtags
    const titleWords = title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 3 && word.length < 20);
    
    titleWords.forEach(word => {
      if (hashtagSet.size < maxHashtags) {
        hashtagSet.add(word);
      }
    });
    categories.push("title-keywords");
    
    // Add global trending hashtags to fill up to maxHashtags
    for (const tag of globalTrending) {
      if (hashtagSet.size >= maxHashtags) break;
      hashtagSet.add(tag);
    }
    categories.push("global-trending");
    
    // Convert to array and limit
    const hashtagArray = Array.from(hashtagSet).slice(0, maxHashtags);
    
    // Format hashtags with # prefix
    const formattedHashtags = hashtagArray.map(tag => `#${tag}`).join(' ');
    
    logger?.info('✅ [generateTrendingHashtags] Hashtags generated successfully', {
      count: hashtagArray.length,
      categories,
      preview: hashtagArray.slice(0, 5),
    });
    
    return {
      hashtags: formattedHashtags,
      count: hashtagArray.length,
      categories,
    };
  },
});
