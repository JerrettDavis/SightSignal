import path from "node:path";
import { defineConfig } from "@playwright/test";

const baseUrl = "http://127.0.0.1:3000";
const e2eDataDir = path.join(process.cwd(), ".local", "e2e");

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000, // 60s timeout
  expect: {
    timeout: 15_000, // 15s expect timeout
  },
  use: {
    baseURL: baseUrl,
    trace: "on-first-retry",
    viewport: { width: 1920, height: 1080 }, // Larger viewport to prevent overflow issues
  },
  workers: process.env.CI ? 4 : 1, // Use 4 workers for better parallelization
  fullyParallel: true, // Run tests in parallel within files
  globalSetup: "./tests/e2e/global-setup.ts",
  webServer: {
    command: "npm run dev -- --port 3000",
    url: baseUrl,
    reuseExistingServer: !process.env.CI,
    env: {
      SIGHTSIGNAL_DATA_STORE: "file",
      SIGHTSIGNAL_DATA_DIR: e2eDataDir,
      ADMIN_AUTH_ENABLED: "true",
      ADMIN_JWT_SECRET: "test-secret-for-e2e-testing-only-min-32-chars",
      ADMIN_USERS:
        "admin:$2b$10$3ucZ/lmCdbbQNyxmXgDv2uBIXueZcUdtKpJVYkd5NvVdZyZVyRl3C",
    },
  },
});
