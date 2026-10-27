import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3499",
    viewport: { width: 390, height: 844 },
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "node --import ./tests/fixtures/ai-provider.js server.js",
    url: "http://127.0.0.1:3499/api/health",
    env: {
      PORT: "3499",
      AI_PROVIDER: "gemini",
      GEMINI_API_KEY: "test-only-fake-google-key",
      GEMINI_MODEL: "gemini-2.5-flash-lite",
      DATA_DIR: process.env.E2E_DATA_DIR || "/tmp/prado-browser-tests",
      ADMIN_PASSWORD: "Browser-test-password-2026!",
    },
    reuseExistingServer: false,
  },
  reporter: "list",
});
