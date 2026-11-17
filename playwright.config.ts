import { defineConfig, devices } from '@playwright/test';

// End-to-end tests run against the production build (vite preview) with
// MusicBrainz and Cover Art Archive stubbed, so they never hit the live service.
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: { baseURL: 'http://localhost:4173/app/', trace: 'on-first-retry' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'npm run build && npx vite preview --port 4173 --strictPort',
    url: 'http://localhost:4173/app/',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
