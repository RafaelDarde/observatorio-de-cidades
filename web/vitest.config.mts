import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname) } },
  test: {
    include: ["lib/**/*.test.ts"],
    env: { DADOS_DIR: path.resolve(import.meta.dirname, "tests/fixtures/dados") },
  },
});
