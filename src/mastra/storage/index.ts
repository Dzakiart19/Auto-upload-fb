import { LibSQLStore } from "@mastra/libsql";

// Create a single shared LibSQL storage instance (file-based, no database required)
export const sharedPostgresStorage = new LibSQLStore({
  url: "file:mastra.db",
});
