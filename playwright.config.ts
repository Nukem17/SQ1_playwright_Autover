import { defineConfig, devices } from '@playwright/test';

// Deze instellingen gelden voor alle .spec.ts-bestanden in test/.
export default defineConfig({
  testDir: './test',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    // Bij een fout kunnen we terugkijken via een screenshot en een trace.
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [
    // Eén testbestand kan zo in meerdere browsers draaien.
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
