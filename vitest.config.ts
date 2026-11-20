import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/__tests__/**/*.test.ts"],
    testTimeout: 30000,
    // Prisma reads .env on import; keep tests on the local JSON store so they can
    // never register users or reset data in the real (Supabase) database.
    env: { DATABASE_URL: "" },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
