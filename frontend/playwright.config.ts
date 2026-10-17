import { defineConfig } from '@playwright/test'
// Start the development and production preview servers in separate terminals.
// Explicit server ownership avoids Windows child-process teardown hangs.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  use: { channel: 'msedge', headless: true, baseURL: 'http://127.0.0.1:5173' },
})
