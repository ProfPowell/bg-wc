import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  // Playwright owns the browser *.spec.js suites; node:test files (e.g. the SSR
  // import smoke, *.mjs) run separately via `npm run test:node`.
  // Two projects: `main` (the behaviour suites) and `visual` (per-preset
  // screenshot baselines). visual is split out because its baselines are
  // environment-specific and must run in the pinned Playwright container — see
  // scripts/update-visual-baselines.sh and the `visual` CI job.
  projects: [
    { name: 'main', testMatch: '**/*.spec.js', testIgnore: '**/visual.spec.js' },
    { name: 'visual', testMatch: '**/visual.spec.js' },
  ],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5174',
    trace: 'on-first-retry',
  },
  webServer: [
    {
      command: 'npx vite --config vite.site.config.js --port 5174',
      url: 'http://localhost:5174/test/tokens-page.html',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
    // The PRODUCTION site for test/built-site.spec.js (gl-wc-kkgm): rebuild
    // dist-site, then serve it statically — no dev middleware, so a missing
    // emitted asset is a real 404 exactly as on GitHub Pages.
    {
      command:
        'npm run build:site && npx vite preview --config vite.site.config.js --port 5175 --strictPort',
      url: 'http://localhost:5175/index.html',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
