import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const generateEngagingCaption = createTool({
  id: "generate-engaging-caption",
  description: "Generate an engaging, viral-worthy caption with emojis and call-to-action to maximize video engagement and views",
  
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
      "general"
    ]).optional().default("general").describe("Content category for targeted caption"),
    language: z.enum(["id", "en"]).optional().default("id").describe("Caption language"),
  }),
  
  outputSchema: z.object({
    caption: z.string(),
    category: z.string(),
    hasEmoji: z.boolean(),
    hasCallToAction: z.boolean(),
  }),
  
  execute: async ({ context, mastra }) => {
    const logger = mastra?.getLogger();
    logger?.info('🔧 [generateEngagingCaption] Starting execution with params:', context);
    
    const { title, category, language } = context;
    
    // Emoji sets per category
    const categoryEmojis: Record<string, string[]> = {
      meme: ["😂", "🤣", "💀", "😭", "🔥", "💯"],
      comedy: ["😄", "🤣", "😆", "😂", "🎭", "✨"],
      tutorial: ["📚", "✅", "💡", "🎯", "👨‍🏫", "📖"],
      motivasi: ["💪", "🔥", "⚡", "🌟", "✨", "🚀"],
      gaming: ["🎮", "🕹️", "👾", "🎯", "🏆", "⚔️"],
      lifestyle: ["✨", "💫", "🌈", "💕", "🌸", "🎀"],
      teknologi: ["💻", "📱", "🤖", "⚡", "🔧", "🚀"],
      kuliner: ["🍔", "🍕", "🍜", "😋", "🤤", "🔥"],
      travel: ["✈️", "🌍", "🗺️", "📸", "🌅", "🏖️"],
      music: ["🎵", "🎶", "🎤", "🎧", "🔊", "💿"],
      sports: ["⚽", "🏀", "🏆", "💪", "🔥", "⚡"],
      general: ["✨", "🔥", "💯", "👀", "🎯", "💫"],
    };
    
    // Call-to-action templates
    const ctaTemplatesID = [
      "Tag teman kamu! 👥",
      "Share ke teman-teman! 📤",
      "Jangan lupa like dan share! ❤️",
      "Kalau suka, share ya! 😊",
      "Tag yang harus lihat ini! 👇",
      "Double tap kalau setuju! 💯",
      "Simpan untuk nanti! 📌",
      "Share ke story kamu! 📱",
      "Comment di bawah! 💬",
      "Follow untuk konten lebih seru! ⭐",
    ];
    
    const ctaTemplatesEN = [
      "Tag your friends! 👥",
      "Share with friends! 📤",
      "Don't forget to like and share! ❤️",
      "If you like it, share it! 😊",
      "Tag someone who needs to see this! 👇",
      "Double tap if you agree! 💯",
      "Save for later! 📌",
      "Share to your story! 📱",
      "Comment below! 💬",
      "Follow for more! ⭐",
    ];
    
    // Hook templates per category (Indonesian)
    const hookTemplatesID: Record<string, string[]> = {
      meme: [
        "Ketawa dulu gak sih? 😂",
        "Ini sih relate banget! 🤣",
        "POV:",
        "Gak kuat liat ini! 💀",
        "Mood banget! 😭",
      ],
      comedy: [
        "Dijamin ngakak! 😄",
        "Lucu banget anjir! 🤣",
        "Nonton sampe abis ya! 😆",
        "Prepare to laugh! 🎭",
      ],
      tutorial: [
        "Tips: ",
        "Cara mudah: ",
        "Tutorial lengkap: ",
        "Belajar yuk: ",
        "Step by step: ",
      ],
      motivasi: [
        "Semangat! 💪",
        "Kamu pasti bisa! 🔥",
        "Inspirasi hari ini: ",
        "Jangan menyerah! ⚡",
      ],
      gaming: [
        "Gameplay epic! 🎮",
        "Pro player move! 🏆",
        "GG banget! 🕹️",
        "Watch this! 👾",
      ],
      general: [
        "Cek ini! ",
        "Wajib nonton! ",
        "Jangan skip! ",
        "Amazing! ",
      ],
    };
    
    // Hook templates (English)
    const hookTemplatesEN: Record<string, string[]> = {
      meme: [
        "This is hilarious! 😂",
        "So relatable! 🤣",
        "POV:",
        "Can't stop laughing! 💀",
        "Big mood! 😭",
      ],
      comedy: [
        "Guaranteed laughs! 😄",
        "This is so funny! 🤣",
        "Watch till the end! 😆",
      ],
      tutorial: [
        "Quick tip: ",
        "Easy way to: ",
        "Complete tutorial: ",
        "Learn how to: ",
      ],
      general: [
        "Check this out! ",
        "Must watch! ",
        "Don't skip! ",
        "Amazing! ",
      ],
    };
    
    const emojis = categoryEmojis[category] || categoryEmojis.general;
    const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    const randomEmoji2 = emojis[Math.floor(Math.random() * emojis.length)];
    
    const ctaTemplates = language === "id" ? ctaTemplatesID : ctaTemplatesEN;
    const randomCTA = ctaTemplates[Math.floor(Math.random() * ctaTemplates.length)];
    
    const hookTemplates = language === "id" 
      ? (hookTemplatesID[category] || hookTemplatesID.general)
      : (hookTemplatesEN[category] || hookTemplatesEN.general);
    const randomHook = hookTemplates[Math.floor(Math.random() * hookTemplates.length)];
    
    // Build caption with structure: Hook + Title + Emoji + CTA
    let caption = "";
    
    // Add hook if it doesn't contain the title already
    if (!randomHook.toLowerCase().includes(title.toLowerCase().substring(0, 10))) {
      caption += `${randomHook} ${randomEmoji}\n\n`;
    }
    
    // Add title with emphasis
    caption += `${title} ${randomEmoji2}\n\n`;
    
    // Add CTA
    caption += `${randomCTA}\n\n`;
    
    // Footer with engagement hooks
    if (language === "id") {
      caption += `━━━━━━━━━━━━━━━\n`;
      caption += `💬 Komen pendapat kamu!\n`;
      caption += `❤️ Like kalau suka!\n`;
      caption += `📤 Share ke teman-teman!\n`;
    } else {
      caption += `━━━━━━━━━━━━━━━\n`;
      caption += `💬 Comment your thoughts!\n`;
      caption += `❤️ Like if you enjoyed!\n`;
      caption += `📤 Share with friends!\n`;
    }
    
    logger?.info('✅ [generateEngagingCaption] Caption generated successfully', {
      captionLength: caption.length,
      category,
      hasEmoji: true,
      hasCallToAction: true,
    });
    
    return {
      caption,
      category,
      hasEmoji: true,
      hasCallToAction: true,
    };
  },
});
