import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: "http://127.0.0.1:4173", launchOptions: process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {} },
  webServer: { command: "serve out -l 4173 --no-clipboard", url: "http://127.0.0.1:4173", reuseExistingServer: !process.env.CI },
});
