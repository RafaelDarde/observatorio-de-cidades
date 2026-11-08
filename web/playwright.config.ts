import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://localhost:3123" },
  webServer: { command: "npx serve out -l 3123", port: 3123, reuseExistingServer: true },
});
