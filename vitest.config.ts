import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  test: {
    coverage: {
      exclude: [
        "src/components/ui/**",
        "src/app/**/layout.tsx",
        "src/app/api/scrape/types.ts",
        "src/domains/{analysis,hotels,locations,tracking,weather}/types.ts",
      ],
      include: ["src/**/*.{ts,tsx}"],
      provider: "v8",
      reporter: [["text", { skipFull: true }], "text-summary"],
      thresholds: {
        branches: 90,
        functions: 90,
        lines: 90,
        statements: 90,
      },
    },
    environment: "node",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
  },
});
