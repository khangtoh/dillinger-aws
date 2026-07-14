import { defineConfig, devices } from "@playwright/test";

const port = 3005;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  reporter: "list",
  timeout: 45_000,
  expect: {
    timeout: 5_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `npx next dev -H 127.0.0.1 -p ${port}`, // Use dev mode; production build has pre-existing prerender errors
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    // Same-origin-protected API routes (image upload, cloud saves, PDF
    // export) validate the request's Origin header against this — without
    // it they compare against the "http://localhost:3000" default, which
    // never matches this suite's 127.0.0.1:${port} origin and 403s.
    env: { NEXT_PUBLIC_BASE_URL: baseURL },
  },
});
