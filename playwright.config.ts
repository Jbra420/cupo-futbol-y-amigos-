import { defineConfig } from "@playwright/test";
import {
  e2eBaseURL,
  e2ePort,
  verifyProduction,
} from "./tests/e2e/support/config";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  expect: { timeout: 10_000 },
  use: {
    baseURL: e2eBaseURL,
    colorScheme: "light",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    trace: "on-first-retry",
    screenshot: "on",
  },
  projects: [
    {
      name: "mobile",
      use: {
        browserName: "chromium",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 1,
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "desktop",
      use: {
        browserName: "chromium",
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
  webServer: {
    command: `npm run ${verifyProduction ? "start" : "dev"} -- --hostname 127.0.0.1 --port ${e2ePort}`,
    url: e2eBaseURL,
    reuseExistingServer: !process.env.CI && !verifyProduction,
  },
});
