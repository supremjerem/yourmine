import { existsSync } from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Locally the backend runs from the project venv; on CI, setup-python installs
// the dependencies against the runner's own interpreter and there is no venv.
// Hardcoding the venv path made the CI job die with exit 127 before a single
// test ran.
const VENV_PYTHON = 'venv/bin/python3';
const backendCommand = `${existsSync(VENV_PYTHON) ? VENV_PYTHON : 'python3'} -m backend.api`;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      cwd: './frontend',
      timeout: 120_000,
    },
    {
      command: backendCommand,
      url: 'http://localhost:8000',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
