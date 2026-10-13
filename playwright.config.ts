import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  workers: 1,
  use: { baseURL: 'http://127.0.0.1:4741', browserName: 'chromium', trace: 'retain-on-failure' },
  webServer: {
    command: `node skills/seo-roast/scripts/roast.mjs serve --port 4741 --sessions .local/ui-sessions-${Date.now()}`,
    url: 'http://127.0.0.1:4741/api/health',
    reuseExistingServer: false,
  },
  reporter: [['list']],
});
