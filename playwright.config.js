import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  // Playwright owns the browser *.spec.js suites; node:test files (e.g. the SSR
  // import smoke, *.mjs) are run separately via `npm run test:ssr`.
  testMatch: '**/*.spec.js',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx vite --config vite.site.config.js --port 5174',
    url: 'http://localhost:5174/test/tokens-page.html',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
